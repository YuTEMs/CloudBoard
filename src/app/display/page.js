"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { ClipboardList, XCircle, Search as SearchIcon } from 'lucide-react'
import { useDisplayBoard } from '../../hooks/useDisplayBoard'
import { usePersonDetection } from '../../hooks/usePersonDetection'
import { useAIAdvertisement } from '../../hooks/useAIAdvertisement'
import { RenderWidget } from '../../components/widgets'
import { advertisementSettingsService } from '../../lib/supabase'

// Lazy load advertisement component (only when advertisements are active)
const AdvertisementDisplay = dynamic(() => import('../../components/AdvertisementDisplay'), {
  ssr: false,
  loading: () => null
})

// Widget definitions removed - now using shared widgets from ../../components/widgets

function DisplayContent() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('board')

  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Use display board hook with save-based updates
  const { board, loading, error, lastUpdated, connectionStatus } = useDisplayBoard(boardId)
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 })
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [showAdvertisement, setShowAdvertisement] = useState(false)
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [advertisements, setAdvertisements] = useState([])
  const [adSettings, setAdSettings] = useState({
    timeBetweenAds: 60,
    initialDelay: 5,
    adDisplayDuration: null,
    enableAI: false,
    personThreshold: 1,
    detectionDuration: 0
  })
  const [showAdSettingsUpdate, setShowAdSettingsUpdate] = useState(false)
  const displayRef = useRef(null)
  const alternatingTimerRef = useRef(null)

  // Person detection - only enabled when AI settings are turned on
  const personDetection = usePersonDetection(adSettings.enableAI)

  // Determine if we should use AI mode or fallback to timer
  const shouldUseAI = adSettings.enableAI && !loading && !error && board
  const useAIMode = shouldUseAI && personDetection.cameraAvailable && personDetection.isModelReady

  // Log AI mode status
  useEffect(() => {
    if (shouldUseAI) {
      console.log(`[Display] AI Mode: ${useAIMode ? 'ACTIVE' : 'FALLBACK TO TIMER'}`);
      console.log(`[Display] Camera Available: ${personDetection.cameraAvailable}`);
      console.log(`[Display] Model Ready: ${personDetection.isModelReady}`);
      if (personDetection.error) {
        console.log(`[Display] Person Detection Error: ${personDetection.error}`);
      }
    }
  }, [shouldUseAI, useAIMode, personDetection.cameraAvailable, personDetection.isModelReady, personDetection.error])

  // AI Advertisement Management - new clean implementation
  const aiAdvertisement = useAIAdvertisement({
    enabled: useAIMode,
    personCount: personDetection.rawPersonCount,
    advertisements,
    settings: adSettings,
    onShowAd: (adIndex) => {
      console.log(`[Display] 🎬 AI triggered ad ${adIndex + 1}/${advertisements.length}`);
      setCurrentAdIndex(adIndex);
      setShowAdvertisement(true);
    },
    onHideAd: () => {
      console.log(`[Display] 🔚 AI hiding ad`);
      setShowAdvertisement(false);
    }
  });

  // Extract board data from real-time hook with memoization
  const canvasItems = useMemo(() => board?.configuration?.items || [], [board?.configuration?.items])
  const boardName = useMemo(() => board?.name || "", [board?.name])
  const canvasSize = useMemo(() => board?.configuration?.canvasSize || { width: 1920, height: 1080 }, [board?.configuration?.canvasSize])
  const backgroundImage = useMemo(() => board?.configuration?.backgroundImage || null, [board?.configuration?.backgroundImage])
  const backgroundColor = useMemo(() => board?.configuration?.backgroundColor || "#ffffff", [board?.configuration?.backgroundColor])
  const isLoading = loading

  // Create safe canvas size object to avoid mutation (memoized)
  const safeCanvasSize = useMemo(() => ({
    width: canvasSize?.width || 1920,
    height: canvasSize?.height || 1080
  }), [canvasSize?.width, canvasSize?.height])

  // Calculate viewport size and scale factors - Hook must be called every render
  const updateViewportSize = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    setViewportSize({ width: vw, height: vh })

    // Use uniform scale factor to maintain aspect ratio
    const scaleX = vw / safeCanvasSize.width
    const scaleY = vh / safeCanvasSize.height
    const uniformScale = Math.min(scaleX, scaleY)

    // Calculate offsets to center the content
    const scaledCanvasWidth = safeCanvasSize.width * uniformScale
    const scaledCanvasHeight = safeCanvasSize.height * uniformScale
    const offsetX = (vw - scaledCanvasWidth) / 2
    const offsetY = (vh - scaledCanvasHeight) / 2

    setScale(uniformScale)
    setOffset({ x: offsetX, y: offsetY })
  }, [safeCanvasSize.width, safeCanvasSize.height])

  // Set initial viewport size and add resize listener
  useEffect(() => {
    updateViewportSize()

    const handleResize = () => {
      updateViewportSize()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateViewportSize])

  // Update scale factors when canvas size changes
  useEffect(() => {
    updateViewportSize()
  }, [safeCanvasSize.width, safeCanvasSize.height, updateViewportSize])

  // Handle real-time board updates
  useEffect(() => {
    if (lastUpdated && connectionStatus === 'updated') {
      // Force re-render by updating a state that doesn't affect rendering but triggers effects
      // This ensures all components respond to the latest data changes
    }
  }, [lastUpdated, connectionStatus])

  // Fetch advertisements for alternating display
  const fetchAdvertisements = useCallback(async () => {
    if (!boardId) {
      console.log('[Display] No boardId provided for advertisement fetch');
      return;
    }

    console.log(`[Display] Fetching advertisements for board: ${boardId}`);

    try {
      // Use public endpoint for display mode (no authentication required)
      const response = await fetch(`/api/advertisements/public?boardId=${boardId}`);
      
      console.log(`[Display] Public API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Display] Public API error:`, errorText);
        setAdvertisements([]);
        return;
      }

      const activeAds = await response.json();
      console.log(`[Display] Received ${activeAds?.length || 0} advertisements:`, activeAds);

      if (!Array.isArray(activeAds)) {
        console.error('[Display] Invalid response format - expected array:', activeAds);
        setAdvertisements([]);
        return;
      }

      // Sort by creation date for consistent ordering
      const sortedAds = activeAds.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      console.log(`[Display] Setting ${sortedAds.length} advertisements for display`);

      setAdvertisements(sortedAds);
    } catch (error) {
      console.error('[Display] Error fetching advertisements:', error);
      setAdvertisements([]);
    }
  }, [boardId]);

  // Fetch advertisement settings
  const fetchAdSettings = useCallback(async () => {
    if (!boardId) {
      console.log('[Display] No boardId provided for settings fetch');
      return;
    }

    console.log(`[Display] Fetching advertisement settings for board: ${boardId}`);

    try {
      const response = await fetch(`/api/advertisements/settings?boardId=${boardId}`);
      
      console.log(`[Display] Settings API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Display] Settings API error:`, errorText);
        // Use default settings on error
        return;
      }

      const settings = await response.json();
      console.log(`[Display] Received advertisement settings:`, settings);

      setAdSettings(settings);
    } catch (error) {
      console.error('[Display] Error fetching advertisement settings:', error);
      // Keep default settings on error
    }
  }, [boardId]);

  // Fetch advertisements when board loads and setup real-time updates
  useEffect(() => {
    if (!boardId || loading || error || !board) return;

    // Fetch advertisements and settings on mount
    fetchAdvertisements();
    fetchAdSettings();

    return () => {
      if (alternatingTimerRef.current) {
        clearTimeout(alternatingTimerRef.current);
      }
    };
  }, [boardId, loading, error, board, fetchAdvertisements, fetchAdSettings]);

  // Listen for real-time updates via the existing SSE connection
  useEffect(() => {
    // Handle string status values
    if (typeof connectionStatus === 'string') {
      if (connectionStatus === 'updated') {
        // Board content was updated - handled by useDisplayBoard hook
      } else if (connectionStatus === 'advertisements_updated') {
        // Advertisements were updated - refetch advertisement list
        fetchAdvertisements();
      }
    }
    // Handle object status values (with embedded data)
    else if (typeof connectionStatus === 'object' && connectionStatus !== null) {
      if (connectionStatus.status === 'advertisement_settings_updated') {
        // Advertisement settings were updated - use settings from broadcast
        console.log('[Display] Advertisement settings updated via broadcast:', connectionStatus.settings);
        if (connectionStatus.settings) {
          setAdSettings(connectionStatus.settings);
        } else {
          // Fallback to fetching if no settings in broadcast
          console.log('[Display] No settings in broadcast, refetching...');
          fetchAdSettings();
        }

        // Show visual indicator for 2 seconds
        setShowAdSettingsUpdate(true);
        setTimeout(() => setShowAdSettingsUpdate(false), 2000);
      }
    }
  }, [connectionStatus, fetchAdvertisements, fetchAdSettings]);

  // Subscribe to ad settings changes via SSE
  useEffect(() => {
    if (!boardId) return;

    console.log(`[Display] Subscribing to advertisement settings SSE updates for board ${boardId}`);

    let indicatorTimeout = null;

    const subscription = advertisementSettingsService.subscribeToSettingsChanges(
      boardId,
      (message) => {
        if (!message || message.type !== 'advertisement_settings_updated') {
          return;
        }

        console.log('[Display] SSE: Advertisement settings message received', message);

        if (message.data) {
          setAdSettings(message.data);
        } else {
          fetchAdSettings();
        }

        // Show visual indicator for 2 seconds
        setShowAdSettingsUpdate(true);
        if (indicatorTimeout) {
          clearTimeout(indicatorTimeout);
        }
        indicatorTimeout = setTimeout(() => setShowAdSettingsUpdate(false), 2000);
      }
    );

    if (!subscription) {
      console.warn('[Display] Failed to subscribe to advertisement settings SSE');
      return undefined;
    }

    return () => {
      console.log(`[Display] Unsubscribing from advertisement settings SSE updates`);
      if (indicatorTimeout) {
        clearTimeout(indicatorTimeout);
      }
      advertisementSettingsService.unsubscribe(subscription);
    };
  }, [boardId, fetchAdSettings]);

  // Start alternating cycle when board is loaded (with AI or timer mode)
  useEffect(() => {
    if (loading || error) {
      console.log(`[Display] Not starting ad cycle - loading: ${loading}, error: ${error}`);
      return;
    }

    if (!board) {
      console.log('[Display] Not starting ad cycle - no board data');
      return;
    }

    console.log(`[Display] Starting advertisement cycle for board: ${board.name} (${board.id})`);
    console.log(`[Display] AI Mode: ${useAIMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[Display] Current advertisements count: ${advertisements.length}`);

    // AI MODE is now handled by the useAIAdvertisement hook
    if (useAIMode) {
      console.log(`[Display] AI mode active - advertisement triggering handled by AI hook`);
      // Don't show ad initially in AI mode
      setShowAdvertisement(false);
      return () => {
        // No cleanup needed - handled by AI hook
      };
    }

    // TIMER MODE: Use traditional timer-based cycle
    console.log(`[Display] Using timer-based mode`);

    const startAlternatingCycle = () => {
      console.log('[Display] Starting new alternating cycle - showing main content first');
      setShowAdvertisement(false);

      const showNextAd = () => {
        console.log(`[Display] Time to show ad - available ads: ${advertisements.length}`);
        if (advertisements.length === 0) {
          const retryTime = (adSettings.timeBetweenAds || 60) * 1000;
          console.log(`[Display] No ads available, scheduling next check in ${retryTime / 1000} seconds`);
          alternatingTimerRef.current = setTimeout(startAlternatingCycle, retryTime);
          return;
        }

        console.log(`[Display] Showing advertisement ${currentAdIndex + 1} of ${advertisements.length}`);
        setShowAdvertisement(true);
      };

      const mainContentTime = (adSettings.timeBetweenAds || 60) * 1000;
      console.log(`[Display] Scheduling ad display in ${mainContentTime / 1000} seconds`);
      alternatingTimerRef.current = setTimeout(showNextAd, mainContentTime);
    };

    const initialDelay = (adSettings.initialDelay || 5) * 1000;
    console.log(`[Display] Starting initial cycle in ${initialDelay / 1000} seconds`);
    alternatingTimerRef.current = setTimeout(startAlternatingCycle, initialDelay);

    return () => {
      console.log('[Display] Cleaning up timer cycle');
      if (alternatingTimerRef.current) {
        clearTimeout(alternatingTimerRef.current);
      }
    };
  }, [board, loading, error, advertisements.length, adSettings, useAIMode, currentAdIndex])

  // Track advertisement view in analytics
  const trackAdView = useCallback(async (advertisementId) => {
    try {
      await fetch('/api/advertisements/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ advertisementId }),
      });
    } catch (error) {
      // Silently fail - don't disrupt display
    }
  }, []);

  // Track when advertisement is shown
  useEffect(() => {
    if (showAdvertisement && advertisements.length > 0 && advertisements[currentAdIndex]) {
      const currentAd = advertisements[currentAdIndex];
      trackAdView(currentAd.id);
    }
  }, [showAdvertisement, currentAdIndex, advertisements, trackAdView]);

  // Handle ad completion and cycle to next
  const handleAdComplete = useCallback(() => {
    console.log(`[Display] Ad completed`);

    if (useAIMode) {
      // In AI mode, let the AI hook handle the completion
      aiAdvertisement.handleAdComplete();
    } else {
      // In timer mode, handle completion manually
      setShowAdvertisement(false);

      // Move to next ad in rotation
      const nextIndex = (currentAdIndex + 1) % advertisements.length;
      setCurrentAdIndex(nextIndex);

      if (nextIndex === 0) {
        console.log(`[Display] Rotation complete, looping back to first ad`);
      } else {
        console.log(`[Display] Moving to next ad in rotation: ${nextIndex + 1} of ${advertisements.length}`);
      }

      // Schedule next ad after break time
      const breakTime = (adSettings.timeBetweenAds || 60) * 1000;
      console.log(`[Display] Timer mode: Scheduling next ad in ${breakTime / 1000} seconds`);
      alternatingTimerRef.current = setTimeout(() => {
        if (advertisements.length > 0) {
          setShowAdvertisement(true);
        }
      }, breakTime);
    }
  }, [useAIMode, aiAdvertisement, advertisements.length, currentAdIndex, adSettings.timeBetweenAds])

  // NOW WE CAN HAVE CONDITIONAL RETURNS AFTER ALL HOOKS
  // Handle loading and error states
  if (!boardId) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center text-white">
        <div className="text-center p-8 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-2xl flex items-center justify-center">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">!</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Display Error</h1>
          <p className="text-xl opacity-90">No board ID provided. Please check the URL.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white">
        <div className="text-center p-8 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div className="spinner mx-auto mb-6"></div>
          <p className="text-2xl font-semibold">Loading Display</p>
          <p className="text-lg opacity-75 mt-2">Preparing your bulletin board...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center text-white">
        <div className="text-center p-8 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Display Error</h1>
          <p className="text-xl mb-4">{error}</p>
          <p className="text-sm opacity-75 bg-black/30 px-4 py-2 rounded-lg">Board ID: {boardId}</p>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white">
        <div className="text-center p-8 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
            <SearchIcon className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Board Not Found</h1>
          <p className="text-xl mb-4">The requested board could not be found.</p>
          <p className="text-sm opacity-75 bg-black/30 px-4 py-2 rounded-lg">Board ID: {boardId}</p>
        </div>
      </div>
    )
  }
  // Render no content state
  if (canvasItems.length === 0) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center" 
        style={{ 
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
        
        <div className="relative z-10 text-center p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
          <div className="text-8xl mb-6 animate-pulse">📺</div>
          <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Empty Board
          </h1>
          <p className="text-xl text-white/90 mb-4 font-medium">
            Board &quot;{boardName}&quot; is ready for content
          </p>
          <p className="text-sm text-white/70 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
            Add widgets and media in the editor to bring this board to life
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Canvas Container - Actual size with CSS transform */}
      <div
        ref={displayRef}
        key={`canvas-${lastUpdated?.getTime() || 'initial'}`}
        className="relative"
        style={{
          width: safeCanvasSize.width,
          height: safeCanvasSize.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Canvas Items */}
        {canvasItems.map((item) => {
          // Use actual coordinates - no scaling math needed
          const itemKey = `${item.id}-${lastUpdated?.getTime() || 'initial'}`

          // Render widgets
          if (item.type === 'widget') {
            return (
              <RenderWidget
                key={itemKey}
                widgetType={item.widgetType}
                x={item.x}
                y={item.y}
                width={item.width}
                height={item.height}
                mode="display"
                item={item}
                playlist={item.playlist || []}
                announcement={item.announcement || {}}
              />
            )
          }
          
          // Render media items
          return (
            <div
              key={itemKey}
              className="absolute rounded-xl overflow-hidden"
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                zIndex: item.zIndex || 0,
                transform: `rotate(${item.rotation || 0}deg)`
              }}
            >
              {item.type === 'image' && (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Silent fail
                  }}
                />
              )}
              {item.type === 'video' && (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={(e) => {
                    // Silent fail
                  }}
                />
              )}
              {item.type === 'text' && (
                <div
                  className="w-full h-full flex items-center justify-center p-2"
                  style={{
                    color: item.color || '#000000',
                    fontSize: `${item.fontSize || 24}px`,
                    fontFamily: item.fontFamily || 'Arial',
                    fontWeight: item.fontWeight || 'normal',
                    textAlign: item.textAlign || 'center',
                    backgroundColor: item.backgroundColor || 'transparent'
                  }}
                >
                  {item.content}
                </div>
              )}
            </div>
          )
        })}



        {/* AI Detection Status Indicator */}
        {useAIMode && (
          <div className="absolute top-6 left-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 backdrop-blur-sm z-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>AI: {personDetection.personCount} {personDetection.personCount === 1 ? 'person' : 'people'}</span>
            {personDetection.personCount >= (adSettings.personThreshold || 1) && (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            )}
          </div>
        )}

        {/* Connection status indicators */}
        {connectionStatus === 'updated' && (
          <div className="absolute top-6 right-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 backdrop-blur-sm z-50 flex items-center gap-2 animate-in fade-in duration-300">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Content Updated
          </div>
        )}

        {/* Ad settings update indicator */}
        {showAdSettingsUpdate && (
          <div className="absolute top-6 right-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 backdrop-blur-sm z-50 flex items-center gap-2 animate-in fade-in duration-300">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Settings Updated
          </div>
        )}
      </div>

      {/* Advertisement Display Overlay */}
      <AdvertisementDisplay
        boardId={boardId}
        isVisible={showAdvertisement}
        currentAdIndex={currentAdIndex}
        advertisements={advertisements}
        onAdComplete={handleAdComplete}
      />
    </div>
  )
}

export default function DisplayPage() {
  // Ensure fullscreen with no margins/padding
  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.margin = '0'
    document.documentElement.style.padding = '0'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.body.style.margin = ''
      document.body.style.padding = ''
      document.body.style.overflow = ''
      document.documentElement.style.margin = ''
      document.documentElement.style.padding = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center m-0 p-0">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading display...</p>
        </div>
      </div>
    }>
      <DisplayContent />
    </Suspense>
  )
}

"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { ClipboardList, XCircle, Search as SearchIcon } from 'lucide-react'
import { useDisplayBoard } from '../../hooks/useDisplayBoard'
import { usePersonDetection } from '../../hooks/usePersonDetection'
import { RenderWidget } from '../../components/widgets'

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
  const displayRef = useRef(null)
  const alternatingTimerRef = useRef(null)
  const isAdShowingRef = useRef(false) // Track ad state to avoid stale closures in intervals
  const currentAdIndexRef = useRef(0) // Track rotation index to avoid stale closures
  const detectionStartTimeRef = useRef(null) // Track when person detection started (for dwell time)

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

  // Keep refs in sync with state to prevent stale closures
  useEffect(() => {
    isAdShowingRef.current = showAdvertisement;
  }, [showAdvertisement])

  useEffect(() => {
    currentAdIndexRef.current = currentAdIndex;
  }, [currentAdIndex])

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
      }
    }
  }, [connectionStatus, fetchAdvertisements, fetchAdSettings]);

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

    // AI MODE: Trigger ads based on person detection
    if (useAIMode) {
      console.log(`[Display] Using AI person detection mode (threshold: ${adSettings.personThreshold})`);

      // Don't show ad initially, wait for person detection
      isAdShowingRef.current = false;
      setShowAdvertisement(false);

      // Check person count and trigger ad accordingly
      const checkAndShowAd = () => {
        if (advertisements.length === 0) {
          console.log('[Display] AI Mode: No ads available to show');
          return; // No ads to show
        }

        const detectedPeople = personDetection.personCount;
        const threshold = adSettings.personThreshold || 1;
        const isCurrentlyShowing = isAdShowingRef.current;
        const rotationIndex = currentAdIndexRef.current;
        const dwellTime = adSettings.detectionDuration || 0;

        // Check if threshold is met
        const thresholdMet = detectedPeople >= threshold;

        // Handle dwell time logic
        if (thresholdMet && !isCurrentlyShowing) {
          // Person detected and ad not showing
          if (dwellTime === 0) {
            // Instant detection - show ad immediately
            console.log(`[Display] ✅ Threshold met! Showing advertisement ${rotationIndex + 1} of ${advertisements.length} (instant)`);
            isAdShowingRef.current = true;
            setCurrentAdIndex(rotationIndex);
            setShowAdvertisement(true);
          } else {
            // Dwell time required
            if (detectionStartTimeRef.current === null) {
              // Start dwell timer
              detectionStartTimeRef.current = Date.now();
              console.log(`[Display] ⏱️ Detection started, waiting ${dwellTime}s before showing ad...`);
            } else {
              // Check elapsed time
              const elapsedSeconds = (Date.now() - detectionStartTimeRef.current) / 1000;

              if (elapsedSeconds >= dwellTime) {
                // Dwell time met - show ad
                console.log(`[Display] ✅ Dwell time met (${elapsedSeconds.toFixed(1)}s/${dwellTime}s)! Showing advertisement ${rotationIndex + 1} of ${advertisements.length}`);
                isAdShowingRef.current = true;
                setCurrentAdIndex(rotationIndex);
                setShowAdvertisement(true);
                detectionStartTimeRef.current = null; // Reset timer
              } else {
                // Still waiting
                console.log(`[Display] ⏳ Detecting... ${elapsedSeconds.toFixed(1)}s/${dwellTime}s (${detectedPeople} ${detectedPeople === 1 ? 'person' : 'people'})`);
              }
            }
          }
        }
        // Person below threshold or left
        else if (!thresholdMet && !isCurrentlyShowing) {
          // Reset dwell timer if person left
          if (detectionStartTimeRef.current !== null) {
            console.log(`[Display] 🔄 Person left, resetting dwell timer`);
            detectionStartTimeRef.current = null;
          } else {
            console.log(`[Display] ⏳ Waiting for ${threshold} ${threshold === 1 ? 'person' : 'people'} (detected: ${detectedPeople})`);
          }
        }
        // Hide ad if people leave AND ad is currently showing
        else if (!thresholdMet && isCurrentlyShowing) {
          console.log(`[Display] ⬇️ Below threshold, hiding advertisement`);
          isAdShowingRef.current = false;
          setShowAdvertisement(false);
          detectionStartTimeRef.current = null; // Reset timer
        }
        // Ad already showing and threshold still met - do nothing
        else if (thresholdMet && isCurrentlyShowing) {
          console.log(`[Display] ✓ Threshold still met, ad already showing - not re-triggering`);
        }
      };

      // Check every second while in AI mode
      const aiCheckInterval = setInterval(checkAndShowAd, 1000);

      // Run initial check immediately
      checkAndShowAd();

      return () => {
        clearInterval(aiCheckInterval);
      };
    }

    // TIMER MODE: Use traditional timer-based cycle
    console.log(`[Display] Using timer-based mode`);

    const startAlternatingCycle = () => {
      console.log('[Display] Starting new alternating cycle - showing main content first');
      isAdShowingRef.current = false;
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
        isAdShowingRef.current = true;
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
      console.log('[Display] Cleaning up cycle');
      if (alternatingTimerRef.current) {
        clearTimeout(alternatingTimerRef.current);
      }
    };
  }, [board, loading, error, advertisements.length, adSettings, useAIMode])
  // Removed unstable dependencies: currentAdIndex, personDetection.personCount, showAdvertisement
  // These are now accessed via refs to prevent constant effect re-runs

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
    console.log(`[Display] Ad completed, hiding advertisement`);
    isAdShowingRef.current = false;
    setShowAdvertisement(false);

    // Move to next ad in rotation
    const nextIndex = (currentAdIndexRef.current + 1) % advertisements.length;
    currentAdIndexRef.current = nextIndex; // Update ref for next rotation
    setCurrentAdIndex(nextIndex); // Update state for rendering

    if (nextIndex === 0) {
      console.log(`[Display] Rotation complete, looping back to first ad`);
    } else {
      console.log(`[Display] Moving to next ad in rotation: ${nextIndex + 1} of ${advertisements.length}`);
    }

    // In AI mode, the person detection will handle showing the next ad
    // In timer mode, schedule the next ad after break time
    if (!useAIMode) {
      const breakTime = (adSettings.timeBetweenAds || 60) * 1000;
      console.log(`[Display] Timer mode: Scheduling next ad in ${breakTime / 1000} seconds`);
      alternatingTimerRef.current = setTimeout(() => {
        if (advertisements.length > 0) {
          isAdShowingRef.current = true;
          setShowAdvertisement(true);
        }
      }, breakTime);
    } else {
      console.log(`[Display] AI mode: Person detection will handle next ad display (next will be ad ${nextIndex + 1})`);
    }
  }, [advertisements.length, adSettings, useAIMode])

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
      className="fixed inset-0 overflow-hidden"
      style={{ 
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Canvas Container - Now fills entire viewport */}
      <div
        ref={displayRef}
        key={`canvas-${lastUpdated?.getTime() || 'initial'}`}
        className="relative w-full h-full"
        style={{ 
          width: viewportSize.width,
          height: viewportSize.height
        }}
      >
        {/* Canvas Items */}
        {canvasItems.map((item) => {
          // Calculate scaled positions and dimensions with uniform scale
          const scaledX = item.x * scale + offset.x
          const scaledY = item.y * scale + offset.y
          const scaledWidth = item.width * scale
          const scaledHeight = item.height * scale
          
          // Create a unique key that includes lastUpdated to force re-render on updates
          const itemKey = `${item.id}-${lastUpdated?.getTime() || 'initial'}`
          
          // Render widgets
          if (item.type === 'widget') {
            return (
              <RenderWidget
                key={itemKey}
                widgetType={item.widgetType}
                x={scaledX}
                y={scaledY}
                width={scaledWidth}
                height={scaledHeight}
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
                left: scaledX,
                top: scaledY,
                width: scaledWidth,
                height: scaledHeight,
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

        {/* Connection status indicator for production */}
        {connectionStatus === 'updated' && (
          <div className="absolute top-6 right-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 backdrop-blur-sm z-50 flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Content Updated
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

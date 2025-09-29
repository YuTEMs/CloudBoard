"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ClipboardList, XCircle, Search as SearchIcon } from 'lucide-react'
import { useDisplayBoard } from '../../hooks/useDisplayBoard'
import { RenderWidget } from '../../components/widgets'
import AdvertisementDisplay from '../../components/AdvertisementDisplay'

// Widget definitions removed - now using shared widgets from ../../components/widgets

function DisplayContent() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('board')

  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Use display board hook with save-based updates
  const { board, loading, error, lastUpdated, connectionStatus } = useDisplayBoard(boardId)
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 })
  const [scaleFactors, setScaleFactors] = useState({ x: 1, y: 1 })
  const [showAdvertisement, setShowAdvertisement] = useState(false)
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [advertisements, setAdvertisements] = useState([])
  const displayRef = useRef(null)
  const alternatingTimerRef = useRef(null)

  // Extract board data from real-time hook
  const canvasItems = board?.configuration?.items || []
  const boardName = board?.name || ""
  const canvasSize = board?.configuration?.canvasSize || { width: 1920, height: 1080 }
  const backgroundImage = board?.configuration?.backgroundImage || null
  const backgroundColor = board?.configuration?.backgroundColor || "#ffffff"
  const isLoading = loading
  
  // Create safe canvas size object to avoid mutation
  const safeCanvasSize = {
    width: canvasSize?.width || 1920,
    height: canvasSize?.height || 1080
  }

  // Calculate viewport size and scale factors - Hook must be called every render
  const updateViewportSize = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    setViewportSize({ width: vw, height: vh })
    
    const scaleX = vw / safeCanvasSize.width
    const scaleY = vh / safeCanvasSize.height
    setScaleFactors({ x: scaleX, y: scaleY })
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
    if (!boardId) return;

    try {
      // Use public endpoint for display mode (no authentication required)
      const response = await fetch(`/api/advertisements/public?boardId=${boardId}`);
      if (!response.ok) {
          return;
      }

      const activeAds = await response.json();

      // Sort by creation date for consistent ordering
      const sortedAds = activeAds.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setAdvertisements(sortedAds);
    } catch (error) {
      setAdvertisements([]);
    }
  }, [boardId]);

  // Fetch advertisements when board loads and setup real-time updates
  useEffect(() => {
    if (!boardId || loading || error || !board) return;

    // Fetch advertisements on mount
    fetchAdvertisements();

    return () => {
      if (alternatingTimerRef.current) {
        clearTimeout(alternatingTimerRef.current);
      }
    };
  }, [boardId, loading, error, board, fetchAdvertisements]);

  // Listen for real-time updates via the existing SSE connection
  useEffect(() => {
    if (connectionStatus === 'updated') {
      // Board content was updated - handled by useDisplayBoard hook
    } else if (connectionStatus === 'advertisements_updated') {
      // Advertisements were updated - refetch advertisement list
      fetchAdvertisements();
    }
  }, [connectionStatus, fetchAdvertisements]);

  // Start alternating cycle when board is loaded (regardless of ads)
  useEffect(() => {
    if (loading || error) {
      return;
    }

    if (!board) {
      return;
    }


    const startAlternatingCycle = () => {
      // Start with 1 minute of main page content
      setShowAdvertisement(false);

      const showNextAd = () => {
        if (advertisements.length === 0) {
          // No ads available, schedule next check
          alternatingTimerRef.current = setTimeout(startAlternatingCycle, 60 * 1000);
          return;
        }

        setShowAdvertisement(true);
      };

      // After 1 minute, show the current ad
      alternatingTimerRef.current = setTimeout(showNextAd, 60 * 1000); // 1 minute for main page
    };

    // Initial delay, then start cycle
    alternatingTimerRef.current = setTimeout(startAlternatingCycle, 5 * 1000); // 5 second initial delay

    return () => {
      if (alternatingTimerRef.current) {
        clearTimeout(alternatingTimerRef.current);
      }
    };
  }, [board, loading, error]); // Start when board loads, not when ads change

  // Handle ad completion and cycle to next
  const handleAdComplete = useCallback(() => {
    setShowAdvertisement(false);

    // Move to next ad
    setCurrentAdIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= advertisements.length) {
        return 0; // Loop back to first ad
      }
      return nextIndex;
    });
    alternatingTimerRef.current = setTimeout(() => {
      if (advertisements.length > 0) {
        setShowAdvertisement(true);
      }
    }, 60 * 1000); // 1 minute break
  }, [advertisements.length])

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
          // Calculate scaled positions and dimensions
          const scaledX = item.x * scaleFactors.x
          const scaledY = item.y * scaleFactors.y
          const scaledWidth = item.width * scaleFactors.x
          const scaledHeight = item.height * scaleFactors.y
          
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

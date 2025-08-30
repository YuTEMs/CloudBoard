"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDisplayBoard } from '../../hooks/useDisplayBoard'

// Widget Components for Display
const TimeWidget = ({ x, y, width, height }) => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className="absolute bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-center shadow-xl"
      style={{ left: x, top: y, width, height }}
    >
      <div className="text-center">
        <div 
          className="font-black tracking-tight"
          style={{ fontSize: Math.min(width * 0.08, height * 0.3) }}
        >
          {time.toLocaleTimeString()}
        </div>
        <div 
          className="opacity-75 font-medium"
          style={{ fontSize: Math.min(width * 0.05, height * 0.2) }}
        >
          {time.toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}

const WeatherWidget = ({ x, y, width, height }) => {
  const [weather] = useState({
    temp: 22,
    condition: 'Sunny',
    humidity: 65
  })

  return (
    <div
      className="absolute bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-4 shadow-xl"
      style={{ left: x, top: y, width, height }}
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex-1">
          <div style={{ fontSize: Math.min(width * 0.12, height * 0.3) }} className="font-black mb-1">
            {weather.temp}°C
          </div>
          <div style={{ fontSize: Math.min(width * 0.06, height * 0.15) }} className="font-medium opacity-90">
            {weather.condition}
          </div>
          <div style={{ fontSize: Math.min(width * 0.04, height * 0.12) }} className="opacity-75 mt-1">
            Humidity: {weather.humidity}%
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div style={{ fontSize: Math.min(width * 0.15, height * 0.4) }}>☀️</div>
        </div>
      </div>
    </div>
  )
}

const AnnouncementWidget = ({ x, y, width, height, announcement = {} }) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Check if announcement should be displayed based on current date and time
  const shouldShow = () => {
    if (!announcement.isActive) return false
    
    const now = currentTime
    // Get current date in YYYY-MM-DD format, accounting for timezone
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const currentDateStr = `${year}-${month}-${day}`
    const currentTimeStr = now.toTimeString().slice(0, 5) // HH:MM format
    
    // Check if current date is within the announcement date range
    const isWithinDateRange = currentDateStr >= announcement.startDate && currentDateStr <= announcement.endDate
    const isWithinTimeRange = currentTimeStr >= announcement.startTime && currentTimeStr <= announcement.endTime
    
    return isWithinDateRange && isWithinTimeRange
  }

  // Don't render if announcement shouldn't show or has no text
  if (!shouldShow() || !announcement.text) {
    return null
  }

  return (
    <div
      className="absolute bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-xl p-4 overflow-hidden shadow-xl border border-white/20"
      style={{ left: x, top: y, width, height }}
    >
      <div className="flex flex-col h-full relative">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
        
        {/* Status indicator */}
        <div className="flex justify-between items-center mb-3 relative z-10">
          <div className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/30 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            LIVE ANNOUNCEMENT
          </div>
        </div>
        
        {/* Announcement text */}
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div 
            className="text-center font-black break-words drop-shadow-lg"
            style={{ 
              fontSize: Math.min(width * 0.06, height * 0.15, 24),
              lineHeight: 1.3,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {announcement.text}
          </div>
        </div>
      </div>
    </div>
  )
}

const SlideshowWidget = ({ x, y, width, height, playlist = [] }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [lastPlaylistState, setLastPlaylistState] = useState('')
  
  // Reset slide index when playlist changes significantly
  useEffect(() => {
    const currentPlaylistState = JSON.stringify(playlist)
    
    // If playlist content changed, reset to beginning
    if (currentPlaylistState !== lastPlaylistState) {
      setCurrentSlideIndex(0)
      setLastPlaylistState(currentPlaylistState)
    }
  }, [playlist, lastPlaylistState])

  // Auto-advance slides
  useEffect(() => {
    if (playlist.length === 0) return

    const currentSlide = playlist[currentSlideIndex]
    if (!currentSlide) {
      setCurrentSlideIndex(0)
      return
    }

    const duration = (currentSlide.duration || 5) * 1000
    const timer = setTimeout(() => {
      setCurrentSlideIndex((prevIndex) => 
        (prevIndex + 1) % playlist.length
      )
    }, duration)

    return () => clearTimeout(timer)
  }, [currentSlideIndex, playlist])

  if (playlist.length === 0) {
    return (
      <div
        className="absolute bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-xl border border-gray-700"
        style={{ left: x, top: y, width, height }}
      >
        <div className="text-white text-center opacity-75">
          <div className="text-6xl mb-4">🖼️</div>
          <p 
            className="font-medium"
            style={{ fontSize: Math.min(width * 0.04, height * 0.1, 16) }}
          >
            No slides available
          </p>
        </div>
      </div>
    )
  }

  const currentSlide = playlist[currentSlideIndex]
  if (!currentSlide) return null

  return (
    <div
      className="absolute rounded-xl overflow-hidden bg-black shadow-xl border border-gray-700"
      style={{ left: x, top: y, width, height }}
    >
      {currentSlide.type === 'image' ? (
        <img
          src={currentSlide.url}
          alt={currentSlide.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Silent fail
          }}
        />
      ) : (
        <video
          src={currentSlide.url}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop={false}
          playsInline
          onError={(e) => {
            // Silent fail
          }}
        />
      )}
      
      {/* Slide indicators */}
      <div className="absolute bottom-2 left-2 right-2 flex justify-center space-x-1">
        {playlist.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentSlideIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-25">
        <div
          className="h-full bg-white animate-pulse"
          style={{
            animation: `slideProgress ${(currentSlide.duration || 5)}s linear`
          }}
        />
      </div>

      <style jsx>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}

function DisplayContent() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('board')
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Use display board hook with save-based updates
  const { board, loading, error, lastUpdated, connectionStatus } = useDisplayBoard(boardId)
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 })
  const [scaleFactors, setScaleFactors] = useState({ x: 1, y: 1 })
  const displayRef = useRef(null)

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
            <span className="text-3xl">📋</span>
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
            <span className="text-3xl">❌</span>
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
            <span className="text-3xl">🔍</span>
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
        
        <div className="relative z-10 text-center p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
          <div className="text-8xl mb-6 animate-pulse">📺</div>
          <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Empty Board
          </h1>
          <p className="text-xl text-white/90 mb-4 font-medium">
            Board "{boardName}" is ready for content
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
            if (item.widgetType === 'time') {
              return (
                <TimeWidget
                  key={itemKey}
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                />
              )
            } else if (item.widgetType === 'weather') {
              return (
                <WeatherWidget
                  key={itemKey}
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                />
              )
            } else if (item.widgetType === 'slideshow') {
              return (
                <SlideshowWidget
                  key={`${itemKey}-playlist-${(item.playlist || []).length}-${JSON.stringify(item.playlist || []).slice(0, 50)}`}
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                  playlist={item.playlist || []}
                />
              )
            } else if (item.widgetType === 'announcement') {
              return (
                <AnnouncementWidget
                  key={`${itemKey}-${JSON.stringify(item.announcement || {}).slice(0, 50)}`}
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                  announcement={item.announcement || {}}
                />
              )
            }
          }
          
          // Render media items
          return (
            <div
              key={itemKey}
              className="absolute rounded-xl overflow-hidden shadow-lg"
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
          <div className="absolute top-6 right-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-white/20 backdrop-blur-sm z-50 flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Content Updated
          </div>
        )}
      </div>
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

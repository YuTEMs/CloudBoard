"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
// No longer need external imports - app uses localStorage

// Widget Components for Display
const TimeWidget = ({ x, y, width, height }) => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className="absolute bg-black text-white rounded-lg flex items-center justify-center font-bold text-center"
      style={{ left: x, top: y, width, height }}
    >
      <div>
        <div style={{ fontSize: Math.min(width * 0.08, height * 0.3) }}>
          {time.toLocaleTimeString()}
        </div>
        <div style={{ fontSize: Math.min(width * 0.05, height * 0.2), opacity: 0.75 }}>
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
      className="absolute bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg p-4"
      style={{ left: x, top: y, width, height }}
    >
      <div className="flex items-center justify-between h-full">
        <div>
          <div style={{ fontSize: Math.min(width * 0.12, height * 0.3) }} className="font-bold">
            {weather.temp}°C
          </div>
          <div style={{ fontSize: Math.min(width * 0.06, height * 0.15) }}>
            {weather.condition}
          </div>
          <div style={{ fontSize: Math.min(width * 0.04, height * 0.12), opacity: 0.75 }}>
            Humidity: {weather.humidity}%
          </div>
        </div>
        <div style={{ fontSize: Math.min(width * 0.15, height * 0.4) }}>☀️</div>
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
      className="absolute bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-4 overflow-hidden shadow-lg animate-pulse"
      style={{ left: x, top: y, width, height }}
    >
      <div className="flex flex-col h-full">
        {/* Status indicator */}
        <div className="flex justify-between items-center mb-2">
          <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-600">
            LIVE
          </div>
        </div>
        
        {/* Announcement text */}
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="text-center font-bold break-words"
            style={{ 
              fontSize: Math.min(width * 0.06, height * 0.15, 24),
              lineHeight: 1.2
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
  const [lastPlaylistLength, setLastPlaylistLength] = useState(0)
  
  // Only reset slide index when playlist actually changes (not just props update)
  useEffect(() => {
    // If playlist length changed significantly, reset to beginning
    if (playlist.length !== lastPlaylistLength) {
      if (playlist.length === 0 || currentSlideIndex >= playlist.length) {
        setCurrentSlideIndex(0)
      }
      setLastPlaylistLength(playlist.length)
    }
  }, [playlist.length, currentSlideIndex, lastPlaylistLength])

  // Auto-advance slides - more resilient to frequent props updates
  useEffect(() => {
    if (playlist.length === 0) return

    const currentSlide = playlist[currentSlideIndex]
    if (!currentSlide) {
      // If current slide doesn't exist, reset to first slide
      setCurrentSlideIndex(0)
      return
    }

    const duration = Math.max(1000, (currentSlide.duration || 5) * 1000) // Ensure minimum 1 second
    
    const timer = setTimeout(() => {
      setCurrentSlideIndex((prevIndex) => {
        // For single slide, stay on same slide
        if (playlist.length === 1) return 0
        
        // For multiple slides, advance with proper looping
        const nextIndex = prevIndex + 1
        return nextIndex >= playlist.length ? 0 : nextIndex
      })
    }, duration)
    
    return () => clearTimeout(timer)
  }, [currentSlideIndex, playlist.length]) // Only depend on currentSlideIndex and playlist.length, not full playlist

  // Get current slide with fallback to ensure we always have a valid slide when playlist exists
  const currentSlide = playlist.length > 0 ? playlist[Math.min(currentSlideIndex, playlist.length - 1)] : null

  if (!currentSlide || playlist.length === 0) {
    return (
      <div
        className="absolute bg-gray-900 text-white rounded-lg flex items-center justify-center"
        style={{ left: x, top: y, width, height }}
      >
        <div className="text-center opacity-50">
          <div style={{ fontSize: Math.min(width * 0.08, 24) }}>📺</div>
          <div style={{ fontSize: Math.min(width * 0.04, 12) }}>Empty Slideshow</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute bg-black rounded-lg overflow-hidden"
      style={{ left: x, top: y, width, height }}
    >
      {currentSlide.type === 'image' && (
        <img
          src={currentSlide.url}
          alt={currentSlide.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error('Slideshow image failed to load:', currentSlide.url)
          }}
        />
      )}
      {currentSlide.type === 'video' && (
        <video
          key={currentSlide.id} // Force re-render when slide changes
          src={currentSlide.url}
          className="w-full h-full object-contain"
          autoPlay
          muted
          playsInline
          onError={(e) => {
            console.error('Slideshow video failed to load:', currentSlide.url)
          }}
        />
      )}
      
      {/* Slide indicator */}
      {playlist.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          {currentSlideIndex + 1}/{playlist.length}
        </div>
      )}
    </div>
  )
}

function DisplayContent() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('board')
  
  const [canvasItems, setCanvasItems] = useState([])
  const [boardName, setBoardName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 })
  const [backgroundImage, setBackgroundImage] = useState(null)
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 })
  const [scaleFactors, setScaleFactors] = useState({ x: 1, y: 1 })
  
  const displayRef = useRef(null)

  // Load board data from localStorage
  useEffect(() => {
    if (!boardId) {
      setError('No board ID provided. Please check the URL.')
      setIsLoading(false)
      return
    }

    try {
      const savedBoards = localStorage.getItem('smartBoards')
      if (savedBoards) {
        const boards = JSON.parse(savedBoards)
        const currentBoard = boards.find(board => board.id === boardId)
        
        if (currentBoard) {
          setBoardName(currentBoard.name)
          const items = currentBoard.configuration?.items || []
          setCanvasItems(items)
          setCanvasSize(currentBoard.configuration?.canvasSize || { width: 1920, height: 1080 })
          setBackgroundImage(currentBoard.configuration?.backgroundImage || null)
          setBackgroundColor(currentBoard.configuration?.backgroundColor || "#ffffff")
          setError(null)
        } else {
          setError('Board not found. Please check the board ID.')
        }
      } else {
        setError('No boards found. Please create a board first.')
      }
    } catch (error) {
      console.error('Failed to load board:', error)
      setError('Failed to load board configuration.')
    } finally {
      setIsLoading(false)
    }
  }, [boardId])

  // Calculate viewport size and scale factors
  const updateViewportSize = useCallback(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    setViewportSize({ width: vw, height: vh })
    
    // Calculate scale factors to fill entire screen
    const scaleX = vw / canvasSize.width
    const scaleY = vh / canvasSize.height
    setScaleFactors({ x: scaleX, y: scaleY })
  }, [canvasSize.width, canvasSize.height])

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
  }, [canvasSize, updateViewportSize])

  // Listen for localStorage changes (when board is updated)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'smartBoards' && boardId) {
        try {
          const boards = JSON.parse(e.newValue || '[]')
          const currentBoard = boards.find(board => board.id === boardId)
          if (currentBoard) {
            setCanvasItems(currentBoard.configuration?.items || [])
            setCanvasSize(currentBoard.configuration?.canvasSize || { width: 1920, height: 1080 })
            setBackgroundImage(currentBoard.configuration?.backgroundImage || null)
            setBackgroundColor(currentBoard.configuration?.backgroundColor || "#ffffff")
          }
        } catch (error) {
          console.error('Failed to process storage update:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [boardId])

  // Polling for updates when same window (localStorage events don't fire in same window)
  useEffect(() => {
    if (!boardId) return

    const pollForUpdates = setInterval(() => {
      try {
        const savedBoards = localStorage.getItem('smartBoards')
        if (savedBoards) {
          const boards = JSON.parse(savedBoards)
          const currentBoard = boards.find(board => board.id === boardId)
          if (currentBoard) {
            const newItems = currentBoard.configuration?.items || []
            const newCanvasSize = currentBoard.configuration?.canvasSize || { width: 1920, height: 1080 }
            const newBackgroundImage = currentBoard.configuration?.backgroundImage || null
            const newBackgroundColor = currentBoard.configuration?.backgroundColor || "#ffffff"
            
            // Only update if something actually changed to avoid disrupting slideshow timing
            const itemsChanged = JSON.stringify(newItems) !== JSON.stringify(canvasItems)
            const sizeChanged = JSON.stringify(newCanvasSize) !== JSON.stringify(canvasSize)
            const backgroundImageChanged = newBackgroundImage !== backgroundImage
            const backgroundColorChanged = newBackgroundColor !== backgroundColor
            
            if (itemsChanged) {
              setCanvasItems(newItems)
            }
            if (sizeChanged) {
              setCanvasSize(newCanvasSize)
            }
            if (backgroundImageChanged) {
              setBackgroundImage(newBackgroundImage)
            }
            if (backgroundColorChanged) {
              setBackgroundColor(newBackgroundColor)
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll for updates:', error)
      }
    }, 2000) // Poll every 2 seconds (reduced frequency to minimize disruption)

    return () => clearInterval(pollForUpdates)
  }, [boardId, canvasItems, canvasSize, backgroundImage, backgroundColor])

  // Render loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading board...</p>
          <p className="text-sm text-gray-400 mt-2">Board: {boardId}</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠</div>
          <h1 className="text-2xl font-bold mb-2">Display Error</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-400">Board: {boardId}</p>
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
        <div className="text-center" style={{ color: backgroundColor === '#ffffff' ? '#333' : '#fff' }}>
          <div className="text-6xl mb-4" style={{ opacity: 0.5 }}>📺</div>
          <h1 className="text-2xl font-bold mb-2">Empty Board</h1>
          <p className="mb-4" style={{ opacity: 0.75 }}>Board "{boardName}" has no content yet</p>
          <p className="text-sm" style={{ opacity: 0.5 }}>Add content in the editor to see it here</p>
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
          
          // Render widgets
          if (item.type === 'widget') {
            if (item.widgetType === 'time') {
              return (
                <TimeWidget
                  key={item.id}
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                />
              )
            } else if (item.widgetType === 'weather') {
              return (
                <WeatherWidget
                  key={item.id}
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                />
              )
            } else if (item.widgetType === 'slideshow') {
              return (
                <SlideshowWidget
                  key={`${item.id}-${(item.playlist || []).length}`}
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
                  key={item.id}
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
              key={item.id}
              className="absolute rounded-lg overflow-hidden"
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
                    console.error('Image failed to load:', item.url)
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
                    console.error('Video failed to load:', item.url)
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Board info (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-xs">
            {boardName} • {canvasItems.length} items • {viewportSize.width}x{viewportSize.height} • Scale: {scaleFactors.x.toFixed(2)}x{scaleFactors.y.toFixed(2)}
          </div>
        </div>
      )}
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

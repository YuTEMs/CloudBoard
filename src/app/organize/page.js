"use client"

import { Button, Card, CardBody, Input, Slider } from "@heroui/react"
import {
  Plus,
  Save,
  Upload,
  ImageIcon,
  Video,
  Trash2,
  Move,
  RotateCcw,
  Clock,
  CloudSun,
  Type,
  Settings,
  Play,
  ChevronUp,
  ChevronDown,
  Pause,
  Megaphone
} from "lucide-react"
import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AppHeader } from "../../components/layout/app-hearder"

// Widget Components
const TimeWidget = ({ x, y, width, height, isSelected, item, onDragStart, setSelectedItem, onResizeStart }) => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      draggable
      className={`absolute bg-black text-white rounded-lg flex items-center justify-center font-bold text-center border-2 ${
        isSelected ? 'cursor-move border-blue-500 shadow-lg' : 'cursor-move border-transparent hover:border-gray-300 hover:shadow-md transition-all duration-150'
      }`}
      style={{ 
        left: x, 
        top: y, 
        width, 
        height
      }}
      onDragStart={(e) => onDragStart(e, item)}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedItem(item)
      }}
    >
      <div>
        <div style={{ fontSize: Math.min(width * 0.08, height * 0.3, 24) }}>
          {time.toLocaleTimeString()}
        </div>
        <div style={{ fontSize: Math.min(width * 0.05, height * 0.2, 14), opacity: 0.75 }}>
          {time.toLocaleDateString()}
        </div>
      </div>
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'nw')}
          ></div>
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'ne')}
          ></div>
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'sw')}
          ></div>
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'se')}
          ></div>
        </>
      )}
    </div>
  )
}

const WeatherWidget = ({ x, y, width, height, isSelected, item, onDragStart, setSelectedItem, onResizeStart }) => {
  const [weather] = useState({
    temp: 22,
    condition: 'Sunny',
    humidity: 65
  })

  return (
    <div
      draggable
      className={`absolute bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg p-4 border-2 ${
        isSelected ? 'cursor-move border-blue-500 shadow-lg' : 'cursor-move border-transparent hover:border-gray-300 hover:shadow-md transition-all duration-150'
      }`}
      style={{ 
        left: x, 
        top: y, 
        width, 
        height
      }}
      onDragStart={(e) => onDragStart(e, item)}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedItem(item)
      }}
    >
      <div className="flex items-center justify-between h-full">
        <div>
          <div style={{ fontSize: Math.min(width * 0.12, height * 0.3, 32) }} className="font-bold">
            {weather.temp}°C
          </div>
          <div style={{ fontSize: Math.min(width * 0.06, height * 0.15, 16) }}>
            {weather.condition}
          </div>
          <div style={{ fontSize: Math.min(width * 0.04, height * 0.12, 12), opacity: 0.75 }}>
            Humidity: {weather.humidity}%
          </div>
        </div>
        <CloudSun style={{ width: Math.min(width * 0.15, height * 0.4, 32), height: Math.min(width * 0.15, height * 0.4, 32) }} />
      </div>
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'nw')}
          ></div>
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'ne')}
          ></div>
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'sw')}
          ></div>
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'se')}
          ></div>
        </>
      )}
    </div>
  )
}

const SlideshowWidget = ({ x, y, width, height, isSelected, item, onDragStart, setSelectedItem, onResizeStart, onAddToSlideshow, uploadedFiles = [] }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true) // Auto-play by default
  
  // Use the playlist directly from props instead of local state to avoid sync issues
  const playlist = item.playlist || []

  const timelineHeight = Math.min(height * 0.3, 60)
  const previewHeight = height - timelineHeight

  // Reset slide index if current index is out of bounds when playlist changes
  useEffect(() => {
    if (playlist.length > 0 && currentSlideIndex >= playlist.length) {
      setCurrentSlideIndex(0)
    }
  }, [playlist.length, currentSlideIndex])

  // Auto-advance slides when playing - simplified and more reliable
  useEffect(() => {
    if (!isPlaying || playlist.length === 0) return

    const currentSlide = playlist[currentSlideIndex]
    if (!currentSlide) return

    const duration = Math.max(1, currentSlide.duration || 5) * 1000 // Ensure minimum 1 second
    
    const timer = setTimeout(() => {
      setCurrentSlideIndex((prevIndex) => {
        // For single slide, just stay on the same slide (no advancement)
        if (playlist.length === 1) return 0
        
        // For multiple slides, loop to the beginning when at the end
        const nextIndex = prevIndex + 1
        return nextIndex >= playlist.length ? 0 : nextIndex
      })
    }, duration)
    
    return () => clearTimeout(timer)
  }, [isPlaying, currentSlideIndex, playlist])

  // Auto-start playing when there are slides (no need to check for multiple slides)
  useEffect(() => {
    if (playlist.length > 0) {
      setIsPlaying(true)
    }
  }, [playlist.length])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const draggedData = e.dataTransfer.getData("application/json")
    if (draggedData) {
      try {
        const draggedItem = JSON.parse(draggedData)
        if (draggedItem.type === 'image' || draggedItem.type === 'video') {
          const newSlide = {
            id: `slide_${Date.now()}_${Math.random()}`,
            assetId: draggedItem.id,
            type: draggedItem.type,
            name: draggedItem.name,
            url: draggedItem.url,
            duration: 5,
            order: playlist.length + 1
          }
          const newPlaylist = [...playlist, newSlide]
          if (onAddToSlideshow) {
            onAddToSlideshow(item.id, newPlaylist)
          }
        }
      } catch (error) {
        console.error('Failed to parse dropped item:', error)
      }
    }
  }, [playlist, onAddToSlideshow, item.id])

  const removeSlide = (slideId) => {
    const newPlaylist = playlist.filter(slide => slide.id !== slideId)
    // Adjust current slide index if needed
    if (currentSlideIndex >= newPlaylist.length && newPlaylist.length > 0) {
      setCurrentSlideIndex(newPlaylist.length - 1)
    } else if (newPlaylist.length === 0) {
      setCurrentSlideIndex(0)
    }
    if (onAddToSlideshow) {
      onAddToSlideshow(item.id, newPlaylist)
    }
  }

  const updateSlideDuration = (slideId, newDuration) => {
    const updatedPlaylist = playlist.map(slide =>
      slide.id === slideId ? { ...slide, duration: Math.max(1, parseInt(newDuration) || 5) } : slide
    )
    if (onAddToSlideshow) {
      onAddToSlideshow(item.id, updatedPlaylist)
    }
  }

  const currentSlide = playlist[currentSlideIndex]

  return (
    <div
      draggable
      className={`absolute bg-gray-900 text-white rounded-lg border-2 ${
        isSelected ? 'cursor-move border-blue-500 shadow-lg' : 'cursor-move border-transparent hover:border-gray-300 hover:shadow-md transition-all duration-150'
      }`}
      style={{ 
        left: x, 
        top: y, 
        width, 
        height
      }}
      onDragStart={(e) => onDragStart(e, item)}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedItem(item)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Preview Area */}
      <div className="relative" style={{ height: previewHeight }}>
        {currentSlide ? (
          <div className="w-full h-full flex items-center justify-center bg-black rounded-t-lg overflow-hidden">
            {currentSlide.type === 'image' && (
              <img
                src={currentSlide.url}
                alt={currentSlide.name}
                className="w-full h-full object-contain"
              />
            )}
            {currentSlide.type === 'video' && (
              <video
                key={currentSlide.id} // Force re-render when slide changes
                src={currentSlide.url}
                className="w-full h-full object-contain"
                muted
                playsInline
                onError={(e) => {
                  console.error('Video failed to load:', currentSlide.url)
                }}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-t-lg">
            <div className="text-center">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-60" />
              <p style={{ fontSize: Math.min(width * 0.04, 12) }}>
                Drop files here to create slideshow
              </p>
            </div>
          </div>
        )}

        {/* Play Controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={() => setIsPlaying(!isPlaying)}
            className="bg-black bg-opacity-50 hover:bg-opacity-75"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
        </div>

        {/* Slide Info */}
        {currentSlide && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 rounded px-2 py-1">
            <span style={{ fontSize: Math.min(width * 0.03, 10) }}>
              {currentSlideIndex + 1}/{playlist.length} • {currentSlide.duration}s
            </span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="border-t border-gray-700 p-1" style={{ height: timelineHeight }}>
        <div className="flex gap-1 overflow-x-auto">
          {playlist.map((slide, index) => (
            <div
              key={slide.id}
              className={`flex-shrink-0 border rounded cursor-pointer ${
                currentSlideIndex === index
                  ? 'border-blue-500 bg-blue-900'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              style={{ width: Math.max(width * 0.15, 30), height: timelineHeight - 8 }}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentSlideIndex(index)
              }}
            >
              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded text-xs">
                {slide.type === 'image' && (
                  <img
                    src={slide.url}
                    alt={slide.name}
                    className="w-full h-full object-contain"
                  />
                )}
                {slide.type === 'video' && (
                  <video
                    key={slide.id}
                    src={slide.url}
                    className="w-full h-full object-contain"
                    muted
                    playsInline
                    onError={() => {
                      // Fallback to icon if video fails to load
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          
          {/* Add slide placeholder */}
          <div
            className="flex-shrink-0 border-2 border-dashed border-gray-600 rounded flex items-center justify-center cursor-pointer hover:border-gray-400"
            style={{ width: Math.max(width * 0.15, 30), height: timelineHeight - 8 }}
          >
            <Plus className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'nw')}
          ></div>
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'ne')}
          ></div>
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'sw')}
          ></div>
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'se')}
          ></div>
        </>
      )}
    </div>
  )
}

const AnnouncementWidget = ({ x, y, width, height, isSelected, item, onDragStart, setSelectedItem, onResizeStart }) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Get current date in YYYY-MM-DD format, accounting for timezone
  const getCurrentDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const announcement = item.announcement || {
    text: "",
    startDate: getCurrentDate(),
    endDate: getCurrentDate(),
    startTime: "09:00",
    endTime: "17:00",
    isActive: true
  }

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

  const isShowing = shouldShow()

  return (
    <div
      draggable
      className={`absolute bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-4 border-2 overflow-hidden ${
        isSelected ? 'cursor-move border-blue-500 shadow-lg' : 'cursor-move border-transparent hover:border-gray-300 hover:shadow-md transition-all duration-150'
      }`}
      style={{ 
        left: x, 
        top: y, 
        width, 
        height,
        opacity: isShowing ? 1 : 0.5
      }}
      onDragStart={(e) => onDragStart(e, item)}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedItem(item)
      }}
    >
      <div className="flex flex-col h-full">
        {/* Status indicator */}
        <div className="flex justify-between items-center mb-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isShowing ? 'bg-green-600' : 'bg-gray-600'
          }`}>
            {isShowing ? 'LIVE' : 'SCHEDULED'}
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
            {announcement.text || "Enter announcement text in edit panel"}
          </div>
        </div>

      </div>
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'nw')}
          ></div>
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'ne')}
          ></div>
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'sw')}
          ></div>
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'se')}
          ></div>
        </>
      )}
    </div>
  )
}

function OrganizePageContent() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('board')
  
  // Canvas and board state
  const [canvasItems, setCanvasItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [draggedItem, setDraggedItem] = useState(null)
  const [canvasSize] = useState({ width: 1920, height: 1080 })
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [boardName, setBoardName] = useState("")
  const [backgroundImage, setBackgroundImage] = useState(null)
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [isUploading, setIsUploading] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null)
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 })

  
  // File upload refs
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const backgroundInputRef = useRef(null)
  const canvasRef = useRef(null)
  
  // Slideshow-specific upload refs (independent)
  const slideshowImageInputRef = useRef(null)
  const slideshowVideoInputRef = useRef(null)

  // Load board data from localStorage
  useEffect(() => {
    if (boardId) {
      const savedBoards = localStorage.getItem('smartBoards')
      if (savedBoards) {
        const boards = JSON.parse(savedBoards)
        const currentBoard = boards.find(board => board.id === boardId)
        if (currentBoard) {
          setBoardName(currentBoard.name)
          setCanvasItems(currentBoard.configuration?.items || [])
          setBackgroundImage(currentBoard.configuration?.backgroundImage || null)
          setBackgroundColor(currentBoard.configuration?.backgroundColor || "#ffffff")
        }
      }
    }
  }, [boardId])

  // Save board configuration
  const saveBoard = useCallback(() => {
    if (!boardId) return

    const savedBoards = localStorage.getItem('smartBoards')
    if (savedBoards) {
      const boards = JSON.parse(savedBoards)
      const boardIndex = boards.findIndex(board => board.id === boardId)
      if (boardIndex !== -1) {
        boards[boardIndex].configuration = {
          items: canvasItems,
          canvasSize,
          backgroundImage,
          backgroundColor
        }
        boards[boardIndex].updatedAt = new Date().toISOString()
        localStorage.setItem('smartBoards', JSON.stringify(boards))
      }
    }
  }, [boardId, canvasItems, canvasSize, backgroundImage, backgroundColor])

  // Widget size configurations
  const widgetSizes = {
    time: { width: 200, height: 100 },
    weather: { width: 250, height: 150 },
    slideshow: { width: 480, height: 270 }, // 16:9 aspect ratio
    announcement: { width: 400, height: 150 }
  }

  // HTML5 Drag and Drop handlers (like proto.js)
  const handleDragStart = (e, item) => {
    // Prevent drag when resizing
    if (isResizing) {
      e.preventDefault()
      return
    }
    setDraggedItem(item)
    setSelectedItem(item)
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = 0.6
    const offsetX = (e.clientX - rect.left) / scale
    const offsetY = (e.clientY - rect.top) / scale
    e.dataTransfer.setData("text/plain", JSON.stringify({ offsetX, offsetY }))
  }

  const handleCanvasDrop = (e) => {
    e.preventDefault()
    if (!draggedItem) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const dropData = JSON.parse(e.dataTransfer.getData("text/plain"))
    const scale = 0.6

    const newX = (e.clientX - canvasRect.left) / scale - dropData.offsetX
    const newY = (e.clientY - canvasRect.top) / scale - dropData.offsetY

    // Apply bounds checking
    const boundedX = Math.max(0, Math.min(newX, canvasSize.width - draggedItem.width))
    const boundedY = Math.max(0, Math.min(newY, canvasSize.height - draggedItem.height))

    setCanvasItems(items =>
      items.map(item =>
        item.id === draggedItem.id
          ? { ...item, x: boundedX, y: boundedY }
          : item
      )
    )
    setDraggedItem(null)
  }

  // Resize handlers
  const handleResizeStart = (e, handle) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStartPos({ x: e.clientX, y: e.clientY })
    setResizeStartSize({ 
      width: selectedItem.width, 
      height: selectedItem.height,
      x: selectedItem.x,
      y: selectedItem.y
    })
  }

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !selectedItem || !resizeHandle) return

    e.preventDefault()

    const deltaX = e.clientX - resizeStartPos.x
    const deltaY = e.clientY - resizeStartPos.y
    const scale = 0.6

    // Scale deltas to canvas scale
    const scaledDeltaX = deltaX / scale
    const scaledDeltaY = deltaY / scale

    let newWidth = resizeStartSize.width
    let newHeight = resizeStartSize.height
    let newX = resizeStartSize.x
    let newY = resizeStartSize.y

    // Calculate new dimensions based on resize handle
    switch (resizeHandle) {
      case 'nw': // Top-left
        newWidth = Math.max(50, resizeStartSize.width - scaledDeltaX)
        newHeight = Math.max(50, resizeStartSize.height - scaledDeltaY)
        newX = resizeStartSize.x + (resizeStartSize.width - newWidth)
        newY = resizeStartSize.y + (resizeStartSize.height - newHeight)
        break
      case 'ne': // Top-right
        newWidth = Math.max(50, resizeStartSize.width + scaledDeltaX)
        newHeight = Math.max(50, resizeStartSize.height - scaledDeltaY)
        newY = resizeStartSize.y + (resizeStartSize.height - newHeight)
        break
      case 'sw': // Bottom-left
        newWidth = Math.max(50, resizeStartSize.width - scaledDeltaX)
        newHeight = Math.max(50, resizeStartSize.height + scaledDeltaY)
        newX = resizeStartSize.x + (resizeStartSize.width - newWidth)
        break
      case 'se': // Bottom-right
        newWidth = Math.max(50, resizeStartSize.width + scaledDeltaX)
        newHeight = Math.max(50, resizeStartSize.height + scaledDeltaY)
        break
    }

    // Apply bounds checking
    newX = Math.max(0, Math.min(newX, canvasSize.width - newWidth))
    newY = Math.max(0, Math.min(newY, canvasSize.height - newHeight))

    // For slideshow widgets, maintain 16:9 aspect ratio
    if (selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow') {
      const aspectRatio = 16 / 9
      // Prioritize width changes for better UX
      if (Math.abs(scaledDeltaX) >= Math.abs(scaledDeltaY)) {
        newHeight = newWidth / aspectRatio
      } else {
        newWidth = newHeight * aspectRatio
      }
      
      // Recalculate position based on new dimensions
      switch (resizeHandle) {
        case 'nw':
          newX = resizeStartSize.x + (resizeStartSize.width - newWidth)
          newY = resizeStartSize.y + (resizeStartSize.height - newHeight)
          break
        case 'ne':
          newY = resizeStartSize.y + (resizeStartSize.height - newHeight)
          break
        case 'sw':
          newX = resizeStartSize.x + (resizeStartSize.width - newWidth)
          break
        case 'se':
          // No position adjustment needed
          break
      }
      
      // Apply bounds checking again with new dimensions
      newX = Math.max(0, Math.min(newX, canvasSize.width - newWidth))
      newY = Math.max(0, Math.min(newY, canvasSize.height - newHeight))
    }

    // Update state directly without re-creating the array unnecessarily
    setCanvasItems(items => {
      const updatedItems = [...items]
      const itemIndex = updatedItems.findIndex(item => item.id === selectedItem.id)
      if (itemIndex !== -1) {
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY
        }
      }
      return updatedItems
    })
  }, [isResizing, selectedItem, resizeHandle, resizeStartPos, resizeStartSize, canvasSize])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Add global mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      // Prevent text selection during resize for better performance
      document.body.style.userSelect = 'none'
      
      document.addEventListener('mousemove', handleResizeMove, { passive: false })
      document.addEventListener('mouseup', handleResizeEnd)
      
      return () => {
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Keyboard deletion
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't delete if user is typing in input fields
      const isTypingInInput = e.target.tagName === 'INPUT' || 
                             e.target.tagName === 'TEXTAREA' || 
                             e.target.contentEditable === 'true' ||
                             e.target.closest('[data-announcement-panel]') ||
                             e.target.closest('[data-slideshow-panel]')
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItem && !isTypingInInput) {
        e.preventDefault()
        deleteSelectedItem()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  // Handle file upload
  const handleFileUpload = async (files, type) => {
    setIsUploading(true)
    try {
      const newFiles = await Promise.all(
        Array.from(files).map(async (file) => {
          // Convert file to base64 data URL for persistence
          const dataURL = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsDataURL(file)
          })
          
          return {
      id: `${type}_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: type,
      file: file,
            url: dataURL, // Use data URL instead of blob URL
      size: file.size,
          }
        })
      )
    setUploadedFiles((prev) => [...prev, ...newFiles])
    } finally {
      setIsUploading(false)
    }
  }

  // Handle slideshow-specific file upload (independent)
  const handleSlideshowFileUpload = async (files, type) => {
    if (!selectedItem || selectedItem.widgetType !== 'slideshow') return
    
    setIsUploading(true)
    try {
      const newSlides = await Promise.all(
        Array.from(files).map(async (file) => {
          if ((type === 'image' && !file.type.startsWith('image/')) ||
              (type === 'video' && !file.type.startsWith('video/'))) {
            return null
          }
          
          // Convert file to base64 data URL for persistence
          const dataURL = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsDataURL(file)
          })
          
          return {
            id: `slide_${Date.now()}_${Math.random()}`,
            type: type,
            name: file.name,
            url: dataURL,
            duration: 5,
            order: (selectedItem.playlist?.length || 0) + 1
          }
        })
      )
      
      // Filter out null values and add to slideshow
      const validSlides = newSlides.filter(slide => slide !== null)
      if (validSlides.length > 0) {
        const currentPlaylist = selectedItem.playlist || []
        const newPlaylist = [...currentPlaylist, ...validSlides]
        addToSlideshow(selectedItem.id, newPlaylist)
      }
    } finally {
      setIsUploading(false)
    }
  }

  // Handle drag operations
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleFileDrop = (e, type) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleFileUpload(files, type)
  }

  // Add item to canvas
  const addToCanvas = (item, position = null) => {
    const newItem = {
      id: `canvas_${Date.now()}_${Math.random()}`,
      ...item,
      x: position?.x || 100,
      y: position?.y || 100,
      width: item.width || 300,
      height: item.height || 200,
      rotation: 0,
      zIndex: canvasItems.length
    }
    setCanvasItems([...canvasItems, newItem])
  }

  // Canvas click events
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedItem(null)
    }
  }

  // Handle clicks outside slideshow to deselect
  const handlePageClick = (e) => {
    // Only deselect if clicking outside the main canvas area and bottom panel
    const isCanvasArea = canvasRef.current?.contains(e.target)
    const isSlideshowPanel = e.target.closest('[data-slideshow-panel]')
    const isAnnouncementPanel = e.target.closest('[data-announcement-panel]')
    const isSidebar = e.target.closest('.w-72')
    
    if (!isCanvasArea && !isSlideshowPanel && !isAnnouncementPanel && !isSidebar) {
      setSelectedItem(null)
    }
  }

  // Add page click listener
  useEffect(() => {
    document.addEventListener('click', handlePageClick)
    return () => document.removeEventListener('click', handlePageClick)
  }, [])

  // Update selected item when canvas items change
  useEffect(() => {
    if (selectedItem) {
      const updatedItem = canvasItems.find(item => item.id === selectedItem.id)
      setSelectedItem(updatedItem)
    }
  }, [canvasItems, selectedItem])

  // Delete selected item
  const deleteSelectedItem = () => {
    if (selectedItem) {
      setCanvasItems(items => items.filter(item => item.id !== selectedItem.id))
      setSelectedItem(null)
    }
  }

  // Update item properties
  const updateItemProperty = (property, value) => {
    if (!selectedItem) return
    
    let updatedProperties = { [property]: value }
    
    // For slideshow widgets, maintain 16:9 aspect ratio
    if (selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow') {
      const aspectRatio = 16 / 9
      if (property === 'width') {
        updatedProperties.height = Math.round(value / aspectRatio)
      } else if (property === 'height') {
        updatedProperties.width = Math.round(value * aspectRatio)
      }
    }
    
    setCanvasItems(items =>
      items.map(item =>
        item.id === selectedItem.id
          ? { ...item, ...updatedProperties }
          : item
      )
    )
  }

  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  // Background management
  const handleBackgroundUpload = async (files) => {
    const file = files[0]
    if (file && file.type.startsWith('image/')) {
      // Convert to data URL for persistence
      const dataURL = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsDataURL(file)
      })
      setBackgroundImage(dataURL)
    }
  }

  const removeBackground = () => {
    setBackgroundImage(null)
    setBackgroundColor("#ffffff")
  }

  // Get current date in YYYY-MM-DD format, accounting for timezone
  const getCurrentDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Add preset widgets
  const addWidget = (type) => {
    const sizes = widgetSizes[type]
    let widgetName = '';
    if (type === 'time') widgetName = 'Time';
    else if (type === 'weather') widgetName = 'Weather';
    else if (type === 'slideshow') widgetName = 'Slideshow';
    else if (type === 'announcement') widgetName = 'Announcement';
    
    const widget = {
      type: 'widget',
      widgetType: type,
      name: `${widgetName} Widget`,
      width: sizes.width,
      height: sizes.height,
      playlist: type === 'slideshow' ? [] : undefined,
      announcement: type === 'announcement' ? {
        text: "",
        startDate: getCurrentDate(),
        endDate: getCurrentDate(),
        startTime: "09:00",
        endTime: "17:00",
        isActive: true
      } : undefined
    }
    addToCanvas(widget)
  }

  // Handle adding items to slideshow
  const addToSlideshow = (slideshowId, newPlaylist) => {
    setCanvasItems(items =>
      items.map(item =>
        item.id === slideshowId
          ? { ...item, playlist: newPlaylist }
          : item
      )
    )
    // Auto-save when playlist changes to ensure display page gets updates
    setTimeout(() => {
      saveBoard()
    }, 100)
  }

  // Handle updating announcement properties
  const updateAnnouncement = (announcementId, updatedAnnouncement) => {
    setCanvasItems(items =>
      items.map(item =>
        item.id === announcementId
          ? { ...item, announcement: updatedAnnouncement }
          : item
      )
    )
    // Auto-save when announcement changes
    setTimeout(() => {
      saveBoard()
    }, 100)
  }

  // Make uploaded files draggable
  const makeFileDraggable = (e, file) => {
    e.dataTransfer.setData("application/json", JSON.stringify(file))
  }

  // Handle slide reordering
  const moveSlide = (slideshowId, slideId, direction) => {
    setCanvasItems(items =>
      items.map(item => {
        if (item.id === slideshowId && item.playlist) {
          const playlist = [...item.playlist]
          const currentIndex = playlist.findIndex(slide => slide.id === slideId)
          
          if (currentIndex === -1) return item
          
          let newIndex
          if (direction === 'up') {
            newIndex = Math.max(0, currentIndex - 1)
          } else {
            newIndex = Math.min(playlist.length - 1, currentIndex + 1)
          }
          
          if (newIndex !== currentIndex) {
            // Swap the slides
            const [movedSlide] = playlist.splice(currentIndex, 1)
            playlist.splice(newIndex, 0, movedSlide)
            
            // Update order property to match new positions
            playlist.forEach((slide, index) => {
              slide.order = index + 1
            })
            
            return { ...item, playlist }
          }
        }
        return item
      })
    )
    
    // Auto-save when playlist order changes
    setTimeout(() => {
      saveBoard()
    }, 100)
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title={`Edit Board: ${boardName}`} showBack backHref="/dashboard" />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Content Library */}
        <div className={`bg-black border-r border-black p-3 overflow-y-auto transition-all duration-300 ${
          selectedItem && selectedItem.type === 'widget' && (selectedItem.widgetType === 'slideshow' || selectedItem.widgetType === 'announcement')
            ? 'w-0 opacity-0 overflow-hidden' 
            : 'w-72 opacity-100'
        }`}>
          <h3 className="text-lg font-semibold mb-4 text-white">Content Library</h3>

          {/* Upload Section */}
              <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-white">
              <Upload className="w-4 h-4 text-white" />
              Upload Files
                </h4>
            
              {/* Image Upload */}
            <Card className="mb-3 bg-white border-black">
              <CardBody className="p-3">
                <div
                  className={`border-2 border-dashed border-black rounded-lg p-3 text-center transition-colors ${
                    isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'
                  }`}
                      onDragOver={handleDragOver}
                  onDrop={(e) => !isUploading && handleFileDrop(e, "image")}
                  onClick={() => !isUploading && imageInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="w-6 h-6 mx-auto mb-1 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 text-black" />
                  )}
                  <p className="text-xs text-black">
                    {isUploading ? "Processing..." : "Drop images or click"}
                  </p>
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files, "image")}
                    />
                  </CardBody>
                </Card>

              {/* Video Upload */}
            <Card className="mb-3 bg-white border-black">
              <CardBody className="p-3">
                <div
                  className={`border-2 border-dashed border-black rounded-lg p-3 text-center transition-colors ${
                    isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'
                  }`}
                      onDragOver={handleDragOver}
                  onDrop={(e) => !isUploading && handleFileDrop(e, "video")}
                  onClick={() => !isUploading && videoInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="w-6 h-6 mx-auto mb-1 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Video className="w-6 h-6 mx-auto mb-1 text-black" />
                  )}
                  <p className="text-xs text-black">
                    {isUploading ? "Processing..." : "Drop videos or click"}
                  </p>
                    </div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      multiple
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files, "video")}
                    />
                  </CardBody>
                </Card>

            {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-2 p-2 border border-white rounded-lg bg-white cursor-move"
                    draggable
                    onDragStart={(e) => makeFileDraggable(e, file)}
                  >
                    <div className="w-8 h-8 flex-shrink-0">
                          {file.type === "video" ? (
                        <div className="w-full h-full bg-black rounded flex items-center justify-center">
                          <Video className="w-4 h-4 text-white" />
                              </div>
                          ) : (
                            <img
                          src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover rounded"
                          onLoad={(e) => {
                            const img = e.target
                            const aspectRatio = img.naturalWidth / img.naturalHeight
                                setUploadedFiles(prev =>
                                  prev.map(f =>
                                    f.id === file.id
                                  ? { ...f, width: 300, height: Math.round(300 / aspectRatio) }
                                      : f
                                  )
                            )
                              }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-black">{file.name}</p>
                      <p className="text-xs text-gray-500">Drag to slideshow or click Add</p>
                        </div>
                        <div className="flex gap-1">
                      <Button size="sm" variant="bordered" className="border-black text-black hover:bg-black hover:text-white" onPress={() => addToCanvas(file)}>
                            Add
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            isIconOnly
                        onPress={() => removeUploadedFile(file.id)}
                          >
                        <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>

          {/* Widgets Section */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-white">
              <Settings className="w-4 h-4 text-white" />
              Widgets
            </h4>
            
            {/* Time Widget */}
            <div className="mb-3">
                  <Button
                    size="sm"
                    variant="bordered"
                    className="w-full border-white text-white hover:bg-white hover:text-black text-xs"
                startContent={<Clock className="w-3 h-3" />}
                onPress={() => addWidget('time')}
                  >
                Time Widget
                  </Button>
              </div>

            {/* Weather Widget */}
            <div className="mb-3">
              <Button
                size="sm"
                variant="bordered"
                className="w-full border-white text-white hover:bg-white hover:text-black text-xs"
                startContent={<CloudSun className="w-3 h-3" />}
                onPress={() => addWidget('weather')}
              >
                Weather Widget
              </Button>
            </div>

            {/* Slideshow Widget */}
            <div className="mb-3">
                  <Button
                    size="sm"
                    variant="bordered"
                    className="w-full border-white text-white hover:bg-white hover:text-black text-xs"
                startContent={<Play className="w-3 h-3" />}
                onPress={() => addWidget('slideshow')}
                  >
                Slideshow Widget
                  </Button>
            </div>

            {/* Announcement Widget */}
            <div className="mb-3">
                  <Button
                    size="sm"
                    variant="bordered"
                    className="w-full border-white text-white hover:bg-white hover:text-black text-xs"
                startContent={<Megaphone className="w-3 h-3" />}
                onPress={() => addWidget('announcement')}
                  >
                Announcement Widget
                  </Button>
            </div>
          </div>

          {/* Background Section */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-white">
              <ImageIcon className="w-4 h-4 text-white" />
              Background
            </h4>
            
            {/* Background Preview */}
            <div className="mb-3">
              <div 
                className="w-full h-20 rounded-lg border-2 border-white"
                style={{
                  backgroundColor: backgroundColor,
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!backgroundImage && (
                  <div className="w-full h-full flex items-center justify-center text-black">
                    <span className="text-xs font-medium">White Background</span>
                </div>
              )}
              </div>
            </div>

            {/* Background Controls */}
              <div className="space-y-2">
              <Button
                size="sm"
                variant="bordered"
                className="w-full border-white text-white hover:bg-white hover:text-black"
                onPress={() => backgroundInputRef.current?.click()}
              >
                Upload Background
              </Button>
              
              <div className="flex gap-2">
                <Input
                  type="color"
                  size="sm"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  onPress={removeBackground}
                  isIconOnly
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleBackgroundUpload(e.target.files)}
              />
            </div>
          </div>

          {/* Selected Item Properties */}
          {selectedItem && (
            <div className="border-t border-white pt-3">
              <h4 className="font-medium mb-2 text-white">Properties</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-white font-medium block mb-1">
                    Width
                    {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                      <span className="text-xs text-gray-400 ml-1">(16:9 ratio)</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    size="sm"
                    value={selectedItem.width}
                    onChange={(e) => updateItemProperty('width', parseInt(e.target.value) || 0)}
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <label className="text-sm text-white font-medium block mb-1">
                    Height
                    {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                      <span className="text-xs text-gray-400 ml-1">(auto-adjusted)</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    size="sm"
                    value={selectedItem.height}
                    onChange={(e) => updateItemProperty('height', parseInt(e.target.value) || 0)}
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <label className="text-sm text-white font-medium block mb-1">X Position</label>
                  <Input
                    type="number"
                    size="sm"
                    value={Math.round(selectedItem.x)}
                    onChange={(e) => updateItemProperty('x', parseInt(e.target.value) || 0)}
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <label className="text-sm text-white font-medium block mb-1">Y Position</label>
                  <Input
                    type="number"
                    size="sm"
                    value={Math.round(selectedItem.y)}
                    onChange={(e) => updateItemProperty('y', parseInt(e.target.value) || 0)}
                    className="bg-white text-black"
                  />
                </div>

                {/* Slideshow-specific properties */}
                {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <h5 className="text-sm text-white font-medium mb-2">Slideshow</h5>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-white block mb-1">
                          Slides: {selectedItem.playlist?.length || 0}
                        </label>
                        {selectedItem.playlist && selectedItem.playlist.length > 0 && (
                          <label className="text-xs text-gray-300 block mb-1">
                            Total Duration: {selectedItem.playlist.reduce((total, slide) => total + (slide.duration || 5), 0)}s
                          </label>
                        )}
                        <p className="text-xs text-gray-300">
                          Drag files from above to add slides. Timeline controls at bottom.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  color="danger"
                  variant="bordered"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={deleteSelectedItem}
                  className="w-full"
                >
                  Delete Item
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Main Canvas Area */}
        <div className={`flex flex-col transition-all duration-300 ${
          selectedItem && selectedItem.type === 'widget' && (selectedItem.widgetType === 'slideshow' || selectedItem.widgetType === 'announcement')
            ? 'w-full' 
            : 'flex-1'
        }`}>
          {/* Canvas Header */}
          <div className="bg-black border-b border-black p-4 flex justify-between items-center">
              <div>
              <h3 className="text-lg font-semibold text-white">
                Canvas ({canvasItems.length} items)
                {selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                  <span className="ml-2 text-sm text-blue-400">• Slideshow Mode</span>
                )}
                {selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'announcement' && (
                  <span className="ml-2 text-sm text-orange-400">• Announcement Mode</span>
                )}
              </h3>
              <p className="text-sm text-white">Size: {canvasSize.width}x{canvasSize.height}px</p>
              </div>
              <div className="flex gap-2">
              <Button
                color="primary"
                startContent={<Save className="w-4 h-4" />}
                onPress={saveBoard}
                className="bg-white text-black hover:bg-gray-200"
              >
                Save Board
                </Button>
              </div>
            </div>

          {/* Canvas Container */}
          <div className="flex-1 p-2 bg-black overflow-auto">
            <div className="h-full flex items-center justify-center">
              <div
                ref={canvasRef}
                className="relative border border-black rounded-lg shadow-lg"
                      style={{
                  width: canvasSize.width * 0.6, 
                  height: canvasSize.height * 0.6,
                  maxWidth: selectedItem && selectedItem.type === 'widget' && (selectedItem.widgetType === 'slideshow' || selectedItem.widgetType === 'announcement')
                    ? 'calc(100vw - 40px)' 
                    : 'calc(100vw - 320px)',
                  maxHeight: 'calc(100vh - 140px)',
                  transformOrigin: 'center center',
                  backgroundColor: backgroundColor,
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
                onClick={handleCanvasClick}
              >
                {/* Canvas Items */}
                {canvasItems.map((item) => {
                  if (item.type === 'widget') {
                    if (item.widgetType === 'time') {
                      return (
                        <TimeWidget
                          key={item.id}
                          x={item.x * 0.6}
                          y={item.y * 0.6}
                          width={item.width * 0.6}
                          height={item.height * 0.6}
                          isSelected={selectedItem?.id === item.id}
                          item={item}
                          onDragStart={handleDragStart}
                          setSelectedItem={setSelectedItem}
                          onResizeStart={handleResizeStart}
                        />
                      )
                    } else if (item.widgetType === 'weather') {
                      return (
                        <WeatherWidget
                          key={item.id}
                          x={item.x * 0.6}
                          y={item.y * 0.6}
                          width={item.width * 0.6}
                          height={item.height * 0.6}
                          isSelected={selectedItem?.id === item.id}
                          item={item}
                          onDragStart={handleDragStart}
                          setSelectedItem={setSelectedItem}
                          onResizeStart={handleResizeStart}
                        />
                      )
                    } else if (item.widgetType === 'slideshow') {
                      return (
                        <SlideshowWidget
                          key={item.id}
                          x={item.x * 0.6}
                          y={item.y * 0.6}
                          width={item.width * 0.6}
                          height={item.height * 0.6}
                          isSelected={selectedItem?.id === item.id}
                          item={item}
                          onDragStart={handleDragStart}
                          setSelectedItem={setSelectedItem}
                          onResizeStart={handleResizeStart}
                          onAddToSlideshow={addToSlideshow}
                          uploadedFiles={uploadedFiles}
                        />
                      )
                    } else if (item.widgetType === 'announcement') {
                      return (
                        <AnnouncementWidget
                          key={item.id}
                          x={item.x * 0.6}
                          y={item.y * 0.6}
                          width={item.width * 0.6}
                          height={item.height * 0.6}
                          isSelected={selectedItem?.id === item.id}
                          item={item}
                          onDragStart={handleDragStart}
                          setSelectedItem={setSelectedItem}
                          onResizeStart={handleResizeStart}
                        />
                      )
                    }
                  }
                  
                  return (
                    <div
                      key={item.id}
                      draggable
                      className={`absolute border-2 rounded-lg overflow-hidden ${
                        selectedItem?.id === item.id 
                          ? 'cursor-move border-blue-500 shadow-lg' 
                          : 'cursor-move border-transparent hover:border-gray-300 hover:shadow-md transition-all duration-150'
                      }`}
                      style={{
                        left: item.x * 0.6,
                        top: item.y * 0.6,
                        width: item.width * 0.6,
                        height: item.height * 0.6,
                        zIndex: item.zIndex,
                        transform: `rotate(${item.rotation || 0}deg)`
                      }}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedItem(item)
                      }}
                    >
                      {item.type === 'image' && (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover pointer-events-none"
                          draggable={false}
                        />
                      )}
                      {item.type === 'video' && (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center pointer-events-none">
                          <Video className="w-8 h-8 text-white" />
                          <span className="text-white text-xs ml-2">{item.name}</span>
                      </div>
                    )}
                      
                      {/* Selection handles */}
                      {selectedItem?.id === item.id && (
                        <>
                          <div 
                            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize hover:bg-blue-600"
                            onMouseDown={(e) => handleResizeStart(e, 'nw')}
                          ></div>
                          <div 
                            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize hover:bg-blue-600"
                            onMouseDown={(e) => handleResizeStart(e, 'ne')}
                          ></div>
                          <div 
                            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize hover:bg-blue-600"
                            onMouseDown={(e) => handleResizeStart(e, 'sw')}
                          ></div>
                          <div 
                            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600"
                            onMouseDown={(e) => handleResizeStart(e, 'se')}
                          ></div>
                        </>
                    )}
                  </div>
                  )
                })}

                {/* Canvas Guide */}
                {canvasItems.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-black">
                  <div className="text-center">
                      <Plus className="w-16 h-16 mx-auto mb-4 opacity-60" />
                      <p className="text-lg font-medium">Drop files here or use the sidebar</p>
                      <p className="text-sm">to add content to your board</p>
                  </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Slideshow Timeline Panel - Bottom */}
        {selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
          <div className="border-t border-gray-300 bg-white p-4" data-slideshow-panel>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900">
                Slideshow Timeline ({selectedItem.playlist?.length || 0} slides)
              </h4>
              {selectedItem.playlist && selectedItem.playlist.length > 0 && (
                <span className="text-sm text-gray-600">
                  Total Duration: {selectedItem.playlist.reduce((total, slide) => total + (slide.duration || 5), 0)}s
                </span>
              )}
      </div>
            
            {/* Upload Area for Slideshow */}
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Image Upload Area */}
                <div
                  className={`border-2 border-dashed border-blue-300 rounded-lg p-4 text-center transition-colors ${
                    isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (isUploading) return
                    
                    // Handle direct file drop (independent from sidebar)
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      setIsUploading(true)
                      Array.from(files).forEach(async (file) => {
                        if (file.type.startsWith('image/')) {
                          try {
                            const dataURL = await new Promise((resolve) => {
                              const reader = new FileReader()
                              reader.onload = (e) => resolve(e.target.result)
                              reader.readAsDataURL(file)
                            })
                            
                            const newSlide = {
                              id: `slide_${Date.now()}_${Math.random()}`,
                              type: 'image',
                              name: file.name,
                              url: dataURL,
                              duration: 5,
                              order: (selectedItem.playlist?.length || 0) + 1
                            }
                            const currentPlaylist = selectedItem.playlist || []
                            const newPlaylist = [...currentPlaylist, newSlide]
                            addToSlideshow(selectedItem.id, newPlaylist)
                          } catch (error) {
                            console.error('Failed to process image:', error)
                          }
                        }
                      })
                      setIsUploading(false)
                    } else {
                      // Handle drag from sidebar
                      const draggedData = e.dataTransfer.getData("application/json")
                      if (draggedData) {
                        try {
                          const draggedItem = JSON.parse(draggedData)
                          if (draggedItem.type === 'image') {
                            const newSlide = {
                              id: `slide_${Date.now()}_${Math.random()}`,
                              assetId: draggedItem.id,
                              type: draggedItem.type,
                              name: draggedItem.name,
                              url: draggedItem.url,
                              duration: 5,
                              order: (selectedItem.playlist?.length || 0) + 1
                            }
                            const currentPlaylist = selectedItem.playlist || []
                            const newPlaylist = [...currentPlaylist, newSlide]
                            addToSlideshow(selectedItem.id, newPlaylist)
                          }
                        } catch (error) {
                          console.error('Failed to parse dropped item:', error)
                        }
                      }
                    }
                  }}
                  onClick={() => !isUploading && slideshowImageInputRef.current?.click()}
                >
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium text-gray-700">Add Images</p>
                  <p className="text-xs text-gray-500">Drag & drop or click to upload</p>
    </div>

                {/* Video Upload Area */}
                <div
                  className={`border-2 border-dashed border-purple-300 rounded-lg p-4 text-center transition-colors ${
                    isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-purple-400 hover:bg-purple-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (isUploading) return
                    
                    // Handle direct file drop (independent from sidebar)
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      setIsUploading(true)
                      Array.from(files).forEach(async (file) => {
                        if (file.type.startsWith('video/')) {
                          try {
                            const dataURL = await new Promise((resolve) => {
                              const reader = new FileReader()
                              reader.onload = (e) => resolve(e.target.result)
                              reader.readAsDataURL(file)
                            })
                            
                            const newSlide = {
                              id: `slide_${Date.now()}_${Math.random()}`,
                              type: 'video',
                              name: file.name,
                              url: dataURL,
                              duration: 5,
                              order: (selectedItem.playlist?.length || 0) + 1
                            }
                            const currentPlaylist = selectedItem.playlist || []
                            const newPlaylist = [...currentPlaylist, newSlide]
                            addToSlideshow(selectedItem.id, newPlaylist)
                          } catch (error) {
                            console.error('Failed to process video:', error)
                          }
                        }
                      })
                      setIsUploading(false)
                    } else {
                      // Handle drag from sidebar
                      const draggedData = e.dataTransfer.getData("application/json")
                      if (draggedData) {
                        try {
                          const draggedItem = JSON.parse(draggedData)
                          if (draggedItem.type === 'video') {
                            const newSlide = {
                              id: `slide_${Date.now()}_${Math.random()}`,
                              assetId: draggedItem.id,
                              type: draggedItem.type,
                              name: draggedItem.name,
                              url: draggedItem.url,
                              duration: 5,
                              order: (selectedItem.playlist?.length || 0) + 1
                            }
                            const currentPlaylist = selectedItem.playlist || []
                            const newPlaylist = [...currentPlaylist, newSlide]
                            addToSlideshow(selectedItem.id, newPlaylist)
                          }
                        } catch (error) {
                          console.error('Failed to parse dropped item:', error)
                        }
                      }
                    }
                  }}
                  onClick={() => !isUploading && slideshowVideoInputRef.current?.click()}
                >
                  <Video className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm font-medium text-gray-700">Add Videos</p>
                  <p className="text-xs text-gray-500">Drag & drop or click to upload</p>
                </div>
              </div>
            </div>
            
            {selectedItem.playlist && selectedItem.playlist.length > 0 ? (
              <div className="space-y-3">
                {/* Slide Timeline */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {selectedItem.playlist.map((slide, index) => (
                    <div
                      key={slide.id}
                      className="flex-shrink-0 border-2 border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      style={{ width: "200px" }}
                    >
                      {/* Slide Preview */}
                      <div className="w-full h-24 bg-gray-200 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {slide.type === 'image' && (
                          <img
                            src={slide.url}
                            alt={slide.name}
                            className="w-full h-full object-contain rounded"
                          />
                        )}
                        {slide.type === 'video' && (
                          <video
                            key={slide.id}
                            src={slide.url}
                            className="w-full h-full object-contain rounded"
                            muted
                            playsInline
                            onError={(e) => {
                              console.error('Video thumbnail failed to load:', slide.url)
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Slide Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                          <span className="text-xs text-gray-600 truncate flex-1">{slide.name}</span>
                          
                          {/* Reorder buttons */}
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="light"
                              isIconOnly
                              isDisabled={index === 0}
                              onPress={() => moveSlide(selectedItem.id, slide.id, 'up')}
                              className="min-w-6 h-6"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              isIconOnly
                              isDisabled={index === selectedItem.playlist.length - 1}
                              onPress={() => moveSlide(selectedItem.id, slide.id, 'down')}
                              className="min-w-6 h-6"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              isIconOnly
                              color="danger"
                              onPress={() => {
                                const newPlaylist = selectedItem.playlist.filter(s => s.id !== slide.id)
                                addToSlideshow(selectedItem.id, newPlaylist)
                              }}
                              className="min-w-6 h-6"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Duration Control */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Duration:</label>
                          <Input
                            type="number"
                            size="sm"
                            value={slide.duration || 5}
                            onChange={(e) => {
                              const newDuration = parseInt(e.target.value) || 5
                              const updatedPlaylist = selectedItem.playlist.map(s =>
                                s.id === slide.id ? { ...s, duration: newDuration } : s
                              )
                              addToSlideshow(selectedItem.id, updatedPlaylist)
                            }}
                            className="w-16"
                            min="1"
                            max="60"
                          />
                          <span className="text-xs text-gray-500">sec</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Slide Placeholder */}
                  <div
                    className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-center hover:border-gray-400 transition-colors cursor-pointer"
                    style={{ width: "200px", height: "140px" }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const draggedData = e.dataTransfer.getData("application/json")
                      if (draggedData) {
                        try {
                          const draggedItem = JSON.parse(draggedData)
                          if (draggedItem.type === 'image' || draggedItem.type === 'video') {
                            const newSlide = {
                              id: `slide_${Date.now()}_${Math.random()}`,
                              assetId: draggedItem.id,
                              type: draggedItem.type,
                              name: draggedItem.name,
                              url: draggedItem.url,
                              duration: 5,
                              order: selectedItem.playlist?.length || 0 + 1
                            }
                            const currentPlaylist = selectedItem.playlist || []
                            const newPlaylist = [...currentPlaylist, newSlide]
                            addToSlideshow(selectedItem.id, newPlaylist)
                          }
                        } catch (error) {
                          console.error('Failed to parse dropped item:', error)
                        }
                      }
                    }}
                  >
                    <div className="text-center text-gray-500">
                      <Plus className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">Drag files here</p>
                      <p className="text-xs">to add slides</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const draggedData = e.dataTransfer.getData("application/json")
                  if (draggedData) {
                    try {
                      const draggedItem = JSON.parse(draggedData)
                      if (draggedItem.type === 'image' || draggedItem.type === 'video') {
                        const newSlide = {
                          id: `slide_${Date.now()}_${Math.random()}`,
                          assetId: draggedItem.id,
                          type: draggedItem.type,
                          name: draggedItem.name,
                          url: draggedItem.url,
                          duration: 5,
                          order: 1
                        }
                        addToSlideshow(selectedItem.id, [newSlide])
                      }
                    } catch (error) {
                      console.error('Failed to parse dropped item:', error)
                    }
                  }
                }}
              >
                <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No slides in slideshow</p>
                <p className="text-xs">Drag images or videos from the sidebar to add slides</p>
              </div>
            )}
            
            {/* Hidden input elements for independent slideshow uploads */}
            <input
              ref={slideshowImageInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleSlideshowFileUpload(e.target.files, "image")}
            />
            <input
              ref={slideshowVideoInputRef}
              type="file"
              multiple
              accept="video/*"
              className="hidden"
              onChange={(e) => handleSlideshowFileUpload(e.target.files, "video")}
            />
          </div>
        )}

        {/* Announcement Editing Panel - Bottom */}
        {selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'announcement' && (
          <div className="border-t border-gray-300 bg-white p-4" data-announcement-panel>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900">
                Announcement Settings
              </h4>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedItem.announcement?.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedItem.announcement?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Text */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Announcement Text
                  </label>
                  <textarea
                    value={selectedItem.announcement?.text || ""}
                    onChange={(e) => {
                      e.stopPropagation()
                      updateAnnouncement(selectedItem.id, {
                        ...selectedItem.announcement,
                        text: e.target.value
                      })
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                    placeholder="Enter your announcement text..."
                  />
                </div>
              </div>

              {/* Right Column - Timing and Status */}
              <div className="space-y-4">
                {/* Date Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={selectedItem.announcement?.startDate || (() => {
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = String(now.getMonth() + 1).padStart(2, '0')
                        const day = String(now.getDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateAnnouncement(selectedItem.id, {
                          ...selectedItem.announcement,
                          startDate: e.target.value
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={selectedItem.announcement?.endDate || (() => {
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = String(now.getMonth() + 1).padStart(2, '0')
                        const day = String(now.getDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateAnnouncement(selectedItem.id, {
                          ...selectedItem.announcement,
                          endDate: e.target.value
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                    />
                  </div>
                </div>

                {/* Time Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={selectedItem.announcement?.startTime || "09:00"}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateAnnouncement(selectedItem.id, {
                          ...selectedItem.announcement,
                          startTime: e.target.value
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={selectedItem.announcement?.endTime || "17:00"}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateAnnouncement(selectedItem.id, {
                          ...selectedItem.announcement,
                          endTime: e.target.value
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItem.announcement?.isActive || false}
                      onChange={(e) => updateAnnouncement(selectedItem.id, {
                        ...selectedItem.announcement,
                        isActive: e.target.checked
                      })}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Announcement
                    </span>
                  </label>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Preview</h5>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <strong>Text:</strong> {selectedItem.announcement?.text?.substring(0, 50) || "No text"}
                      {selectedItem.announcement?.text?.length > 50 && "..."}
                    </p>
                    <p><strong>Active Period:</strong> {selectedItem.announcement?.startDate || (() => {
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = String(now.getMonth() + 1).padStart(2, '0')
                        const day = String(now.getDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()} {selectedItem.announcement?.startTime || "09:00"} - {selectedItem.announcement?.endDate || (() => {
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = String(now.getMonth() + 1).padStart(2, '0')
                        const day = String(now.getDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()} {selectedItem.announcement?.endTime || "17:00"}</p>
                    <p><strong>Status:</strong> {selectedItem.announcement?.isActive ? "Active" : "Inactive"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrganizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-black">Loading board editor...</p>
        </div>
      </div>
    }>
      <OrganizePageContent />
    </Suspense>
  )
}
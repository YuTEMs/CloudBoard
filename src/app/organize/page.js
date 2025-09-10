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
import { ClipboardList } from "lucide-react"
import { useState, useRef, useEffect, useCallback, Suspense, memo, useMemo } from "react"
import { useSession } from 'next-auth/react'
import { useSearchParams } from "next/navigation"
import { AppHeader } from "../../components/layout/app-hearder"
import { useRealtimeBoards } from "../../hooks/useRealtimeBoards"
import { useBoardSave } from "../../hooks/useBoardSave"
import { uploadMedia, isTooLarge, deleteMedia } from "../../lib/storage"
import { RenderWidget } from "../../components/widgets"

// Widget Components removed - now using shared widgets
// Widget definitions removed - now using shared widgets from ../../components/widgets

function OrganizePageContent() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('board')
  const { data: session } = useSession()
  const userIdForPath = session?.user?.id || 'anonymous'
  
  // Use real-time boards hook
  const { boards, updateBoard } = useRealtimeBoards()
  const currentBoard = boards.find(board => board.id === boardId)
  
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
  
  // Track if there are unsaved changes to prevent real-time updates from overriding them
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedState, setLastSavedState] = useState(null)

  // Refs for high-frequency resize updates (avoid re-subscribing listeners)
  const isResizingRef = useRef(false)
  const selectedItemRef = useRef(null)
  const selectedItemIdRef = useRef(null)
  const resizeHandleRef = useRef(null)
  const resizeStartPosRef = useRef({ x: 0, y: 0 })
  const resizeStartSizeRef = useRef({ width: 0, height: 0, x: 0, y: 0 })
  const canvasSizeRef = useRef(canvasSize)
  const isSlideshowRef = useRef(false)
  const rafIdRef = useRef(null)

  
  // File upload refs
  const mediaInputRef = useRef(null)
  const backgroundInputRef = useRef(null)
  const canvasRef = useRef(null)
  
  // Slideshow-specific upload refs (independent)
  const slideshowImageInputRef = useRef(null)
  const slideshowVideoInputRef = useRef(null)

  // Use save-based board management
  const { saveBoard: saveBoardToDb, saving, lastSaved, error: saveError } = useBoardSave()

  // Load board data from real-time hook - only if no unsaved changes
  useEffect(() => {
    if (currentBoard) {
      setBoardName(currentBoard.name)
      
      // Only update local state if there are no unsaved changes to prevent overriding user's work
      if (!hasUnsavedChanges) {
        const newItems = currentBoard.configuration?.items || []
        const newBackgroundImage = currentBoard.configuration?.backgroundImage || null
        const newBackgroundColor = currentBoard.configuration?.backgroundColor || "#ffffff"
        
        setCanvasItems(newItems)
        setBackgroundImage(newBackgroundImage)
        setBackgroundColor(newBackgroundColor)
        
        // Store the current state as the last saved state for comparison
        setLastSavedState({
          items: newItems,
          backgroundImage: newBackgroundImage,
          backgroundColor: newBackgroundColor
        })
      }
    }
  }, [currentBoard, hasUnsavedChanges])

  // Detect changes to mark as unsaved
  useEffect(() => {
    if (lastSavedState) {
      // Compare current state with last saved state
      const currentStateString = JSON.stringify({
        items: canvasItems,
        backgroundImage,
        backgroundColor
      })
      const lastSavedStateString = JSON.stringify(lastSavedState)
      
      const hasChanges = currentStateString !== lastSavedStateString
      if (hasChanges !== hasUnsavedChanges) {
        setHasUnsavedChanges(hasChanges)
      }
    }
  }, [canvasItems, backgroundImage, backgroundColor, lastSavedState, hasUnsavedChanges])

  // Keep refs in sync with state that is read during resize
  useEffect(() => {
    selectedItemRef.current = selectedItem
    selectedItemIdRef.current = selectedItem?.id || null
    // Compute once when selection changes
    isSlideshowRef.current = !!(selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow')
  }, [selectedItem])

  useEffect(() => {
    canvasSizeRef.current = canvasSize
  }, [canvasSize])

  // Manual save function - only saves when user clicks Save button
  const handleSaveBoard = useCallback(async () => {
    if (!boardId) return

    try {
      const configuration = {
        items: canvasItems,
        canvasSize,
        backgroundImage,
        backgroundColor
      }

      await saveBoardToDb(boardId, configuration)
      
      // Mark as saved and update last saved state
      setHasUnsavedChanges(false)
      setLastSavedState({
        items: [...canvasItems],
        backgroundImage,
        backgroundColor
      })
      
      console.log('✅ Board configuration saved successfully!')
    } catch (error) {
      console.error('❌ Error saving board configuration:', error)
    }
  }, [boardId, canvasItems, canvasSize, backgroundImage, backgroundColor, saveBoardToDb])

  // Widget size configurations
  const widgetSizes = {
    time: { width: 200, height: 100 },
    weather: { width: 250, height: 150 },
    slideshow: { width: 480, height: 270 }, // 16:9 aspect ratio
    announcement: { width: 400, height: 150 }
  }

  // HTML5 Drag and Drop handlers (like proto.js)
  const handleDragStart = useCallback((e, item) => {
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
  }, [isResizing])

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
  const handleResizeStart = useCallback((e, handle) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Update UI state
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStartPos({ x: e.clientX, y: e.clientY })
    setResizeStartSize({ 
      width: selectedItem?.width || 0, 
      height: selectedItem?.height || 0,
      x: selectedItem?.x || 0,
      y: selectedItem?.y || 0
    })

    // Sync refs (used by the stable move handler)
    isResizingRef.current = true
    resizeHandleRef.current = handle
    resizeStartPosRef.current = { x: e.clientX, y: e.clientY }
    resizeStartSizeRef.current = { 
      width: selectedItem?.width || 0, 
      height: selectedItem?.height || 0,
      x: selectedItem?.x || 0,
      y: selectedItem?.y || 0
    }
    selectedItemIdRef.current = selectedItem?.id || null
    isSlideshowRef.current = !!(selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow')
  }, [selectedItem])

  // Stable mousemove handler using refs + rAF throttling
  const handleResizeMove = useCallback((e) => {
    if (!isResizingRef.current || !selectedItemIdRef.current || !resizeHandleRef.current) return
    e.preventDefault()

    const applyResize = () => {
      rafIdRef.current = null

      const startPos = resizeStartPosRef.current
      const startSize = resizeStartSizeRef.current
      const handle = resizeHandleRef.current
      const id = selectedItemIdRef.current
      const canvas = canvasSizeRef.current
      const isSlideshow = isSlideshowRef.current

      const deltaX = e.clientX - startPos.x
      const deltaY = e.clientY - startPos.y
      const scale = 0.6

      // Scale deltas to canvas scale
      const scaledDeltaX = deltaX / scale
      const scaledDeltaY = deltaY / scale

      let newWidth = startSize.width
      let newHeight = startSize.height
      let newX = startSize.x
      let newY = startSize.y

      // Calculate new dimensions based on resize handle
      switch (handle) {
        case 'nw':
          newWidth = Math.max(50, startSize.width - scaledDeltaX)
          newHeight = Math.max(50, startSize.height - scaledDeltaY)
          newX = startSize.x + (startSize.width - newWidth)
          newY = startSize.y + (startSize.height - newHeight)
          break
        case 'ne':
          newWidth = Math.max(50, startSize.width + scaledDeltaX)
          newHeight = Math.max(50, startSize.height - scaledDeltaY)
          newY = startSize.y + (startSize.height - newHeight)
          break
        case 'sw':
          newWidth = Math.max(50, startSize.width - scaledDeltaX)
          newHeight = Math.max(50, startSize.height + scaledDeltaY)
          newX = startSize.x + (startSize.width - newWidth)
          break
        case 'se':
          newWidth = Math.max(50, startSize.width + scaledDeltaX)
          newHeight = Math.max(50, startSize.height + scaledDeltaY)
          break
      }

      // Apply bounds checking
      newX = Math.max(0, Math.min(newX, canvas.width - newWidth))
      newY = Math.max(0, Math.min(newY, canvas.height - newHeight))

      // Maintain 16:9 for slideshow widgets
      if (isSlideshow) {
        const aspectRatio = 16 / 9
        if (Math.abs(scaledDeltaX) >= Math.abs(scaledDeltaY)) {
          newHeight = newWidth / aspectRatio
        } else {
          newWidth = newHeight * aspectRatio
        }

        // Recalculate position based on new dimensions
        switch (handle) {
          case 'nw':
            newX = startSize.x + (startSize.width - newWidth)
            newY = startSize.y + (startSize.height - newHeight)
            break
          case 'ne':
            newY = startSize.y + (startSize.height - newHeight)
            break
          case 'sw':
            newX = startSize.x + (startSize.width - newWidth)
            break
          case 'se':
            break
        }

        newX = Math.max(0, Math.min(newX, canvas.width - newWidth))
        newY = Math.max(0, Math.min(newY, canvas.height - newHeight))
      }

      setCanvasItems(items => {
        const updatedItems = [...items]
        const idx = updatedItems.findIndex(it => it.id === id)
        if (idx !== -1) {
          updatedItems[idx] = {
            ...updatedItems[idx],
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY
          }
        }
        return updatedItems
      })
    }

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(applyResize)
    }
  }, [])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeHandle(null)
    isResizingRef.current = false
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  // Add global mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
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
      const tasks = Array.from(files).map(async (file) => {
        if (type === 'image' && !file.type.startsWith('image/')) return null
        if (type === 'video' && !file.type.startsWith('video/')) return null
        if (isTooLarge(file)) {
          const mb = (file.size / (1024 * 1024)).toFixed(1)
          console.error(`File too large: ${file.name} (${mb}MB)`)
          alert(`File too large: ${file.name} (${mb}MB). Max allowed is 50MB.`)
          return null
        }
        const { publicUrl, bucket, path } = await uploadMedia(file, {
          boardId: boardId || 'shared',
          userId: userIdForPath,
          kind: type,
        })
        return {
          id: `${type}_${Date.now()}_${Math.random()}`,
          name: file.name,
          type,
          size: file.size,
          url: publicUrl,
          bucket,
          path,
        }
      })
      const results = await Promise.allSettled(tasks)
      const uploads = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
      if (uploads.length) setUploadedFiles((prev) => [...prev, ...uploads])
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length) {
        alert(`${failures.length} file(s) failed to upload.`)
      }
    } finally {
      setIsUploading(false)
    }
  }

  // Handle slideshow-specific file upload (independent)
  const handleSlideshowFileUpload = async (files, type) => {
    if (!selectedItem || selectedItem.widgetType !== 'slideshow') return
    setIsUploading(true)
    try {
      const startOrder = (selectedItem.playlist?.length || 0)
      const tasks = Array.from(files).map(async (file, idx) => {
        if ((type === 'image' && !file.type.startsWith('image/')) ||
            (type === 'video' && !file.type.startsWith('video/'))) return null
        if (isTooLarge(file)) {
          const mb = (file.size / (1024 * 1024)).toFixed(1)
          console.error(`File too large: ${file.name} (${mb}MB)`)
          alert(`File too large: ${file.name} (${mb}MB). Max allowed is 50MB.`)
          return null
        }
        const { publicUrl } = await uploadMedia(file, {
          boardId: boardId || 'shared',
          userId: userIdForPath,
          kind: type,
        })
        return {
          id: `slide_${Date.now()}_${Math.random()}`,
          type,
          name: file.name,
          url: publicUrl,
          duration: 5,
          order: startOrder + idx + 1,
        }
      })
      const results = await Promise.allSettled(tasks)
      const slides = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
      if (slides.length) {
        const currentPlaylist = selectedItem.playlist || []
        const newPlaylist = [...currentPlaylist, ...slides]
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
      // Avoid resetting selection during active resize to prevent thrash
      if (!isResizingRef.current) {
        setSelectedItem(updatedItem)
      }
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

  const removeUploadedFile = async (fileId) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file && file.path) {
        // Fire and forget deletion
        deleteMedia({ bucket: file.bucket, path: file.path }).catch(() => {})
      }
      return prev.filter(file => file.id !== fileId)
    })
  }

  // Background management
  const handleBackgroundUpload = async (files) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (isTooLarge(file)) {
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      alert(`Background image too large (${mb}MB). Max allowed is 50MB.`)
      return
    }
    try {
      const { publicUrl } = await uploadMedia(file, {
        boardId: boardId || 'shared',
        userId: userIdForPath,
        kind: 'image',
      })
      setBackgroundImage(publicUrl)
    } catch (err) {
      console.error('Background upload failed:', err)
      alert(`Failed to upload background: ${err.message || err}`)
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
  const addToSlideshow = useCallback((slideshowId, newPlaylist) => {
    setCanvasItems(items =>
      items.map(item =>
        item.id === slideshowId
          ? { ...item, playlist: newPlaylist }
          : item
      )
    )
    // Note: Changes are now saved manually when user clicks Save button
  }, [])

  // Handle updating announcement properties
  const updateAnnouncement = useCallback((announcementId, updatedAnnouncement) => {
    setCanvasItems(items =>
      items.map(item =>
        item.id === announcementId
          ? { ...item, announcement: updatedAnnouncement }
          : item
      )
    )
    // Note: Changes are now saved manually when user clicks Save button
  }, [])

  // Make uploaded files draggable
  const makeFileDraggable = (e, file) => {
    e.dataTransfer.setData("application/json", JSON.stringify(file))
  }

  // Handle slide reordering
  const moveSlide = useCallback((slideshowId, slideId, direction) => {
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
    
    // Note: Changes are now saved manually when user clicks Save button
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <AppHeader title={`Edit Board: ${boardName}`} showBack backHref="/dashboard" />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Content Library */}
        <div className={`bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-200 p-4 overflow-y-auto transition-all duration-300 shadow-lg ${
          selectedItem && selectedItem.type === 'widget' && (selectedItem.widgetType === 'slideshow' || selectedItem.widgetType === 'announcement')
            ? 'w-0 opacity-0 overflow-hidden' 
            : 'w-80 opacity-100'
        }`}>
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <span>Content Library</span>
          </h3>

              {/* Upload Section */}
              <div className="mb-8">
            <h4 className="font-semibold mb-4 flex items-center gap-3 text-white">
              <Upload className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>Upload Files</span>
                </h4>
            
              {/* Unified Media Upload */}
            <Card className="mb-4 bg-white/10 backdrop-blur-sm border-white/20">
              <CardBody className="p-4">
                <div
                  className={`border-2 border-dashed border-blue-300/70 rounded-xl p-4 text-center transition-all duration-200 ${
                    isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/10 hover:border-blue-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    if (isUploading) return
                    e.preventDefault()
                    const files = e.dataTransfer.files
                    if (!files || files.length === 0) return
                    const images = []
                    const videos = []
                    Array.from(files).forEach(f => {
                      if (f.type.startsWith('image/')) images.push(f)
                      else if (f.type.startsWith('video/')) videos.push(f)
                    })
                    if (images.length) handleFileUpload(images, 'image')
                    if (videos.length) handleFileUpload(videos, 'video')
                  }}
                  onClick={() => !isUploading && mediaInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="spinner mx-auto mb-2"></div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <ImageIcon className="w-6 h-6 text-blue-300" />
                      <Video className="w-6 h-6 text-purple-300" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-white mb-1">
                    {isUploading ? 'Processing...' : 'Add Media'}
                  </p>
                  <p className="text-xs text-blue-200">
                    Drag & drop images or videos, or click to upload
                  </p>
                </div>
                <input
                  ref={mediaInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) return
                    const images = []
                    const videos = []
                    Array.from(files).forEach(f => {
                      if (f.type.startsWith('image/')) images.push(f)
                      else if (f.type.startsWith('video/')) videos.push(f)
                    })
                    if (images.length) handleFileUpload(images, 'image')
                    if (videos.length) handleFileUpload(videos, 'video')
                    // Reset input to allow same file re-selection
                    e.target.value = ''
                  }}
                />
              </CardBody>
            </Card>

            {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                <h5 className="text-sm font-semibold text-white flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>Media Library ({uploadedFiles.length})</span>
                </h5>
                    {uploadedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-3 p-3 border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm cursor-move hover:bg-white/20 transition-all duration-200"
                    draggable
                    onDragStart={(e) => makeFileDraggable(e, file)}
                  >
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden">
                          {file.type === "video" ? (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
                          <Video className="w-5 h-5 text-white" />
                              </div>
                          ) : (
                            <img
                          src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover rounded-lg"
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
                      <p className="text-sm font-medium truncate text-white">{file.name}</p>
                      <p className="text-xs text-blue-200">Drag to canvas or slideshow</p>
                        </div>
                        <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="bordered" 
                        className="border-cyan-300/50 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-300 transition-all duration-200 rounded-lg flex items-center justify-center h-8 px-3" 
                        onPress={() => addToCanvas(file)}
                      >
                        <span className="text-xs font-medium">Add</span>
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        className="rounded-lg flex items-center justify-center h-8 w-8 p-0"
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
          <div className="mb-8">
            <h4 className="font-semibold mb-4 flex items-center gap-3 text-white">
              <Settings className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>Smart Widgets</span>
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Time Widget */}
              <div>
                <Button
                  size="md"
                  variant="bordered"
                  className="w-full border-green-300/50 text-white hover:bg-green-500/20 hover:border-green-300 transition-all duration-200 p-4 h-auto rounded-xl"
                  onPress={() => addWidget('time')}
                >
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Clock className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <div className="text-center">
                      <div className="font-medium">Time Widget</div>
                      <div className="text-xs text-green-200 mt-1">Live clock display</div>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Weather Widget */}
              <div>
                <Button
                  size="md"
                  variant="bordered"
                  className="w-full border-blue-300/50 text-white hover:bg-blue-500/20 hover:border-blue-300 transition-all duration-200 p-4 h-auto rounded-xl"
                  onPress={() => addWidget('weather')}
                >
                  <div className="flex flex-col items-center gap-2 w-full">
                    <CloudSun className="w-6 h-6 text-blue-400 flex-shrink-0" />
                    <div className="text-center">
                      <div className="font-medium">Weather Widget</div>
                      <div className="text-xs text-blue-200 mt-1">Weather information</div>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Slideshow Widget */}
              <div>
                <Button
                  size="md"
                  variant="bordered"
                  className="w-full border-purple-300/50 text-white hover:bg-purple-500/20 hover:border-purple-300 transition-all duration-200 p-4 h-auto rounded-xl"
                  onPress={() => addWidget('slideshow')}
                >
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Play className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <div className="text-center">
                      <div className="font-medium">Slideshow Widget</div>
                      <div className="text-xs text-purple-200 mt-1">Image & video carousel</div>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Announcement Widget */}
              <div>
                <Button
                  size="md"
                  variant="bordered"
                  className="w-full border-orange-300/50 text-white hover:bg-orange-500/20 hover:border-orange-300 transition-all duration-200 p-4 h-auto rounded-xl"
                  onPress={() => addWidget('announcement')}
                >
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Megaphone className="w-6 h-6 text-orange-400 flex-shrink-0" />
                    <div className="text-center">
                      <div className="font-medium">Announcement Widget</div>
                      <div className="text-xs text-orange-200 mt-1">Scheduled messages</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Background Section */}
          <div className="mb-8">
            <h4 className="font-semibold mb-4 flex items-center gap-3 text-white">
              <ImageIcon className="w-5 h-5 text-pink-400 flex-shrink-0" />
              <span>Background Style</span>
            </h4>
            
            {/* Background Preview */}
            <div className="mb-4">
              <div 
                className="w-full h-20 rounded-xl border-2 border-white/20 shadow-lg overflow-hidden"
                style={{
                  backgroundColor: backgroundColor,
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!backgroundImage && backgroundColor === "#ffffff" && (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-xs font-medium text-gray-600">Clean Background</span>
                  </div>
                )}
                {!backgroundImage && backgroundColor !== "#ffffff" && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white/80">Custom Color</span>
                  </div>
                )}
              </div>
            </div>

            {/* Background Controls */}
              <div className="space-y-3">
              <Button
                size="md"
                variant="bordered"
                className="w-full border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-200 rounded-xl flex items-center justify-center gap-3 h-12"
                onPress={() => backgroundInputRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 flex-shrink-0" />
                <span>Upload Background</span>
              </Button>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/80 block mb-2">Background Color</label>
                  <Input
                    type="color"
                    size="md"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full"
                    classNames={{
                      inputWrapper: "bg-white/10 border-white/20 rounded-xl h-12"
                    }}
                  />
                </div>
                <div className="flex-shrink-0">
                  <label className="text-xs text-white/80 block mb-2">Reset</label>
                  <Button
                    size="md"
                    variant="bordered"
                    className="border-white/30 text-white hover:bg-red-500/20 hover:border-red-300 transition-all duration-200 rounded-xl h-12 px-4"
                    onPress={() => {
                      setBackgroundColor("#ffffff")
                      setBackgroundImage(null)
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
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
            <div className="border-t border-white/20 pt-6 mt-6">
              <h4 className="font-semibold mb-4 text-white flex items-center gap-3">
                <Settings className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span>Properties</span>
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white font-semibold block mb-2 flex items-center gap-2">
                    <span>Width</span>
                    {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                      <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">16:9 ratio</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    size="sm"
                    value={selectedItem.width}
                    onChange={(e) => updateItemProperty('width', parseInt(e.target.value) || 0)}
                    classNames={{
                      input: "text-gray-900",
                      inputWrapper: "bg-white border-white/20"
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm text-white font-semibold block mb-2 flex items-center gap-2">
                    <span>Height</span>
                    {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                      <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">auto-adjusted</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    size="sm"
                    value={selectedItem.height}
                    onChange={(e) => updateItemProperty('height', parseInt(e.target.value) || 0)}
                    classNames={{
                      input: "text-gray-900",
                      inputWrapper: "bg-white border-white/20"
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white font-semibold block mb-2">X Position</label>
                    <Input
                      type="number"
                      size="sm"
                      value={Math.round(selectedItem.x)}
                      onChange={(e) => updateItemProperty('x', parseInt(e.target.value) || 0)}
                      classNames={{
                        input: "text-gray-900",
                        inputWrapper: "bg-white border-white/20"
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white font-semibold block mb-2">Y Position</label>
                    <Input
                      type="number"
                      size="sm"
                      value={Math.round(selectedItem.y)}
                      onChange={(e) => updateItemProperty('y', parseInt(e.target.value) || 0)}
                      classNames={{
                        input: "text-gray-900",
                        inputWrapper: "bg-white border-white/20"
                      }}
                    />
                  </div>
                </div>

                {/* Slideshow-specific properties */}
                {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                  <div className="border-t border-white/20 pt-4 mt-4">
                    <h5 className="text-sm text-white font-semibold mb-3 flex items-center gap-2">
                      <Play className="w-4 h-4 text-purple-400" />
                      Slideshow Settings
                    </h5>
                    <div className="space-y-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                        <div className="text-xs text-white font-medium mb-1">
                          Slides: {selectedItem.playlist?.length || 0}
                        </div>
                        {selectedItem.playlist && selectedItem.playlist.length > 0 && (
                          <div className="text-xs text-blue-300 mb-2">
                            Total Duration: {selectedItem.playlist.reduce((total, slide) => total + (slide.duration || 5), 0)}s
                          </div>
                        )}
                        <p className="text-xs text-gray-300 leading-relaxed">
                          Drag files from above to add slides. Use timeline controls below.
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
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-300 p-4 flex justify-between items-center shadow-sm">
              <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <span>Canvas</span>
                <span className="text-sm font-normal text-slate-300">({canvasItems.length} items)</span>
                {selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                  <span className="ml-2 px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30">
                    Slideshow Mode
                  </span>
                )}
                {selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'announcement' && (
                  <span className="ml-2 px-3 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full border border-orange-400/30">
                    Announcement Mode
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-300">Size: {canvasSize.width}x{canvasSize.height}px</p>
              </div>
              <div className="flex gap-4 items-center">
              <Button
                onPress={handleSaveBoard}
                isLoading={saving}
                className={`${
                  hasUnsavedChanges 
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                } text-white font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 rounded-2xl px-6 py-3 h-12 flex items-center justify-center gap-3`}
              >
                <Save className="w-5 h-5 flex-shrink-0" />
                <span>
                  {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Save Board'}
                  {hasUnsavedChanges && !saving && <span className="ml-1 w-2 h-2 bg-white rounded-full inline-block animate-pulse"></span>}
                </span>
              </Button>
              {lastSaved && (
                <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-emerald-200 font-medium">
                    Saved at {lastSaved.toLocaleTimeString()}
                  </span>
                </div>
              )}
              {saveError && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-200 font-medium">
                    Error: {saveError}
                  </span>
                </div>
              )}
              </div>
            </div>

          {/* Canvas Container */}
          <div className="flex-1 p-6 bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 overflow-auto">
            <div className="h-full flex items-center justify-center">
              <div
                ref={canvasRef}
                className="relative border-2 border-slate-200/50 rounded-3xl shadow-2xl backdrop-blur-sm bg-gradient-to-br from-white/80 to-gray-50/80"
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
                    return (
                      <RenderWidget
                        key={item.id}
                        widgetType={item.widgetType}
                        x={item.x * 0.6}
                        y={item.y * 0.6}
                        width={item.width * 0.6}
                        height={item.height * 0.6}
                        mode="organize"
                        isSelected={selectedItem?.id === item.id}
                        item={item}
                        onDragStart={handleDragStart}
                        setSelectedItem={setSelectedItem}
                        onResizeStart={handleResizeStart}
                        onAddToSlideshow={addToSlideshow}
                        uploadedFiles={uploadedFiles}
                      />
                    )
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
                    
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      handleSlideshowFileUpload(files, 'image')
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
                    
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      handleSlideshowFileUpload(files, 'video')
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
                            preload="metadata"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-900 mb-2">Loading Board Editor</p>
          <p className="text-gray-600">Preparing your creative workspace...</p>
        </div>
      </div>
    }>
      <OrganizePageContent />
    </Suspense>
  )
}

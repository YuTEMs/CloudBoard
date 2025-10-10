"use client"

import { Button } from "@heroui/react"
import { Save, Settings } from "lucide-react"
import { ClipboardList } from "lucide-react"
import { useState, useRef, useEffect, useCallback, Suspense, memo, useMemo } from "react"
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from "next/navigation"
import toast from 'react-hot-toast'
import { AppHeader } from "../../components/layout/app-hearder"
import { useRealtimeBoards } from "../../hooks/useRealtimeBoards"
import { useBoardSave } from "../../hooks/useBoardSave"
import { uploadMedia, isTooLarge, deleteMedia } from "../../lib/storage"
import { ToolsPanel } from "../../components/organize/ToolsPanel"
import { PropertiesPanel } from "../../components/organize/PropertiesPanel"
import { CanvasArea } from "../../components/organize/CanvasArea"
import { OrientationSelector } from "../../components/organize/OrientationSelector"
import { ContextPanel } from "../../components/organize/ContextPanel"
import { ResponsiveLayout } from "../../components/organize/ResponsiveLayout"

// Widget Components removed - now using shared widgets
// Widget definitions removed - now using shared widgets from ../../components/widgets

function OrganizePageContent() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('board')
  const { data: session } = useSession()
  const userIdForPath = session?.user?.id || 'anonymous'
  const router = useRouter()
  
  // Use real-time boards hook
  const { boards, updateBoard } = useRealtimeBoards()
  const currentBoard = boards.find(board => board.id === boardId)
  
  // Check user permissions - only allow edit access for owners and editors
  const userRole = currentBoard?.userRole
  const hasWriteAccess = userRole === 'owner' || userRole === 'editor'
  
  // Canvas and board state
  const [canvasItems, setCanvasItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [draggedItem, setDraggedItem] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 })
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
  const justSavedRef = useRef(false)
  const isSavingRef = useRef(false)

  // Calculate dynamic scale factor that ensures canvas fits in available space
  const [isMounted, setIsMounted] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 1920, height: 1080 })

  useEffect(() => {
    setIsMounted(true)
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  const canvasScale = useMemo(() => {
    // Use fixed scale during SSR to prevent hydration mismatch
    if (!isMounted) return 0.6

    const availableWidth = windowSize.width - 700 // 680-700px for side panels + margins
    const availableHeight = windowSize.height - 230 // 230px for app header (80) + canvas header (100) + padding (32) + margins (18)
    const scaleToFitWidth = availableWidth / canvasSize.width
    const scaleToFitHeight = availableHeight / canvasSize.height
    return Math.min(scaleToFitWidth, scaleToFitHeight, 0.6); // Max scale of 0.6
  }, [isMounted, windowSize, canvasSize])

  // Refs for high-frequency resize updates (avoid re-subscribing listeners)
  const isResizingRef = useRef(false)
  const selectedItemRef = useRef(null)
  const selectedItemIdRef = useRef(null)
  const resizeHandleRef = useRef(null)
  const resizeStartPosRef = useRef({ x: 0, y: 0 })
  const resizeStartSizeRef = useRef({ width: 0, height: 0, x: 0, y: 0 })
  const canvasSizeRef = useRef(canvasSize)
  const canvasScaleRef = useRef(canvasScale)
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

  // Check permission and redirect if user only has viewer access
  useEffect(() => {
    if (currentBoard && userRole && !hasWriteAccess) {
      // Redirect viewers to display page
      router.push(`/display?board=${boardId}`)
      return
    }
  }, [currentBoard, userRole, hasWriteAccess, boardId, router])

  // Load board data from real-time hook - only if no unsaved changes
  useEffect(() => {
    if (currentBoard) {
      setBoardName(currentBoard.name)

      // Only update local state if there are no unsaved changes to prevent overriding user's work
      // Also skip if we just saved to prevent stuttering (the data is already current)
      if (!hasUnsavedChanges && !justSavedRef.current) {
        const newItems = currentBoard.configuration?.items || []
        const newBackgroundImage = currentBoard.configuration?.backgroundImage || null
        const newBackgroundColor = currentBoard.configuration?.backgroundColor || "#ffffff"

        // Default canvas size fallback
        const savedCanvasSize = currentBoard.configuration?.canvasSize;
        const defaultCanvasSize = { width: 1920, height: 1080 };
        const newCanvasSize =
        savedCanvasSize && savedCanvasSize.width && savedCanvasSize.height
          ? savedCanvasSize
          : defaultCanvasSize;

        setCanvasItems(newItems)
        setBackgroundImage(newBackgroundImage)
        setBackgroundColor(newBackgroundColor)
        setCanvasSize(newCanvasSize);

        // Store the current state as the last saved state for comparison
        setLastSavedState({
          items: newItems,
          backgroundImage: newBackgroundImage,
          backgroundColor: newBackgroundColor,
          canvasSize: newCanvasSize
        })
      }

      // Clear justSaved flag after real-time update confirms the save
      if (justSavedRef.current) {
        justSavedRef.current = false
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
        backgroundColor,
        canvasSize
      })
      const lastSavedStateString = JSON.stringify(lastSavedState)

      const hasChanges = currentStateString !== lastSavedStateString
      if (hasChanges !== hasUnsavedChanges) {
        setHasUnsavedChanges(hasChanges)
      }
    }
  }, [canvasItems, backgroundImage, backgroundColor, canvasSize, lastSavedState, hasUnsavedChanges])

  // Keep refs in sync with state that is read during resize
  useEffect(() => {
    selectedItemRef.current = selectedItem
    selectedItemIdRef.current = selectedItem?.id || null
    // Compute once when selection changes
    isSlideshowRef.current = !!(selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow')
  }, [selectedItem])

  useEffect(() => {
    canvasSizeRef.current = canvasSize
    canvasScaleRef.current = canvasScale
  }, [canvasSize, canvasScale])

  // Manual save function - only saves when user clicks Save button
  const handleSaveBoard = useCallback(async () => {
    if (!boardId) return

    try {
      isSavingRef.current = true  // Prevent widget re-renders during save

      const configuration = {
        items: canvasItems,
        canvasSize,
        backgroundImage,
        backgroundColor
      }

      await saveBoardToDb(boardId, configuration)

      // Mark as saved and update last saved state
      justSavedRef.current = true  // Prevent reload stutter
      setHasUnsavedChanges(false)
      setLastSavedState({
        items: [...canvasItems],
        backgroundImage,
        backgroundColor,
        canvasSize: { ...canvasSize }
      })

    } catch (error) {
    } finally {
      isSavingRef.current = false
    }
  }, [boardId, canvasItems, canvasSize, backgroundImage, backgroundColor, saveBoardToDb])

  // Widget size configurations
  const getWidgetSize = (type, subType = null) => {
    const sizes = {
      time: subType === 'analog' ? { width: 150, height: 150 } : { width: 200, height: 100 },
      weather: { width: 250, height: 150 },
      slideshow: { width: 480, height: 270 }, // 16:9 aspect ratio
    }
    return sizes[type] || { width: 200, height: 100 }
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
    // getBoundingClientRect() returns transformed bounds, no need to divide by scale
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    e.dataTransfer.setData("text/plain", JSON.stringify({ offsetX, offsetY }))

    // Create simple box as drag preview matching visual size
    const dragImage = document.createElement('div')
    dragImage.style.width = `${rect.width}px`
    dragImage.style.height = `${rect.height}px`
    dragImage.style.backgroundColor = 'rgba(59, 130, 246, 0.5)' // Blue semi-transparent
    dragImage.style.border = '2px solid rgb(59, 130, 246)'
    dragImage.style.borderRadius = '8px'
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-9999px'
    dragImage.style.left = '-9999px'
    dragImage.style.pointerEvents = 'none'
    document.body.appendChild(dragImage)

    // Set custom drag image
    e.dataTransfer.setDragImage(dragImage, offsetX, offsetY)

    // Clean up after drag starts
    requestAnimationFrame(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    })
  }, [isResizing])

  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault()
    if (!draggedItem) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const dropData = JSON.parse(e.dataTransfer.getData("text/plain"))

    // Calculate mouse position relative to canvas in screen space
    const mouseXInCanvas = e.clientX - canvasRect.left
    const mouseYInCanvas = e.clientY - canvasRect.top

    // Convert both mouse position and offset from scaled space to canvas space
    const canvasMouseX = mouseXInCanvas / canvasScale
    const canvasMouseY = mouseYInCanvas / canvasScale
    const canvasOffsetX = dropData.offsetX / canvasScale
    const canvasOffsetY = dropData.offsetY / canvasScale

    // Calculate new position in canvas coordinates
    const newX = canvasMouseX - canvasOffsetX
    const newY = canvasMouseY - canvasOffsetY

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
  }, [draggedItem, canvasSize, canvasScale])

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

      let newWidth = startSize.width
      let newHeight = startSize.height
      let newX = startSize.x
      let newY = startSize.y

      // Calculate new dimensions based on resize handle
      switch (handle) {
        case 'nw':
          newWidth = Math.max(50, startSize.width - deltaX)
          newHeight = Math.max(50, startSize.height - deltaY)
          newX = startSize.x + (startSize.width - newWidth)
          newY = startSize.y + (startSize.height - newHeight)
          break
        case 'ne':
          newWidth = Math.max(50, startSize.width + deltaX)
          newHeight = Math.max(50, startSize.height - deltaY)
          newY = startSize.y + (startSize.height - newHeight)
          break
        case 'sw':
          newWidth = Math.max(50, startSize.width - deltaX)
          newHeight = Math.max(50, startSize.height + deltaY)
          newX = startSize.x + (startSize.width - newWidth)
          break
        case 'se':
          newWidth = Math.max(50, startSize.width + deltaX)
          newHeight = Math.max(50, startSize.height + deltaY)
          break
      }

      // Apply bounds checking
      newX = Math.max(0, Math.min(newX, canvas.width - newWidth))
      newY = Math.max(0, Math.min(newY, canvas.height - newHeight))

      // Maintain 16:9 for slideshow widgets
      if (isSlideshow) {
        const aspectRatio = 16 / 9
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
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

  // Delete selected item
  const deleteSelectedItem = useCallback(() => {
    if (selectedItem) {
      setCanvasItems(items => items.filter(item => item.id !== selectedItem.id))
      setSelectedItem(null)
    }
  }, [selectedItem])


  // Handle file upload
  const handleFileUpload = async (files, type) => {
    setIsUploading(true)

    // Show validation toast
    const validationToast = toast.loading('Validating content...', {
      duration: Infinity
    })

    try {
      const tasks = Array.from(files).map(async (file) => {
        if (type === 'image' && !file.type.startsWith('image/')) return null
        if (type === 'video' && !file.type.startsWith('video/')) return null
        if (isTooLarge(file)) {
          const mb = (file.size / (1024 * 1024)).toFixed(1)
          toast.error(`File too large: ${file.name} (${mb}MB). Max allowed is 50MB.`)
          return null
        }

        try {
          const { publicUrl, bucket, path } = await uploadMedia(file, {
            boardId: boardId || 'shared',
            userId: userIdForPath,
            kind: type,
            validateContent: true,
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
        } catch (error) {
          // Show error toast for blocked content
          if (error.message.startsWith('Upload blocked:')) {
            toast.error(error.message, { duration: 5000 })
          } else {
            toast.error(`Failed to upload ${file.name}: ${error.message}`)
          }
          throw error
        }
      })

      const results = await Promise.allSettled(tasks)
      const uploads = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)

      // Dismiss validation toast
      toast.dismiss(validationToast)

      if (uploads.length) {
        setUploadedFiles((prev) => [...prev, ...uploads])
        toast.success(`Successfully uploaded ${uploads.length} file(s)`)
      }

      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length && uploads.length === 0) {
        toast.error(`All ${failures.length} file(s) failed to upload`)
      }
    } catch (error) {
      toast.dismiss(validationToast)
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle slideshow-specific file upload (independent)
  const handleSlideshowFileUpload = async (files, type) => {
    if (!selectedItem || selectedItem.widgetType !== 'slideshow') return
    setIsUploading(true)

    // Show validation toast
    const validationToast = toast.loading('Validating slideshow content...', {
      duration: Infinity
    })

    try {
      const startOrder = (selectedItem.playlist?.length || 0)
      const tasks = Array.from(files).map(async (file, idx) => {
        if ((type === 'image' && !file.type.startsWith('image/')) ||
            (type === 'video' && !file.type.startsWith('video/'))) return null
        if (isTooLarge(file)) {
          const mb = (file.size / (1024 * 1024)).toFixed(1)
          toast.error(`File too large: ${file.name} (${mb}MB). Max allowed is 50MB.`)
          return null
        }

        try {
          const { publicUrl } = await uploadMedia(file, {
            boardId: boardId || 'shared',
            userId: userIdForPath,
            kind: type,
            validateContent: true,
          })
          return {
            id: `slide_${Date.now()}_${Math.random()}`,
            type,
            name: file.name,
            url: publicUrl,
            duration: 5,
            order: startOrder + idx + 1,
          }
        } catch (error) {
          // Show error toast for blocked content
          if (error.message.startsWith('Upload blocked:')) {
            toast.error(error.message, { duration: 5000 })
          } else {
            toast.error(`Failed to upload ${file.name}: ${error.message}`)
          }
          throw error
        }
      })

      const results = await Promise.allSettled(tasks)
      const slides = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)

      // Dismiss validation toast
      toast.dismiss(validationToast)
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
    const path = typeof e.composedPath === 'function' ? e.composedPath() : []
    const clickedInsidePropertiesPanel = path.some(
      (node) => node instanceof HTMLElement && node.hasAttribute('data-properties-panel')
    )

    // Only deselect if clicking outside the main canvas area, panels, and sidebars
    const isCanvasArea = canvasRef.current?.contains(e.target)
    const isSlideshowPanel = e.target.closest('[data-slideshow-panel]')
    const isPropertiesPanel = clickedInsidePropertiesPanel || e.target.closest('[data-properties-panel]')
    const isToolsPanel = e.target.closest('[data-tools-panel]')
    const isSidebar = e.target.closest('.w-72') || e.target.closest('.w-80')

    if (!isCanvasArea && !isSlideshowPanel && !isPropertiesPanel && !isToolsPanel && !isSidebar) {
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
      // Also skip during save to prevent widget re-renders
      if (!isResizingRef.current && !isSavingRef.current) {
        // Only update if the item reference actually changed
        if (updatedItem !== selectedItem) {
          setSelectedItem(updatedItem)
        }
      }
    }
  }, [canvasItems, selectedItem])


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
      toast.error(`Background image too large (${mb}MB). Max allowed is 50MB.`)
      return
    }

    // Show validation toast
    const validationToast = toast.loading('Validating background image...', {
      duration: Infinity
    })

    try {
      const { publicUrl } = await uploadMedia(file, {
        boardId: boardId || 'shared',
        userId: userIdForPath,
        kind: 'image',
        validateContent: true,
      })
      toast.dismiss(validationToast)
      setBackgroundImage(publicUrl)
      toast.success('Background image uploaded successfully')
    } catch (err) {
      toast.dismiss(validationToast)
      if (err.message.startsWith('Upload blocked:')) {
        toast.error(err.message, { duration: 5000 })
      } else {
        toast.error(`Failed to upload background: ${err.message || err}`)
      }
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
  const addWidget = (type, timeType = null, backgroundColor = null) => {
    const sizes = getWidgetSize(type, timeType)
    let widgetName = '';
    if (type === 'time') widgetName = 'Time';
    else if (type === 'weather') widgetName = 'Weather';
    else if (type === 'slideshow') widgetName = 'Slideshow';

    const widget = {
      type: 'widget',
      widgetType: type,
      name: `${widgetName} Widget`,
      width: sizes.width,
      height: sizes.height,
      timeType: type === 'time' ? (timeType || 'digital') : undefined,
      backgroundColor: type === 'time' ? (
        backgroundColor !== null ? backgroundColor : (timeType === 'analog' ? 'transparent' : '#1e293b')
      ) : undefined,
      playlist: type === 'slideshow' ? [] : undefined,
      locations: type === 'weather' ? [] : undefined,
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

  const handleUpdateDuration = (url, duration) => {
  setCanvasItems(items =>
    items.map(item =>
      item.widgetType === 'slideshow' && item.playlist
        ? {
            ...item,
            playlist: item.playlist.map(slide =>
              slide.url === url ? { ...slide, duration } : slide
            )
          }
        : item
    )
  )
}

  // Function to handle orientation change
  const handleOrientationChange = (mode) => {
    const oldWidth = canvasSize.width;
    const oldHeight = canvasSize.height;

    let newWidth, newHeight;
    if (mode === 'landscape') {
      newWidth = 1920;
      newHeight = 1080;
    } else if (mode === 'portrait') {
      newWidth = 1080;
      newHeight = 1920;
    }

    // Calculate scale factors
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    // Transform all canvas items to fit new orientation
    const transformedItems = canvasItems.map(item => ({
      ...item,
      x: item.x * scaleX,
      y: item.y * scaleY,
      width: item.width * scaleX,
      height: item.height * scaleY
    }));

    setCanvasItems(transformedItems);
    setCanvasSize({ width: newWidth, height: newHeight });
  };

  // Show loading while checking permissions
  if (currentBoard && userRole && !hasWriteAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-900 mb-2">Redirecting to Display Mode</p>
          <p className="text-gray-600">You have view-only access to this board</p>
        </div>
      </div>
    )
  }

  // Show access denied if no board access at all
  if (currentBoard && userRole === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to edit this board.</p>
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 rounded-xl"
            onPress={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <AppHeader title={`Edit Board: ${boardName}`} showBack backHref="/dashboard" />
      <ResponsiveLayout
        toolsPanel={
          <ToolsPanel
            isUploading={isUploading}
            uploadedFiles={uploadedFiles}
            mediaInputRef={mediaInputRef}
            backgroundInputRef={backgroundInputRef}
            handleFileUpload={handleFileUpload}
            handleDragOver={handleDragOver}
            addWidget={addWidget}
            makeFileDraggable={makeFileDraggable}
            addToCanvas={addToCanvas}
            removeUploadedFile={removeUploadedFile}
            handleBackgroundUpload={handleBackgroundUpload}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            backgroundImage={backgroundImage}
            setBackgroundImage={setBackgroundImage}
          />
        }
        propertiesPanel={
          <PropertiesPanel
            selectedItem={selectedItem}
            updateItemProperty={updateItemProperty}
            deleteSelectedItem={deleteSelectedItem}
            canvasItems={canvasItems}
            isUploading={isUploading}
            slideshowImageInputRef={slideshowImageInputRef}
            slideshowVideoInputRef={slideshowVideoInputRef}
            handleSlideshowFileUpload={handleSlideshowFileUpload}
            handleDragOver={handleDragOver}
            addToSlideshow={addToSlideshow}
            uploadedFiles={uploadedFiles}
            makeFileDraggable={makeFileDraggable}
            moveSlide={moveSlide}
            canvasSize={canvasSize}
          />
        }
        contextPanel={
          <ContextPanel
            selectedItem={selectedItem}
            addToSlideshow={addToSlideshow}
            moveSlide={moveSlide}
          />
        }
      >
        {/* Canvas Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-300 p-4 flex justify-between items-center shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:inline">Canvas</span>
              <span className="text-sm font-normal text-slate-300">({canvasItems.length} items)</span>
              {selectedItem && selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                <span className="ml-2 px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30 hidden sm:inline">
                  Slideshow Mode
                </span>
              )}
            </h3>
            <OrientationSelector
              canvasSize={canvasSize}
              onOrientationChange={handleOrientationChange}
            />
          </div>
          <div className="flex gap-2 sm:gap-4 items-center">
            <Button
              onPress={handleSaveBoard}
              isLoading={saving}
              size="sm"
              className={`${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              } text-white font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 rounded-2xl px-3 sm:px-6 py-2 sm:py-3 h-10 sm:h-12 flex items-center justify-center gap-2 sm:gap-3`}
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm">
                {saving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Save'}
                {hasUnsavedChanges && !saving && <span className="ml-1 w-2 h-2 bg-white rounded-full inline-block animate-pulse"></span>}
              </span>
            </Button>
            {lastSaved && (
              <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-2 sm:px-3 py-1 sm:py-2 flex items-center gap-2 hidden sm:flex">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-200 font-medium">
                  Saved at {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            )}
            {saveError && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-2 sm:px-3 py-1 sm:py-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs text-red-200 font-medium">
                  Error
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <CanvasArea
          canvasRef={canvasRef}
          canvasSize={canvasSize}
          canvasScale={canvasScale}
          backgroundColor={backgroundColor}
          backgroundImage={backgroundImage}
          canvasItems={canvasItems}
          selectedItem={selectedItem}
          handleCanvasDrop={handleCanvasDrop}
          handleCanvasClick={handleCanvasClick}
          handleDragStart={handleDragStart}
          setSelectedItem={setSelectedItem}
          handleResizeStart={handleResizeStart}
          addToSlideshow={addToSlideshow}
          uploadedFiles={uploadedFiles}
          handleUpdateDuration={handleUpdateDuration}
        />
      </ResponsiveLayout>
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

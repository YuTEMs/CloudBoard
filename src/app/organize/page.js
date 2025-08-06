"use client"

import { Button, useDisclosure } from "@heroui/react"
import { Move, Plus, FileText, Check, ImageIcon, Video, Trash2 } from "lucide-react"
import { useState, useRef } from "react"
import { AppHeader } from "../../components/layout/app-hearder"

// Mock data for available content
const mockAssets = {
  images: [
    { id: "img1", name: "Logo.png", url: "/placeholder.svg?height=100&width=150&text=Logo", type: "image" },
    { id: "img2", name: "Banner.jpg", url: "/placeholder.svg?height=100&width=200&text=Banner", type: "image" },
    { id: "img3", name: "Product.png", url: "/placeholder.svg?height=120&width=120&text=Product", type: "image" },
  ],
  videos: [
    { id: "vid1", name: "Promo.mp4", thumbnail: "/placeholder.svg?height=100&width=150&text=Video1", type: "video" },
    { id: "vid2", name: "Demo.mp4", thumbnail: "/placeholder.svg?height=100&width=150&text=Video2", type: "video" },
  ],
}

export default function OrganizePage() {
  const [canvasElements, setCanvasElements] = useState([])
  const [selectedElement, setSelectedElement] = useState(null)
  const [draggedElement, setDraggedElement] = useState(null)
  const [isResizing, setIsResizing] = useState(false)
  const canvasRef = useRef(null)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const handleFileUpload = (files, type) => {
    const newFiles = Array.from(files).map((file) => ({
      id: `${type}_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: type,
      file: file,
      url: URL.createObjectURL(file),
      size: file.size,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, type) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleFileUpload(files, type)
  }

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  // Add element to canvas
  const addElementToCanvas = (asset, position = { x: 50, y: 50 }) => {
    const newElement = {
      id: `element_${Date.now()}`,
      assetId: asset.id,
      type: asset.type,
      name: asset.name,
      url: asset.url || asset.thumbnail,
      position,
      size: { width: 150, height: 100 },
      zIndex: canvasElements.length + 1,
    }
    setCanvasElements([...canvasElements, newElement])
  }

  // Add text element
  const addTextElement = () => {
    const newElement = {
      id: `text_${Date.now()}`,
      type: "text",
      content: "Sample Text",
      position: { x: 100, y: 100 },
      size: { width: 200, height: 50 },
      style: { fontSize: "18px", color: "#000000", fontWeight: "normal" },
      zIndex: canvasElements.length + 1,
    }
    setCanvasElements([...canvasElements, newElement])
  }

  // Handle drag start
  const handleDragStart = (e, element) => {
    setDraggedElement(element)
    setSelectedElement(element)
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    e.dataTransfer.setData("text/plain", JSON.stringify({ offsetX, offsetY }))
  }

  // Handle drop on canvas
  const handleCanvasDrop = (e) => {
    e.preventDefault()
    if (!draggedElement) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const dropData = JSON.parse(e.dataTransfer.getData("text/plain"))

    const newPosition = {
      x: e.clientX - canvasRect.left - dropData.offsetX,
      y: e.clientY - canvasRect.top - dropData.offsetY,
    }

    setCanvasElements((elements) =>
      elements.map((el) => (el.id === draggedElement.id ? { ...el, position: newPosition } : el)),
    )
    setDraggedElement(null)
  }

  // Handle resize
  const handleResize = (elementId, newSize) => {
    setCanvasElements((elements) => elements.map((el) => (el.id === elementId ? { ...el, size: newSize } : el)))
  }

  // Delete element
  const deleteElement = (elementId) => {
    setCanvasElements((elements) => elements.filter((el) => el.id !== elementId))
    setSelectedElement(null)
  }

  // Save layout
  const saveLayout = () => {
    console.log("Saving layout:", canvasElements)
    // Here you would typically send the layout to your backend
    alert("Layout saved successfully!")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Organize Page" showBack backHref="/upload" />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Content Library Sidebar */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Content Library</h3>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button size="sm" variant="bordered" startContent={<Plus className="w-4 h-4" />} onPress={addTextElement}>
              Add Text
            </Button>
            <Button size="sm" variant="bordered" startContent={<FileText className="w-4 h-4" />}>
              Template
            </Button>
          </div>

          {/* Images Section */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Images
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {mockAssets.images.map((asset) => (
                <div
                  key={asset.id}
                  className="border rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => addElementToCanvas(asset)}
                >
                  <img
                    src={asset.url || "/placeholder.svg"}
                    alt={asset.name}
                    className="w-full h-16 object-cover rounded mb-1"
                  />
                  <p className="text-xs text-gray-600 truncate">{asset.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Videos Section */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Videos
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {mockAssets.videos.map((asset) => (
                <div
                  key={asset.id}
                  className="border rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => addElementToCanvas(asset)}
                >
                  <div className="relative">
                    <img
                      src={asset.thumbnail || "/placeholder.svg"}
                      alt={asset.name}
                      className="w-full h-16 object-cover rounded mb-1"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black bg-opacity-50 rounded-full p-1">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{asset.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Element Properties */}
          {selectedElement && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Properties</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-600">Width</label>
                  <input
                    type="number"
                    value={selectedElement.size.width}
                    onChange={(e) =>
                      handleResize(selectedElement.id, {
                        ...selectedElement.size,
                        width: Number.parseInt(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Height</label>
                  <input
                    type="number"
                    value={selectedElement.size.height}
                    onChange={(e) =>
                      handleResize(selectedElement.id, {
                        ...selectedElement.size,
                        height: Number.parseInt(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                {selectedElement.type === "text" && (
                  <div>
                    <label className="text-sm text-gray-600">Text Content</label>
                    <input
                      type="text"
                      value={selectedElement.content}
                      onChange={(e) => {
                        setCanvasElements((elements) =>
                          elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, content: e.target.value } : el,
                          ),
                        )
                        setSelectedElement({ ...selectedElement, content: e.target.value })
                      }}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                )}
                <Button
                  size="sm"
                  color="danger"
                  variant="bordered"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={() => deleteElement(selectedElement.id)}
                  className="w-full"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Canvas (1920x1080)</h3>
            <Button color="primary" startContent={<Check className="w-4 h-4" />} onPress={saveLayout}>
              Save Layout
            </Button>
          </div>

          <div
            ref={canvasRef}
            className="relative bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
            style={{ width: "800px", height: "450px" }} // 16:9 aspect ratio scaled down
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
            onClick={() => setSelectedElement(null)}
          >
            {canvasElements.map((element) => (
              <div
                key={element.id}
                draggable
                onDragStart={(e) => handleDragStart(e, element)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedElement(element)
                }}
                className={`absolute cursor-move border-2 ${selectedElement?.id === element.id ? "border-blue-500" : "border-transparent"
                  } hover:border-blue-300 transition-colors group`}
                style={{
                  left: element.position.x,
                  top: element.position.y,
                  width: element.size.width,
                  height: element.size.height,
                  zIndex: element.zIndex,
                }}
              >
                {element.type === "image" && (
                  <img
                    src={element.url || "/placeholder.svg"}
                    alt={element.name}
                    className="w-full h-full object-cover rounded"
                    draggable={false}
                  />
                )}

                {element.type === "video" && (
                  <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center relative">
                    <Video className="w-8 h-8 text-gray-500" />
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                      {element.name}
                    </div>
                  </div>
                )}

                {element.type === "text" && (
                  <div
                    className="w-full h-full flex items-center justify-center bg-transparent border border-dashed border-gray-400 rounded"
                    style={element.style}
                  >
                    {element.content}
                  </div>
                )}

                {/* Resize Handle */}
                {selectedElement?.id === element.id && (
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setIsResizing(true)
                      // Add resize logic here if needed
                    }}
                  />
                )}
              </div>
            ))}

            {canvasElements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Move className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Click on content from the library to add it to the canvas</p>
                  <p className="text-sm">Then drag and resize to position elements</p>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Info */}
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Elements: {canvasElements.length} | Selected:{" "}
              {selectedElement ? selectedElement.name || selectedElement.content : "None"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

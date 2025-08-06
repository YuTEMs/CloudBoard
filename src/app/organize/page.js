"use client"

import { Button, Card, CardBody } from "@heroui/react"
import { Move, Plus, FileText, Check, ImageIcon, Video, Trash2, Upload } from "lucide-react"
import { useState, useRef } from "react"
import { AppHeader } from "../../components/layout/app-hearder"

// Mock data for available content
const mockAssets = {
  images: [
    { id: "img1", name: "Logo.png", url: "/placeholder.svg?height=100&width=150&text=Logo", type: "image", size: { width: 150, height: 100 } },
    { id: "img2", name: "Banner.jpg", url: "/placeholder.svg?height=100&width=200&text=Banner", type: "image", size: { width: 150, height: 100 } },
    { id: "img3", name: "Product.png", url: "/placeholder.svg?height=120&width=120&text=Product", type: "image", size: { width: 150, height: 100 } },
  ],
  videos: [
    { id: "vid1", name: "Promo.mp4", thumbnail: "/placeholder.svg?height=100&width=150&text=Video1", type: "video", size: { width: 150, height: 100 } },
    { id: "vid2", name: "Demo.mp4", thumbnail: "/placeholder.svg?height=100&width=150&text=Video2", type: "video", size: { width: 150, height: 100 } },
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
  const [activeTab, setActiveTab] = useState("existing") // "existing" or "upload"

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
    const originalWidth = asset.size.width;
    const originalHeight = asset.size.height;

    const newElement = {
      id: `element_${Date.now()}`,
      assetId: asset.id,
      type: asset.type,
      name: asset.name,
      url: asset.url || asset.thumbnail,
      position,
      size: { width: originalWidth, height: originalHeight },
      zIndex: canvasElements.length + 1,
      originalHeight: originalHeight,
      originalWidth: originalWidth,
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
  const handleResize = (elementId, sizeUpdate) => {
    setCanvasElements((elements) =>
      elements.map((el) =>
        el.id === elementId
          ? { ...el, size: { ...el.size, ...sizeUpdate } }
          : el
      )
    );
  };

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

  // Get all available assets (existing + uploaded)
  const getAllAssets = () => {
    return {
      images: [...mockAssets.images, ...uploadedFiles.filter((f) => f.type === "image")],
      videos: [...mockAssets.videos, ...uploadedFiles.filter((f) => f.type === "video")],
    }
  }

  const allAssets = getAllAssets()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Organize Page" showBack backHref="/dashboard" />

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

          {/* Tab Navigation */}
          <div className="flex mb-4 border-b">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "existing"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => setActiveTab("existing")}
            >
              Library
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "upload"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => setActiveTab("upload")}
            >
              Upload ({uploadedFiles.length})
            </button>
          </div>

          {/* Existing Assets Tab */}
          {activeTab === "existing" && (
            <>
              {/* Images Section */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Images ({allAssets.images.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {allAssets.images.map((asset) => (
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
                  Videos ({allAssets.videos.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {allAssets.videos.map((asset) => (
                    <div
                      key={asset.id}
                      className="border rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => addElementToCanvas(asset)}
                    >
                      <div className="relative">
                        <img
                          src={asset.thumbnail || asset.url || "/placeholder.svg"}
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
            </>
          )}

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              {/* Image Upload */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Upload Images
                </h4>
                <Card>
                  <CardBody className="p-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleFileDrop(e, "image")}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-1">Drop images here</p>
                      <p className="text-xs text-gray-500">or click to browse</p>
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
              </div>

              {/* Video Upload */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Upload Videos
                </h4>
                <Card>
                  <CardBody className="p-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleFileDrop(e, "video")}
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-1">Drop videos here</p>
                      <p className="text-xs text-gray-500">or click to browse</p>
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
              </div>

              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Uploaded Files ({uploadedFiles.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-2 border rounded-lg">
                        <div className="w-12 h-12 flex-shrink-0">
                          {file.type === "image" ? (
                            <img
                              src={file.url || "/placeholder.svg"}
                              alt={file.name}
                              className="w-full h-full object-cover rounded"
                              onLoad={e => {
                                const img = e.target;
                                const width = img.naturalWidth;
                                const height = img.naturalHeight;
                                // Update the file object with its size
                                setUploadedFiles(prev =>
                                  prev.map(f =>
                                    f.id === file.id
                                      ? { ...f, size: { width, height } }
                                      : f
                                  )
                                );
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                              <Video className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{file.type}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="bordered" onPress={() => addElementToCanvas(file)}>
                            Add
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            isIconOnly
                            onPress={() => removeUploadedFile(file.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Element Properties */}
          {selectedElement && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Properties</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-600">Width</label>
                  <input
                    type="number"
                    value={selectedElement.size.width ?? 0}
                    onChange={(e) => {
                      const newWidth = Number.parseInt(e.target.value) || 0;
                      handleResize(selectedElement.id, { width: newWidth });
                      setSelectedElement({
                        ...selectedElement,
                        size: {
                          ...selectedElement.size,
                          width: newWidth,
                        },
                      });
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Height</label>
                  <input
                    type="number"
                    value={selectedElement.size.height ?? 0}
                    onChange={(e) => {
                      const newHeight = Number.parseInt(e.target.value) || 0;
                      handleResize(selectedElement.id, { height: newHeight });
                      setSelectedElement({
                        ...selectedElement,
                        size: {
                          ...selectedElement.size,
                          height: newHeight,
                        },
                      });
                    }}
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
                  variant="bordered"
                  onPress={() => {
                    handleResize(selectedElement.id, {
                      width: selectedElement.originalWidth,
                      height: selectedElement.originalHeight,
                    });
                    setSelectedElement({
                      ...selectedElement,
                      size: { 
                        ...selectedElement.size,
                        width: selectedElement.originalWidth,
                        height: selectedElement.originalHeight,},
                    });
                  }}
                  className="w-full mt-2"
                >
                  Reset Size
                </Button>
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
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            ))}

            {canvasElements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Move className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Click on content from the library to add it to the canvas</p>
                  <p className="text-sm">Upload new files or use existing assets</p>
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

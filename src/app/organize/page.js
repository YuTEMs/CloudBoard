"use client"

import { Button, Card, CardBody } from "@heroui/react"
import {
  Move,
  Plus,
  FileText,
  Check,
  ImageIcon,
  Video,
  Trash2,
  Upload,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { useState, useRef } from "react"
import { AppHeader } from "../../components/layout/app-hearder"
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"
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
  const [selectedSlide, setSelectedSlide] = useState(null)
  const [isResizing, setIsResizing] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState("existing") // "existing" or "upload"
  const [playlist, setPlaylist] = useState([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

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

  // Handle resize
  const handleResize = (elementId, sizeUpdate) => {
    setPlaylist((elements) =>
      elements.map((el) =>
        el.id === elementId
          ? { ...el, size: { ...el.size, ...sizeUpdate } }
          : el
      )
    );
  };

  // Save playlist
  const savePlaylist = async () => {
    try {
      if (!playlist.length) {
        alert("Add items to the playlist first.")
        return
      }

      const form = new FormData()
      const durationsOut = []
      let appendedCount = 0

      for (const slide of playlist) {
        const durationValue = Number.isFinite(slide.duration) ? slide.duration : 5

        // Prefer original uploaded file if present
        const matchedUpload = uploadedFiles.find((f) => f.id === slide.assetId)
        if (matchedUpload?.file) {
          form.append("files", matchedUpload.file)
          durationsOut.push(durationValue)
          appendedCount++
          continue
        }

        // Fallback: fetch by URL and upload as File
        try {
          if (!slide.url) continue
          const res = await fetch(slide.url, { mode: "cors" })
          if (!res.ok) {
            console.warn("Skipping asset (fetch failed):", slide.url, res.status)
            continue
          }
          const blob = await res.blob()
          const urlPath = (slide.url || "").split("?")[0]
          const ext = urlPath.includes(".") ? urlPath.substring(urlPath.lastIndexOf(".") + 1) : ""
          const safeName = (slide.name || `slide_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_")
          const filename = ext && !safeName.endsWith(`.${ext}`) ? `${safeName}.${ext}` : safeName
          const fileFromBlob = new File([blob], filename, { type: blob.type || undefined })
          form.append("files", fileFromBlob)
          durationsOut.push(durationValue)
          appendedCount++
        } catch (err) {
          console.error("Skipping asset (fetch error):", slide.url, err)
        }
      }

      if (appendedCount === 0) {
        alert("No valid files to upload.")
        return
      }

      form.append("durations", JSON.stringify(durationsOut))
      form.append("loop", "true")

      const response = await fetch(`${BACKEND_URL}/upload-playlist`, {
        method: "POST",
        body: form,
        mode: "cors",
      })

      if (!response.ok) {
        const text = await response.text()
        alert(`Failed to save playlist: ${text}`)
        return
      }

      const data = await response.json()
      console.log("Playlist saved:", data)
      alert("Playlist saved and broadcasting to display!")
    } catch (e) {
      console.error(e)
      alert("Unexpected error saving playlist.")
    }
  }

  // Get all available assets (existing + uploaded)
  const getAllAssets = () => {
    return {
      images: [...mockAssets.images, ...uploadedFiles.filter((f) => f.type === "image")],
      videos: [...mockAssets.videos, ...uploadedFiles.filter((f) => f.type === "video")],
    }
  }


  // Add content to playlist
  const addToPlaylist = (asset) => {
    const originalWidth = asset.size?.width ?? 300;
    const originalHeight = asset.size?.height ?? 300;
    const newSlide = {
      id: `slide_${Date.now()}`,
      assetId: asset.id,
      type: asset.type,
      name: asset.name,
      url: asset.url || asset.thumbnail,
      duration: 5, // Default 5 seconds
      order: playlist.length + 1,
      size: { height: originalHeight, width: originalWidth },
      originalHeight: originalHeight,
      originalWidth: originalWidth,
    }
    setPlaylist([...playlist, newSlide])
  }

  // Remove slide from playlist
  const removeSlide = (slideId) => {
    setPlaylist((prev) => prev.filter((slide) => slide.id !== slideId))
    setSelectedSlide(null)
  }

  // Move slide up/down in order
  const moveSlide = (slideId, direction) => {
    const slideIndex = playlist.findIndex((slide) => slide.id === slideId)
    const newPlaylist = [...playlist]
    const targetIndex = direction === "up" ? slideIndex - 1 : slideIndex + 1

    if ((direction === "up" && slideIndex === 0) || (direction === "down" && slideIndex === playlist.length - 1)) {
      return
    }
    // Swap slides
    ;[newPlaylist[slideIndex], newPlaylist[targetIndex]] = [newPlaylist[targetIndex], newPlaylist[slideIndex]]

    setPlaylist(newPlaylist)
  }

  // Update slide duration
  const updateSlideDuration = (slideId, duration) => {
    const newDuration = Number.parseInt(duration)

    setPlaylist((prev) => prev.map((slide) => (slide.id === slideId ? { ...slide, duration: newDuration } : slide)))

    // Also update selectedSlide if it's the one being modified
    if (selectedSlide && selectedSlide.id === slideId) {
      setSelectedSlide((prev) => ({ ...prev, duration: newDuration }))
    }
  }

  const allAssets = getAllAssets()
  const currentSlide = playlist[currentSlideIndex]
  const totalDuration = playlist.reduce((sum, slide) => sum + slide.duration, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Organize Page" showBack backHref="/dashboard" />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Content Library Sidebar */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Content Library</h3>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
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
                      onClick={() => addToPlaylist(asset)}
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
                      onClick={() => addToPlaylist(asset)}
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
                      onDrop={(e) => handleDrop(e, "image")}
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
                      onDrop={(e) => handleDrop(e, "video")}
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
                          {file.type === "video" ? (
                            <>
                              <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                <Video className="w-6 h-6 text-gray-500" />
                              </div>
                              <video
                                src={file.url}
                                style={{ display: "none" }}
                                onLoadedMetadata={e => {
                                  const video = e.target;
                                  const width = video.videoWidth;
                                  const height = video.videoHeight;
                                  setUploadedFiles(prev =>
                                    prev.map(f =>
                                      f.id === file.id
                                        ? { ...f, size: { width, height } }
                                        : f
                                    )
                                  );
                                }}
                              />
                            </>
                          ) : (
                            <img
                              src={file.url || "/placeholder.svg"}
                              alt={file.name}
                              className="w-full h-full object-cover rounded"
                              onLoad={e => {
                                const img = e.target;
                                const width = img.naturalWidth;
                                const height = img.naturalHeight;
                                setUploadedFiles(prev =>
                                  prev.map(f =>
                                    f.id === file.id
                                      ? { ...f, size: { width, height } }
                                      : f
                                  )
                                );
                              }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{file.type}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="bordered" onPress={() => addToPlaylist(file)}>
                            Add
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            isIconOnly
                            onPress={() => removeFile(file.id)}
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
          {currentSlide && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Properties</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-600">Width</label>
                  <input
                    type="number"
                    value={currentSlide.size.width ?? 0}
                    onChange={(e) => {
                      const newWidth = Number.parseInt(e.target.value) || 0;
                      handleResize(currentSlide.id, { width: newWidth });
                      setSelectedSlide({
                        ...currentSlide,
                        size: {
                          ...currentSlide.size,
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
                    value={currentSlide.size.height ?? 0}
                    onChange={(e) => {
                      const newHeight = Number.parseInt(e.target.value) || 0;
                      handleResize(currentSlide.id, { height: newHeight });
                      setSelectedSlide({
                        ...currentSlide,
                        size: {
                          ...currentSlide.size,
                          height: newHeight,
                        },
                      });
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() => {
                    handleResize(selectedSlide.id, {
                      width: selectedSlide.originalWidth,
                      height: selectedSlide.originalHeight,
                    });
                    setSelectedSlide({
                      ...selectedSlide,
                      size: {
                        ...selectedSlide.size,
                        width: selectedSlide.originalWidth,
                        height: selectedSlide.originalHeight,
                      },
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
                  onPress={() => removeSlide(selectedSlide.id)}
                  className="w-full"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Preview Area */}
          <div className="flex-1 p-6 bg-white">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Preview</h3>
                <p className="text-sm text-gray-600">
                  Slide {currentSlideIndex + 1} of {playlist.length} | Total Duration: {totalDuration}s
                </p>
              </div>
              <div className="flex gap-2">
                <Button color="primary" startContent={<Check className="w-4 h-4" />} onPress={savePlaylist}>
                  Save Playlist
                </Button>
              </div>
            </div>

            {/* Preview Display */}
            <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: "400px" }}>
              {currentSlide ? (
                <div className="w-full h-full flex items-center justify-center">
                  {currentSlide.type === "image" && (
                    <img
                      src={currentSlide.url || "/placeholder.svg"}
                      alt={currentSlide.name}
                      className="max-w-full max-h-full object-contain rounded"
                      style={{
                        width: currentSlide.size.width,
                        height: currentSlide.size.height,
                      }}
                    />
                  )}
                  {currentSlide.type === "video" && (
                    <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center">
                      <div className="text-center text-white">
                        <video
                          src={currentSlide.url}
                          className="max-w-full max-h-full object-contain rounded"
                          style={{
                            width: currentSlide.size.width,
                            height: currentSlide.size.height,
                          }}
                          controls
                          muted
                          onError={(e) => {
                            // Fallback to placeholder if video fails to load
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {currentSlide.type === "text" && (
                    <div
                      className="w-full h-full flex items-center justify-center rounded"
                      style={{
                        backgroundColor: currentSlide.style?.backgroundColor || "#ffffff",
                        color: currentSlide.style?.color || "#000000",
                        fontSize: currentSlide.style?.fontSize || "24px",
                        textAlign: currentSlide.style?.textAlign || "center",
                      }}
                    >
                      <div className="p-8">
                        <p>{currentSlide.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No content in playlist</p>
                  <p className="text-sm">Add images, videos, or text from the library</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline/Playlist Area */}
          <div className="bg-white border-t p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Playlist Timeline ({playlist.length} slides)</h4>
              {selectedSlide && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <select
                    className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                    value={selectedSlide.duration}
                    onChange={(e) => updateSlideDuration(selectedSlide.id, e.target.value)}
                  >
                    <option value="3">3s</option>
                    <option value="5">5s</option>
                    <option value="10">10s</option>
                    <option value="15">15s</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                  </select>
                </div>
              )}
            </div>

            {/* Timeline Slides */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {playlist.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`flex-shrink-0 border-2 rounded-lg p-2 cursor-pointer transition-colors ${selectedSlide?.id === slide.id
                    ? "border-blue-500 bg-blue-50"
                    : currentSlideIndex === index
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                    }`}
                  style={{ width: "120px" }}
                  onClick={() => {
                    setSelectedSlide(slide)
                    setCurrentSlideIndex(index)
                  }}
                >
                  {/* Slide Preview */}
                  <div className="w-full h-16 bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                    {slide.type === "image" && (
                      <img
                        src={slide.url || "/placeholder.svg"}
                        alt={slide.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {slide.type === "video" && (
                      <div className="w-full h-16 bg-gray-800 flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {slide.type === "text" && (
                      <div className="w-full h-16 flex items-center justify-center text-xs p-1">
                        <span className="truncate">{slide.content}</span>
                      </div>
                    )}
                  </div>

                  {/* Slide Info */}
                  <div className="text-center">
                    <p className="text-xs font-medium truncate">{index + 1}</p>
                    <p className="text-xs text-gray-500">{slide.duration}s</p>
                  </div>

                  {/* Controls */}
                  {selectedSlide?.id === slide.id && (
                    <div className="flex justify-center gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => moveSlide(slide.id, "up")}
                        isDisabled={index === 0}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => moveSlide(slide.id, "down")}
                        isDisabled={index === playlist.length - 1}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button size="sm" color="danger" variant="light" isIconOnly onPress={() => removeSlide(slide.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Slide Button */}
              <div
                className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg p-2 cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center"
                style={{ width: "120px", height: "120px" }}
                onClick={() => setActiveTab("existing")}
              >
                <div className="text-center text-gray-500">
                  <Plus className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-xs">Add Slide</p>
                </div>
              </div>
            </div>

            {/* Text Editor for Selected Text Slide */}
            {selectedSlide?.type === "text" && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h5 className="font-medium mb-2">Edit Text Content</h5>
                <Input
                  value={selectedSlide.content}
                  onChange={(e) => updateTextContent(selectedSlide.id, e.target.value)}
                  placeholder="Enter your text content"
                  className="mb-2"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


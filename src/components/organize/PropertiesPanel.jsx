"use client"

import { Button, Input } from "@heroui/react"
import { Settings, Trash2, Play, Move, Layers, ImageIcon, Video, Upload, Plus, ChevronUp, ChevronDown } from "lucide-react"

export function PropertiesPanel({
  selectedItem,
  updateItemProperty,
  deleteSelectedItem,
  canvasItems,
  // Slideshow-specific props
  isUploading,
  slideshowImageInputRef,
  slideshowVideoInputRef,
  handleSlideshowFileUpload,
  handleDragOver,
  addToSlideshow,
  uploadedFiles,
  makeFileDraggable,
  moveSlide
}) {
  // Prevent deselection when clicking anywhere in the properties panel
  const handlePropertiesPanelClick = (e) => {
    e.stopPropagation()
  }
  if (!selectedItem) {
    return (
      <div className="w-80 bg-gradient-to-b from-slate-100 to-white border-l border-slate-200 p-4 overflow-y-auto shadow-lg" data-properties-panel onClick={handlePropertiesPanelClick}>
        <h3 className="text-xl font-bold mb-6 text-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <span>Properties</span>
        </h3>

        {/* Canvas Overview */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50">
          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            Canvas Overview
          </h4>
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Items:</strong> {canvasItems.length}</p>
            <p><strong>Size:</strong> 1920×1080px</p>
            <p><strong>Scale:</strong> 60%</p>
          </div>
        </div>

        <div className="mt-6 text-center text-slate-500">
          <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
            <Move className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium">No Item Selected</p>
          <p className="text-xs mt-1">Click on a canvas item to view its properties</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-gradient-to-b from-slate-100 to-white border-l border-slate-200 p-4 overflow-y-auto shadow-lg" data-properties-panel onClick={handlePropertiesPanelClick}>
      <h3 className="text-xl font-bold mb-6 text-slate-900 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Settings className="w-4 h-4 text-white" />
        </div>
        <span>Properties</span>
      </h3>

      {/* Item Info */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 mb-6">
        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          {selectedItem.type === 'widget' && <Settings className="w-4 h-4 text-indigo-500" />}
          {selectedItem.type === 'image' && <div className="w-4 h-4 bg-blue-500 rounded"></div>}
          {selectedItem.type === 'video' && <div className="w-4 h-4 bg-purple-500 rounded"></div>}
          Selected Item
        </h4>
        <div className="space-y-2 text-sm">
          <p className="text-slate-600">
            <strong>Type:</strong> {selectedItem.type === 'widget' ? selectedItem.widgetType : selectedItem.type}
          </p>
          {selectedItem.name && (
            <p className="text-slate-600">
              <strong>Name:</strong> {selectedItem.name}
            </p>
          )}
        </div>
      </div>

      {/* Dimensions & Position */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 mb-6">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Move className="w-4 h-4 text-indigo-500" />
          Dimensions & Position
        </h4>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-700 font-semibold block mb-2 flex items-center gap-2">
              <span>Width</span>
              {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">16:9 ratio</span>
              )}
            </label>
            <Input
              type="number"
              size="sm"
              value={selectedItem.width}
              onChange={(e) => updateItemProperty('width', parseInt(e.target.value) || 0)}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              classNames={{
                input: "text-slate-900",
                inputWrapper: "bg-white border-slate-200"
              }}
            />
          </div>

          <div>
            <label className="text-sm text-slate-700 font-semibold block mb-2 flex items-center gap-2">
              <span>Height</span>
              {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">auto-adjusted</span>
              )}
            </label>
            <Input
              type="number"
              size="sm"
              value={selectedItem.height}
              onChange={(e) => updateItemProperty('height', parseInt(e.target.value) || 0)}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              classNames={{
                input: "text-slate-900",
                inputWrapper: "bg-white border-slate-200"
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-700 font-semibold block mb-2">X Position</label>
              <Input
                type="number"
                size="sm"
                value={Math.round(selectedItem.x)}
                onChange={(e) => updateItemProperty('x', parseInt(e.target.value) || 0)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                classNames={{
                  input: "text-slate-900",
                  inputWrapper: "bg-white border-slate-200"
                }}
              />
            </div>
            <div>
              <label className="text-sm text-slate-700 font-semibold block mb-2">Y Position</label>
              <Input
                type="number"
                size="sm"
                value={Math.round(selectedItem.y)}
                onChange={(e) => updateItemProperty('y', parseInt(e.target.value) || 0)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                classNames={{
                  input: "text-slate-900",
                  inputWrapper: "bg-white border-slate-200"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Slideshow-specific properties */}
      {selectedItem.type === 'widget' && selectedItem.widgetType === 'slideshow' && (
        <>
          {/* Slideshow Info */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 mb-6">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-500" />
              Slideshow Settings
            </h4>
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-700 font-medium mb-1">
                  Slides: {selectedItem.playlist?.length || 0}
                </div>
                {selectedItem.playlist && selectedItem.playlist.length > 0 && (
                  <div className="text-sm text-purple-600 mb-2">
                    Total Duration: {selectedItem.playlist.reduce((total, slide) => total + (slide.duration || 5), 0)}s
                  </div>
                )}
                <p className="text-xs text-slate-600 leading-relaxed">
                  Use the timeline below to manage slides and durations.
                </p>
              </div>
            </div>
          </div>

          {/* Upload Controls */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 mb-6">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-500" />
              Add Content
            </h4>

            <div className="space-y-3">
              {/* Image Upload */}
              <div
                className={`border-2 border-dashed border-blue-300 rounded-lg p-3 text-center transition-colors ${
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
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isUploading) slideshowImageInputRef.current?.click()
                }}
              >
                <ImageIcon className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-sm font-medium text-slate-700">Add Images</p>
                <p className="text-xs text-slate-500">Drag & drop or click</p>
              </div>

              {/* Video Upload */}
              <div
                className={`border-2 border-dashed border-purple-300 rounded-lg p-3 text-center transition-colors ${
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
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isUploading) slideshowVideoInputRef.current?.click()
                }}
              >
                <Video className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <p className="text-sm font-medium text-slate-700">Add Videos</p>
                <p className="text-xs text-slate-500">Drag & drop or click</p>
              </div>

              {/* Media Library Quick Access */}
              {uploadedFiles && uploadedFiles.length > 0 && (
                <div className="border-t border-slate-200 pt-3">
                  <h5 className="text-xs font-semibold text-slate-600 mb-2">From Media Library</h5>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.slice(0, 4).map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                        draggable
                        onDragStart={(e) => makeFileDraggable(e, file)}
                        onClick={(e) => {
                          e.stopPropagation()
                          const newSlide = {
                            id: `slide_${Date.now()}_${Math.random()}`,
                            assetId: file.id,
                            type: file.type,
                            name: file.name,
                            url: file.url,
                            duration: 5,
                            order: (selectedItem.playlist?.length || 0) + 1
                          }
                          const currentPlaylist = selectedItem.playlist || []
                          const newPlaylist = [...currentPlaylist, newSlide]
                          addToSlideshow(selectedItem.id, newPlaylist)
                        }}
                      >
                        <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden">
                          {file.type === "video" ? (
                            <div className="w-full h-full bg-purple-500 flex items-center justify-center">
                              <Video className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-slate-700">{file.name}</p>
                          <p className="text-xs text-slate-500">Click to add</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {uploadedFiles.length > 4 && (
                    <p className="text-xs text-slate-500 mt-2">+{uploadedFiles.length - 4} more in media library</p>
                  )}
                </div>
              )}
            </div>

            {/* Hidden input elements */}
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

          {/* Timeline Management */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 mb-6">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-500" />
              Slideshow Timeline
            </h4>

            {selectedItem.playlist && selectedItem.playlist.length > 0 ? (
              <div className="space-y-3">
                {/* Slide List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedItem.playlist.map((slide, index) => (
                    <div
                      key={slide.id}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      {/* Slide Preview Row */}
                      <div className="flex items-center gap-3 mb-2">
                        {/* Thumbnail */}
                        <div className="w-16 h-12 bg-slate-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                          {slide.type === 'image' && (
                            <img
                              src={slide.url}
                              alt={slide.name}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                          {slide.type === 'video' && (
                            <video
                              key={slide.id}
                              src={slide.url}
                              className="w-full h-full object-cover rounded"
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">#{index + 1}</span>
                            <span className="text-xs text-slate-600 truncate flex-1">{slide.name}</span>
                          </div>
                        </div>

                        {/* Reorder buttons */}
                        <div className="flex gap-1 flex-shrink-0">
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
                        <label className="text-xs text-slate-600 font-medium">Duration:</label>
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
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="w-20"
                          min="1"
                          max="60"
                          classNames={{
                            input: "text-slate-900",
                            inputWrapper: "bg-white border-slate-200"
                          }}
                        />
                        <span className="text-xs text-slate-500">seconds</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Slide Drop Zone */}
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors cursor-pointer"
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
                  <Plus className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                  <p className="text-sm text-slate-600">Drag files here to add more slides</p>
                </div>
              </div>
            ) : (
              <div
                className="text-center py-6 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
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
                <Plus className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">No slides yet</p>
                <p className="text-xs text-slate-500">Add content above or drag files here</p>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}
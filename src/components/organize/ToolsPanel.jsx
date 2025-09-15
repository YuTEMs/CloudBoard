"use client"

import { Button, Card, CardBody, Input } from "@heroui/react"
import {
  Upload,
  ImageIcon,
  Video,
  Trash2,
  RotateCcw,
  Clock,
  CloudSun,
  Settings,
  Play,
  Megaphone
} from "lucide-react"
import { useState } from "react"

export function ToolsPanel({
  isUploading,
  uploadedFiles,
  mediaInputRef,
  backgroundInputRef,
  handleFileUpload,
  handleDragOver,
  addWidget,
  makeFileDraggable,
  addToCanvas,
  removeUploadedFile,
  handleBackgroundUpload,
  backgroundColor,
  setBackgroundColor,
  backgroundImage,
  setBackgroundImage
}) {
  const [expandedTimeWidget, setExpandedTimeWidget] = useState(false)
  const [selectedDigitalColor, setSelectedDigitalColor] = useState('#1e293b')
  const [selectedAnalogColor, setSelectedAnalogColor] = useState('transparent')
  const [showAnalogColorPicker, setShowAnalogColorPicker] = useState(false)

  const handleAddWidget = (type, timeType = null, backgroundColor = null) => {
    addWidget(type, timeType, backgroundColor)
    if (type === 'time') {
      setExpandedTimeWidget(false)
      setShowAnalogColorPicker(false)
    }
  }

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-200 p-4 overflow-y-auto w-80 shadow-lg" data-tools-panel>
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
                e.target.value = ''
              }}
            />
          </CardBody>
        </Card>

        {/* Media Library */}
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
                        // Note: This would need to be passed up to parent component
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

      {/* Smart Widgets Section */}
      <div className="mb-8">
        <h4 className="font-semibold mb-4 flex items-center gap-3 text-white">
          <Settings className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span>Smart Widgets</span>
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {/* Time Widget */}
          <div>
            {!expandedTimeWidget ? (
              <Button
                size="md"
                variant="bordered"
                className="w-full border-green-300/50 text-white hover:bg-green-500/20 hover:border-green-300 transition-all duration-200 p-4 h-auto rounded-xl"
                onPress={() => setExpandedTimeWidget(true)}
              >
                <div className="flex flex-col items-center gap-2 w-full">
                  <Clock className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <div className="text-center">
                    <div className="font-medium">Time Widget</div>
                    <div className="text-xs text-green-200 mt-1">Live clock display</div>
                  </div>
                </div>
              </Button>
            ) : (
              <div className="border border-green-300/50 rounded-xl p-3 bg-green-500/10 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-white">Choose Time Widget Type</span>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    className="ml-auto text-green-300 hover:text-white"
                    onPress={() => setExpandedTimeWidget(false)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-2">
                  {/* Analog Option */}
                  <div className="border border-green-300/30 rounded-lg p-3 bg-green-500/5">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/20"
                        style={{
                          backgroundColor: selectedAnalogColor === 'transparent' ? 'rgba(255,255,255,0.9)' : selectedAnalogColor
                        }}
                      >
                        <div className="w-3 h-3 border border-gray-600 rounded-full relative bg-white">
                          <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-gray-600 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                          <div className="absolute top-1/2 left-1/2 w-0.5 h-1 bg-gray-600 transform -translate-x-1/2 -translate-y-full origin-bottom rotate-45"></div>
                          <div className="absolute top-1/2 left-1/2 w-0.5 h-1.5 bg-gray-400 transform -translate-x-1/2 -translate-y-full origin-bottom rotate-90"></div>
                        </div>
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-sm font-medium text-white">Analog Clock</div>
                        <div className="text-xs text-green-200">Traditional clock face</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Button
                          size="sm"
                          variant={selectedAnalogColor === 'transparent' ? 'solid' : 'bordered'}
                          color={selectedAnalogColor === 'transparent' ? 'primary' : 'default'}
                          onPress={() => setSelectedAnalogColor('transparent')}
                          className="text-xs px-2 h-6"
                        >
                          Transparent
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAnalogColor !== 'transparent' ? 'solid' : 'bordered'}
                          color={selectedAnalogColor !== 'transparent' ? 'primary' : 'default'}
                          onPress={() => {
                            if (selectedAnalogColor === 'transparent') {
                              setSelectedAnalogColor('#f0f9ff')
                            }
                            setShowAnalogColorPicker(!showAnalogColorPicker)
                          }}
                          className="text-xs px-2 h-6"
                        >
                          Color
                        </Button>
                      </div>
                    </div>

                    {showAnalogColorPicker && selectedAnalogColor !== 'transparent' && (
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs text-green-200 min-w-0 flex-shrink-0">Background:</label>
                        <Input
                          type="color"
                          size="sm"
                          value={selectedAnalogColor === 'transparent' ? '#f0f9ff' : selectedAnalogColor}
                          onChange={(e) => setSelectedAnalogColor(e.target.value)}
                          className="w-16"
                          classNames={{
                            input: "h-6 w-full min-h-0 p-0 border-none",
                            inputWrapper: "h-6 min-h-0 bg-transparent border border-green-300/30 rounded"
                          }}
                        />
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-md text-xs px-3 h-6 w-full"
                      onPress={() => handleAddWidget('time', 'analog', selectedAnalogColor)}
                    >
                      Add Analog
                    </Button>
                  </div>

                  {/* Digital Option */}
                  <div className="border border-green-300/30 rounded-lg p-3 bg-green-500/5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selectedDigitalColor }}>
                        <span className="text-white text-xs font-bold">12:34</span>
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-sm font-medium text-white">Digital Clock</div>
                        <div className="text-xs text-green-200">Customizable display</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs text-green-200 min-w-0 flex-shrink-0">Color:</label>
                      <Input
                        type="color"
                        size="sm"
                        value={selectedDigitalColor}
                        onChange={(e) => setSelectedDigitalColor(e.target.value)}
                        className="w-16"
                        classNames={{
                          input: "h-6 w-full min-h-0 p-0 border-none",
                          inputWrapper: "h-6 min-h-0 bg-transparent border border-green-300/30 rounded"
                        }}
                      />
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-md text-xs px-3 h-6 flex-1"
                        onPress={() => handleAddWidget('time', 'digital', selectedDigitalColor)}
                      >
                        Add Digital
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Weather Widget */}
          <Button
            size="md"
            variant="bordered"
            className="w-full border-blue-300/50 text-white hover:bg-blue-500/20 hover:border-blue-300 transition-all duration-200 p-4 h-auto rounded-xl"
            onPress={() => handleAddWidget('weather')}
          >
            <div className="flex flex-col items-center gap-2 w-full">
              <CloudSun className="w-6 h-6 text-blue-400 flex-shrink-0" />
              <div className="text-center">
                <div className="font-medium">Weather Widget</div>
                <div className="text-xs text-blue-200 mt-1">Weather information</div>
              </div>
            </div>
          </Button>

          {/* Slideshow Widget */}
          <Button
            size="md"
            variant="bordered"
            className="w-full border-purple-300/50 text-white hover:bg-purple-500/20 hover:border-purple-300 transition-all duration-200 p-4 h-auto rounded-xl"
            onPress={() => handleAddWidget('slideshow')}
          >
            <div className="flex flex-col items-center gap-2 w-full">
              <Play className="w-6 h-6 text-purple-400 flex-shrink-0" />
              <div className="text-center">
                <div className="font-medium">Slideshow Widget</div>
                <div className="text-xs text-purple-200 mt-1">Image & video carousel</div>
              </div>
            </div>
          </Button>

          {/* Announcement Widget */}
          <Button
            size="md"
            variant="bordered"
            className="w-full border-orange-300/50 text-white hover:bg-orange-500/20 hover:border-orange-300 transition-all duration-200 p-4 h-auto rounded-xl"
            onPress={() => handleAddWidget('announcement')}
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
    </div>
  )
}
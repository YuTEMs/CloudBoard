"use client"

import { Plus, Video } from "lucide-react"
import { RenderWidget } from "../../components/widgets"

export function CanvasArea({
  canvasRef,
  canvasSize,
  backgroundColor,
  backgroundImage,
  canvasItems,
  selectedItem,
  handleCanvasDrop,
  handleCanvasClick,
  handleDragStart,
  setSelectedItem,
  handleResizeStart,
  addToSlideshow,
  uploadedFiles,
  handleUpdateDuration
}) {
  // Determine if portrait mode
  const isPortrait = canvasSize.height > canvasSize.width;

  // Calculate responsive scale factor
  const baseScale = 0.6;
  const canvasWidth = canvasSize.width * baseScale;
  const canvasHeight = canvasSize.height * baseScale;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 overflow-auto">
      <div className={`h-full flex items-center justify-center ${isPortrait ? 'py-12' : 'p-6'}`}>
        <div
          ref={canvasRef}
          className="relative border-2 border-slate-200/50 rounded-3xl shadow-2xl backdrop-blur-sm bg-gradient-to-br from-white/80 to-gray-50/80"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            maxWidth: 'calc(100vw - 680px)', // Account for both side panels
            maxHeight: isPortrait ? 'calc(100vh - 200px)' : 'calc(100vh - 140px)',
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
                  playlist={item.widgetType === 'slideshow' ? item.playlist : undefined}
                  onUpdateDuration={handleUpdateDuration}
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
                {item.type === 'text' && (
                  <div
                    className="w-full h-full flex items-center justify-center p-2 pointer-events-none"
                    style={{
                      color: item.color || '#000000',
                      fontSize: `${(item.fontSize || 24) * 0.6}px`,
                      fontFamily: item.fontFamily || 'Arial',
                      fontWeight: item.fontWeight || 'normal',
                      textAlign: item.textAlign || 'center',
                      backgroundColor: item.backgroundColor || 'transparent'
                    }}
                  >
                    {item.content}
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
  )
}
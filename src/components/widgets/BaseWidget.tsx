'use client'

import React from 'react'
import { WidgetProps } from './types'

interface BaseWidgetProps extends WidgetProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const BaseWidget: React.FC<BaseWidgetProps> = ({
  x,
  y,
  width,
  height,
  mode,
  isSelected,
  item,
  onDragStart,
  setSelectedItem,
  onResizeStart,
  children,
  className = '',
  style = {}
}) => {
  const isOrganizeMode = mode === 'organize'

  const baseStyle = {
    left: x,
    top: y,
    width,
    height,
    ...style
  }

  const baseClassName = `absolute rounded-xl ${className}`

  // Display mode - simple rendering
  if (!isOrganizeMode) {
    return (
      <div className={baseClassName} style={baseStyle}>
        {children}
      </div>
    )
  }

  // Organize mode - with interaction capabilities
  return (
    <div
      draggable
      className={`${baseClassName} border-2 shadow-lg ${
        isSelected 
          ? 'cursor-move border-blue-400 shadow-blue-500/50 shadow-xl' 
          : 'cursor-move border-transparent hover:border-slate-600 hover:shadow-xl transition-all duration-200'
      }`}
      style={baseStyle}
      onDragStart={(e) => onDragStart && onDragStart(e, item)}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedItem && setSelectedItem(item)
      }}
    >
      {children}
      
      {/* Selection handles for organize mode */}
      {isSelected && (
        <>
          <div 
            className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nw-resize hover:bg-blue-600 shadow-lg border-2 border-white"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'nw')}
          />
          <div 
            className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-ne-resize hover:bg-blue-600 shadow-lg border-2 border-white"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'ne')}
          />
          <div 
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-sw-resize hover:bg-blue-600 shadow-lg border-2 border-white"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'sw')}
          />
          <div 
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600 shadow-lg border-2 border-white"
            onMouseDown={(e) => onResizeStart && onResizeStart(e, 'se')}
          />
        </>
      )}
    </div>
  )
}
'use client'

import React, { memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps, Playlist } from './types'

interface SlideshowWidgetProps extends WidgetProps {
  playlist?: Playlist
  onAddToSlideshow?: (itemId: string, newPlaylist: Playlist) => void
  uploadedFiles?: any[]
}

const SlideshowWidget: React.FC<SlideshowWidgetProps> = memo(function SlideshowWidget({
  playlist = [],
  onAddToSlideshow,
  uploadedFiles = [],
  item,
  ...props
}) {
  const { width, height, mode } = props
  const isOrganizeMode = mode === 'organize'

  // FUNCTIONALITY DISABLED - Don't render in display mode
  if (!isOrganizeMode) {
    return null
  }

  // Show disabled placeholder in organize mode
  const disabledContent = (
    <div className="flex items-center justify-center h-full">
      <div className="text-white text-center opacity-50">
        <div className="text-6xl mb-4">🖼️</div>
        <p 
          className="font-medium text-gray-400"
          style={{ fontSize: Math.min(width * 0.04, height * 0.1, 16) }}
        >
          Slideshow Widget (Disabled)
        </p>
      </div>
    </div>
  )

  return (
    <BaseWidget
      {...props}
      className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl border border-gray-700"
      style={{ opacity: 0.7 }}
    >
      {disabledContent}
    </BaseWidget>
  )
})

export default SlideshowWidget
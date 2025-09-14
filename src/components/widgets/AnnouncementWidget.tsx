'use client'

import React, { memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps, AnnouncementData } from './types'

interface AnnouncementWidgetProps extends WidgetProps {
  announcement?: AnnouncementData
}

const AnnouncementWidget: React.FC<AnnouncementWidgetProps> = memo(function AnnouncementWidget({
  announcement = {},
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
    <div className="flex flex-col h-full relative opacity-50">
      {/* Disabled indicator */}
      <div className="flex justify-between items-center mb-3 relative z-10">
        <div className="px-3 py-1 rounded-full text-xs font-bold bg-gray-600">
          DISABLED
        </div>
      </div>
      
      {/* Placeholder text */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div 
          className="text-center font-black break-words text-gray-400"
          style={{ 
            fontSize: Math.min(width * 0.06, height * 0.15, 16),
            lineHeight: 1.3,
          }}
        >
          Announcement Widget (Disabled)
        </div>
      </div>
    </div>
  )

  return (
    <BaseWidget
      {...props}
      className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-4 overflow-hidden border"
      style={{ opacity: 0.7 }}
    >
      {disabledContent}
    </BaseWidget>
  )
})

export default AnnouncementWidget
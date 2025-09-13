'use client'

import React from 'react'
import TimeWidget from './TimeWidget'
import WeatherWidget from './WeatherWidget'
import SlideshowWidget from './SlideshowWidget'
import AnnouncementWidget from './AnnouncementWidget'
import { WidgetProps, WidgetMode } from './types'

export type WidgetType = 'time' | 'weather' | 'slideshow' | 'announcement'

export interface WidgetConfig {
  type: WidgetType
  name: string
  description: string
  defaultSize: {
    width: number
    height: number
  }
}

export const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  time: {
    type: 'time',
    name: 'Time Widget',
    description: 'Display current time and date',
    defaultSize: { width: 200, height: 100 }
  },
  weather: {
    type: 'weather',
    name: 'Weather Widget', 
    description: 'Display weather information',
    defaultSize: { width: 250, height: 150 }
  },
  slideshow: {
    type: 'slideshow',
    name: 'Slideshow Widget',
    description: 'Display rotating images and videos',
    defaultSize: { width: 300, height: 200 }
  },
  announcement: {
    type: 'announcement',
    name: 'Announcement Widget',
    description: 'Display time-based announcements',
    defaultSize: { width: 400, height: 120 }
  }
}

interface RenderWidgetProps extends WidgetProps {
  widgetType: WidgetType
  // Additional props for specific widgets
  playlist?: any[]
  announcement?: any
  onAddToSlideshow?: (itemId: string, newPlaylist: any[]) => void
  uploadedFiles?: any[]
}

export const RenderWidget: React.FC<RenderWidgetProps> = ({
  widgetType,
  ...props
}) => {
  switch (widgetType) {
    case 'time':
      return <TimeWidget {...props} />
    
    case 'weather':
      return <WeatherWidget {...props} />
    
    case 'slideshow':
      // FUNCTIONALITY DISABLED - Don't render slideshow widgets
      return <SlideshowWidget {...props}/>
    
    case 'announcement':
      // FUNCTIONALITY DISABLED - Don't render announcement widgets
      return null
    
    default:
      console.warn(`Unknown widget type: ${widgetType}`)
      return null
  }
}

export const createWidget = (
  type: WidgetType, 
  x: number = 0, 
  y: number = 0,
  customSize?: { width: number; height: number }
) => {
  const config = WIDGET_CONFIGS[type]
  const size = customSize || config.defaultSize
  
  return {
    id: `widget_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'widget',
    widgetType: type,
    x,
    y,
    width: size.width,
    height: size.height,
    zIndex: 1,
    rotation: 0,
    // Widget-specific defaults
    ...(type === 'slideshow' && { playlist: [] }),
    ...(type === 'announcement' && { 
      announcement: {
        text: "",
        isActive: true,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "17:00"
      }
    })
  }
}

export { TimeWidget, WeatherWidget, SlideshowWidget, AnnouncementWidget }
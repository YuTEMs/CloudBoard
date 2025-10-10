export type WidgetMode = 'display' | 'organize'

export interface BaseWidgetProps {
  x: number
  y: number
  width: number
  height: number
  mode: WidgetMode
}

export interface OrganizeWidgetProps extends BaseWidgetProps {
  isSelected?: boolean
  item: any
  onDragStart?: (e: React.DragEvent, item: any) => void
  setSelectedItem?: (item: any) => void
  onResizeStart?: (e: React.MouseEvent, direction: string) => void
}

export interface DisplayWidgetProps extends BaseWidgetProps {
  // Display mode specific props if needed
}

export type WidgetProps = BaseWidgetProps & Partial<OrganizeWidgetProps>

export interface WeatherData {
  temp: number
  condition: string
  humidity: number
}

export interface LocationData {
  name: string
  lat: string | number
  lng: string | number
}

export interface SlideItem {
  type: 'image' | 'video'
  url: string
  name: string
  duration?: number,
  order?: number,
}

export type Playlist = SlideItem[]
'use client'

import React, { useState, memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps, WeatherData } from './types'

const WeatherWidget: React.FC<WidgetProps> = memo(function WeatherWidget(props) {
  const { width, height } = props
  const [weather] = useState<WeatherData>({
    temp: 22,
    condition: 'Sunny',
    humidity: 65
  })

  return (
    <BaseWidget
      {...props}
      className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 shadow-xl"
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex-1">
          <div style={{ fontSize: Math.min(width * 0.12, height * 0.3) }} className="font-black mb-1">
            {weather.temp}°C
          </div>
          <div style={{ fontSize: Math.min(width * 0.06, height * 0.15) }} className="font-medium opacity-90">
            {weather.condition}
          </div>
          <div style={{ fontSize: Math.min(width * 0.04, height * 0.12) }} className="opacity-75 mt-1">
            Humidity: {weather.humidity}%
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div style={{ fontSize: Math.min(width * 0.15, height * 0.4) }}>☀️</div>
        </div>
      </div>
    </BaseWidget>
  )
})

export default WeatherWidget
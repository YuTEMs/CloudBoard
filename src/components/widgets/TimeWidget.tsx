'use client'

import React, { useState, useEffect, memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps } from './types'

interface TimeWidgetProps extends WidgetProps {
  item?: {
    timeType?: 'digital' | 'analog'
    backgroundColor?: string
    [key: string]: any
  }
}

const AnalogClock: React.FC<{ time: Date, size: number, backgroundColor?: string }> = ({ time, size, backgroundColor = 'transparent' }) => {
  const hours = time.getHours() % 12
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  const hourAngle = (hours * 30) + (minutes * 0.5) - 90
  const minuteAngle = (minutes * 6) - 90
  const secondAngle = (seconds * 6) - 90

  const centerX = size / 2
  const centerY = size / 2
  const radius = size * 0.42
  const strokeWidth = Math.max(2, size * 0.008)
  const hourMarkLength = size * 0.06
  const hourMarkWidth = Math.max(2, size * 0.006)

  return (
    <svg width={size} height={size}>
      {/* Background circle */}
      {backgroundColor !== 'transparent' && (
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + strokeWidth}
          fill={backgroundColor}
        />
      )}
      
      {/* Clock face */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill={backgroundColor === 'transparent' ? 'rgba(255, 255, 255, 0.95)' : 'white'}
        stroke="#374151"
        strokeWidth={strokeWidth}
      />
      
      {/* Hour markers and numbers */}
      {[...Array(12)].map((_, i) => {
        const angle = ((i * 30) - 90) * (Math.PI / 180) // Start from 12 o'clock position
        const x1 = centerX + Math.cos(angle) * (radius - hourMarkLength)
        const y1 = centerY + Math.sin(angle) * (radius - hourMarkLength)
        const x2 = centerX + Math.cos(angle) * (radius - hourMarkLength/3)
        const y2 = centerY + Math.sin(angle) * (radius - hourMarkLength/3)
        const textX = centerX + Math.cos(angle) * (radius - hourMarkLength * 2)
        const textY = centerY + Math.sin(angle) * (radius - hourMarkLength * 2)
        
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#374151"
              strokeWidth={hourMarkWidth}
            />
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-700 font-bold"
              fontSize={Math.max(size * 0.07, 8)}
            >
              {i === 0 ? 12 : i}
            </text>
          </g>
        )
      })}

      {/* Hour hand */}
      <line
        x1={centerX}
        y1={centerY}
        x2={centerX + Math.cos(hourAngle * Math.PI / 180) * (radius * 0.5)}
        y2={centerY + Math.sin(hourAngle * Math.PI / 180) * (radius * 0.5)}
        stroke="#1f2937"
        strokeWidth={Math.max(3, size * 0.012)}
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        x1={centerX}
        y1={centerY}
        x2={centerX + Math.cos(minuteAngle * Math.PI / 180) * (radius * 0.72)}
        y2={centerY + Math.sin(minuteAngle * Math.PI / 180) * (radius * 0.72)}
        stroke="#374151"
        strokeWidth={Math.max(2, size * 0.008)}
        strokeLinecap="round"
      />

      {/* Second hand */}
      <line
        x1={centerX}
        y1={centerY}
        x2={centerX + Math.cos(secondAngle * Math.PI / 180) * (radius * 0.8)}
        y2={centerY + Math.sin(secondAngle * Math.PI / 180) * (radius * 0.8)}
        stroke="#dc2626"
        strokeWidth={Math.max(1, size * 0.004)}
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle
        cx={centerX}
        cy={centerY}
        r={Math.max(3, size * 0.012)}
        fill="#1f2937"
      />
    </svg>
  )
}

const TimeWidget: React.FC<TimeWidgetProps> = memo(function TimeWidget(props) {
  const { width, height, item } = props
  const [time, setTime] = useState(new Date())
  
  const timeType = item?.timeType || 'digital'
  const backgroundColor = item?.backgroundColor || '#1e293b'

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (timeType === 'analog') {
    const analogBg = backgroundColor === 'transparent' ? 'transparent' : backgroundColor
    const clockSize = Math.min(width * 0.75, height * 0.65, Math.max(width, height) * 0.8)
    const minClockSize = 80 // Minimum size to ensure visibility
    const finalClockSize = Math.max(clockSize, minClockSize)
    
    return (
      <BaseWidget
        {...props}
        className="flex items-center justify-center"
        style={{ 
          background: analogBg === 'transparent' 
            ? 'transparent' 
            : `linear-gradient(to bottom right, ${analogBg}, ${analogBg}dd)`
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <AnalogClock 
            time={time} 
            size={finalClockSize} 
            backgroundColor={analogBg}
          />
          <div 
            className="text-gray-800 font-semibold text-center"
            style={{ 
              fontSize: Math.min(width * 0.06, height * 0.15, 16),
              color: analogBg === 'transparent' ? '#1f2937' : '#374151'
            }}
          >
            {time.toLocaleDateString()}
          </div>
        </div>
      </BaseWidget>
    )
  }

  return (
    <BaseWidget
      {...props}
      className="text-white flex items-center justify-center font-bold text-center"
      style={{ 
        background: `linear-gradient(to bottom right, ${backgroundColor}, ${backgroundColor}dd)`
      }}
    >
      <div className="text-center">
        <div 
          className="font-black tracking-tight"
          style={{ fontSize: Math.min(width * 0.08, height * 0.3, 24) }}
        >
          {time.toLocaleTimeString()}
        </div>
        <div 
          className="opacity-75 font-medium"
          style={{ fontSize: Math.min(width * 0.05, height * 0.2, 14) }}
        >
          {time.toLocaleDateString()}
        </div>
      </div>
    </BaseWidget>
  )
})

export default TimeWidget
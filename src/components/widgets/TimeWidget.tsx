'use client'

import React, { useState, useEffect, memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps } from './types'

const TimeWidget: React.FC<WidgetProps> = memo(function TimeWidget(props) {
  const { width, height } = props
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <BaseWidget
      {...props}
      className="bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-center shadow-xl"
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
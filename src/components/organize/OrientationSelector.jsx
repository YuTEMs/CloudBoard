"use client"

import { useState, useEffect } from 'react'

export function OrientationSelector({ canvasSize, onOrientationChange }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Always render the same structure to avoid hydration mismatch
  const orientationMode = canvasSize.width > canvasSize.height ? 'landscape' : 'portrait'

  return (
    <div
      className="text-sm text-slate-300 hidden sm:flex items-center gap-3"
      style={{ visibility: mounted ? 'visible' : 'hidden' }}
    >
      <span className="font-medium">Orientation:</span>
      <div className="flex gap-1 bg-slate-600/50 rounded-lg p-1">
        <button
          onClick={() => onOrientationChange('landscape')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            orientationMode === 'landscape'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-slate-300 hover:text-white hover:bg-slate-600'
          }`}
          disabled={!mounted}
        >
          Landscape (1920×1080)
        </button>
        <button
          onClick={() => onOrientationChange('portrait')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            orientationMode === 'portrait'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-slate-300 hover:text-white hover:bg-slate-600'
          }`}
          disabled={!mounted}
        >
          Portrait (1080×1920)
        </button>
      </div>
    </div>
  )
}

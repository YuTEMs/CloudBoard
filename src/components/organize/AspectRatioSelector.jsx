"use client"

import { useState, useEffect } from 'react'
import { Select, SelectItem } from "@heroui/react"

// Define common aspect ratios with their dimensions
const ASPECT_RATIOS = [
  { key: "16:9", label: "16:9 Landscape", width: 1920, height: 1080, display: "16:9 (1920×1080)" },
  { key: "9:16", label: "9:16 Portrait", width: 1080, height: 1920, display: "9:16 (1080×1920)" },
  { key: "4:3", label: "4:3 Traditional", width: 1440, height: 1080, display: "4:3 (1440×1080)" },
  { key: "3:4", label: "3:4 Portrait", width: 1080, height: 1440, display: "3:4 (1080×1440)" },
  { key: "21:9", label: "21:9 Ultra-wide", width: 2560, height: 1080, display: "21:9 (2560×1080)" },
  { key: "9:21", label: "9:21 Portrait Ultra-wide", width: 1080, height: 2560, display: "9:21 (1080×2560)" },
  { key: "1:1", label: "1:1 Square", width: 1080, height: 1080, display: "1:1 (1080×1080)" },
  { key: "3:2", label: "3:2 Classic", width: 1620, height: 1080, display: "3:2 (1620×1080)" },
  { key: "2:3", label: "2:3 Portrait", width: 1080, height: 1620, display: "2:3 (1080×1620)" },
]

export function AspectRatioSelector({ canvasSize, onAspectRatioChange }) {
  const [mounted, setMounted] = useState(false)
  const [selectedKey, setSelectedKey] = useState("16:9")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine current aspect ratio based on canvas size
  useEffect(() => {
    const currentRatio = ASPECT_RATIOS.find(
      ratio => ratio.width === canvasSize.width && ratio.height === canvasSize.height
    )
    if (currentRatio) {
      setSelectedKey(currentRatio.key)
    }
  }, [canvasSize])

  const handleSelectionChange = (keys) => {
    const key = Array.from(keys)[0]
    if (!key) return

    setSelectedKey(key)
    const selectedRatio = ASPECT_RATIOS.find(ratio => ratio.key === key)

    if (selectedRatio && onAspectRatioChange) {
      onAspectRatioChange({
        width: selectedRatio.width,
        height: selectedRatio.height
      })
    }
  }

  return (
    <div
      className="text-sm text-slate-300 hidden sm:flex items-center gap-3"
      style={{ visibility: mounted ? 'visible' : 'hidden' }}
    >
      <span className="font-medium">Aspect Ratio:</span>
      <Select
        size="sm"
        selectedKeys={new Set([selectedKey])}
        onSelectionChange={handleSelectionChange}
        className="w-52"
        classNames={{
          trigger: "bg-gradient-to-r from-slate-700/80 to-slate-600/80 border-slate-500/30 hover:from-slate-600 hover:to-slate-500 transition-all duration-200 backdrop-blur-sm shadow-lg rounded-xl h-9 flex items-center",
          value: "text-white font-semibold text-sm text-center w-full",
          selectorIcon: "text-slate-300",
          innerWrapper: "flex items-center justify-center w-full",
          mainWrapper: "h-9",
          listbox: "bg-gradient-to-b from-slate-800 to-slate-900 max-w-[220px]",
          popoverContent: "bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600/50 backdrop-blur-xl shadow-2xl rounded-xl w-[220px] overflow-hidden",
        }}
        aria-label="Select aspect ratio"
        disabled={!mounted}
        variant="bordered"
        disallowEmptySelection
        renderValue={(items) => {
          const item = items[0]
          if (!item) return <span className="text-slate-400">Select...</span>
          const ratio = ASPECT_RATIOS.find(r => r.key === item.key)
          return <span className="text-white font-semibold truncate block">{ratio?.display || item.key}</span>
        }}
      >
        {ASPECT_RATIOS.map((ratio) => (
          <SelectItem
            key={ratio.key}
            value={ratio.key}
            textValue={ratio.label}
            classNames={{
              base: "data-[hover=true]:bg-gradient-to-r data-[hover=true]:from-blue-600/40 data-[hover=true]:to-purple-600/40 data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-blue-500/50 data-[selected=true]:to-purple-500/50 rounded-lg transition-all duration-200 mx-1 my-0.5",
              title: "text-slate-200 font-medium group-data-[selected=true]:text-white"
            }}
          >
            <div className="flex flex-col min-w-0">
              <span className="font-semibold truncate">{ratio.label}</span>
              <span className="text-xs text-slate-400 truncate">{ratio.width}×{ratio.height}</span>
            </div>
          </SelectItem>
        ))}
      </Select>
    </div>
  )
}

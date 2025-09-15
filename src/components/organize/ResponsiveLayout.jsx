"use client"

import { useState, useEffect } from "react"
import { Button } from "@heroui/react"
import { Menu, X, Settings, Upload } from "lucide-react"

export function ResponsiveLayout({
  children,
  toolsPanel,
  propertiesPanel,
  contextPanel
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [showToolsPanel, setShowToolsPanel] = useState(false)
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Close panels when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isMobile && !e.target.closest('[data-panel]') && !e.target.closest('[data-panel-toggle]')) {
        setShowToolsPanel(false)
        setShowPropertiesPanel(false)
      }
    }

    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [isMobile])

  if (!isMobile) {
    // Desktop: Full three-panel layout
    return (
      <div className="flex h-[calc(100vh-80px)]">
        {toolsPanel}
        <div className="flex flex-col flex-1">
          {children}
        </div>
        {propertiesPanel}
        {contextPanel}
      </div>
    )
  }

  // Mobile: Collapsible panels with overlays
  return (
    <div className="relative h-[calc(100vh-80px)]">
      {/* Mobile Header with Panel Toggles */}
      <div className="bg-slate-800 border-b border-slate-300 p-2 flex justify-between items-center lg:hidden">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          className="text-white"
          onPress={() => setShowToolsPanel(!showToolsPanel)}
          data-panel-toggle
        >
          <Upload className="w-5 h-5" />
        </Button>

        <span className="text-white text-sm font-medium">Board Editor</span>

        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          className="text-white"
          onPress={() => setShowPropertiesPanel(!showPropertiesPanel)}
          data-panel-toggle
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Canvas Area */}
      <div className="h-[calc(100%-48px)]">
        {children}
      </div>

      {/* Tools Panel Overlay */}
      {showToolsPanel && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
          <div
            className="fixed left-0 top-0 h-full w-80 z-50 lg:hidden transform transition-transform duration-300"
            data-panel
          >
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                className="absolute top-4 right-4 z-10 text-white"
                onPress={() => setShowToolsPanel(false)}
              >
                <X className="w-4 h-4" />
              </Button>
              {toolsPanel}
            </div>
          </div>
        </>
      )}

      {/* Properties Panel Overlay */}
      {showPropertiesPanel && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
          <div
            className="fixed right-0 top-0 h-full w-80 z-50 lg:hidden transform transition-transform duration-300"
            data-panel
          >
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                className="absolute top-4 left-4 z-10 text-slate-600"
                onPress={() => setShowPropertiesPanel(false)}
              >
                <X className="w-4 h-4" />
              </Button>
              {propertiesPanel}
            </div>
          </div>
        </>
      )}

      {/* Context Panel - Always visible at bottom on mobile */}
      {contextPanel}
    </div>
  )
}
'use client'

import React, { useEffect, useRef, useState, memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps, Playlist } from './types'

interface SlideshowWidgetProps extends WidgetProps {
  playlist?: Playlist // array of { id: string; type: 'image' | 'video'; src: string }
}

const SlideshowWidget: React.FC<SlideshowWidgetProps> = memo(function SlideshowWidget({
  playlist = [],
  ...props
}) {
  const { width, height, mode } = props
  const [currentIndex, setCurrentIndex] = useState(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const isOrganizeMode = mode === 'organize'

  // Clamp/reset currentIndex if playlist changes (prevents out-of-bounds errors)
  useEffect(() => {
    if (currentIndex >= playlist.length) {
      setCurrentIndex(0)
    }
  }, [playlist, currentIndex])

  useEffect(() => {
    if (!playlist.length) return
    const currentItem = playlist[currentIndex]
    if (!currentItem) return

    if (currentItem.type === 'video') {
      const video = videoRefs.current[currentIndex]
      if (video) {
        video.currentTime = 0
        video.play().catch(() => { })
        const handleEnded = () => handleNext()
        video.addEventListener('ended', handleEnded)

        return () => {
          video.removeEventListener('ended', handleEnded)
        }
      }
    } else {
      // Image case: advance after duration
      const duration = (currentItem.duration ?? 5) * 1000
      const timer = setTimeout(handleNext, duration)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, playlist])

  const handleNext = () => {
    if (!playlist.length) return

    // Special case: single video loops
    if (playlist.length === 1 && playlist[0].type === 'video') {
      const video = videoRefs.current[0]
      if (video) {
        video.currentTime = 0
        video.play().catch(() => { })
      }
      return
    }

    setCurrentIndex((prev) => (prev + 1) % playlist.length)
  }

  if (playlist.length === 0) {
    return (
      <BaseWidget {...props} className="bg-gray-900 text-white flex items-center justify-center">
        <p>No media in slideshow</p>
      </BaseWidget>
    )
  }

  // if (isOrganizeMode) {
  //   return (
  //     <BaseWidget {...props} className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl border border-gray-700">
  //       <div className="flex items-center justify-center h-full text-gray-400">
  //         <div className="text-center opacity-70">
  //           <div className="text-5xl mb-2">🖼️</div>
  //           <p className="text-sm">Slideshow Widget (Preview Disabled)</p>
  //         </div>
  //       </div>
  //     </BaseWidget>
  //   )
  // }

  const currentItem = playlist[currentIndex]

  return (
    <BaseWidget {...props} className="bg-black flex items-center justify-center overflow-hidden">
      {currentItem.type === 'image' ? (
        <img
          src={currentItem.url}
          alt=""
          className="w-full h-full object-cover"
          style={{ maxWidth: width, maxHeight: height }}
        />
      ) : (
        <video
          ref={(el) => { videoRefs.current[currentIndex] = el; }}
          src={currentItem.url}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
      )}
    </BaseWidget>
  )
})

export default SlideshowWidget

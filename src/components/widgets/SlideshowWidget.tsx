'use client'

import React, { useEffect, useRef, useState, memo } from 'react'
import { BaseWidget } from './BaseWidget'
import { WidgetProps, Playlist } from './types'

interface SlideshowWidgetProps extends WidgetProps {
  playlist?: Playlist
  onUpdateDuration?: (url: string, duration: number) => void
}

const SlideshowWidget: React.FC<SlideshowWidgetProps> = memo(function SlideshowWidget({
  playlist = [],
  onUpdateDuration,
  ...props
}) {
  const { width, height, mode } = props
  const [currentIndex, setCurrentIndex] = useState(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  // Clamp index when playlist changes
  useEffect(() => {
    if (playlist.length === 0) {
      setCurrentIndex(0)
    } else if (currentIndex >= playlist.length) {
      setCurrentIndex(playlist.length - 1)
    }
  }, [playlist, currentIndex])

  const handleNext = () => {
    if (playlist.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % playlist.length)
  }

  // Slide timing effect
  useEffect(() => {
    if (playlist.length === 0) return
    const currentItem = playlist[currentIndex]
    if (!currentItem) return

    let timer: NodeJS.Timeout
    if (currentItem.type === 'video') {
      const video = videoRefs.current[currentIndex]
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {})

        if (!currentItem.duration || currentItem.duration <= 0) {
          if (!isNaN(video.duration) && video.duration > 0) {
            timer = setTimeout(() => handleNext(), video.duration * 1000)
          } else {
            const onLoaded = () => {
              if (video.duration && !isNaN(video.duration)) {
                timer = setTimeout(() => handleNext(), video.duration * 1000)
              } else {
                timer = setTimeout(() => handleNext(), 5000)
              }
              video.removeEventListener('loadedmetadata', onLoaded)
            }
            video.addEventListener('loadedmetadata', onLoaded)
          }
        } else {
          timer = setTimeout(() => handleNext(), currentItem.duration * 1000)
        }
      }
    } else {
      const duration = currentItem.duration ? currentItem.duration * 1000 : 5000
      timer = setTimeout(() => handleNext(), duration)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [currentIndex, playlist])

  if (playlist.length === 0) {
    return (
      <BaseWidget {...props} className="bg-gray-900 text-white flex items-center justify-center">
        <p>No media in slideshow</p>
      </BaseWidget>
    )
  }

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
          ref={(el) => { videoRefs.current[currentIndex] = el }}
          src={currentItem.url}
          className="w-full h-full object-cover"
          muted
          playsInline
          onLoadedMetadata={(e) => {
            const video = e.currentTarget
            if (!isNaN(video.duration) && video.duration > 0 && onUpdateDuration) {
              onUpdateDuration(currentItem.url, Math.round(video.duration))
            }
          }}
        />
      )}
    </BaseWidget>
  )
})

export default SlideshowWidget

"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, MANIFESTS_BUCKET } from '@/lib/supabase'

function DisplayContent() {
  const searchParams = useSearchParams()
  const roomId = searchParams.get('room')
  
  const [playlist, setPlaylist] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentManifestVersion, setCurrentManifestVersion] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [preloadedMedia, setPreloadedMedia] = useState(new Map())
  
  const channelRef = useRef(null)
  const timeoutRef = useRef(null)
  const videoRef = useRef(null)

  // Preload media function
  const preloadMedia = useCallback(async (items) => {
    const newPreloadedMedia = new Map()
    
    for (const item of items) {
      try {
        if (item.type === 'image') {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = item.url
          })
          newPreloadedMedia.set(item.url, img)
        } else if (item.type === 'video') {
          const video = document.createElement('video')
          video.crossOrigin = 'anonymous'
          video.preload = 'metadata'
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve
            video.onerror = reject
            video.src = item.url
          })
          newPreloadedMedia.set(item.url, video)
        }
      } catch (error) {
        console.warn('Failed to preload media:', item.url, error)
      }
    }
    
    setPreloadedMedia(newPreloadedMedia)
  }, [])

  // Fetch latest manifest from storage
  const fetchLatestManifest = useCallback(async () => {
    if (!roomId || !supabase) return

    try {
      const manifestPath = `rooms/${roomId}/latest-manifest.json`
      const { data, error } = await supabase.storage
        .from(MANIFESTS_BUCKET)
        .download(manifestPath)

      if (error) {
        if (error.message.includes('not found')) {
          setError(null) // Clear any previous errors
          setPlaylist([]) // Empty playlist is fine for new rooms
          setIsLoading(false) // Stop loading immediately
          return
        }
        throw error
      }

      const manifestText = await data.text()
      const manifest = JSON.parse(manifestText)

      // Only update if version is newer or this is the first load
      if (manifest.version > currentManifestVersion || currentManifestVersion === 0) {
        console.log('Loading new manifest version:', manifest.version)
        
        // Preload all media before updating playlist
        await preloadMedia(manifest.items)
        
        setPlaylist(manifest.items)
        setCurrentIndex(0)
        setCurrentManifestVersion(manifest.version)
        setError(null)
      }
      
    } catch (error) {
      console.error('Failed to fetch manifest:', error)
      setError(`Failed to load playlist: ${error.message}`)
      setIsLoading(false) // Make sure to stop loading on any error
    }
  }, [roomId, currentManifestVersion, preloadMedia])

  // Setup Supabase Realtime subscription
  useEffect(() => {
    if (!roomId) {
      setError('No room ID provided. Please check the URL.')
      setIsLoading(false)
      return
    }

    const setupRealtimeSubscription = async () => {
      try {
        // Fetch initial manifest (this will handle the loading state)
        await fetchLatestManifest()
        
        // Setup realtime channel
        if (!supabase) {
          setError('Supabase not configured')
          setIsLoading(false)
          return
        }
        
        const channel = supabase.channel(`room-${roomId}`)
        channelRef.current = channel

        channel
          .on('broadcast', { event: 'playlist.replace' }, async (payload) => {
            console.log('Received new playlist:', payload)
            
            const newManifest = payload.payload
            
            // Ignore stale manifests
            if (newManifest.version <= currentManifestVersion) {
              console.log('Ignoring stale manifest version:', newManifest.version)
              return
            }

            console.log('Processing new manifest version:', newManifest.version)
            
            try {
              // Preload all new media before replacing playlist
              await preloadMedia(newManifest.items)
              
              // Atomically replace playlist
              setPlaylist(newManifest.items)
              setCurrentIndex(0)
              setCurrentManifestVersion(newManifest.version)
              
            } catch (error) {
              console.error('Failed to process new manifest:', error)
            }
          })
          .subscribe((status) => {
            console.log('Subscription status:', status)
            setConnectionStatus(status)
            
            // Always stop loading once we're connected, regardless of content
            if (status === 'SUBSCRIBED') {
              setIsLoading(false)
            }
          })

      } catch (error) {
        console.error('Failed to setup subscription:', error)
        setError(`Connection failed: ${error.message}`)
        setIsLoading(false)
      }
    }

    setupRealtimeSubscription()

    // Safety timeout - stop loading after 10 seconds maximum
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('Loading timeout - stopping loading state')
        setIsLoading(false)
      }
    }, 10000)

    // Cleanup function
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      clearTimeout(loadingTimeout)
    }
  }, [roomId, fetchLatestManifest, currentManifestVersion, preloadMedia])

  // Auto-advance through playlist
  useEffect(() => {
    if (playlist.length === 0) return

    const currentItem = playlist[currentIndex]
    if (!currentItem) return

    let duration = 8000 // 8 seconds default for images

    if (currentItem.type === 'video') {
      const video = videoRef.current
      if (video) {
        // For videos, use the actual duration
        const handleLoadedMetadata = () => {
          duration = video.duration * 1000
          startTimer()
        }

        const handleEnded = () => {
          clearTimeout(timeoutRef.current)
          nextSlide()
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('ended', handleEnded)

        // If metadata is already loaded
        if (video.duration) {
          duration = video.duration * 1000
          startTimer()
        }

        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
          video.removeEventListener('ended', handleEnded)
        }
      }
    } else {
      startTimer()
    }

    function startTimer() {
      timeoutRef.current = setTimeout(nextSlide, duration)
    }

    function nextSlide() {
      setCurrentIndex(prev => (prev + 1) % playlist.length)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [currentIndex, playlist])

  // Handle reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connectionStatus !== 'SUBSCRIBED') {
        console.log('Page became visible, attempting to reconnect...')
        fetchLatestManifest()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [connectionStatus, fetchLatestManifest])

  // Render loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading display...</p>
          <p className="text-sm text-gray-400 mt-2">Room: {roomId}</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠</div>
          <h1 className="text-2xl font-bold mb-2">Display Error</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-400">Room: {roomId}</p>
        </div>
      </div>
    )
  }

  // Render no content state
  if (playlist.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-gray-400 text-6xl mb-4">📺</div>
          <h1 className="text-2xl font-bold mb-2">No Content</h1>
          <p className="text-gray-300 mb-4">Waiting for content to be uploaded...</p>
          <p className="text-sm text-gray-400">Room: {roomId}</p>
          <div className="flex items-center justify-center mt-4">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              connectionStatus === 'SUBSCRIBED' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-sm">{connectionStatus}</span>
          </div>
        </div>
      </div>
    )
  }

  const currentItem = playlist[currentIndex]

  return (
    <div className="fixed inset-0 bg-black">
      {/* Main content display */}
      <div className="w-full h-full flex items-center justify-center">
        {currentItem?.type === 'image' && (
          <img
            src={currentItem.url}
            alt="Display content"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.error('Image failed to load:', currentItem.url)
              // Skip to next slide on error
              setCurrentIndex(prev => (prev + 1) % playlist.length)
            }}
          />
        )}

        {currentItem?.type === 'video' && (
          <video
            ref={videoRef}
            src={currentItem.url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted
            playsInline
            onError={(e) => {
              console.error('Video failed to load:', currentItem.url)
              // Skip to next slide on error
              setCurrentIndex(prev => (prev + 1) % playlist.length)
            }}
          />
        )}
      </div>

      {/* Connection status indicator (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'SUBSCRIBED'
              ? 'bg-green-900 text-green-200'
              : 'bg-red-900 text-red-200'
          }`}>
            {connectionStatus} • {playlist.length} items • v{currentManifestVersion}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DisplayPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading display...</p>
        </div>
      </div>
    }>
      <DisplayContent />
    </Suspense>
  )
}

'use client';

import { useState, useEffect, useRef } from 'react';

export default function AdvertisementDisplay({
  boardId,
  isVisible,
  currentAdIndex,
  advertisements,
  onAdComplete,
  adSettings
}) {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const loadTokenRef = useRef(0);

  // Reset loading state when visibility changes
  useEffect(() => {
    if (isVisible) {
      setIsLoading(true);
    }
  }, [isVisible, currentAdIndex]);

  // Handle media load completion
  const handleMediaLoad = () => {
    setIsLoading(false);
  };

  // Handle video end event for automatic progression
  const handleVideoEnd = () => {
    onAdComplete();
  };

  // For image ads, we need to detect when they're fully loaded and set a timer
  useEffect(() => {
    if (!isVisible || !advertisements.length || isLoading) return;

    const currentAd = advertisements[currentAdIndex];
    if (!currentAd || currentAd.media_type !== 'image') return;

    // Priority: 1) individual ad duration, 2) global adSettings duration, 3) default 10 seconds
    const imageDuration = currentAd.display_duration ||
                         (adSettings?.adDisplayDuration ? adSettings.adDisplayDuration * 1000 : null) ||
                         10000;

    console.log(`[AdvertisementDisplay] Image ad "${currentAd.title}" will display for ${imageDuration / 1000}s`);

    const timer = setTimeout(() => {
      onAdComplete();
    }, imageDuration);

    return () => clearTimeout(timer);
  }, [isVisible, currentAdIndex, advertisements, isLoading, onAdComplete, adSettings]);

  // Ensure cached images clear the loading state (onLoad may not fire)
  useEffect(() => {
    if (!isVisible || !advertisements.length) return;
    const currentAd = advertisements[currentAdIndex];
    if (!currentAd || currentAd.media_type !== 'image') return;

    const img = imageRef.current;
    if (img && img.complete) {
      // If image is already cached and complete, clear loader immediately
      if (img.naturalWidth > 0) {
        // Defer to next frame to avoid state updates during render
        requestAnimationFrame(() => handleMediaLoad());
      } else {
        // Completed but zero dimensions indicates error; still clear loader to avoid spinner hang
        requestAnimationFrame(() => handleMediaLoad());
      }
    }

    // Preload image deterministically using an off-DOM Image object
    const token = ++loadTokenRef.current;
    const preloader = new Image();
    preloader.decoding = 'async';
    preloader.onload = () => {
      if (loadTokenRef.current === token) {
        handleMediaLoad();
      }
    };
    preloader.onerror = () => {
      // Proceed anyway on error to avoid indefinite spinner
      if (loadTokenRef.current === token) {
        handleMediaLoad();
      }
    };
    preloader.src = currentAd.media_url;

    // Fallback: if neither onload nor onerror fires, clear the spinner after 4s
    const fallback = setTimeout(() => {
      if (loadTokenRef.current === token) {
        handleMediaLoad();
      }
    }, 4000);

    return () => {
      clearTimeout(fallback);
    };
  }, [isVisible, currentAdIndex, advertisements]);

  if (!isVisible || !advertisements.length) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];
  if (!currentAd) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black transition-all duration-500">
      {/* Loading indicator */}
      {(() => {
        const isImage = currentAd.media_type === 'image';
        if (!isLoading) return null;
        // Hide the spinner for image ads to avoid "Loading advertisement..." flashes
        if (isImage) return null;
        return (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-xl">Loading advertisement...</p>
          </div>
        </div>
        );
      })()}

      {/* Full-screen Advertisement content */}
      <div className={`relative w-full h-full animate-in fade-in duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {currentAd.media_type === 'image' ? (
          <img
            key={currentAd.id || currentAd.media_url}
            ref={imageRef}
            src={currentAd.media_url}
            alt={currentAd.title}
            className="w-full h-full object-contain"
            style={{ objectFit: 'contain' }}
            onLoad={handleMediaLoad}
            onError={() => {
              // Proceed even if image fails to load to avoid spinner hang
              handleMediaLoad();
            }}
            decoding="async"
            loading="eager"
            draggable={false}
          />
        ) : (
          <video
            ref={videoRef}
            src={currentAd.media_url}
            className="w-full h-full object-contain"
            style={{ objectFit: 'contain' }}
            autoPlay
            muted
            playsInline
            onLoadedData={handleMediaLoad}
            onEnded={handleVideoEnd}
            onError={() => {
              handleMediaLoad(); // Still proceed even if video fails
              // For videos that fail to load, treat as completed after short delay
              setTimeout(onAdComplete, 2000);
            }}
          />
        )}
      </div>

    </div>
  );
}

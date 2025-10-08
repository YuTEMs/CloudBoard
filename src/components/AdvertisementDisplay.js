'use client';

import { useState, useEffect, useRef } from 'react';

export default function AdvertisementDisplay({
  boardId,
  isVisible,
  currentAdIndex,
  advertisements,
  onAdComplete
}) {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

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

    // Use the ad's configured display duration, or default to 10 seconds
    const imageDuration = currentAd.display_duration || 10000;

    console.log(`[AdvertisementDisplay] Image ad "${currentAd.title}" will display for ${imageDuration / 1000}s`);

    const timer = setTimeout(() => {
      onAdComplete();
    }, imageDuration);

    return () => clearTimeout(timer);
  }, [isVisible, currentAdIndex, advertisements, isLoading, onAdComplete]);

  if (!isVisible || !advertisements.length) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];
  if (!currentAd) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black transition-all duration-500">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-xl">Loading advertisement...</p>
          </div>
        </div>
      )}

      {/* Full-screen Advertisement content */}
      <div className={`relative w-full h-full animate-in fade-in duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {currentAd.media_type === 'image' ? (
          <img
            src={currentAd.media_url}
            alt={currentAd.title}
            className="w-full h-full object-contain"
            style={{ objectFit: 'contain' }}
            onLoad={handleMediaLoad}
            onError={(e) => {
              handleMediaLoad(); // Still proceed even if image fails
            }}
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
            onError={(e) => {
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
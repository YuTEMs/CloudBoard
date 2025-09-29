'use client';

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_DISPLAY_DURATION = 10000; // 10 seconds fallback

export default function AdvertisementDisplay({ boardId, isVisible, onClose }) {
  const [advertisements, setAdvertisements] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveAdvertisements = useCallback(async () => {
    try {
      // Fetch advertisements
      const adsResponse = await fetch(`/api/advertisements?boardId=${boardId}`);
      if (!adsResponse.ok) {
        throw new Error('Failed to fetch advertisements');
      }
      const ads = await adsResponse.json();

      // Filter advertisements based on:
      // 1. Individual ad is_active flag
      // 2. Date range (start_date/end_date)
      const activeAds = ads.filter(ad => {
        // Must be individually active
        if (!ad.is_active) return false;

        // Must be within date range
        const now = new Date();
        if (ad.start_date && new Date(ad.start_date) > now) return false;
        if (ad.end_date && new Date(ad.end_date) < now) return false;

        return true;
      });

      setAdvertisements(activeAds);

      if (activeAds.length === 0) {
        onClose(); // Hide advertisement overlay if no active ads
      }
    } catch (error) {
      console.error('Error fetching advertisements:', error);
      setAdvertisements([]);
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [boardId, onClose]);

  const recordView = useCallback(async (advertisementId) => {
    try {
      await fetch('/api/advertisements/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertisementId })
      });
    } catch (error) {
      console.error('Error recording advertisement view:', error);
    }
  }, []);

  // Fetch advertisements on mount and setup interval
  useEffect(() => {
    fetchActiveAdvertisements();

    // Refresh advertisements every 5 minutes to check for new ones
    const refreshInterval = setInterval(fetchActiveAdvertisements, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchActiveAdvertisements]);

  // Handle advertisement cycling
  useEffect(() => {
    if (!isVisible || advertisements.length === 0) return;

    const currentAd = advertisements[currentAdIndex];
    if (currentAd) {
      // Record view when ad is displayed
      recordView(currentAd.id);
    }

    // Determine display duration for current ad
    let displayDuration = DEFAULT_DISPLAY_DURATION;

    if (currentAd) {
      if (currentAd.media_type === 'image' && currentAd.display_duration) {
        // Use custom duration for image ads
        displayDuration = currentAd.display_duration;
      } else if (currentAd.media_type === 'video') {
        // For videos, we'll use a longer default duration
        // In a more advanced implementation, we could get video duration
        displayDuration = 30000; // 30 seconds for videos
      }
    }

    const timer = setTimeout(() => {
      if (advertisements.length > 1) {
        // Move to next advertisement
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      } else {
        // Single ad - close after display duration
        onClose();
      }
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [currentAdIndex, advertisements, isVisible, recordView, onClose]);

  // Reset to first ad when visibility changes
  useEffect(() => {
    if (isVisible) {
      setCurrentAdIndex(0);
    }
  }, [isVisible]);

  if (!isVisible || isLoading || advertisements.length === 0) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];
  if (!currentAd) return null;

  // Calculate current display duration for progress bar
  let currentDisplayDuration = DEFAULT_DISPLAY_DURATION;
  if (currentAd.media_type === 'image' && currentAd.display_duration) {
    currentDisplayDuration = currentAd.display_duration;
  } else if (currentAd.media_type === 'video') {
    currentDisplayDuration = 30000; // 30 seconds for videos
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white text-4xl font-light z-[10000]"
        aria-label="Close advertisement"
      >
        ×
      </button>

      {/* Advertisement content */}
      <div className="relative max-w-4xl max-h-4xl w-full h-full flex items-center justify-center p-8">
        {currentAd.media_type === 'image' ? (
          <img
            src={currentAd.media_url}
            alt={currentAd.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <video
            src={currentAd.media_url}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            autoPlay
            muted
            loop
            playsInline
          />
        )}

        {/* Advertisement title */}
        {currentAd.title && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-black/70 text-white px-6 py-3 rounded-full backdrop-blur-sm">
              <h2 className="text-lg font-medium text-center">{currentAd.title}</h2>
            </div>
          </div>
        )}

        {/* Progress indicator for multiple ads */}
        {advertisements.length > 1 && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2">
            {advertisements.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentAdIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Timer progress bar */}
        <div className="absolute bottom-4 left-6 right-6">
          <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-linear"
              style={{
                animation: `progressBar ${currentDisplayDuration}ms linear forwards`
              }}
            />
          </div>
        </div>
      </div>

      {/* CSS for progress bar animation */}
      <style jsx>{`
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
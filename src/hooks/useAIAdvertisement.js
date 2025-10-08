'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for AI-based advertisement triggering
 * Manages the logic for showing ads based on person detection
 */
export function useAIAdvertisement({
  enabled,
  personCount,
  advertisements,
  settings,
  onShowAd,
  onHideAd
}) {
  // State for tracking detection phases
  const [detectionState, setDetectionState] = useState('idle'); // 'idle', 'detecting', 'cooldown'
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // Refs for tracking timing and state
  const detectionStartTime = useRef(null);
  const cooldownEndTime = useRef(0);
  const consecutiveDetections = useRef(0);
  const consecutiveEmptyChecks = useRef(0);
  const checkInterval = useRef(null);

  // Extract settings with defaults
  const threshold = settings?.personThreshold || 1;
  const dwellTime = settings?.detectionDuration || 0;
  const cooldownTime = Math.max(2, dwellTime * 1000); // Cooldown at least 2 seconds

  // Reset state when AI is disabled
  useEffect(() => {
    if (!enabled) {
      setDetectionState('idle');
      detectionStartTime.current = null;
      cooldownEndTime.current = 0;
      consecutiveDetections.current = 0;
      consecutiveEmptyChecks.current = 0;
      
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    }
  }, [enabled]);

  // Main detection logic
  const performDetectionCheck = useCallback(() => {
    const now = Date.now();
    const peopleDetected = personCount || 0;
    const thresholdMet = peopleDetected >= threshold;

    console.log(`[AI Ad] Check - State: ${detectionState}, People: ${peopleDetected}/${threshold}, Ads: ${advertisements.length}`);

    // Skip if no advertisements available
    if (advertisements.length === 0) {
      return;
    }

    // Handle cooldown period
    if (detectionState === 'cooldown') {
      if (now < cooldownEndTime.current) {
        // Still in cooldown
        if (thresholdMet) {
          console.log(`[AI Ad] In cooldown, ignoring detection (${Math.ceil((cooldownEndTime.current - now) / 1000)}s remaining)`);
        }
        return;
      } else {
        // Cooldown ended - require area to be clear before resuming
        if (thresholdMet) {
          console.log(`[AI Ad] Cooldown ended but area still occupied, waiting for clear area`);
          return;
        } else {
          console.log(`[AI Ad] Cooldown ended and area clear, resuming detection`);
          setDetectionState('idle');
          consecutiveDetections.current = 0;
          consecutiveEmptyChecks.current = 0;
        }
      }
    }

    // Handle active detection
    if (thresholdMet && detectionState !== 'cooldown') {
      consecutiveEmptyChecks.current = 0;
      consecutiveDetections.current += 1;

      if (dwellTime === 0) {
        // Immediate triggering mode - require 2 consecutive detections to prevent false positives
        if (consecutiveDetections.current >= 2) {
          console.log(`[AI Ad] ✅ Threshold met consecutively, triggering ad ${currentAdIndex + 1}/${advertisements.length}`);
          triggerAdvertisement();
        } else {
          console.log(`[AI Ad] ⏳ First detection confirmed, waiting for second confirmation...`);
        }
      } else {
        // Dwell time mode
        if (detectionState === 'idle') {
          // Start dwell timer
          detectionStartTime.current = now;
          setDetectionState('detecting');
          console.log(`[AI Ad] ⏱️ Started dwell timer, waiting ${dwellTime}s...`);
        } else if (detectionState === 'detecting') {
          // Check if dwell time has elapsed
          const elapsedSeconds = (now - detectionStartTime.current) / 1000;
          
          if (elapsedSeconds >= dwellTime) {
            console.log(`[AI Ad] ✅ Dwell time completed (${elapsedSeconds.toFixed(1)}s), triggering ad ${currentAdIndex + 1}/${advertisements.length}`);
            triggerAdvertisement();
          } else {
            console.log(`[AI Ad] ⏳ Dwelling... ${elapsedSeconds.toFixed(1)}s/${dwellTime}s`);
          }
        }
      }
    } else if (!thresholdMet && detectionState !== 'cooldown') {
      // No people detected
      consecutiveDetections.current = 0;
      consecutiveEmptyChecks.current += 1;

      if (detectionState === 'detecting') {
        // Person left during dwell time
        console.log(`[AI Ad] 🔄 Person left during dwell time, resetting`);
        setDetectionState('idle');
        detectionStartTime.current = null;
      } else if (consecutiveEmptyChecks.current % 10 === 1) {
        // Occasional status log to reduce spam
        console.log(`[AI Ad] ⏳ Waiting for ${threshold} ${threshold === 1 ? 'person' : 'people'}...`);
      }
    }
  }, [detectionState, personCount, threshold, dwellTime, advertisements.length, currentAdIndex]);

  // Function to trigger advertisement
  const triggerAdvertisement = useCallback(() => {
    if (advertisements.length === 0) return;

    // Show the current ad
    onShowAd(currentAdIndex);

    // Enter cooldown state
    setDetectionState('cooldown');
    cooldownEndTime.current = Date.now() + cooldownTime;
    detectionStartTime.current = null;
    consecutiveDetections.current = 0;
    consecutiveEmptyChecks.current = 0;

    console.log(`[AI Ad] 🎬 Ad triggered, entering ${cooldownTime / 1000}s cooldown`);
  }, [advertisements.length, currentAdIndex, onShowAd, cooldownTime]);

  // Function to handle ad completion
  const handleAdComplete = useCallback(() => {
    console.log(`[AI Ad] 🏁 Ad completed`);
    
    // Move to next ad in rotation
    const nextIndex = (currentAdIndex + 1) % advertisements.length;
    setCurrentAdIndex(nextIndex);
    
    onHideAd();
    
    // Cooldown period is already set when ad was triggered
    // Just log the remaining cooldown time
    const remainingCooldown = Math.max(0, cooldownEndTime.current - Date.now());
    if (remainingCooldown > 0) {
      console.log(`[AI Ad] 😴 Cooldown continues for ${Math.ceil(remainingCooldown / 1000)}s more`);
    }
  }, [currentAdIndex, advertisements.length, onHideAd]);

  // Start/stop detection interval
  useEffect(() => {
    if (!enabled) {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
      return;
    }

    // Start detection checks every second
    checkInterval.current = setInterval(performDetectionCheck, 1000);
    
    // Run initial check
    performDetectionCheck();

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    };
  }, [enabled, performDetectionCheck]);

  return {
    detectionState,
    currentAdIndex,
    handleAdComplete,
    triggerAdvertisement
  };
}
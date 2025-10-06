'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for person detection using TensorFlow.js COCO-SSD model
 * Detects people through webcam and returns the count
 *
 * @param {boolean} enabled - Whether detection should be active
 * @returns {Object} - Detection state
 * @property {number} personCount - Number of people detected
 * @property {boolean} isLoading - Whether the model is loading
 * @property {string|null} error - Error message if any
 * @property {boolean} isModelReady - Whether the model is loaded and ready
 * @property {boolean} cameraAvailable - Whether camera access was granted
 */
export function usePersonDetection(enabled = true) {
  const [personCount, setPersonCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);

  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    // Don't initialize if not enabled
    if (!enabled) {
      setIsLoading(false);
      setCameraAvailable(false);
      return;
    }

    let mounted = true;

    const initializeDetection = async () => {
      try {
        console.log('[Person Detection] Initializing...');
        setIsLoading(true);
        setError(null);

        // Request camera access
        console.log('[Person Detection] Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        setCameraAvailable(true);
        console.log('[Person Detection] Camera access granted');

        // Create video element (hidden, just for processing)
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.width = 640;
        video.height = 480;
        videoRef.current = video;

        // Wait for video to be ready
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });

        console.log('[Person Detection] Video stream ready');

        // Load TensorFlow.js and COCO-SSD model
        console.log('[Person Detection] Loading TensorFlow.js and COCO-SSD model...');
        const [tf, cocoSsd] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow-models/coco-ssd')
        ]);

        console.log('[Person Detection] Loading model...');
        const model = await cocoSsd.load();

        if (!mounted) {
          return;
        }

        modelRef.current = model;
        setIsModelReady(true);
        setIsLoading(false);
        console.log('[Person Detection] Model loaded successfully');

        // Start detection loop
        const runDetection = async () => {
          if (!mounted || !modelRef.current || !videoRef.current) {
            return;
          }

          try {
            const predictions = await modelRef.current.detect(videoRef.current);

            // Count only 'person' class detections
            const peopleDetected = predictions.filter(
              prediction => prediction.class === 'person'
            ).length;

            if (mounted) {
              setPersonCount(peopleDetected);
              console.log(`[Person Detection] Detected ${peopleDetected} people`);
            }
          } catch (detectionError) {
            console.error('[Person Detection] Detection error:', detectionError);
          }
        };

        // Run detection every 1 second
        detectionIntervalRef.current = setInterval(runDetection, 1000);

        // Run first detection immediately
        runDetection();

      } catch (err) {
        console.error('[Person Detection] Initialization error:', err);

        if (!mounted) return;

        // Handle different error types
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access denied. Falling back to timer-based ads.');
          setCameraAvailable(false);
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Falling back to timer-based ads.');
          setCameraAvailable(false);
        } else {
          setError(`Camera error: ${err.message}. Falling back to timer-based ads.`);
          setCameraAvailable(false);
        }

        setIsLoading(false);
      }
    };

    initializeDetection();

    // Cleanup function
    return () => {
      mounted = false;
      console.log('[Person Detection] Cleaning up...');

      // Stop detection interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }

      // Stop video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[Person Detection] Stopped camera track');
        });
        streamRef.current = null;
      }

      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }

      // Model cleanup (TensorFlow.js manages its own memory)
      modelRef.current = null;
    };
  }, [enabled]);

  return {
    personCount,
    isLoading,
    error,
    isModelReady,
    cameraAvailable
  };
}

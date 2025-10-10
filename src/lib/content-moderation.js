/**
 * Content Moderation Utilities
 * Uses Google Vision API to detect NSFW/sensitive content in images and videos
 */

/**
 * Extract a frame from a video file as an image blob
 * @param {File} videoFile - The video file to extract frame from
 * @param {number} timeInSeconds - Time position to extract frame from (default: 1s)
 * @returns {Promise<Blob>} - Image blob of the extracted frame
 */
async function extractVideoFrame(videoFile, timeInSeconds = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      // Set video time to extract frame
      video.currentTime = Math.min(timeInSeconds, video.duration / 2)
    }

    video.onseeked = () => {
      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to extract frame from video'))
        }
      }, 'image/jpeg', 0.8)

      // Clean up
      URL.revokeObjectURL(video.src)
    }

    video.onerror = () => {
      reject(new Error('Failed to load video for frame extraction'))
      URL.revokeObjectURL(video.src)
    }

    // Load video
    video.src = URL.createObjectURL(videoFile)
  })
}

/**
 * Validate image content using Google Vision API
 * @param {File|Blob} file - The image file to validate
 * @returns {Promise<{safe: boolean, reason?: string, details?: object}>}
 */
export async function validateImageContent(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/content-moderation', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!response.ok && !result.safe) {
      // API error but returned result
      return result
    }

    return result
  } catch (error) {
    console.error('[Content Moderation] Validation error:', error)
    // Fail open - allow upload if validation fails
    return {
      safe: true,
      error: error.message,
      validationError: true
    }
  }
}

/**
 * Validate video content by extracting and checking frames
 * @param {File} videoFile - The video file to validate
 * @param {number} numFrames - Number of frames to check (default: 3)
 * @returns {Promise<{safe: boolean, reason?: string, details?: object}>}
 */
export async function validateVideoContent(videoFile, numFrames = 3) {
  try {
    // Extract multiple frames from different time positions
    const framePromises = []

    for (let i = 0; i < numFrames; i++) {
      // Extract frames at different positions: 10%, 50%, 90% of video duration
      const position = (i + 1) * (1 / (numFrames + 1))
      framePromises.push(
        extractVideoFrame(videoFile, position * 10) // Approximate position
          .catch(() => null) // Ignore frame extraction errors
      )
    }

    const frames = await Promise.all(framePromises)
    const validFrames = frames.filter(f => f !== null)

    if (validFrames.length === 0) {
      // Could not extract any frames - fail open
      console.warn('[Content Moderation] Could not extract video frames, allowing upload')
      return {
        safe: true,
        warning: 'Could not validate video content',
        frameExtractionError: true
      }
    }

    // Check each frame
    const validationResults = await Promise.all(
      validFrames.map(frame => validateImageContent(frame))
    )

    // If any frame is unsafe, block the video
    const unsafeFrame = validationResults.find(result => !result.safe)

    if (unsafeFrame) {
      return unsafeFrame
    }

    // All frames are safe
    return {
      safe: true,
      framesChecked: validFrames.length
    }

  } catch (error) {
    console.error('[Content Moderation] Video validation error:', error)
    // Fail open - allow upload if validation fails
    return {
      safe: true,
      error: error.message,
      validationError: true
    }
  }
}

/**
 * Validate media content (auto-detects image or video)
 * @param {File} file - The media file to validate
 * @returns {Promise<{safe: boolean, reason?: string, details?: object}>}
 */
export async function validateMediaContent(file) {
  if (!file) {
    return { safe: true, error: 'No file provided' }
  }

  const fileType = file.type

  if (fileType.startsWith('image/')) {
    return await validateImageContent(file)
  } else if (fileType.startsWith('video/')) {
    return await validateVideoContent(file)
  } else {
    // Unknown file type - allow
    return { safe: true, warning: 'Unknown file type, skipping validation' }
  }
}

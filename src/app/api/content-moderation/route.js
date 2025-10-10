import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'

export const runtime = 'nodejs'

// Initialize Google Vision client
let visionClient = null

function getVisionClient() {
  if (!visionClient) {
    const credentials = process.env.GOOGLE_VISION_CREDENTIALS

    if (!credentials) {
      throw new Error('GOOGLE_VISION_CREDENTIALS environment variable is not set')
    }

    try {
      // Parse credentials from JSON string
      const credentialsJson = JSON.parse(credentials)

      visionClient = new vision.ImageAnnotatorClient({
        credentials: credentialsJson
      })
    } catch (error) {
      throw new Error(`Failed to initialize Vision API: ${error.message}`)
    }
  }

  return visionClient
}

// Safety thresholds - block if content exceeds these levels
const SAFETY_THRESHOLDS = {
  ADULT: 'LIKELY',       // Block LIKELY and VERY_LIKELY (nude/sexual content)
  VIOLENCE: 'LIKELY',    // Block LIKELY and VERY_LIKELY
  RACY: 'VERY_LIKELY',   // Only block VERY_LIKELY (allow fashion/art)
  MEDICAL: 'POSSIBLE',   // Block POSSIBLE and higher (medical imagery)
}

const LIKELIHOOD_VALUES = {
  'UNKNOWN': 0,
  'VERY_UNLIKELY': 1,
  'UNLIKELY': 2,
  'POSSIBLE': 3,
  'LIKELY': 4,
  'VERY_LIKELY': 5
}

function isContentUnsafe(safeSearchAnnotation) {
  const results = {
    safe: true,
    blocked: [],
    details: {}
  }

  // Check NSFW and medical content
  const categories = ['adult', 'violence', 'racy', 'medical']

  for (const category of categories) {
    const detected = safeSearchAnnotation[category]
    const threshold = SAFETY_THRESHOLDS[category.toUpperCase()]

    results.details[category] = detected

    // Compare likelihood values
    if (LIKELIHOOD_VALUES[detected] >= LIKELIHOOD_VALUES[threshold]) {
      results.safe = false
      results.blocked.push({
        category,
        level: detected,
        threshold
      })
    }
  }

  return results
}

export async function POST(request) {
  try {
    // === STEP 1: Get File ===
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Get Vision API client
    const client = getVisionClient()

    // === STEP 2: Perform SafeSearch Detection ===
    const [safeSearchResult] = await client.safeSearchDetection({
      image: { content: buffer }
    })

    const safeSearchAnnotation = safeSearchResult.safeSearchAnnotation

    // Check if content is safe (NSFW + medical)
    const safetyCheck = isContentUnsafe(safeSearchAnnotation)

    if (!safetyCheck.safe) {
      // Content is unsafe - return generic message
      return NextResponse.json({
        safe: false,
        reason: 'Invalid due to sensitive content',
        blocked: safetyCheck.blocked,
        details: safetyCheck.details,
        source: 'vision-api'
      }, { status: 200 })
    }

    // === STEP 3: All Checks Passed - Content is Safe ===

    console.log('[Content Moderation] Content approved')

    return NextResponse.json({
      safe: true,
      details: safetyCheck.details
    }, { status: 200 })

  } catch (error) {
    console.error('[Content Moderation] Error:', error)

    // Check if it's a Vision API configuration error
    if (error.message.includes('GOOGLE_VISION_CREDENTIALS')) {
      return NextResponse.json({
        error: 'Content moderation is not configured. Please contact administrator.',
        safe: true, // Allow upload if moderation is not configured (graceful degradation)
        configError: true
      }, { status: 200 })
    }

    return NextResponse.json({
      error: error.message || 'Content moderation failed',
      safe: true, // Allow upload on error (graceful degradation)
      moderationError: true
    }, { status: 200 })
  }
}

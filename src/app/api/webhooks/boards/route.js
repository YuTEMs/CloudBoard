import { NextResponse } from 'next/server'
import { broadcastToBoard } from '@/lib/stream-manager'

// Test endpoint to verify webhook is reachable
export async function GET(request) {
  return NextResponse.json({ 
    status: 'webhook endpoint is reachable',
    timestamp: new Date().toISOString(),
    url: request.url 
  })
}

// Webhook handler for board updates - DISABLED to prevent duplicate broadcasts
// All broadcasting is now handled directly in the API route for immediate response
export async function POST(request) {
  try {
    const payload = await request.json()

    // Extract board update information
    const { type, table, record } = payload

    console.log(`[Webhook] Received ${type} event for table ${table}, record ${record?.id}`)

    // Log but don't broadcast - API route handles this now
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: `Webhook disabled - API route handles broadcasting directly`,
      table,
      type,
      message: "Broadcasting is handled by API route to ensure immediate response"
    })

  } catch (error) {
    console.error('[Webhook] Processing failed:', error.message)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}

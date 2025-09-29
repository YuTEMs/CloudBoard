import { NextResponse } from 'next/server'
import { broadcastToBoard } from '@/lib/stream-manager'

// Test endpoint to verify webhook is reachable
export async function GET(request) {
  return NextResponse.json({
    status: 'ok',
    message: 'Advertisement webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

// Webhook handler for Supabase advertisements table changes
export async function POST(request) {
  try {
    const webhookData = await request.json()

    const { type, table, record, old_record } = webhookData

    // Validate webhook data
    if (table !== 'advertisements') {
      return NextResponse.json({ error: 'Wrong table' }, { status: 400 })
    }

    if (!record?.board_id) {
      return NextResponse.json({ error: 'Missing board_id' }, { status: 400 })
    }

    const boardId = record.board_id

    // Handle different webhook types
    switch (type) {
      case 'INSERT':
        break
      case 'UPDATE':
        // Check if is_active field changed
        if (old_record && old_record.is_active !== record.is_active) {
          // Advertisement active status changed
        }
        break
      case 'DELETE':
        break
      default:
        break
    }

    // Broadcast advertisement update to all connected display clients for this board
    const clientsNotified = broadcastToBoard(boardId, {
      type: 'advertisements_updated',
      boardId: boardId,
      advertisementId: record?.id || old_record?.id,
      webhookType: type,
      timestamp: new Date().toISOString(),
      data: record || old_record
    })


    return NextResponse.json({
      success: true,
      clientsNotified,
      type,
      boardId,
      advertisementId: record?.id || old_record?.id
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}
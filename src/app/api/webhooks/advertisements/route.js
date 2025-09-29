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
    console.log('🎯 Advertisement webhook received')

    const webhookData = await request.json()
    console.log('📦 Advertisement webhook payload:', JSON.stringify(webhookData, null, 2))

    const { type, table, record, old_record } = webhookData

    // Validate webhook data
    if (table !== 'advertisements') {
      console.log('❌ Advertisement webhook: Wrong table:', table)
      return NextResponse.json({ error: 'Wrong table' }, { status: 400 })
    }

    if (!record?.board_id) {
      console.log('❌ Advertisement webhook: Missing board_id in record')
      return NextResponse.json({ error: 'Missing board_id' }, { status: 400 })
    }

    const boardId = record.board_id

    // Handle different webhook types
    switch (type) {
      case 'INSERT':
        console.log('🆕 Advertisement created:', record.id, 'for board:', boardId)
        break
      case 'UPDATE':
        console.log('✏️ Advertisement updated:', record.id, 'for board:', boardId)
        // Check if is_active field changed
        if (old_record && old_record.is_active !== record.is_active) {
          console.log('🔄 Advertisement active status changed:', old_record.is_active, '→', record.is_active)
        }
        break
      case 'DELETE':
        console.log('🗑️ Advertisement deleted:', old_record?.id, 'from board:', boardId)
        break
      default:
        console.log('❓ Unknown advertisement webhook type:', type)
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

    console.log('📡 Advertisement update broadcasted to', clientsNotified, 'clients for board:', boardId)

    return NextResponse.json({
      success: true,
      clientsNotified,
      type,
      boardId,
      advertisementId: record?.id || old_record?.id
    })

  } catch (error) {
    console.error('💥 Advertisement webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}
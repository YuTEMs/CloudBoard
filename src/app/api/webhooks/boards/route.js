import { NextResponse } from 'next/server'
import { broadcastToBoard } from '@/lib/stream-manager'

// Simple webhook handler for board updates
export async function POST(request) {
  try {
    const payload = await request.json()
    
    // Extract board update information
    const { type, table, record } = payload
    
    // Only handle boards table updates
    if (table !== 'boards' || type !== 'UPDATE') {
      return NextResponse.json({ received: true })
    }

    console.log(`📝 Board "${record.name}" was updated - triggering display refresh`)
    
    // Broadcast to all connected display clients
    const clientsNotified = broadcastToBoard(record?.id, {
      type: 'board_updated',
      boardId: record?.id,
      userId: record?.user_id,
      data: record,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ 
      success: true,
      message: `Board update sent to ${clientsNotified} displays`
    })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

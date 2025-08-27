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

// Webhook handler for board updates
export async function POST(request) {
  try {
    const payload = await request.json()
    
    // Extract board update information
    const { type, table, record } = payload
    
    // Only handle boards table updates
    if (table !== 'boards' || type !== 'UPDATE') {
      return NextResponse.json({ 
        received: true, 
        ignored: true, 
        reason: `Not a boards UPDATE event`,
        table,
        type 
      })
    }

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
      message: `Board update sent to ${clientsNotified} displays`,
      boardId: record?.id,
      clientsNotified
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}

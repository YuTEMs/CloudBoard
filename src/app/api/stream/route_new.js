import { NextResponse } from 'next/server'
import { addConnection, removeConnection } from '@/lib/stream-manager'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const boardId = searchParams.get('boardId')
  
  if (!boardId) {
    return new NextResponse('Board ID required', { status: 400 })
  }

  console.log(`📺 Display page connected for board: ${boardId}`)

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      // Store this connection
      addConnection(boardId, controller)
      
      // Send initial connection message
      const connectMessage = JSON.stringify({
        type: 'connected',
        boardId,
        timestamp: new Date().toISOString()
      })
      controller.enqueue(`data: ${connectMessage}\n\n`)

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(() => {
        try {
          const pingMessage = JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          })
          controller.enqueue(`data: ${pingMessage}\n\n`)
        } catch (error) {
          console.log('Ping failed, cleaning up connection')
          clearInterval(pingInterval)
          removeConnection(boardId, controller)
        }
      }, 30000) // Ping every 30 seconds

      // Clean up on close
      request.signal?.addEventListener('abort', () => {
        clearInterval(pingInterval)
        removeConnection(boardId, controller)
      })
    },

    cancel() {
      console.log(`📺 Display page disconnected for board: ${boardId}`)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

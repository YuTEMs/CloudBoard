import { NextResponse } from 'next/server'
import { addConnection, removeConnection, updateConnectionPing } from '@/lib/stream-manager'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const boardId = searchParams.get('boardId')
  
  if (!boardId) {
    return new NextResponse('Board ID required', { status: 400 })
  }

  // Create Server-Sent Events stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Store this connection with tracking
      const connectionId = addConnection(boardId, controller)

      // Send initial connection message
      const connectMessage = JSON.stringify({
        type: 'connected',
        boardId,
        connectionId,
        timestamp: new Date().toISOString()
      })
      controller.enqueue(encoder.encode(`data: ${connectMessage}\n\n`))

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(() => {
        try {
          updateConnectionPing(boardId, controller)
          const pingMessage = JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          })
          controller.enqueue(encoder.encode(`data: ${pingMessage}\n\n`))
        } catch (error) {
          console.error(`[SSE] Ping failed for connection ${connectionId}:`, error.message)
          clearInterval(pingInterval)
          removeConnection(boardId, controller)
        }
      }, 30000) // Ping every 30 seconds (optimized from 15s)

      // Clean up on close
      request.signal?.addEventListener('abort', () => {
        console.log(`[SSE] Connection ${connectionId} aborted`)
        clearInterval(pingInterval)
        removeConnection(boardId, controller)
      })
    },

    cancel() {
      // Silent cleanup
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

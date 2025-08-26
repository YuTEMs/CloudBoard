import { NextResponse } from 'next/server'

// Store active connections for each board
const boardConnections = new Map()

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
      if (!boardConnections.has(boardId)) {
        boardConnections.set(boardId, new Set())
      }
      boardConnections.get(boardId).add(controller)
      
      // Send connection confirmation
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        boardId,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Setup periodic ping to detect disconnections
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          })}\n\n`)
        } catch (error) {
          // Connection closed
          clearInterval(pingInterval)
          const connections = boardConnections.get(boardId)
          if (connections) {
            connections.delete(controller)
            if (connections.size === 0) {
              boardConnections.delete(boardId)
            }
          }
        }
      }, 30000) // Ping every 30 seconds
      
      // Cleanup on connection close
      request.signal?.addEventListener('abort', () => {
        clearInterval(pingInterval)
        const connections = boardConnections.get(boardId)
        if (connections) {
          connections.delete(controller)
          if (connections.size === 0) {
            boardConnections.delete(boardId)
          }
        }
        console.log(`📺 Display page disconnected for board: ${boardId}`)
      })
    }
  })
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Function to broadcast updates to all displays of a specific board
export function broadcastToBoard(boardId, message) {
  const connections = boardConnections.get(boardId)
  
  if (!connections || connections.size === 0) {
    console.log(`No display connections for board ${boardId}`)
    return 0
  }

  const messageData = `data: ${JSON.stringify(message)}\n\n`
  let sentCount = 0
  const disconnected = []

  for (const controller of connections) {
    try {
      controller.enqueue(messageData)
      sentCount++
    } catch (error) {
      console.log('Display connection error, removing...')
      disconnected.push(controller)
    }
  }

  // Clean up disconnected connections
  disconnected.forEach(controller => {
    connections.delete(controller)
  })

  if (connections.size === 0) {
    boardConnections.delete(boardId)
  }

  console.log(`📡 Sent update to ${sentCount} displays for board ${boardId}`)
  return sentCount
}

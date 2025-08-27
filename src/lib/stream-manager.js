// Store active connections for each board
const boardConnections = new Map()

export function addConnection(boardId, controller) {
  if (!boardConnections.has(boardId)) {
    boardConnections.set(boardId, new Set())
  }
  boardConnections.get(boardId).add(controller)
  
  console.log('🔍 DEBUG: Added connection for board:', boardId, 'Total connections:', boardConnections.get(boardId).size)
}

export function removeConnection(boardId, controller) {
  const connections = boardConnections.get(boardId)
  if (connections) {
    connections.delete(controller)
    if (connections.size === 0) {
      boardConnections.delete(boardId)
    }
    console.log('🔍 DEBUG: Removed connection for board:', boardId, 'Remaining connections:', connections?.size || 0)
  }
}

export function broadcastToBoard(boardId, message) {
  const connections = boardConnections.get(boardId)
  
  console.log('🔍 DEBUG: Broadcasting to board:', boardId, 'Available connections:', connections?.size || 0)
  
  if (!connections || connections.size === 0) {
    console.log('🔍 DEBUG: No connections found for board:', boardId)
    return 0
  }

  const messageData = `data: ${JSON.stringify(message)}\n\n`
  let sentCount = 0
  const disconnected = []

  for (const controller of connections) {
    try {
      controller.enqueue(messageData)
      sentCount++
      console.log('🔍 DEBUG: Successfully sent to connection', sentCount)
    } catch (error) {
      console.log('🔍 DEBUG: Connection error, will remove:', error.message)
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

  console.log('🔍 DEBUG: Broadcast complete. Sent to:', sentCount, 'connections. Disconnected:', disconnected.length)
  return sentCount
}

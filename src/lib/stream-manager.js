// Store active connections for each board
const boardConnections = new Map()

export function addConnection(boardId, controller) {
  if (!boardConnections.has(boardId)) {
    boardConnections.set(boardId, new Set())
  }
  boardConnections.get(boardId).add(controller)
  
}

export function removeConnection(boardId, controller) {
  const connections = boardConnections.get(boardId)
  if (connections) {
    connections.delete(controller)
    if (connections.size === 0) {
      boardConnections.delete(boardId)
    }
  }
}

export function broadcastToBoard(boardId, message) {
  const connections = boardConnections.get(boardId)
  
  
  if (!connections || connections.size === 0) {
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

  return sentCount
}

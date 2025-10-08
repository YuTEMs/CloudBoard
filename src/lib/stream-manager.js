// Store active connections for each board with metadata
const boardConnections = new Map()

export function addConnection(boardId, controller) {
  if (!boardConnections.has(boardId)) {
    boardConnections.set(boardId, new Map())
  }

  const connectionId = `${Date.now()}-${Math.random()}`
  const connectionInfo = {
    controller,
    connectionId,
    connectedAt: new Date(),
    lastPing: new Date()
  }

  boardConnections.get(boardId).set(controller, connectionInfo)
  console.log(`[StreamManager] Added connection ${connectionId} for board ${boardId}. Total connections: ${boardConnections.get(boardId).size}`)

  return connectionId
}

export function removeConnection(boardId, controller) {
  const connections = boardConnections.get(boardId)
  if (connections) {
    const connectionInfo = connections.get(controller)
    const connectionId = connectionInfo?.connectionId || 'unknown'

    connections.delete(controller)
    console.log(`[StreamManager] Removed connection ${connectionId} for board ${boardId}. Remaining connections: ${connections.size}`)

    if (connections.size === 0) {
      boardConnections.delete(boardId)
      console.log(`[StreamManager] No more connections for board ${boardId}, removed from tracking`)
    }
  }
}

export function updateConnectionPing(boardId, controller) {
  const connections = boardConnections.get(boardId)
  if (connections && connections.has(controller)) {
    connections.get(controller).lastPing = new Date()
  }
}

export function broadcastToBoard(boardId, message) {
  const connections = boardConnections.get(boardId)

  if (!connections || connections.size === 0) {
    console.log(`[StreamManager] No connections for board ${boardId}, skipping broadcast`)
    return 0
  }

  const encoder = new TextEncoder()
  const messageData = `data: ${JSON.stringify(message)}\n\n`
  const encodedMessage = encoder.encode(messageData)
  let sentCount = 0
  const disconnected = []

  console.log(`[StreamManager] Broadcasting to ${connections.size} connections for board ${boardId}`)
  console.log(`[StreamManager] Message:`, message)

  for (const [controller, connectionInfo] of connections) {
    try {
      controller.enqueue(encodedMessage)
      sentCount++
    } catch (error) {
      console.error(`[StreamManager] Failed to send to connection ${connectionInfo.connectionId}:`, error.message)
      disconnected.push(controller)
    }
  }

  // Clean up disconnected connections
  disconnected.forEach(controller => {
    removeConnection(boardId, controller)
  })

  console.log(`[StreamManager] Successfully broadcasted to ${sentCount} connections for board ${boardId}`)
  return sentCount
}

// Utility function to get connection stats
export function getConnectionStats() {
  const stats = {}
  for (const [boardId, connections] of boardConnections) {
    stats[boardId] = {
      count: connections.size,
      connections: Array.from(connections.values()).map(info => ({
        connectionId: info.connectionId,
        connectedAt: info.connectedAt,
        lastPing: info.lastPing
      }))
    }
  }
  return stats
}

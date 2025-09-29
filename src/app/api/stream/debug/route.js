import { NextResponse } from 'next/server'
import { getConnectionStats } from '@/lib/stream-manager'

// Debug endpoint to check active connections
export async function GET() {
  const stats = getConnectionStats()

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalBoards: Object.keys(stats).length,
    totalConnections: Object.values(stats).reduce((sum, board) => sum + board.count, 0),
    boards: stats
  })
}
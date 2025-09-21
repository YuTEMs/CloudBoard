import { NextResponse } from 'next/server'
import { adminBoardService } from '@/lib/supabase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// GET /api/boards/[boardId] - Get a specific board by ID
export async function GET(request, { params }) {
  try {
    const { boardId } = params

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    // For public access (like display mode), we don't require authentication
    // but we still check if the user is authenticated to provide role info
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    // Get board with membership info if user is authenticated
    const board = await adminBoardService.getBoardById(boardId, userId)

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
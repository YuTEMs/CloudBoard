import { NextResponse } from 'next/server'
import { adminBoardService, adminBoardMemberService } from '@/lib/supabase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// GET /api/boards/[boardId]/members - Get board members
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { boardId } = await params
    const userId = session.user.id

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    // Check if user has access to view members
    const hasAccess = await adminBoardService.checkBoardAccess(boardId, userId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this board' },
        { status: 403 }
      )
    }

    // Get board members
    const members = await adminBoardMemberService.getBoardMembers(boardId)

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching board members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

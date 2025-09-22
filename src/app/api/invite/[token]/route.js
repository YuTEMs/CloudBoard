import { NextResponse } from 'next/server'
import { adminBoardService } from '@/lib/supabase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// GET /api/invite/[token] - Get invitation details
export async function GET(request, { params }) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Get invitation details
    const invitation = await adminBoardService.getInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      )
    }

    // Return invitation details (without sensitive info)
    return NextResponse.json({
      boardId: invitation.board_id,
      boardName: invitation.boards?.name || 'Unknown Board',
      role: invitation.role,
      invitedBy: invitation.invited_by,
      inviterName: invitation.inviter?.name || 'Unknown User',
      expiresAt: invitation.expires_at,
      isActive: invitation.is_active,
      isExpired: new Date(invitation.expires_at) < new Date(),
      canUse: true
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/invite/[token] - Accept invitation
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to accept invitations' },
        { status: 401 }
      )
    }

    const { token } = await params
    const userId = session.user.id

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Accept the invitation
    const result = await adminBoardService.acceptInvitation(token, userId)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error accepting invitation:', error)

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      )
    }

    if (error.message.includes('expired')) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      )
    }


    if (error.message.includes('already a member')) {
      return NextResponse.json(
        { error: 'You are already a member of this board' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

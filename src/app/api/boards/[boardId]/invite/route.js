import { NextResponse } from 'next/server'
import { adminBoardService } from '@/lib/supabase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { generateInviteToken } from '@/lib/utils'

// POST /api/boards/[boardId]/invite - Create invitation link
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { boardId } = await params
    const { role = 'viewer', maxUses = null, expiresInDays = 7 } = await request.json()

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['viewer', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be viewer or editor' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Check if user has permission to invite others
    const hasPermission = await adminBoardService.checkBoardAccess(boardId, userId)
    if (!hasPermission || !['owner', 'editor'].includes(hasPermission.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to invite users to this board' },
        { status: 403 }
      )
    }

    // Create invitation
    const invitation = await adminBoardService.createInvitation({
      boardId,
      invitedBy: userId,
      role,
      maxUses,
      expiresInDays
    })

    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/boards/[boardId]/invite - Get active invitations for board
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

    // Check if user has permission to view invitations
    const hasPermission = await adminBoardService.checkBoardAccess(boardId, userId)
    if (!hasPermission || !['owner', 'editor'].includes(hasPermission.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to view invitations for this board' },
        { status: 403 }
      )
    }

    // Get active invitations
    const invitations = await adminBoardService.getBoardInvitations(boardId)

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/boards/[boardId]/invite - Delete/revoke invitation
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { boardId } = await params
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('invitationId')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Check if user has permission to revoke invitations
    const hasPermission = await adminBoardService.checkBoardAccess(boardId, userId)
    if (!hasPermission || hasPermission.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only board owners can revoke invitations' },
        { status: 403 }
      )
    }

    // Revoke invitation
    await adminBoardService.revokeInvitation(invitationId, userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
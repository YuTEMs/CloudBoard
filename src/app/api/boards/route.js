import { NextResponse } from 'next/server'
import { boardService } from '@/lib/supabase'
import { adminBoardService, supabaseAdmin } from '@/lib/supabase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// GET /api/boards - Get all boards for the authenticated user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    
    const boards = await adminBoardService.getUserBoards(userId)
    
    return NextResponse.json({
      boards,
      total: boards.length
    })
  } catch (error) {
    console.error('Error fetching boards:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/boards - Create a new board
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const boardData = await request.json()

    // Validate required fields
    if (!boardData.name || !boardData.id) {
      return NextResponse.json(
        { error: 'Board name and ID are required' },
        { status: 400 }
      )
    }

    const newBoard = await adminBoardService.createBoard(boardData, userId)
    
    return NextResponse.json(newBoard, { status: 201 })
  } catch (error) {
    console.error('Error creating board:', error)
    
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json(
        { error: 'Board with this ID already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/boards - Update board configuration
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { boardId, ...updates } = await request.json()

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    const updatedBoard = await adminBoardService.updateBoard(boardId, updates, userId)
    
    // ALWAYS broadcast update immediately - don't rely on webhooks
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager')
      
      console.log('🔍 DEBUG: About to broadcast update for board:', boardId)
      const clientsNotified = broadcastToBoard(boardId, {
        type: 'board_updated',
        boardId: boardId,
        userId: userId,
        data: updatedBoard,
        timestamp: new Date().toISOString()
      })
      
      console.log('🔍 DEBUG: Broadcast result - clients notified:', clientsNotified)
      
      if (clientsNotified === 0) {
        console.log('⚠️ WARNING: No display clients connected to receive update!')
      } else {
        console.log('✅ SUCCESS: Update sent to', clientsNotified, 'display(s)')
      }
      
    } catch (broadcastError) {
      console.error('❌ ERROR: Broadcast failed:', broadcastError)
    }
    
    return NextResponse.json(updatedBoard)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/boards - Delete a board
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    // First delete the board row
    await adminBoardService.deleteBoard(boardId, userId)

    // Then clean up any storage assets for this board
    async function cleanupBoardStorage(uid, bid) {
      const primaryBucket = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'upload-media'
      const buckets = Array.from(new Set([primaryBucket, 'upload-media', 'media'])).filter(Boolean)
      const subfolders = ['images', 'videos', 'files']
      const summary = {}

      for (const bucket of buckets) {
        let deleted = 0
        const errors = []
        for (const sub of subfolders) {
          const prefix = `${uid}/${bid}/${sub}`
          try {
            const { data: listed, error: listErr } = await supabaseAdmin
              .storage
              .from(bucket)
              .list(prefix, { limit: 1000 })
            if (listErr || !Array.isArray(listed) || listed.length === 0) continue

            const paths = listed.map(item => `${prefix}/${item.name}`)
            const { error: rmErr } = await supabaseAdmin
              .storage
              .from(bucket)
              .remove(paths)
            if (rmErr) {
              errors.push(rmErr.message || String(rmErr))
            } else {
              deleted += paths.length
            }
          } catch (e) {
            errors.push(e?.message || String(e))
          }
        }
        summary[bucket] = { deleted, errors }
      }
      return summary
    }

    const storage = await cleanupBoardStorage(userId, boardId)

    return NextResponse.json({ success: true, storage })
  } catch (error) {
    console.error('Error deleting board:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

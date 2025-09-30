import { NextResponse } from 'next/server'
import { boardService } from '@/lib/supabase'
import { adminBoardService, supabaseAdmin } from '@/lib/supabase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import {
  boardsCache,
  boardCache,
  withCache,
  getBoardsCacheKey,
  getBoardCacheKey,
  invalidateUserBoards,
  invalidateBoardCache
} from '@/lib/cache'

// GET /api/boards - Get all boards for the authenticated user, or a specific board
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
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')

    if (boardId) {
      // Return specific board with caching
      const cacheKey = getBoardCacheKey(boardId)
      const board = await withCache(
        cacheKey,
        async () => {
          const boards = await adminBoardService.getUserBoards(userId)
          return boards.find(b => b.id === boardId)
        },
        boardCache,
        60000 // 1 minute cache
      )

      if (!board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(board)
    } else {
      // Return all boards with caching
      const cacheKey = getBoardsCacheKey(userId)
      const boards = await withCache(
        cacheKey,
        async () => await adminBoardService.getUserBoards(userId),
        boardsCache,
        30000 // 30 seconds cache for board lists
      )

      return NextResponse.json({
        boards,
        total: boards.length
      })
    }
  } catch (error) {
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

    // Invalidate user's board cache
    invalidateUserBoards(userId)

    return NextResponse.json(newBoard, { status: 201 })
  } catch (error) {
    
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

    // Invalidate caches
    invalidateBoardCache(boardId)
    invalidateUserBoards(userId)

    // ALWAYS broadcast update immediately - don't rely on webhooks
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager')

      const clientsNotified = broadcastToBoard(boardId, {
        type: 'board_updated',
        boardId: boardId,
        userId: userId,
        data: updatedBoard,
        timestamp: new Date().toISOString()
      })

      console.log(`[API] Board ${boardId} update broadcasted to ${clientsNotified} clients`)

    } catch (broadcastError) {
      console.error(`[API] Failed to broadcast board ${boardId} update:`, broadcastError)
      // Don't fail the API call if broadcast fails, but log it
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

    // Invalidate caches
    invalidateBoardCache(boardId)
    invalidateUserBoards(userId)

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

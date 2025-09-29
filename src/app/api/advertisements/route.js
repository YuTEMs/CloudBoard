import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Verify user owns the board
    const { data: board, error: boardError } = await supabaseAdmin
      .from('boards')
      .select('created_by')
      .eq('id', boardId)
      .single();

    if (boardError || board?.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 });
    }

    // Get advertisements for the board
    const { data: advertisements, error } = await supabaseAdmin
      .from('advertisements')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(advertisements);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { boardId, title, mediaUrl, mediaType, startDate, endDate, isActive, displayDuration } = body;

    const missingFields = [];
    if (!boardId) missingFields.push('boardId');
    if (!title) missingFields.push('title');
    if (!mediaUrl) missingFields.push('mediaUrl');
    if (!mediaType) missingFields.push('mediaType');

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required fields',
        missingFields
      }, { status: 400 });
    }

    // Verify user owns the board
    const { data: board, error: boardError } = await supabaseAdmin
      .from('boards')
      .select('created_by')
      .eq('id', boardId)
      .single();


    if (boardError) {
      return NextResponse.json({
        error: 'Board not found',
        details: boardError.message
      }, { status: 404 });
    }

    if (board?.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Access denied - you do not own this board' }, { status: 403 });
    }

    // Determine display duration (only for images)
    let finalDisplayDuration = null;
    if (mediaType === 'image') {
      finalDisplayDuration = displayDuration || 10000; // Default 10 seconds for images
    }

    // Create advertisement

    const { data: advertisement, error } = await supabaseAdmin
      .from('advertisements')
      .insert({
        board_id: boardId,
        created_by: session.user.id,
        title,
        media_url: mediaUrl,
        media_type: mediaType,
        start_date: startDate || new Date().toISOString(),
        end_date: endDate,
        is_active: isActive !== undefined ? isActive : true,
        display_duration: finalDisplayDuration
      })
      .select()
      .single();


    if (error) {
      throw error;
    }

    // Create analytics entry
    const { error: analyticsError } = await supabaseAdmin
      .from('advertisement_analytics')
      .insert({
        advertisement_id: advertisement.id,
        board_id: boardId,
        view_count: 0
      });

    if (analyticsError) {
      // Don't fail the entire request if analytics creation fails
    }


    // Broadcast advertisement creation immediately for real-time updates
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager')

      const clientsNotified = broadcastToBoard(boardId, {
        type: 'advertisements_updated',
        boardId: boardId,
        advertisementId: advertisement.id,
        webhookType: 'INSERT',
        timestamp: new Date().toISOString(),
        data: advertisement
      })
    } catch (broadcastError) {
      // Don't fail the request if broadcast fails
    }

    return NextResponse.json(advertisement);
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, startDate, endDate, isActive, displayDuration } = body;

    if (!id) {
      return NextResponse.json({ error: 'Advertisement ID is required' }, { status: 400 });
    }

    // Verify user owns the advertisement and get media type + board_id
    const { data: ad, error: adError } = await supabaseAdmin
      .from('advertisements')
      .select('created_by, media_type, board_id')
      .eq('id', id)
      .single();

    if (adError || ad?.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Advertisement not found or access denied' }, { status: 404 });
    }

    // Update advertisement
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (isActive !== undefined) updateData.is_active = isActive;

    // Only allow display duration for image advertisements
    if (displayDuration !== undefined && ad.media_type === 'image') {
      updateData.display_duration = displayDuration;
    }

    const { data: advertisement, error } = await supabaseAdmin
      .from('advertisements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Broadcast advertisement update immediately for real-time updates
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager')

      const clientsNotified = broadcastToBoard(ad.board_id, {
        type: 'advertisements_updated',
        boardId: ad.board_id,
        advertisementId: advertisement.id,
        webhookType: 'UPDATE',
        timestamp: new Date().toISOString(),
        data: advertisement
      })
    } catch (broadcastError) {
      // Don't fail the request if broadcast fails
    }

    return NextResponse.json(advertisement);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Advertisement ID is required' }, { status: 400 });
    }

    // Get advertisement details and verify ownership
    const { data: ad, error: adError } = await supabaseAdmin
      .from('advertisements')
      .select('created_by, media_url, board_id')
      .eq('id', id)
      .single();

    if (adError || ad?.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Advertisement not found or access denied' }, { status: 404 });
    }

    // Delete analytics entries first
    await supabaseAdmin
      .from('advertisement_analytics')
      .delete()
      .eq('advertisement_id', id);

    // Delete advertisement
    const { error } = await supabaseAdmin
      .from('advertisements')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // TODO: Delete media file from storage if needed

    // Broadcast advertisement deletion immediately for real-time updates
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager')

      const clientsNotified = broadcastToBoard(ad.board_id, {
        type: 'advertisements_updated',
        boardId: ad.board_id,
        advertisementId: id,
        webhookType: 'DELETE',
        timestamp: new Date().toISOString(),
        data: ad
      })
    } catch (broadcastError) {
      // Don't fail the request if broadcast fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
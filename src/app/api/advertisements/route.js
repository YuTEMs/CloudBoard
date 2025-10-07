import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-options';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('[Ads API] GET: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    console.log(`[Ads API] GET: User ${session.user.id} requesting ads for board ${boardId}`);

    if (!boardId) {
      console.log('[Ads API] GET: Missing board ID');
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Verify user owns the board
    const { data: board, error: boardError } = await supabaseAdmin
      .from('boards')
      .select('created_by')
      .eq('id', boardId)
      .single();

    if (boardError) {
      console.error(`[Ads API] GET: Board query error:`, boardError);
      return NextResponse.json({ 
        error: 'Board not found', 
        details: boardError.message 
      }, { status: 404 });
    }

    if (board?.created_by !== session.user.id) {
      console.log(`[Ads API] GET: Access denied - User ${session.user.id} doesn't own board ${boardId}`);
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 });
    }

    console.log(`[Ads API] GET: Fetching advertisements for board ${boardId}`);

    // Get advertisements for the board
    const { data: advertisements, error } = await supabaseAdmin
      .from('advertisements')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[Ads API] GET: Advertisements query error:`, error);
      return NextResponse.json({ 
        error: 'Failed to fetch advertisements', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`[Ads API] GET: Found ${advertisements?.length || 0} advertisements for board ${boardId}`);
    return NextResponse.json(advertisements);
    
  } catch (error) {
    console.error('[Ads API] GET: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('[Ads API] POST: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { boardId, title, mediaUrl, mediaType, startDate, endDate, isActive, displayDuration } = body;

    console.log(`[Ads API] POST: User ${session.user.id} creating advertisement "${title}" for board ${boardId}`);

    const missingFields = [];
    if (!boardId) missingFields.push('boardId');
    if (!title) missingFields.push('title');
    if (!mediaUrl) missingFields.push('mediaUrl');
    if (!mediaType) missingFields.push('mediaType');

    if (missingFields.length > 0) {
      console.log('[Ads API] POST: Missing required fields:', missingFields);
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
        is_active: isActive !== undefined ? isActive : false,
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

      const broadcastMessage = {
        type: 'advertisements_updated',
        boardId: boardId,
        advertisementId: advertisement.id,
        webhookType: 'INSERT',
        timestamp: new Date().toISOString(),
        data: advertisement,
        changeType: 'ADVERTISEMENT_CREATED',
        priority: 'HIGH'
      };

      console.log(`[Ads API] POST: Broadcasting new advertisement "${advertisement.title}":`, broadcastMessage);

      const clientsNotified = broadcastToBoard(boardId, broadcastMessage);
      
      console.log(`[Ads API] POST: Notified ${clientsNotified} clients about new advertisement`);
      
    } catch (broadcastError) {
      console.error(`[Ads API] POST: Broadcast failed:`, broadcastError);
      // Don't fail the request if broadcast fails, but log it
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
      console.log('[Ads API] PUT: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, startDate, endDate, isActive, displayDuration } = body;

    console.log(`[Ads API] PUT: User ${session.user.id} updating ad ${id} with changes:`, {
      title: title !== undefined,
      startDate: startDate !== undefined,
      endDate: endDate !== undefined,
      isActive: isActive !== undefined ? isActive : 'unchanged',
      displayDuration: displayDuration !== undefined
    });

    if (!id) {
      console.log('[Ads API] PUT: Missing advertisement ID');
      return NextResponse.json({ error: 'Advertisement ID is required' }, { status: 400 });
    }

    // Verify user owns the advertisement and get current state + board_id
    const { data: ad, error: adError } = await supabaseAdmin
      .from('advertisements')
      .select('created_by, media_type, board_id, is_active, title')
      .eq('id', id)
      .single();

    if (adError) {
      console.error(`[Ads API] PUT: Advertisement query error:`, adError);
      return NextResponse.json({ 
        error: 'Advertisement not found', 
        details: adError.message 
      }, { status: 404 });
    }

    if (ad?.created_by !== session.user.id) {
      console.log(`[Ads API] PUT: Access denied - User ${session.user.id} doesn't own ad ${id}`);
      return NextResponse.json({ error: 'Advertisement not found or access denied' }, { status: 404 });
    }

    console.log(`[Ads API] PUT: Found ad "${ad.title}" (active: ${ad.is_active}) for board ${ad.board_id}`);

    // Track if active status is changing (important for broadcast priority)
    const isActiveStatusChanging = isActive !== undefined && isActive !== ad.is_active;
    
    if (isActiveStatusChanging) {
      console.log(`[Ads API] PUT: ACTIVE STATUS CHANGING: ${ad.is_active} -> ${isActive} for ad "${ad.title}"`);
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

    console.log(`[Ads API] PUT: Applying updates to ad ${id}:`, updateData);

    const { data: advertisement, error } = await supabaseAdmin
      .from('advertisements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[Ads API] PUT: Update error:`, error);
      return NextResponse.json({ 
        error: 'Failed to update advertisement', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`[Ads API] PUT: Successfully updated ad "${advertisement.title}"`);

    // Broadcast advertisement update immediately for real-time updates
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager')

      const broadcastMessage = {
        type: 'advertisements_updated',
        boardId: ad.board_id,
        advertisementId: advertisement.id,
        webhookType: 'UPDATE',
        timestamp: new Date().toISOString(),
        data: advertisement,
        changeType: isActiveStatusChanging ? 'ACTIVE_STATUS_CHANGE' : 'CONTENT_UPDATE',
        priority: isActiveStatusChanging ? 'HIGH' : 'NORMAL'
      };

      console.log(`[Ads API] PUT: Broadcasting update for ad "${advertisement.title}":`, broadcastMessage);

      const clientsNotified = broadcastToBoard(ad.board_id, broadcastMessage);
      
      console.log(`[Ads API] PUT: Notified ${clientsNotified} clients about ad update`);
      
    } catch (broadcastError) {
      console.error(`[Ads API] PUT: Broadcast failed:`, broadcastError);
      // Don't fail the request if broadcast fails, but log it
    }

    return NextResponse.json(advertisement);
    
  } catch (error) {
    console.error('[Ads API] PUT: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('[Ads API] DELETE: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log(`[Ads API] DELETE: User ${session.user.id} deleting ad ${id}`);

    if (!id) {
      console.log('[Ads API] DELETE: Missing advertisement ID');
      return NextResponse.json({ error: 'Advertisement ID is required' }, { status: 400 });
    }

    // Get advertisement details and verify ownership
    const { data: ad, error: adError } = await supabaseAdmin
      .from('advertisements')
      .select('created_by, media_url, board_id, title, is_active')
      .eq('id', id)
      .single();

    if (adError) {
      console.error(`[Ads API] DELETE: Advertisement query error:`, adError);
      return NextResponse.json({ 
        error: 'Advertisement not found', 
        details: adError.message 
      }, { status: 404 });
    }

    if (ad?.created_by !== session.user.id) {
      console.log(`[Ads API] DELETE: Access denied - User ${session.user.id} doesn't own ad ${id}`);
      return NextResponse.json({ error: 'Advertisement not found or access denied' }, { status: 404 });
    }

    console.log(`[Ads API] DELETE: Deleting advertisement "${ad.title}" for board ${ad.board_id}`);

    // Delete analytics entries first
    console.log(`[Ads API] DELETE: Removing analytics for ad ${id}`);
    const { error: analyticsDeleteError } = await supabaseAdmin
      .from('advertisement_analytics')
      .delete()
      .eq('advertisement_id', id);

    if (analyticsDeleteError) {
      console.error(`[Ads API] DELETE: Analytics deletion error:`, analyticsDeleteError);
      // Continue with advertisement deletion even if analytics fails
    }

    // Delete advertisement
    console.log(`[Ads API] DELETE: Removing advertisement ${id} from database`);
    const { error } = await supabaseAdmin
      .from('advertisements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[Ads API] DELETE: Advertisement deletion error:`, error);
      return NextResponse.json({ 
        error: 'Failed to delete advertisement', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`[Ads API] DELETE: Successfully deleted advertisement "${ad.title}"`);

    // TODO: Delete media file from storage if needed

    // Broadcast advertisement deletion immediately for real-time updates
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager')

      const broadcastMessage = {
        type: 'advertisements_updated',
        boardId: ad.board_id,
        advertisementId: id,
        webhookType: 'DELETE',
        timestamp: new Date().toISOString(),
        data: ad,
        changeType: 'ADVERTISEMENT_DELETED',
        priority: 'HIGH'
      };

      console.log(`[Ads API] DELETE: Broadcasting deletion of "${ad.title}":`, broadcastMessage);

      const clientsNotified = broadcastToBoard(ad.board_id, broadcastMessage);
      
      console.log(`[Ads API] DELETE: Notified ${clientsNotified} clients about advertisement deletion`);
      
    } catch (broadcastError) {
      console.error(`[Ads API] DELETE: Broadcast failed:`, broadcastError);
      // Don't fail the request if broadcast fails, but log it
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Ads API] DELETE: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
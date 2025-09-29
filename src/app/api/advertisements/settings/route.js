import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('[Ad Settings API] GET: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    console.log(`[Ad Settings API] GET: User ${session.user.id} requesting settings for board ${boardId}`);

    if (!boardId) {
      console.log('[Ad Settings API] GET: Missing board ID');
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Verify user owns the board
    const { data: board, error: boardError } = await supabaseAdmin
      .from('boards')
      .select('created_by')
      .eq('id', boardId)
      .single();

    if (boardError) {
      console.error(`[Ad Settings API] GET: Board query error:`, boardError);
      return NextResponse.json({ 
        error: 'Board not found', 
        details: boardError.message 
      }, { status: 404 });
    }

    if (board?.created_by !== session.user.id) {
      console.log(`[Ad Settings API] GET: Access denied - User ${session.user.id} doesn't own board ${boardId}`);
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 });
    }

    console.log(`[Ad Settings API] GET: Fetching advertisement settings for board ${boardId}`);

    // Get advertisement settings for the board
    const { data: settings, error } = await supabaseAdmin
      .from('advertisement_settings')
      .select('*')
      .eq('board_id', boardId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error(`[Ad Settings API] GET: Settings query error:`, error);
      return NextResponse.json({ 
        error: 'Failed to fetch advertisement settings', 
        details: error.message 
      }, { status: 500 });
    }

    if (!settings) {
      // Return default settings if none exist
      console.log(`[Ad Settings API] GET: No settings found, returning defaults for board ${boardId}`);
      const defaultSettings = {
        board_id: boardId,
        time_between_ads: 60,
        initial_delay: 5,
        ad_display_duration: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({
        boardId: defaultSettings.board_id,
        timeBetweenAds: defaultSettings.time_between_ads,
        initialDelay: defaultSettings.initial_delay,
        adDisplayDuration: defaultSettings.ad_display_duration
      });
    }

    console.log(`[Ad Settings API] GET: Found settings for board ${boardId}:`, settings);

    // Convert database format to API format
    const apiSettings = {
      boardId: settings.board_id,
      timeBetweenAds: settings.time_between_ads,
      initialDelay: settings.initial_delay,
      adDisplayDuration: settings.ad_display_duration
    };

    return NextResponse.json(apiSettings);
    
  } catch (error) {
    console.error('[Ad Settings API] GET: Unexpected error:', error);
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
      console.log('[Ad Settings API] POST: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { boardId, timeBetweenAds, initialDelay, adDisplayDuration } = body;

    console.log(`[Ad Settings API] POST: User ${session.user.id} saving settings for board ${boardId}:`, {
      timeBetweenAds,
      initialDelay,
      adDisplayDuration
    });

    if (!boardId) {
      console.log('[Ad Settings API] POST: Missing board ID');
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Validate settings
    if (timeBetweenAds !== undefined && (timeBetweenAds < 5 || timeBetweenAds > 600)) {
      return NextResponse.json({ 
        error: 'Time between ads must be between 5 and 600 seconds' 
      }, { status: 400 });
    }

    if (initialDelay !== undefined && (initialDelay < 1 || initialDelay > 60)) {
      return NextResponse.json({ 
        error: 'Initial delay must be between 1 and 60 seconds' 
      }, { status: 400 });
    }

    // Verify user owns the board
    const { data: board, error: boardError } = await supabaseAdmin
      .from('boards')
      .select('created_by')
      .eq('id', boardId)
      .single();

    if (boardError) {
      console.error(`[Ad Settings API] POST: Board query error:`, boardError);
      return NextResponse.json({ 
        error: 'Board not found', 
        details: boardError.message 
      }, { status: 404 });
    }

    if (board?.created_by !== session.user.id) {
      console.log(`[Ad Settings API] POST: Access denied - User ${session.user.id} doesn't own board ${boardId}`);
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 });
    }

    // Prepare settings data for database
    const settingsData = {
      board_id: boardId,
      time_between_ads: timeBetweenAds || 60,
      initial_delay: initialDelay || 5,
      ad_display_duration: adDisplayDuration || null,
      updated_at: new Date().toISOString()
    };

    console.log(`[Ad Settings API] POST: Upserting settings for board ${boardId}:`, settingsData);

    // Upsert settings (update if exists, insert if not)
    const { data: savedSettings, error } = await supabaseAdmin
      .from('advertisement_settings')
      .upsert(settingsData, { 
        onConflict: 'board_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error(`[Ad Settings API] POST: Upsert error:`, error);
      return NextResponse.json({ 
        error: 'Failed to save advertisement settings', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`[Ad Settings API] POST: Successfully saved settings for board ${boardId}`);

    // Convert database format to API format
    const apiSettings = {
      boardId: savedSettings.board_id,
      timeBetweenAds: savedSettings.time_between_ads,
      initialDelay: savedSettings.initial_delay,
      adDisplayDuration: savedSettings.ad_display_duration
    };

    // Broadcast settings update immediately for real-time updates
    try {
      const { broadcastToBoard } = await import('@/lib/stream-manager');

      const broadcastMessage = {
        type: 'advertisement_settings_updated',
        boardId: boardId,
        timestamp: new Date().toISOString(),
        data: apiSettings,
        changeType: 'SETTINGS_UPDATE',
        priority: 'HIGH'
      };

      console.log(`[Ad Settings API] POST: Broadcasting settings update:`, broadcastMessage);

      const clientsNotified = broadcastToBoard(boardId, broadcastMessage);
      
      console.log(`[Ad Settings API] POST: Notified ${clientsNotified} clients about settings update`);
      
    } catch (broadcastError) {
      console.error(`[Ad Settings API] POST: Broadcast failed:`, broadcastError);
      // Don't fail the request if broadcast fails, but log it
    }

    return NextResponse.json(apiSettings);
    
  } catch (error) {
    console.error('[Ad Settings API] POST: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

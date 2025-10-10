import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    // Check for session (optional for GET - allows public display access)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    console.log(`[Ad Settings API] GET: ${userId ? `User ${userId}` : 'Public'} requesting settings for board ${boardId}`);

    if (!boardId) {
      console.log('[Ad Settings API] GET: Missing board ID');
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Verify board exists (no ownership check for GET - public display needs this)
    const { data: board, error: boardError } = await supabaseAdmin
      .from('boards')
      .select('id, created_by')
      .eq('id', boardId)
      .single();

    if (boardError) {
      console.error(`[Ad Settings API] GET: Board query error:`, boardError);
      return NextResponse.json({
        error: 'Board not found',
        details: boardError.message
      }, { status: 404 });
    }

    if (!board) {
      console.log(`[Ad Settings API] GET: Board not found: ${boardId}`);
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
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
        enable_ai: false,
        person_threshold: 1,
        detection_duration: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return NextResponse.json({
        boardId: defaultSettings.board_id,
        timeBetweenAds: defaultSettings.time_between_ads,
        initialDelay: defaultSettings.initial_delay,
        adDisplayDuration: defaultSettings.ad_display_duration,
        enableAI: defaultSettings.enable_ai,
        personThreshold: defaultSettings.person_threshold,
        detectionDuration: defaultSettings.detection_duration
      });
    }

    console.log(`[Ad Settings API] GET: Found settings for board ${boardId}:`, settings);

    // Convert database format to API format
    const apiSettings = {
      boardId: settings.board_id,
      timeBetweenAds: settings.time_between_ads,
      initialDelay: settings.initial_delay,
      adDisplayDuration: settings.ad_display_duration,
      enableAI: settings.enable_ai || false,
      personThreshold: settings.person_threshold || 1,
      detectionDuration: settings.detection_duration || 0
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
    const { boardId, timeBetweenAds, initialDelay, adDisplayDuration, enableAI, personThreshold, detectionDuration } = body;

    console.log(`[Ad Settings API] POST: User ${session.user.id} saving settings for board ${boardId}:`, {
      timeBetweenAds,
      initialDelay,
      adDisplayDuration,
      enableAI,
      personThreshold,
      detectionDuration
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

    if (personThreshold !== undefined && (!Number.isInteger(personThreshold) || personThreshold < 1 || personThreshold > 50)) {
      return NextResponse.json({
        error: 'Person threshold must be an integer between 1 and 50'
      }, { status: 400 });
    }

    if (detectionDuration !== undefined && (!Number.isInteger(detectionDuration) || detectionDuration < 0 || detectionDuration > 30)) {
      return NextResponse.json({
        error: 'Detection duration must be an integer between 0 and 30 seconds'
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
      enable_ai: enableAI !== undefined ? enableAI : false,
      person_threshold: personThreshold || 1,
      detection_duration: detectionDuration !== undefined ? detectionDuration : 0,
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

    console.log(`[Ad Settings API] POST: Successfully saved settings for board ${boardId} - Supabase Realtime will notify subscribers`);

    // Convert database format to API format
    const apiSettings = {
      boardId: savedSettings.board_id,
      timeBetweenAds: savedSettings.time_between_ads,
      initialDelay: savedSettings.initial_delay,
      adDisplayDuration: savedSettings.ad_display_duration,
      enableAI: savedSettings.enable_ai || false,
      personThreshold: savedSettings.person_threshold || 1,
      detectionDuration: savedSettings.detection_duration || 0
    };

    return NextResponse.json(apiSettings);
    
  } catch (error) {
    console.error('[Ad Settings API] POST: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

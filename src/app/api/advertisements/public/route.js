import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Public endpoint for fetching active advertisements for display purposes
// This bypasses authentication to allow display URLs to work without login
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    console.log(`[Public Ads API] Request for boardId: ${boardId}`);

    if (!boardId) {
      console.log('[Public Ads API] Error: No board ID provided');
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // First verify the board exists (using admin client for reliable access)
    console.log(`[Public Ads API] Verifying board exists: ${boardId}`);
    const { data: board, error: boardError } = await supabaseAdmin
      .from('boards')
      .select('id, name')
      .eq('id', boardId)
      .single();

    if (boardError) {
      console.error(`[Public Ads API] Board query error:`, boardError);
      return NextResponse.json({ 
        error: 'Board not found', 
        details: boardError.message,
        boardId 
      }, { status: 404 });
    }

    if (!board) {
      console.log(`[Public Ads API] Board not found: ${boardId}`);
      return NextResponse.json({ 
        error: 'Board not found', 
        boardId 
      }, { status: 404 });
    }

    console.log(`[Public Ads API] Board found: ${board.name} (${board.id})`);

    // Get active advertisements for the board (using admin client for reliable access)
    console.log(`[Public Ads API] Fetching advertisements for board: ${boardId}`);
    const { data: advertisements, error } = await supabaseAdmin
      .from('advertisements')
      .select('*')
      .eq('board_id', boardId)
      .eq('is_active', true) // Only return active ads
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[Public Ads API] Advertisements query error:`, error);
      return NextResponse.json({ 
        error: 'Failed to fetch advertisements', 
        details: error.message,
        boardId 
      }, { status: 500 });
    }

    console.log(`[Public Ads API] Found ${advertisements?.length || 0} active advertisements`);

    if (!advertisements || advertisements.length === 0) {
      console.log(`[Public Ads API] No active advertisements found for board: ${boardId}`);
      return NextResponse.json([]);
    }

    // Filter by date range with proper timezone handling
    const now = new Date();
    console.log(`[Public Ads API] Current time: ${now.toISOString()}`);
    
    const activeAds = advertisements.filter(ad => {
      // Check start date (convert to Date object and compare in UTC)
      if (ad.start_date) {
        const startDate = new Date(ad.start_date);
        if (startDate > now) {
          console.log(`[Public Ads API] Ad "${ad.title}" not yet active (starts: ${startDate.toISOString()})`);
          return false;
        }
      }
      
      // Check end date (convert to Date object and compare in UTC)
      if (ad.end_date) {
        const endDate = new Date(ad.end_date);
        // Add 23:59:59 to end date if it's just a date (no time component)
        if (ad.end_date.includes('T') === false) {
          endDate.setHours(23, 59, 59, 999);
        }
        if (endDate < now) {
          console.log(`[Public Ads API] Ad "${ad.title}" expired (ended: ${endDate.toISOString()})`);
          return false;
        }
      }
      
      console.log(`[Public Ads API] Ad "${ad.title}" is active`);
      return true;
    });

    console.log(`[Public Ads API] Returning ${activeAds.length} date-filtered active advertisements`);
    return NextResponse.json(activeAds);
    
  } catch (error) {
    console.error('[Public Ads API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
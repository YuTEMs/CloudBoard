import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getConnectionStats } from '@/lib/stream-manager';

// Debug endpoint for testing advertisement system functionality
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const action = searchParams.get('action') || 'status';

    const debugInfo = {
      timestamp: new Date().toISOString(),
      action,
      boardId,
      results: {}
    };

    switch (action) {
      case 'status':
        // Overall system status
        debugInfo.results = {
          message: 'Advertisement debug endpoint is active',
          connectionStats: getConnectionStats(),
          databaseConnection: 'testing...'
        };

        // Test database connection
        try {
          const { data, error } = await supabaseAdmin
            .from('boards')
            .select('count(*)')
            .limit(1);
          
          debugInfo.results.databaseConnection = error ? `Error: ${error.message}` : 'Connected';
        } catch (dbError) {
          debugInfo.results.databaseConnection = `Failed: ${dbError.message}`;
        }
        break;

      case 'board-ads':
        if (!boardId) {
          return NextResponse.json({ error: 'boardId required for board-ads action' }, { status: 400 });
        }

        // Test board and advertisements queries
        console.log(`[Debug] Testing board ${boardId} and its advertisements`);

        // Check board
        const { data: board, error: boardError } = await supabaseAdmin
          .from('boards')
          .select('id, name, created_by')
          .eq('id', boardId)
          .single();

        debugInfo.results.board = {
          found: !!board,
          error: boardError?.message || null,
          data: board || null
        };

        if (board) {
          // Check all advertisements
          const { data: allAds, error: allAdsError } = await supabaseAdmin
            .from('advertisements')
            .select('*')
            .eq('board_id', boardId)
            .order('created_at', { ascending: false });

          debugInfo.results.allAdvertisements = {
            count: allAds?.length || 0,
            error: allAdsError?.message || null,
            data: allAds || []
          };

          // Check active advertisements (what public API returns)
          const { data: activeAds, error: activeAdsError } = await supabaseAdmin
            .from('advertisements')
            .select('*')
            .eq('board_id', boardId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          debugInfo.results.activeAdvertisements = {
            count: activeAds?.length || 0,
            error: activeAdsError?.message || null,
            data: activeAds || []
          };

          // Apply date filtering (same logic as public API)
          const now = new Date();
          const dateFilteredAds = activeAds?.filter(ad => {
            if (ad.start_date) {
              const startDate = new Date(ad.start_date);
              if (startDate > now) return false;
            }
            if (ad.end_date) {
              const endDate = new Date(ad.end_date);
              if (ad.end_date.includes('T') === false) {
                endDate.setHours(23, 59, 59, 999);
              }
              if (endDate < now) return false;
            }
            return true;
          }) || [];

          debugInfo.results.dateFilteredAdvertisements = {
            count: dateFilteredAds.length,
            currentTime: now.toISOString(),
            data: dateFilteredAds
          };
        }
        break;

      case 'test-public-api':
        if (!boardId) {
          return NextResponse.json({ error: 'boardId required for test-public-api action' }, { status: 400 });
        }

        // Test the public API directly
        console.log(`[Debug] Testing public API for board ${boardId}`);
        
        try {
          const publicApiUrl = new URL('/api/advertisements/public', request.url);
          publicApiUrl.searchParams.set('boardId', boardId);
          
          const publicApiResponse = await fetch(publicApiUrl.toString());
          const publicApiData = await publicApiResponse.json();
          
          debugInfo.results.publicApiTest = {
            status: publicApiResponse.status,
            ok: publicApiResponse.ok,
            data: publicApiData,
            headers: Object.fromEntries(publicApiResponse.headers.entries())
          };
        } catch (apiError) {
          debugInfo.results.publicApiTest = {
            error: apiError.message,
            stack: apiError.stack
          };
        }
        break;

      case 'connections':
        // Show SSE connection details
        debugInfo.results = {
          connectionStats: getConnectionStats(),
          description: 'Active SSE connections per board'
        };
        break;

      default:
        debugInfo.results = {
          error: 'Unknown action',
          availableActions: ['status', 'board-ads', 'test-public-api', 'connections'],
          usage: '/api/advertisements/debug?action=STATUS&boardId=BOARD_ID'
        };
    }

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('[Advertisement Debug] Error:', error);
    return NextResponse.json({ 
      error: 'Debug endpoint error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST endpoint for testing broadcasts
export async function POST(request) {
  try {
    const body = await request.json();
    const { boardId, testMessage } = body;

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    console.log(`[Debug] Broadcasting test message to board ${boardId}`);

    const { broadcastToBoard } = await import('@/lib/stream-manager');

    const testBroadcast = {
      type: 'advertisements_updated',
      boardId: boardId,
      advertisementId: 'debug-test',
      webhookType: 'DEBUG',
      timestamp: new Date().toISOString(),
      data: { message: testMessage || 'Debug test broadcast' },
      changeType: 'DEBUG_TEST',
      priority: 'LOW'
    };

    const clientsNotified = broadcastToBoard(boardId, testBroadcast);

    return NextResponse.json({
      success: true,
      clientsNotified,
      broadcastMessage: testBroadcast,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Advertisement Debug] Broadcast test error:', error);
    return NextResponse.json({ 
      error: 'Broadcast test failed', 
      details: error.message 
    }, { status: 500 });
  }
}


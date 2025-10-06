import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth-options';
import { supabase } from '../../../../lib/supabase';
import { queryCache, withCache } from '../../../../lib/cache';

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
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('created_by')
      .eq('id', boardId)
      .single();

    if (boardError || board?.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 });
    }

    // Get analytics data with caching (5 minute TTL)
    const cacheKey = `analytics:${boardId}`;
    const analytics = await withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('advertisement_analytics')
          .select(`
            *,
            advertisements (
              id,
              title,
              media_type,
              created_at
            )
          `)
          .eq('board_id', boardId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      queryCache,
      300000 // 5 minutes
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching advertisement analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { advertisementId } = body;

    if (!advertisementId) {
      return NextResponse.json({ error: 'Advertisement ID is required' }, { status: 400 });
    }

    // Increment view count
    const { error } = await supabase.rpc('increment_ad_view_count', {
      ad_id: advertisementId
    });

    if (error) {
      // If RPC function doesn't exist, use manual increment
      const { data: analytics, error: fetchError } = await supabase
        .from('advertisement_analytics')
        .select('view_count')
        .eq('advertisement_id', advertisementId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const { error: updateError } = await supabase
        .from('advertisement_analytics')
        .update({
          view_count: (analytics.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('advertisement_id', advertisementId);

      if (updateError) {
        throw updateError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording advertisement view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Public endpoint for fetching active advertisements for display purposes
// This bypasses authentication to allow display URLs to work without login
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // First verify the board exists (public access)
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Get active advertisements for the board (public access)
    const { data: advertisements, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('board_id', boardId)
      .eq('is_active', true) // Only return active ads
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public advertisements:', error);
      throw error;
    }

    // Filter by date range
    const now = new Date();
    const activeAds = advertisements.filter(ad => {
      // Check start date
      if (ad.start_date && new Date(ad.start_date) > now) return false;
      // Check end date
      if (ad.end_date && new Date(ad.end_date) < now) return false;
      return true;
    });

    return NextResponse.json(activeAds);
  } catch (error) {
    console.error('Error in public advertisements endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
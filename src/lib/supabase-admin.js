import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase service role environment variables')
}

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database operations for boards using admin client
export const adminBoardService = {
  // Create a new board
  async createBoard(boardData, userId) {
    console.log('📝 Creating board with admin client:', boardData)
    
    const { data, error } = await supabaseAdmin
      .from('boards')
      .insert({
        id: boardData.id,
        name: boardData.name,
        description: boardData.description || '',
        user_id: userId,
        configuration: boardData.configuration || {
          items: [],
          widgets: [],
          canvasSize: { width: 1920, height: 1080 },
          backgroundImage: null,
          backgroundColor: "#ffffff"
        },
        created_at: boardData.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('❌ Error creating board:', error)
      throw error
    }
    
    console.log('✅ Board created successfully:', data)
    return data[0]
  },

  // Get all boards for a user
  async getUserBoards(userId) {
    const { data, error } = await supabaseAdmin
      .from('boards')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching user boards:', error)
      throw error
    }

    return data || []
  },

  // Get a specific board by ID
  async getBoardById(boardId) {
    const { data, error } = await supabaseAdmin
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching board:', error)
      throw error
    }

    return data
  },

  // Update a board
  async updateBoard(boardId, updates, userId) {
    console.log('📝 Updating board:', boardId, updates)
    
    const { data, error } = await supabaseAdmin
      .from('boards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', boardId)
      .eq('user_id', userId) // Ensure user can only update their own boards
      .select()

    if (error) {
      console.error('❌ Error updating board:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('Board not found or access denied')
    }
    
    console.log('✅ Board updated successfully:', data)
    return data[0]
  },

  // Delete a board
  async deleteBoard(boardId, userId) {
    const { error } = await supabaseAdmin
      .from('boards')
      .delete()
      .eq('id', boardId)
      .eq('user_id', userId) // Ensure user can only delete their own boards

    if (error) {
      console.error('Error deleting board:', error)
      throw error
    }

    return true
  }
}

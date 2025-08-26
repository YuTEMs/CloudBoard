import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database operations for users
export const userService = {
  // Create or update user profile
  async upsertUser(userData) {
    console.log('📝 Supabase upsertUser called with:', userData)
    
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        username: userData.username,
        avatar_url: userData.image || userData.avatar_url,
        provider: userData.provider || 'email',
        created_at: userData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('❌ Supabase upsert error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      throw error
    }
    
    console.log('✅ Supabase upsert successful:', data)
    return data[0]
  },

  // Get user by ID
  async getUserById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user:', error)
      throw error
    }

    return data
  },

  // Get user by email
  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user by email:', error)
      throw error
    }

    return data
  },

  // Update user profile
  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Error updating user:', error)
      throw error
    }

    return data[0]
  },

  // Delete user
  async deleteUser(userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      throw error
    }

    return true
  }
}

// Database operations for boards
export const boardService = {
  // Create a new board
  async createBoard(boardData, userId) {
    console.log('📝 Creating board:', boardData)
    
    const { data, error } = await supabase
      .from('boards')
      .insert({
        id: boardData.id,
        name: boardData.name,
        description: boardData.description,
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
    const { data, error } = await supabase
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

  // Get a single board by ID
  async getBoardById(boardId) {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching board:', error)
      throw error
    }

    return data
  },

  // Update board configuration
  async updateBoard(boardId, updates, userId) {
    console.log('📝 Updating board:', boardId, updates)
    
    const { data, error } = await supabase
      .from('boards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', boardId)
      .eq('user_id', userId) // Ensure user owns the board
      .select()

    if (error) {
      console.error('❌ Error updating board:', error)
      throw error
    }
    
    console.log('✅ Board updated successfully:', data)
    return data[0]
  },

  // Delete a board
  async deleteBoard(boardId, userId) {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId)
      .eq('user_id', userId) // Ensure user owns the board

    if (error) {
      console.error('Error deleting board:', error)
      throw error
    }

    return true
  },

  // Subscribe to real-time changes for user's boards
  subscribeToUserBoards(userId, callback) {
    console.log('🔔 Setting up real-time subscription for user:', userId)
    
    const channel = supabase
      .channel(`user_boards_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'boards',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Real-time board change detected:', payload)
          callback(payload)
        }
      )
      .subscribe()

    return channel
  },

  // Subscribe to changes for a specific board (for display mode)
  subscribeToBoardChanges(boardId, callback) {
    console.log('🔔 Setting up real-time subscription for board:', boardId)
    
    const channel = supabase
      .channel(`board_${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'boards',
          filter: `id=eq.${boardId}`
        },
        (payload) => {
          console.log('🔄 Real-time board update detected:', payload)
          callback(payload)
        }
      )
      .subscribe()

    return channel
  }
}

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

    // Build payload and only include password_hash if provided to avoid overwriting
    const payload = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      username: userData.username,
      avatar_url: userData.image || userData.avatar_url,
      provider: userData.provider || 'email',
      created_at: userData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    if (userData.password_hash) {
      payload.password_hash = userData.password_hash
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(payload)
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
// Debug function to check database status and user authentication
export const debugService = {
  async checkDatabaseStatus() {
    console.log('🔍 Checking database status...')

    try {
      // Check if tables exist (using admin call to bypass RLS)
      const boardsCheck = await supabase.from('boards').select('count').limit(1)
      const membersCheck = await supabase.from('board_members').select('count').limit(1)
      const usersCheck = await supabase.from('users').select('count').limit(1)

      console.log('📊 Database table accessibility:')
      console.log('  - boards table:', boardsCheck.error ? '❌ ' + boardsCheck.error.message : '✅ accessible')
      console.log('  - board_members table:', membersCheck.error ? '❌ ' + membersCheck.error.message : '✅ accessible')
      console.log('  - users table:', usersCheck.error ? '❌ ' + usersCheck.error.message : '✅ accessible')

      // Check current user authentication
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      console.log('🔐 Current auth user:', authUser.user ? authUser.user.id : 'None')
      if (authError) {
        console.log('🔐 Auth error:', authError.message)
      }

      return {
        tablesAccessible: !boardsCheck.error && !membersCheck.error && !usersCheck.error,
        currentAuthUser: authUser.user?.id || null,
        authError
      }
    } catch (err) {
      console.error('❌ Database status check failed:', err)
      return { error: err }
    }
  }
}

export const boardService = {
  // Create a new board
  async createBoard(boardData, userId) {
    console.log('📝 Creating board:', { boardData, userId })

    if (!userId) {
      throw new Error('User ID is required to create a board')
    }

    // First, ensure the user exists in the users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking user existence:', userCheckError)
      throw new Error(`Failed to verify user: ${userCheckError.message}`)
    }

    if (!existingUser) {
      console.log('👤 User not found in users table, attempting to create user...')

      // Try to create the user first
      try {
        // We need basic user info to create the user - get it from session if possible
        const basicUserData = {
          id: userId,
          email: `${userId}@placeholder.com`, // Fallback email
          name: 'User',
          username: userId,
          provider: 'unknown'
        }

        console.log('👤 Creating missing user:', basicUserData)
        const createdUser = await userService.upsertUser(basicUserData)
        console.log('✅ User created successfully:', createdUser)
      } catch (userCreateError) {
        console.error('❌ Failed to create user:', userCreateError)
        throw new Error(`Cannot create board: User ${userId} does not exist and could not be created. Please sign out and sign in again.`)
      }
    }

    // Create board with new schema
    const boardToCreate = {
      id: boardData.id,
      name: boardData.name,
      description: boardData.description || '',
      created_by: userId,
      configuration: boardData.configuration || {
        items: [],
        widgets: [],
        canvasSize: { width: 1920, height: 1080 },
        backgroundImage: null,
        backgroundColor: "#ffffff"
      }
    }

    console.log('🔧 Creating board with data:', boardToCreate)

    const { data: boardResult, error: boardError } = await supabase
      .from('boards')
      .insert(boardToCreate)
      .select()

    if (boardError) {
      console.error('❌ Error creating board:', {
        error: boardError,
        message: boardError.message,
        code: boardError.code,
        details: boardError.details,
        hint: boardError.hint
      })

      // Provide helpful error messages
      if (boardError.code === '23503') {
        throw new Error(`Foreign key constraint error: User ${userId} does not exist in users table. Please ensure you're properly logged in.`)
      }

      throw new Error(`Failed to create board: ${boardError.message}`)
    }

    console.log('✅ Board created successfully:', boardResult)

    // The database trigger should automatically create the board_members entry
    // Let's verify it was created
    const { data: membershipCheck, error: membershipError } = await supabase
      .from('board_members')
      .select('*')
      .eq('board_id', boardData.id)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membershipCheck) {
      console.log('⚠️ Automatic membership creation via trigger failed, creating manually...')

      // Manual fallback - create membership manually
      const { error: memberError } = await supabase
        .from('board_members')
        .insert({
          board_id: boardData.id,
          user_id: userId,
          role: 'owner',
          permissions: {
            read: true,
            write: true,
            delete: true,
            invite: true
          }
        })

      if (memberError) {
        console.error('❌ Error creating board membership:', memberError)
        // Cleanup: delete the board if membership creation failed
        await supabase.from('boards').delete().eq('id', boardData.id)
        throw new Error(`Failed to create board membership: ${memberError.message}`)
      }

      console.log('✅ Board membership created manually')
    } else {
      console.log('✅ Board membership created automatically via trigger')
    }

    // Map database snake_case to frontend camelCase
    const board = boardResult[0]
    return {
      ...board,
      createdAt: board.created_at,
      updatedAt: board.updated_at
    }
  },

  // Get all boards accessible to a user (owned + shared)
  async getUserBoards(userId) {
    console.log('🔍 Fetching boards for userId:', userId)

    if (!userId) {
      console.error('❌ No userId provided to getUserBoards')
      throw new Error('User ID is required')
    }

    // Run diagnostic check on first error
    const diagnostics = await debugService.checkDatabaseStatus()
    console.log('🔧 Diagnostics:', diagnostics)

    // Try to fetch user's boards directly
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        board_members!inner(
          role,
          permissions,
          joined_at
        )
      `)
      .eq('board_members.user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching user boards:', {
        error,
        userId,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        hint: error.hint
      })

      // If this is a table/column not found error, suggest database setup
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        throw new Error(`Database table issue: ${error.message}. Please ensure the fresh database setup script was executed successfully.`)
      }

      // If this is an RLS policy issue, suggest checking policies
      if (error.code === '42501' || error.message.includes('policy')) {
        throw new Error(`Permission issue: ${error.message}. RLS policies may be blocking access.`)
      }

      throw error
    }

    // Transform data to include user's role and permissions
    return (data || []).map(board => ({
      ...board,
      // Map database snake_case to frontend camelCase
      createdAt: board.created_at,
      updatedAt: board.updated_at,
      userRole: board.board_members[0]?.role,
      userPermissions: board.board_members[0]?.permissions,
      joinedAt: board.board_members[0]?.joined_at
    }))
  },

  // Get boards where user is owner
  async getUserOwnedBoards(userId) {
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        board_members!inner(
          role,
          permissions,
          joined_at
        )
      `)
      .eq('board_members.user_id', userId)
      .eq('board_members.role', 'owner')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching user owned boards:', error)
      throw error
    }

    return (data || []).map(board => ({
      ...board,
      // Map database snake_case to frontend camelCase
      createdAt: board.created_at,
      updatedAt: board.updated_at,
      userRole: board.board_members[0]?.role,
      userPermissions: board.board_members[0]?.permissions,
      joinedAt: board.board_members[0]?.joined_at
    }))
  },

  // Get a single board by ID (for display mode - bypasses RLS)
  async getBoardById(boardId, userId = null) {
    // For display mode, we need public access to boards
    // This allows shared display URLs to work without authentication
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching board:', error)
      throw error
    }

    // Map database snake_case to frontend camelCase for consistency
    if (data) {
      return {
        ...data,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    }

    return data
  },

  // Get a single board by ID with full membership info (authenticated access)
  async getBoardByIdWithMembers(boardId, userId = null) {
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        board_members(
          user_id,
          role,
          permissions,
          joined_at,
          users(
            id,
            name,
            email,
            avatar_url
          )
        )
      `)
      .eq('id', boardId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching board with members:', error)
      throw error
    }

    if (!data) return null

    // Find current user's access level if userId provided
    let userAccess = null
    if (userId) {
      userAccess = data.board_members?.find(member => member.user_id === userId)
    }

    return {
      ...data,
      // Map database snake_case to frontend camelCase
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userRole: userAccess?.role || null,
      userPermissions: userAccess?.permissions || null,
      members: data.board_members || []
    }
  },

  // Check if user has access to a board
  async checkBoardAccess(boardId, userId) {
    const { data, error } = await supabase
      .from('board_members')
      .select('role, permissions')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking board access:', error)
      throw error
    }

    return data
  },

  // Update board configuration
  async updateBoard(boardId, updates, userId) {
    console.log('📝 Updating board:', boardId, updates)

    // First check if user has write access
    const access = await this.checkBoardAccess(boardId, userId)
    if (!access || (!access.permissions?.write && access.role !== 'owner')) {
      throw new Error('Insufficient permissions to update board')
    }

    const { data, error } = await supabase
      .from('boards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', boardId)
      .select()

    if (error) {
      console.error('❌ Error updating board:', error)
      throw error
    }

    console.log('✅ Board updated successfully:', data)
    
    // Map database snake_case to frontend camelCase
    const board = data[0]
    return {
      ...board,
      createdAt: board.created_at,
      updatedAt: board.updated_at
    }
  },

  // Delete a board (only owners can delete)
  async deleteBoard(boardId, userId) {
    // Check if user is owner
    const access = await this.checkBoardAccess(boardId, userId)
    if (!access || access.role !== 'owner') {
      throw new Error('Only board owners can delete boards')
    }

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId)

    if (error) {
      console.error('Error deleting board:', error)
      throw error
    }

    return true
  },

  // Subscribe to real-time changes for user's accessible boards
  subscribeToUserBoards(userId, callback) {
    console.log('🔔 Setting up real-time subscription for user:', userId)

    // Subscribe to board_members changes for this user
    const membershipChannel = supabase
      .channel(`user_memberships_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_members',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Real-time membership change detected:', payload)
          callback({ type: 'membership', payload })
        }
      )
      .subscribe()

    // Subscribe to board changes for boards the user has access to
    const boardChannel = supabase
      .channel(`user_boards_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards'
        },
        (payload) => {
          console.log('🔄 Real-time board change detected:', payload)
          callback({ type: 'board', payload })
        }
      )
      .subscribe()

    return { membershipChannel, boardChannel }
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

// Database operations for board members
export const boardMemberService = {
  // Get all members of a board
  async getBoardMembers(boardId) {
    const { data, error } = await supabase
      .from('board_members')
      .select(`
        *,
        users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('board_id', boardId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching board members:', error)
      throw error
    }

    return data || []
  },

  // Add a member to a board
  async addBoardMember(boardId, userId, role = 'viewer', invitedBy, permissions = null) {
    const defaultPermissions = {
      viewer: { read: true, write: false, delete: false, invite: false },
      editor: { read: true, write: true, delete: false, invite: false },
      owner: { read: true, write: true, delete: true, invite: true }
    }

    const { data, error } = await supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: userId,
        role,
        invited_by: invitedBy,
        permissions: permissions || defaultPermissions[role],
        joined_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error adding board member:', error)
      throw error
    }

    return data[0]
  },

  // Update member role/permissions
  async updateBoardMember(boardId, userId, updates) {
    const { data, error } = await supabase
      .from('board_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error updating board member:', error)
      throw error
    }

    return data[0]
  },

  // Remove member from board
  async removeBoardMember(boardId, userId) {
    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing board member:', error)
      throw error
    }

    return true
  }
}

// Database operations for board invitations
export const invitationService = {
  // Generate a secure token for invitations
  generateInviteToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  // Create a new board invitation
  async createInvitation(boardId, invitedBy, role = 'viewer', expiresInDays = 7, maxUses = null) {
    const token = this.generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { data, error } = await supabase
      .from('board_invitations')
      .insert({
        board_id: boardId,
        invited_by: invitedBy,
        role,
        token,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        used_count: 0,
        is_active: true
      })
      .select()

    if (error) {
      console.error('Error creating invitation:', error)
      throw error
    }

    return data[0]
  },

  // Get invitation by token
  async getInvitationByToken(token) {
    const { data, error } = await supabase
      .from('board_invitations')
      .select(`
        *,
        boards (
          id,
          name,
          description,
          created_by
        ),
        users!board_invitations_invited_by_fkey (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching invitation:', error)
      throw error
    }

    return data
  },

  // Accept an invitation
  async acceptInvitation(token, userId) {
    // Get invitation details
    const invitation = await this.getInvitationByToken(token)

    if (!invitation) {
      throw new Error('Invitation not found or expired')
    }

    // Check if invitation is still valid
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired')
    }

    if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
      throw new Error('Invitation has reached maximum usage limit')
    }

    // Check if user is already a member
    const existingMember = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', invitation.board_id)
      .eq('user_id', userId)
      .single()

    if (existingMember.data) {
      throw new Error('User is already a member of this board')
    }

    // Add user as board member
    await boardMemberService.addBoardMember(
      invitation.board_id,
      userId,
      invitation.role,
      invitation.invited_by
    )

    // Update invitation usage count
    await supabase
      .from('board_invitations')
      .update({
        used_count: invitation.used_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    return {
      board: invitation.boards,
      role: invitation.role,
      invitedBy: invitation.users
    }
  },

  // Get all invitations for a board
  async getBoardInvitations(boardId) {
    const { data, error } = await supabase
      .from('board_invitations')
      .select(`
        *,
        users!board_invitations_invited_by_fkey (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('board_id', boardId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching board invitations:', error)
      throw error
    }

    return data || []
  },

  // Revoke an invitation
  async revokeInvitation(invitationId) {
    const { error } = await supabase
      .from('board_invitations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (error) {
      console.error('Error revoking invitation:', error)
      throw error
    }

    return true
  },

  // Clean up expired invitations
  async cleanupExpiredInvitations() {
    const { error } = await supabase
      .from('board_invitations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)

    if (error) {
      console.error('Error cleaning up expired invitations:', error)
      throw error
    }

    return true
  }
}

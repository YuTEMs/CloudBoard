import { createClient } from '@supabase/supabase-js'
import {
  invalidateBoardCache,
  invalidateUserBoards
} from './cache'

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
      throw error
    }
    
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
      throw error
    }

    return true
  }
}

// Database operations for boards
// Debug function to check database status and user authentication
export const debugService = {
  async checkDatabaseStatus() {

    try {
      // Check if tables exist (using admin call to bypass RLS)
      const boardsCheck = await supabase.from('boards').select('count').limit(1)
      const membersCheck = await supabase.from('board_members').select('count').limit(1)
      const usersCheck = await supabase.from('users').select('count').limit(1)


      // Check current user authentication
      const { data: authUser, error: authError } = await supabase.auth.getUser()

      return {
        tablesAccessible: !boardsCheck.error && !membersCheck.error && !usersCheck.error,
        currentAuthUser: authUser.user?.id || null,
        authError
      }
    } catch (err) {
      return { error: err }
    }
  }
}

export const boardService = {
  // Create a new board
  async createBoard(boardData, userId) {

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
      throw new Error(`Failed to verify user: ${userCheckError.message}`)
    }

    if (!existingUser) {

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

        const createdUser = await userService.upsertUser(basicUserData)
      } catch (userCreateError) {
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


    const { data: boardResult, error: boardError } = await supabase
      .from('boards')
      .insert(boardToCreate)
      .select()

    if (boardError) {

      // Provide helpful error messages
      if (boardError.code === '23503') {
        throw new Error(`Foreign key constraint error: User ${userId} does not exist in users table. Please ensure you're properly logged in.`)
      }

      throw new Error(`Failed to create board: ${boardError.message}`)
    }


    // The database trigger should automatically create the board_members entry
    // Let's verify it was created
    const { data: membershipCheck, error: membershipError } = await supabase
      .from('board_members')
      .select('*')
      .eq('board_id', boardData.id)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membershipCheck) {

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
        // Cleanup: delete the board if membership creation failed
        await supabase.from('boards').delete().eq('id', boardData.id)
        throw new Error(`Failed to create board membership: ${memberError.message}`)
      }

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

    if (!userId) {
      throw new Error('User ID is required')
    }

    // NO CLIENT-SIDE CACHING - only cache on server-side API routes
    // Client-side caching causes issues with real-time updates in organize page
    // The API routes still have caching which is sufficient

    // Run diagnostic check on first error
    const diagnostics = await debugService.checkDatabaseStatus()

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
      throw error
    }

    return data
  },

  // Update board configuration
  async updateBoard(boardId, updates, userId) {

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
      throw error
    }

    // Invalidate caches
    invalidateBoardCache(boardId)
    invalidateUserBoards(userId)

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
      throw error
    }

    // Invalidate caches
    invalidateBoardCache(boardId)
    invalidateUserBoards(userId)

    return true
  },

  // Subscribe to real-time changes for user's accessible boards
  subscribeToUserBoards(userId, callback) {

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
          callback({ type: 'board', payload })
        }
      )
      .subscribe()

    return { membershipChannel, boardChannel }
  },

  // Subscribe to changes for a specific board (for display mode)
  subscribeToBoardChanges(boardId, callback) {

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
          callback(payload)
        }
      )
      .subscribe()

    return channel
  }
}

// Database operations for advertisement settings
export const advertisementSettingsService = {
  // Subscribe to advertisement settings changes for a specific board using SSE
  subscribeToSettingsChanges(boardId, callback, options = {}) {
    if (!boardId) {
      console.warn('[AdvertisementSettingsService] Missing boardId for subscription')
      return null
    }

    if (typeof window === 'undefined') {
      console.warn('[AdvertisementSettingsService] Subscription attempted during SSR - ignoring')
      return null
    }

    const { onStatusChange } = options
    let closed = false

    onStatusChange?.('connecting')

    const eventSource = new EventSource(`/api/stream?boardId=${boardId}`)

    const handleMessage = (event) => {
      if (!callback) return

      try {
        const data = JSON.parse(event.data)

        if (data?.type === 'advertisement_settings_updated') {
          callback(data)
        }
      } catch (error) {
        console.error('[AdvertisementSettingsService] Failed to parse SSE message:', error)
      }
    }

    eventSource.addEventListener('message', handleMessage)

    eventSource.onopen = () => {
      onStatusChange?.('connected')
    }

    eventSource.onerror = (error) => {
      console.error('[AdvertisementSettingsService] SSE error:', error)
      if (!closed) {
        onStatusChange?.('error', error)
      }
    }

    const close = () => {
      if (closed) return
      closed = true
      eventSource.removeEventListener('message', handleMessage)
      eventSource.close()
      onStatusChange?.('disconnected')
    }

    return { eventSource, close }
  },

  // Unsubscribe from advertisement settings changes
  unsubscribe(subscription) {
    if (!subscription) return

    if (typeof subscription.close === 'function') {
      subscription.close()
      return
    }

    if (subscription.eventSource && typeof subscription.eventSource.close === 'function') {
      subscription.eventSource.close()
    }
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
  async createInvitation(boardId, invitedBy, role = 'viewer', expiresInDays = 7) {
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
        is_active: true
      })
      .select()

    if (error) {
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

    // Update invitation last used timestamp
    await supabase
      .from('board_invitations')
      .update({
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
      throw error
    }

    return true
  }
}

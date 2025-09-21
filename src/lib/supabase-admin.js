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
    console.log('📝 [ADMIN] Creating board:', { boardData, userId })

    if (!userId) {
      throw new Error('User ID is required to create a board')
    }

    // First, ensure the user exists in the users table
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ [ADMIN] Error checking user existence:', userCheckError)
      throw new Error(`Failed to verify user: ${userCheckError.message}`)
    }

    if (!existingUser) {
      console.log('👤 [ADMIN] User not found in users table, attempting to create user...')

      // Try to create the user first using admin client
      try {
        const basicUserData = {
          id: userId,
          email: `${userId}@placeholder.com`, // Fallback email
          name: 'User',
          username: userId,
          provider: 'unknown'
        }

        console.log('👤 [ADMIN] Creating missing user:', basicUserData)

        const { data: createdUser, error: createUserError } = await supabaseAdmin
          .from('users')
          .upsert(basicUserData)
          .select()

        if (createUserError) {
          throw createUserError
        }

        console.log('✅ [ADMIN] User created successfully:', createdUser)
      } catch (userCreateError) {
        console.error('❌ [ADMIN] Failed to create user:', userCreateError)
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

    console.log('🔧 [ADMIN] Creating board with data:', boardToCreate)

    const { data: boardResult, error: boardError } = await supabaseAdmin
      .from('boards')
      .insert(boardToCreate)
      .select()

    if (boardError) {
      console.error('❌ [ADMIN] Error creating board:', {
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

    console.log('✅ [ADMIN] Board created successfully:', boardResult)

    // Check if trigger created the membership automatically
    const { data: membershipCheck, error: membershipError } = await supabaseAdmin
      .from('board_members')
      .select('*')
      .eq('board_id', boardData.id)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membershipCheck) {
      console.log('⚠️ [ADMIN] Automatic membership creation via trigger failed, creating manually...')

      // Manual fallback - create membership manually
      const { error: memberError } = await supabaseAdmin
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
        console.error('❌ [ADMIN] Error creating board membership:', memberError)
        // Cleanup: delete the board if membership creation failed
        await supabaseAdmin.from('boards').delete().eq('id', boardData.id)
        throw new Error(`Failed to create board membership: ${memberError.message}`)
      }

      console.log('✅ [ADMIN] Board membership created manually')
    } else {
      console.log('✅ [ADMIN] Board membership created automatically via trigger')
    }

    return boardResult[0]
  },

  // Get all boards accessible to a user (owned + shared)
  async getUserBoards(userId) {
    console.log('🔍 [ADMIN] Fetching boards for userId:', userId)

    // First check if tables exist by doing a simple test query
    try {
      const testQuery = await supabaseAdmin
        .from('board_members')
        .select('id')
        .limit(1)

      if (testQuery.error) {
        console.error('❌ [ADMIN] board_members table does not exist:', testQuery.error)
        throw new Error('Database tables not set up. Please run the fresh database setup script.')
      }
    } catch (err) {
      console.error('❌ [ADMIN] Database connectivity issue:', err)
      throw err
    }

    const { data, error } = await supabaseAdmin
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
      console.error('❌ [ADMIN] Error fetching user boards:', {
        error,
        userId,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details
      })
      throw error
    }

    // Transform data to include user's role and permissions
    return (data || []).map(board => ({
      ...board,
      userRole: board.board_members[0]?.role,
      userPermissions: board.board_members[0]?.permissions,
      joinedAt: board.board_members[0]?.joined_at
    }))
  },

  // Get a specific board by ID with user access info
  async getBoardById(boardId, userId = null) {
    let query = supabaseAdmin
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

    const { data, error } = await query

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
      userRole: userAccess?.role || null,
      userPermissions: userAccess?.permissions || null,
      members: data.board_members || []
    }
  },

  // Check if user has access to a board
  async checkBoardAccess(boardId, userId) {
    const { data, error } = await supabaseAdmin
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

  // Update a board
  async updateBoard(boardId, updates, userId) {
    // First check if user has write access
    const access = await this.checkBoardAccess(boardId, userId)
    if (!access || (!access.permissions?.write && access.role !== 'owner')) {
      throw new Error('Insufficient permissions to update board')
    }

    const { data, error } = await supabaseAdmin
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

    if (!data || data.length === 0) {
      throw new Error('Board not found')
    }

    return data[0]
  },

  // Delete a board (only owners can delete)
  async deleteBoard(boardId, userId) {
    // Check if user is owner
    const access = await this.checkBoardAccess(boardId, userId)
    if (!access || access.role !== 'owner') {
      throw new Error('Only board owners can delete boards')
    }

    const { error } = await supabaseAdmin
      .from('boards')
      .delete()
      .eq('id', boardId)

    if (error) {
      throw error
    }

    return true
  },

  // ========================================
  // INVITATION MANAGEMENT
  // ========================================

  // Create a new invitation
  async createInvitation({ boardId, invitedBy, role, maxUses = null, expiresInDays = 7 }) {
    // Generate unique token
    const token = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { data, error } = await supabaseAdmin
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
      console.error('❌ Error creating invitation:', error)
      throw error
    }

    return data[0]
  },

  // Get invitation by token
  async getInvitationByToken(token) {
    const { data, error } = await supabaseAdmin
      .from('board_invitations')
      .select(`
        *,
        boards (
          id,
          name,
          description
        ),
        inviter:users!invited_by (
          id,
          name,
          email
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching invitation:', error)
      throw error
    }

    return data
  },

  // Get all invitations for a board
  async getBoardInvitations(boardId) {
    const { data, error } = await supabaseAdmin
      .from('board_invitations')
      .select(`
        *,
        inviter:users!invited_by (
          id,
          name,
          email
        )
      `)
      .eq('board_id', boardId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching board invitations:', error)
      throw error
    }

    return data
  },

  // Accept an invitation
  async acceptInvitation(token, userId) {
    // Get invitation details
    const invitation = await this.getInvitationByToken(token)

    if (!invitation) {
      throw new Error('Invitation not found or inactive')
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired')
    }

    // Check if invitation has reached max uses
    if (invitation.max_uses !== null && invitation.used_count >= invitation.max_uses) {
      throw new Error('Invitation has already been used maximum number of times')
    }

    // Check if user is already a member
    const existingMembership = await this.checkBoardAccess(invitation.board_id, userId)
    if (existingMembership) {
      throw new Error('User is already a member of this board')
    }

    try {
      // First, ensure the user exists in the users table
      const { data: existingUser, error: userCheckError } = await supabaseAdmin
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
        
        // Try to create the user first using admin client
        try {
          const basicUserData = {
            id: userId,
            email: `${userId}@placeholder.com`, // Fallback email
            name: 'User',
            username: userId,
            provider: 'unknown'
          }

          console.log('👤 Creating missing user:', basicUserData)

          const { data: createdUser, error: createUserError } = await supabaseAdmin
            .from('users')
            .upsert(basicUserData)
            .select()

          if (createUserError) {
            throw createUserError
          }

          console.log('✅ User created successfully:', createdUser)
        } catch (userCreateError) {
          console.error('❌ Failed to create user:', userCreateError)
          throw new Error(`Cannot accept invitation: User ${userId} does not exist and could not be created. Please sign out and sign in again.`)
        }
      }

      // Add user to board_members
      const { error: memberError } = await supabaseAdmin
        .from('board_members')
        .insert({
          board_id: invitation.board_id,
          user_id: userId,
          role: invitation.role,
          invited_by: invitation.invited_by,
          permissions: {
            read: true,
            write: invitation.role === 'editor',
            delete: false,
            invite: invitation.role === 'editor'
          }
        })

      if (memberError) {
        console.error('❌ Error adding board member:', memberError)
        throw memberError
      }

      // Increment used_count
      const { error: updateError } = await supabaseAdmin
        .from('board_invitations')
        .update({
          used_count: invitation.used_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('❌ Error updating invitation usage:', updateError)
        // Don't fail the whole operation for this
      }

      // Return success info
      return {
        success: true,
        boardId: invitation.board_id,
        boardName: invitation.boards?.name,
        role: invitation.role,
        message: `Successfully joined board "${invitation.boards?.name}" as ${invitation.role}`
      }

    } catch (error) {
      console.error('❌ Error accepting invitation:', error)
      throw error
    }
  },

  // Revoke an invitation
  async revokeInvitation(invitationId, userId) {
    // First check if the user has permission to revoke this invitation
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('board_invitations')
      .select('board_id, invited_by')
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) {
      throw new Error('Invitation not found')
    }

    // Check if user is board owner
    const access = await this.checkBoardAccess(invitation.board_id, userId)
    if (!access || access.role !== 'owner') {
      throw new Error('Only board owners can revoke invitations')
    }

    // Deactivate the invitation
    const { error } = await supabaseAdmin
      .from('board_invitations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (error) {
      console.error('❌ Error revoking invitation:', error)
      throw error
    }

    return { success: true }
  }
}

// Database operations for board members using admin client
export const adminBoardMemberService = {
  // Get all members of a board
  async getBoardMembers(boardId) {
    const { data, error } = await supabaseAdmin
      .from('board_members')
      .select(`
        *,
        user:users!board_members_user_id_fkey (
          id,
          name,
          email,
          avatar_url
        ),
        inviter:users!board_members_invited_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('board_id', boardId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching board members:', error)
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

    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { error } = await supabaseAdmin
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

// Database operations for board invitations using admin client
export const adminInvitationService = {
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

    const { data, error } = await supabaseAdmin
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
      throw error
    }

    return data[0]
  },

  // Get invitation by token
  async getInvitationByToken(token) {
    const { data, error } = await supabaseAdmin
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

    if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
      throw new Error('Invitation has reached maximum usage limit')
    }

    // Check if user is already a member
    const existingMember = await supabaseAdmin
      .from('board_members')
      .select('id')
      .eq('board_id', invitation.board_id)
      .eq('user_id', userId)
      .single()

    if (existingMember.data) {
      throw new Error('User is already a member of this board')
    }

    // Add user as board member
    await adminBoardMemberService.addBoardMember(
      invitation.board_id,
      userId,
      invitation.role,
      invitation.invited_by
    )

    // Update invitation usage count
    await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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
    const { error } = await supabaseAdmin
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
  }
}
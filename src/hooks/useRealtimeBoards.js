"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { boardService } from '../lib/supabase'

export function useRealtimeBoards() {
  const { data: session } = useSession()
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Use Supabase user ID provided by NextAuth session
  const userId = session?.user?.id || null

  // Load initial boards
  const loadBoards = useCallback(async (silent = false) => {
    if (!userId) {
      setBoards([])
      setLoading(false)
      return
    }

    try {
      if (!silent) setLoading(true)
      setError(null)
      
      // First, try to migrate from localStorage if boards exist there
      const localBoards = localStorage.getItem('smartBoards')
      if (localBoards) {
        const parsedLocalBoards = JSON.parse(localBoards)
        console.log('📦 Found local boards, migrating to Supabase:', parsedLocalBoards.length)
        
        // Migrate each board to Supabase
        for (const board of parsedLocalBoards) {
          try {
            await boardService.createBoard({
              ...board,
              createdAt: board.createdAt || new Date().toISOString(),
            }, userId)
          } catch (migrateError) {
            // Board might already exist, ignore the error
            console.log('Board already exists or migration failed:', board.id)
          }
        }
        
        // Clear localStorage after migration
        localStorage.removeItem('smartBoards')
        console.log('✅ Migration completed, localStorage cleared')
      }
      
      // Load boards from Supabase
      const userBoards = await boardService.getUserBoards(userId)
      setBoards(userBoards)
    } catch (err) {
      console.error('Error loading boards:', err)
      setError(err.message)
      
      // Fallback to localStorage if Supabase fails
      const localBoards = localStorage.getItem('smartBoards')
      if (localBoards) {
        setBoards(JSON.parse(localBoards))
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((updateData) => {
    const { type, payload } = updateData
    const { eventType, new: newData, old: oldData } = payload

    if (type === 'membership') {
      // Handle board membership changes (when user is added/removed from boards)
      switch (eventType) {
        case 'INSERT':
          // User was added to a board, fetch the board details
          if (newData.user_id === userId) {
            loadBoards(true) // Silent reload to get the new board
          }
          break
        case 'DELETE':
          // User was removed from a board
          if (oldData.user_id === userId) {
            setBoards(currentBoards =>
              currentBoards.filter(board => board.id !== oldData.board_id)
            )
          }
          break
        case 'UPDATE':
          // User's role/permissions changed
          if (newData.user_id === userId) {
            setBoards(currentBoards =>
              currentBoards.map(board =>
                board.id === newData.board_id
                  ? {
                      ...board,
                      userRole: newData.role,
                      userPermissions: newData.permissions
                    }
                  : board
              )
            )
          }
          break
      }
    } else if (type === 'board') {
      // Handle board content changes
      setBoards(currentBoards => {
        switch (eventType) {
          case 'INSERT':
            // A new board was created - check if user has access
            // This will be handled by membership changes instead
            return currentBoards

          case 'UPDATE':
            // Update existing board content
            return currentBoards.map(board =>
              board.id === newData.id
                ? { ...board, ...newData, updated_at: newData.updated_at }
                : board
            ).sort((a, b) =>
              new Date(b.updated_at) - new Date(a.updated_at)
            )

          case 'DELETE':
            // Remove deleted board
            return currentBoards.filter(board => board.id !== oldData.id)

          default:
            return currentBoards
        }
      })
    }
  }, [userId, loadBoards])

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return

    let channels = null

    const setupRealtimeSubscription = async () => {
      try {
        channels = boardService.subscribeToUserBoards(userId, handleRealtimeUpdate)
      } catch (err) {
        console.error('Error setting up real-time subscription:', err)
      }
    }

    setupRealtimeSubscription()

    return () => {
      if (channels) {
        // Unsubscribe from both channels
        if (channels.membershipChannel) {
          channels.membershipChannel.unsubscribe()
        }
        if (channels.boardChannel) {
          channels.boardChannel.unsubscribe()
        }
      }
    }
  }, [userId, handleRealtimeUpdate])

  // Load boards when user changes
  useEffect(() => {
    loadBoards(false)
  }, [loadBoards])

  // Refresh on focus/visibility change only (no background polling)
  useEffect(() => {
    const onFocus = () => loadBoards(true)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadBoards(true)
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [loadBoards])

  // Board management functions
  const createBoard = useCallback(async (boardData) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      const newBoard = await boardService.createBoard(boardData, userId)
      // Real-time subscription will handle adding it to state
      return newBoard
    } catch (err) {
      console.error('Error creating board:', err)
      throw err
    }
  }, [userId])

  const updateBoard = useCallback(async (boardId, updates) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      const updatedBoard = await boardService.updateBoard(boardId, updates, userId)
      // Real-time subscription will handle updating state
      return updatedBoard
    } catch (err) {
      console.error('Error updating board:', err)
      throw err
    }
  }, [userId])

  const deleteBoard = useCallback(async (boardId) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      // Use API route so server can also purge storage assets
      const res = await fetch(`/api/boards?boardId=${encodeURIComponent(boardId)}`, {
        method: 'DELETE'
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to delete board')
      }

      // Optimistically remove immediately; realtime will also confirm
      setBoards(current => current.filter(b => b.id !== boardId))
      return true
    } catch (err) {
      console.error('Error deleting board:', err)
      throw err
    }
  }, [userId])

  return {
    boards,
    loading,
    error,
    createBoard,
    updateBoard,
    deleteBoard,
    refetch: () => loadBoards(false)
  }
}

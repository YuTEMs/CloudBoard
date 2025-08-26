"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { boardService } from '../lib/supabase'

export function useRealtimeBoards() {
  const { data: session } = useSession()
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get user ID from session
  const userId = session?.user?.email ? `google_${session.user.id}` || `email_${session.user.email.replace('@', '_').replace('.', '_')}` : null

  // Load initial boards
  const loadBoards = useCallback(async () => {
    if (!userId) {
      setBoards([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
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
      setLoading(false)
    }
  }, [userId])

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload) => {
    const { eventType, new: newBoard, old: oldBoard } = payload

    setBoards(currentBoards => {
      switch (eventType) {
        case 'INSERT':
          // Add new board if it doesn't already exist
          if (!currentBoards.find(b => b.id === newBoard.id)) {
            return [...currentBoards, newBoard].sort((a, b) => 
              new Date(b.updated_at) - new Date(a.updated_at)
            )
          }
          return currentBoards

        case 'UPDATE':
          // Update existing board
          return currentBoards.map(board => 
            board.id === newBoard.id ? { ...board, ...newBoard } : board
          ).sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
          )

        case 'DELETE':
          // Remove deleted board
          return currentBoards.filter(board => board.id !== oldBoard.id)

        default:
          return currentBoards
      }
    })
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return

    let channel = null

    const setupRealtimeSubscription = async () => {
      try {
        channel = boardService.subscribeToUserBoards(userId, handleRealtimeUpdate)
      } catch (err) {
        console.error('Error setting up real-time subscription:', err)
      }
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [userId, handleRealtimeUpdate])

  // Load boards when user changes
  useEffect(() => {
    loadBoards()
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
      await boardService.deleteBoard(boardId, userId)
      // Real-time subscription will handle removing from state
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
    refetch: loadBoards
  }
}

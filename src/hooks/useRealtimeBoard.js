"use client"

import { useState, useEffect, useCallback } from 'react'
import { boardService } from '../lib/supabase'

export function useRealtimeBoard(boardId) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load board data
  const loadBoard = useCallback(async () => {
    if (!boardId) {
      setBoard(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Try to load from Supabase first
      const boardData = await boardService.getBoardById(boardId)
      
      if (boardData) {
        setBoard(boardData)
      } else {
        // Fallback to localStorage for backwards compatibility
        const localBoards = localStorage.getItem('smartBoards')
        if (localBoards) {
          const boards = JSON.parse(localBoards)
          const localBoard = boards.find(b => b.id === boardId)
          setBoard(localBoard || null)
        } else {
          setBoard(null)
        }
      }
    } catch (err) {
      console.error('Error loading board:', err)
      setError(err.message)
      
      // Fallback to localStorage
      try {
        const localBoards = localStorage.getItem('smartBoards')
        if (localBoards) {
          const boards = JSON.parse(localBoards)
          const localBoard = boards.find(b => b.id === boardId)
          setBoard(localBoard || null)
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError)
      }
    } finally {
      setLoading(false)
    }
  }, [boardId])

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload) => {
    const { eventType, new: newBoard } = payload

    if (eventType === 'UPDATE' && newBoard) {
      console.log('🔄 Board updated in real-time:', newBoard)
      setBoard(currentBoard => ({
        ...currentBoard,
        ...newBoard
      }))
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!boardId) return

    let channel = null

    const setupRealtimeSubscription = async () => {
      try {
        channel = boardService.subscribeToBoardChanges(boardId, handleRealtimeUpdate)
      } catch (err) {
        console.error('Error setting up board real-time subscription:', err)
      }
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [boardId, handleRealtimeUpdate])

  // Load board when boardId changes
  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  return {
    board,
    loading,
    error,
    refetch: loadBoard
  }
}

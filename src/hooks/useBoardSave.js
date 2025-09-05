"use client"

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { boardService } from '../lib/supabase'

export function useBoardSave() {
  const { data: session } = useSession()
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [error, setError] = useState(null)

  const userId = session?.user?.id || null

  const saveBoard = useCallback(async (boardId, configuration) => {
    if (!userId || !boardId) {
      throw new Error('User not authenticated or board ID missing')
    }

    setSaving(true)
    setError(null)

    try {
      // Use the API endpoint instead of direct Supabase calls
      // This ensures the update broadcast is triggered
      const response = await fetch('/api/boards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId,
          configuration,
          updated_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save board')
      }

      const updatedBoard = await response.json()
      setLastSaved(new Date())
      
      // Also save to localStorage as backup
      try {
        const localBoards = JSON.parse(localStorage.getItem('smartBoards') || '[]')
        const boardIndex = localBoards.findIndex(board => board.id === boardId)
        if (boardIndex >= 0) {
          localBoards[boardIndex].configuration = configuration
          localBoards[boardIndex].updatedAt = new Date().toISOString()
          localStorage.setItem('smartBoards', JSON.stringify(localBoards))
        }
      } catch (localError) {
        // Silent fail
      }

      return updatedBoard
    } catch (err) {
      setError(err.message)
      
      // Fallback: save to localStorage only
      try {
        const localBoards = JSON.parse(localStorage.getItem('smartBoards') || '[]')
        const boardIndex = localBoards.findIndex(board => board.id === boardId)
        if (boardIndex >= 0) {
          localBoards[boardIndex].configuration = configuration
          localBoards[boardIndex].updatedAt = new Date().toISOString()
          localStorage.setItem('smartBoards', JSON.stringify(localBoards))
        }
      } catch (localError) {
        // Silent fail
      }
      
      throw err
    } finally {
      setSaving(false)
    }
  }, [userId])

  return {
    saveBoard,
    saving,
    lastSaved,
    error
  }
}

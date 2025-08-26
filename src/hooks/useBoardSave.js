"use client"

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { boardService } from '../lib/supabase'

export function useBoardSave() {
  const { data: session } = useSession()
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [error, setError] = useState(null)

  const userId = session?.user?.id 
    ? `google_${session.user.id}` 
    : session?.user?.email 
    ? `email_${session.user.email.replace('@', '_').replace('.', '_')}`
    : null

  const saveBoard = useCallback(async (boardId, configuration) => {
    if (!userId || !boardId) {
      throw new Error('User not authenticated or board ID missing')
    }

    setSaving(true)
    setError(null)

    try {
      console.log(`💾 Saving board ${boardId}...`)
      
      const updatedBoard = await boardService.updateBoard(boardId, {
        configuration,
        updated_at: new Date().toISOString()
      }, userId)

      setLastSaved(new Date())
      console.log(`✅ Board ${boardId} saved successfully`)
      
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
        console.warn('Failed to update localStorage backup:', localError)
      }

      return updatedBoard
    } catch (err) {
      console.error(`❌ Failed to save board ${boardId}:`, err)
      setError(err.message)
      
      // Fallback: save to localStorage only
      try {
        const localBoards = JSON.parse(localStorage.getItem('smartBoards') || '[]')
        const boardIndex = localBoards.findIndex(board => board.id === boardId)
        if (boardIndex >= 0) {
          localBoards[boardIndex].configuration = configuration
          localBoards[boardIndex].updatedAt = new Date().toISOString()
          localStorage.setItem('smartBoards', JSON.stringify(localBoards))
          console.log('📦 Saved to localStorage as fallback')
        }
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError)
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

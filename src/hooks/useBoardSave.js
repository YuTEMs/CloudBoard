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

      return updatedBoard
    } catch (err) {
      setError(err.message)
      console.error(`[useBoardSave] Failed to save board ${boardId}:`, err.message)

      // No fallback - fail fast when Supabase is not working
      throw new Error(`Supabase is not working right now. Please try again later.`);
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

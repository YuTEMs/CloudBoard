"use client"

import { useState, useEffect, useCallback } from 'react'
import { boardService, advertisementService } from '../lib/supabase'

export function useDisplayBoard(boardId) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')


  // Load board data initially and when polling
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
        setBoard(prevBoard => {
          // Only update if data actually changed
          if (!prevBoard || prevBoard.updatedAt !== boardData.updatedAt) {
            setLastUpdated(new Date(boardData.updatedAt))
            return boardData
          }
          return prevBoard
        })
      } else {
        setError('Board not found')
      }
    } catch (err) {
      console.error(`[useDisplayBoard] Failed to load board ${boardId}:`, err.message)
      // No fallback - fail fast when Supabase is not working
      setError('Supabase is not working right now')
    } finally {
      setLoading(false)
    }
  }, [boardId])

  // Setup Supabase Realtime to listen for updates
  useEffect(() => {
    if (!boardId) return

    console.log(`[useDisplayBoard] Setting up Realtime subscriptions for board ${boardId}`)
    setConnectionStatus('connected')

    // Subscribe to board changes
    const boardChannel = boardService.subscribeToBoardChanges(boardId, (payload) => {
      console.log(`[useDisplayBoard] Board change received:`, payload)

      if (payload.eventType === 'UPDATE' && payload.new) {
        // Parse configuration if it's a string
        let updatedBoard = { ...payload.new }
        if (typeof updatedBoard.configuration === 'string') {
          try {
            updatedBoard.configuration = JSON.parse(updatedBoard.configuration)
          } catch (e) {
            updatedBoard.configuration = {}
          }
        }

        // Map database snake_case to frontend camelCase
        updatedBoard = {
          ...updatedBoard,
          createdAt: updatedBoard.created_at,
          updatedAt: updatedBoard.updated_at
        }

        setBoard(updatedBoard)
        setLastUpdated(new Date(updatedBoard.updated_at))

        // Show a brief update indicator
        setConnectionStatus('updated')
        setTimeout(() => setConnectionStatus('connected'), 2000)

        console.log(`[useDisplayBoard] Board ${boardId} updated successfully via Realtime`)
      }
    })

    // Subscribe to advertisement changes
    const advertisementChannel = advertisementService.subscribeToAdvertisements(boardId, (payload) => {
      console.log(`[useDisplayBoard] Advertisement change received:`, payload.eventType)

      // Signal that advertisements have been updated
      setConnectionStatus('advertisements_updated')
      setTimeout(() => setConnectionStatus('connected'), 1000)
    })

    return () => {
      console.log(`[useDisplayBoard] Cleaning up Realtime subscriptions for board ${boardId}`)
      if (boardChannel) {
        boardService.subscribeToBoardChanges(boardId, null)?.unsubscribe()
      }
      if (advertisementChannel) {
        advertisementService.unsubscribe(advertisementChannel)
      }
      setConnectionStatus('disconnected')
    }
  }, [boardId]) // Only depend on boardId to prevent infinite loops

  // Load board data when boardId changes
  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  return {
    board,
    loading,
    error,
    lastUpdated,
    connectionStatus,
    refetch: loadBoard
  }
}

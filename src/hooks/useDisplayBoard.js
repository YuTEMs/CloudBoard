"use client"

import { useState, useEffect, useCallback } from 'react'
import { boardService } from '../lib/supabase'

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
          if (!prevBoard || prevBoard.updated_at !== boardData.updated_at) {
            setLastUpdated(new Date(boardData.updated_at))
            return boardData
          }
          return prevBoard
        })
      } else {
        // Fallback to localStorage for backwards compatibility
        const localBoards = localStorage.getItem('smartBoards')
        if (localBoards) {
          const boards = JSON.parse(localBoards)
          const localBoard = boards.find(b => b.id === boardId)
          if (localBoard) {
            setBoard(localBoard)
            setLastUpdated(new Date(localBoard.updatedAt || localBoard.updated_at))
          } else {
            setError('Board not found')
          }
        } else {
          setError('Board not found')
        }
      }
    } catch (err) {
      setError(err.message)
      
      // Fallback to localStorage
      try {
        const localBoards = localStorage.getItem('smartBoards')
        if (localBoards) {
          const boards = JSON.parse(localBoards)
          const localBoard = boards.find(b => b.id === boardId)
          if (localBoard) {
            setBoard(localBoard)
            setLastUpdated(new Date(localBoard.updatedAt || localBoard.updated_at))
          }
        }
      } catch (localError) {
        // Silent fail
      }
    } finally {
      setLoading(false)
    }
  }, [boardId])

  // Setup Server-Sent Events to listen for updates
  useEffect(() => {
    if (!boardId) return

    let eventSource = null
    let pollingInterval = null
    
    try {
      console.log('🔍 DEBUG: Setting up SSE connection for board:', boardId)
      eventSource = new EventSource(`/api/stream?boardId=${boardId}`)
      
      eventSource.onopen = () => {
        console.log('🔍 DEBUG: SSE connection opened for board:', boardId)
        setConnectionStatus('connected')
        // Clear polling since SSE is working
        if (pollingInterval) {
          clearInterval(pollingInterval)
          pollingInterval = null
        }
      }
      
      eventSource.onmessage = (event) => {
        console.log('🔍 DEBUG: SSE message received:', event.data)
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'connected':
              console.log('🔍 DEBUG: SSE connection confirmed for board:', boardId)
              break
              
            case 'ping':
              console.log('🔍 DEBUG: SSE ping received')
              break
              
            case 'board_updated':
              console.log('🔍 DEBUG: Board update received via SSE:', data)
              // Update board data reactively without page refresh
              if (data.data) {
                // Parse configuration if it's a string
                let updatedBoard = { ...data.data }
                if (typeof updatedBoard.configuration === 'string') {
                  try {
                    updatedBoard.configuration = JSON.parse(updatedBoard.configuration)
                  } catch (e) {
                    updatedBoard.configuration = {}
                  }
                }
                
                setBoard(updatedBoard)
                setLastUpdated(new Date(data.timestamp))
                
                // Show a brief update indicator
                setConnectionStatus('updated')
                setTimeout(() => setConnectionStatus('connected'), 2000)
              } else {
                // If no data provided, reload from database
                setConnectionStatus('updated')
                loadBoard()
              }
              break
              
            default:
              console.log('🔍 DEBUG: Unknown SSE message type:', data.type)
              break
          }
        } catch (err) {
          console.error('🔍 DEBUG: Error parsing SSE message:', err)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error('🔍 DEBUG: SSE connection error:', error)
        setConnectionStatus('error')
        
        // Start polling as fallback if SSE fails
        if (!pollingInterval) {
          console.log('🔍 DEBUG: Starting polling fallback for board:', boardId)
          pollingInterval = setInterval(() => {
            loadBoard()
          }, 3000) // Poll every 3 seconds
        }
      }
    } catch (error) {
      console.error('🔍 DEBUG: Failed to create SSE connection:', error)
      // If SSE fails completely, use polling
      setConnectionStatus('polling')
      pollingInterval = setInterval(() => {
        loadBoard()
      }, 3000)
    }
    
    return () => {
      console.log('🔍 DEBUG: Cleaning up SSE connection for board:', boardId)
      if (eventSource) {
        eventSource.close()
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      setConnectionStatus('disconnected')
    }
  }, [boardId, loadBoard])

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

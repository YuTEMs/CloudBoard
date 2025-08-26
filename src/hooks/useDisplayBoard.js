"use client"

import { useState, useEffect, useCallback } from 'react'
import { boardService } from '../lib/supabase'

export function useDisplayBoard(boardId) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  // Load board data initially
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
        setLastUpdated(new Date(boardData.updated_at))
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
      console.error('Error loading board:', err)
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
        console.error('Error loading from localStorage:', localError)
      }
    } finally {
      setLoading(false)
    }
  }, [boardId])

  // Setup Server-Sent Events to listen for updates
  useEffect(() => {
    if (!boardId) return

    console.log(`📺 Setting up update listener for board: ${boardId}`)
    
    const eventSource = new EventSource(`/api/stream?boardId=${boardId}`)
    
    eventSource.onopen = () => {
      console.log(`✅ Connected to updates for board: ${boardId}`)
      setConnectionStatus('connected')
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            console.log(`🔗 Display connection confirmed for board: ${boardId}`)
            break
            
          case 'ping':
            // Keep-alive ping, do nothing
            break
            
          case 'board_updated':
            console.log(`🔄 Board ${boardId} was updated, refreshing...`)
            
            // Force a complete reload of the board data
            if (data.data) {
              console.log('📊 Updating board with new data:', data.data)
              
              // Parse configuration if it's a string
              let updatedBoard = { ...data.data }
              if (typeof updatedBoard.configuration === 'string') {
                try {
                  updatedBoard.configuration = JSON.parse(updatedBoard.configuration)
                } catch (e) {
                  console.error('Error parsing board configuration:', e)
                  updatedBoard.configuration = {}
                }
              }
              
              setBoard(updatedBoard) // Set the complete new board data
              setLastUpdated(new Date(data.timestamp))
              
              console.log('✅ Board updated successfully:', updatedBoard)
              
              // Show a brief update indicator
              setConnectionStatus('updated')
              setTimeout(() => setConnectionStatus('connected'), 2000)
            } else {
              // If no data provided, reload from database
              console.log('🔄 No data in webhook, reloading from database...')
              loadBoard()
            }
            break
            
          default:
            console.log('Unknown message type:', data.type)
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setConnectionStatus('error')
      
      // Try to reconnect after a delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔄 Attempting to reconnect...')
          // The useEffect will handle creating a new connection
        }
      }, 5000)
    }
    
    return () => {
      console.log(`📺 Disconnecting from updates for board: ${boardId}`)
      eventSource.close()
      setConnectionStatus('disconnected')
    }
  }, [boardId])

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

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

  // Setup Server-Sent Events to listen for updates
  useEffect(() => {
    if (!boardId) return

    let eventSource = null
    let reconnectTimeout = null
    let connectionAttempts = 0
    const maxReconnectAttempts = 5

    const createConnection = () => {
      if (connectionAttempts >= maxReconnectAttempts) {
        setConnectionStatus('error')
        return
      }

      connectionAttempts++

      try {
        eventSource = new EventSource(`/api/stream?boardId=${boardId}`)

        const setupEventSourceHandlers = (es) => {
          es.onopen = () => {
            setConnectionStatus('connected')
            connectionAttempts = 0 // Reset attempt counter on successful connection
          }

          es.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)

              switch (data.type) {
                case 'connected':
                  console.log(`[useDisplayBoard] Connected to board ${boardId} via SSE`)
                  setConnectionStatus('connected')
                  break

                case 'ping':
                  // Update connection status to ensure we're connected
                  setConnectionStatus('connected')
                  break

                case 'board_updated':
                  console.log(`[useDisplayBoard] Received board update for ${boardId}`)

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

                    console.log(`[useDisplayBoard] Board ${boardId} updated successfully via SSE`)
                  } else {
                    // If no data provided, reload from database
                    console.log(`[useDisplayBoard] Board ${boardId} update received, reloading from database`)
                    setConnectionStatus('updated')
                    loadBoard()
                  }
                  break

                case 'advertisements_updated':
                  // Signal that advertisements have been updated
                  setConnectionStatus('advertisements_updated')
                  setTimeout(() => setConnectionStatus('connected'), 1000)
                  break

                default:
                  break
              }
            } catch (err) {
            }
          }

          es.onerror = (error) => {
            setConnectionStatus('error')

            // Only attempt reconnection if the connection was closed
            if (es.readyState === EventSource.CLOSED) {
              // Attempt to reconnect with exponential backoff
              const backoffDelay = Math.min(3000 * Math.pow(2, connectionAttempts - 1), 30000)
              reconnectTimeout = setTimeout(() => {
                createConnection()
              }, backoffDelay)
            }
          }
        }

        setupEventSourceHandlers(eventSource)
      } catch (err) {
        setConnectionStatus('error')

        // Schedule reconnect on creation error
        reconnectTimeout = setTimeout(() => {
          createConnection()
        }, 5000)
      }
    }

    // Add a small delay to ensure the page is fully loaded before creating connection
    const initialDelay = setTimeout(() => {
      createConnection()
    }, 500)

    return () => {
      clearTimeout(initialDelay)
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
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

"use client"

import { useState, useEffect, useCallback } from 'react'
import { advertisementSettingsService } from '../lib/supabase'

export function useAdSettings(boardId) {
  const [adSettings, setAdSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [settingsStatus, setSettingsStatus] = useState('disconnected')

  // Load ad settings initially
  const loadAdSettings = useCallback(async () => {
    if (!boardId) {
      setAdSettings(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch from API
      const response = await fetch(`/api/advertisements/settings?boardId=${boardId}`)

      if (response.ok) {
        const settings = await response.json()
        setAdSettings(prevSettings => {
          // Only update if data actually changed
          if (!prevSettings || JSON.stringify(prevSettings) !== JSON.stringify(settings)) {
            setLastUpdated(new Date())
            return settings
          }
          return prevSettings
        })
      } else {
        setError('Settings not found')
      }
    } catch (err) {
      console.error(`[useAdSettings] Failed to load settings for board ${boardId}:`, err.message)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [boardId])

  // Setup Supabase Realtime to listen for updates - EXACTLY like useDisplayBoard
  useEffect(() => {
    if (!boardId) return

    console.log(`[useAdSettings] Setting up Realtime subscription for board ${boardId}`)
    setSettingsStatus('connected')

    // Subscribe to settings changes - EXACTLY like board subscription
    const settingsChannel = advertisementSettingsService.subscribeToSettingsChanges(
      boardId,
      (payload) => {
        console.log(`[useAdSettings] Settings change received:`, payload)

        if (payload.eventType === 'UPDATE' && payload.new) {
          // Transform database snake_case to frontend camelCase - EXACTLY like board does
          const updatedSettings = {
            boardId: payload.new.board_id,
            timeBetweenAds: payload.new.time_between_ads,
            initialDelay: payload.new.initial_delay,
            adDisplayDuration: payload.new.ad_display_duration,
            enableAI: payload.new.enable_ai || false,
            personThreshold: payload.new.person_threshold || 1,
            detectionDuration: payload.new.detection_duration || 0
          }

          setAdSettings(updatedSettings)
          setLastUpdated(new Date())

          // Show a brief update indicator
          setSettingsStatus('updated')
          setTimeout(() => setSettingsStatus('connected'), 2000)

          console.log(`[useAdSettings] Settings for board ${boardId} updated successfully via Realtime`)
        }
      }
    )

    return () => {
      console.log(`[useAdSettings] Cleaning up Realtime subscription for board ${boardId}`)
      if (settingsChannel) {
        advertisementSettingsService.unsubscribe(settingsChannel)
      }
      setSettingsStatus('disconnected')
    }
  }, [boardId]) // Only depend on boardId to prevent infinite loops

  // Load settings when boardId changes
  useEffect(() => {
    loadAdSettings()
  }, [loadAdSettings])

  // Poll every 5 seconds for updates
  useEffect(() => {
    if (!boardId) return

    console.log('[useAdSettings] Starting 5-second polling for ad settings')

    const pollInterval = setInterval(() => {
      console.log('[useAdSettings] Polling for ad settings updates...')
      loadAdSettings()
    }, 5000) // Poll every 5 seconds

    return () => {
      console.log('[useAdSettings] Stopping polling')
      clearInterval(pollInterval)
    }
  }, [boardId, loadAdSettings])

  return {
    adSettings,
    loading,
    error,
    lastUpdated,
    settingsStatus,
    refetch: loadAdSettings
  }
}

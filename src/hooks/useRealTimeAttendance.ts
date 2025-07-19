'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useToast } from '@/contexts/ToastContext'

export interface AttendanceEvent {
  type: 'verification' | 'status_change' | 'new_scan' | 'connected' | 'heartbeat' | 'error'
  data: {
    registrationId?: string
    fullName?: string
    status?: 'present' | 'absent' | 'late'
    timestamp: string
    scannerName?: string
    platoonName?: string
    roomName?: string
    message?: string
    error?: string
  }
}

export interface UseRealTimeAttendanceOptions {
  onVerification?: (event: AttendanceEvent) => void
  onStatusChange?: (event: AttendanceEvent) => void
  onNewScan?: (event: AttendanceEvent) => void
  onError?: (event: AttendanceEvent) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  enabled?: boolean // Allow disabling the connection
}

export function useRealTimeAttendance(options: UseRealTimeAttendanceOptions = {}) {
  const {
    onVerification,
    onStatusChange,
    onNewScan,
    onError,
    autoReconnect = true,
    reconnectInterval = 2000, // Reduced from 5000ms to 2000ms for faster reconnection
    enabled = true // Default to enabled
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<AttendanceEvent | null>(null)
  const [eventCount, setEventCount] = useState(0)

  // Stable state management to prevent flickering
  const [stableConnectionState, setStableConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const stateStabilizationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Polling fallback for production environments where EventSource might fail
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [usePollingFallback, setUsePollingFallback] = useState(false)

  // Throttled event count to prevent rapid UI updates
  const [displayEventCount, setDisplayEventCount] = useState(0)
  const eventCountUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { success, error: showError } = useToast()

  // Debounced state update to prevent rapid flickering
  const updateStableState = useCallback((newState: 'connected' | 'disconnected' | 'connecting') => {
    if (stateStabilizationTimeoutRef.current) {
      clearTimeout(stateStabilizationTimeoutRef.current)
    }

    stateStabilizationTimeoutRef.current = setTimeout(() => {
      setStableConnectionState(newState)
    }, 300) // 300ms debounce to prevent rapid state changes
  }, [])

  // Throttled event count update to prevent UI flickering
  const updateDisplayEventCount = useCallback((newCount: number) => {
    if (eventCountUpdateTimeoutRef.current) {
      clearTimeout(eventCountUpdateTimeoutRef.current)
    }

    eventCountUpdateTimeoutRef.current = setTimeout(() => {
      setDisplayEventCount(newCount)
    }, 500) // 500ms throttle for event count updates
  }, [])

  // Polling fallback for production environments
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    console.log('🔄 Starting polling fallback for real-time updates...')
    setUsePollingFallback(true)

    // Poll every 5 seconds for updates
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/attendance/poll', {
          credentials: 'include'
        })

        if (response.ok) {
          const events = await response.json()
          if (events && events.length > 0) {
            events.forEach((event: AttendanceEvent) => {
              handleEvent(event)
            })
          }
        }
      } catch (error) {
        console.warn('Polling fallback error:', error)
      }
    }, 5000)
  }, [])

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setUsePollingFallback(false)
  }, [])

  const connect = useCallback(() => {
    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Check if we're in browser environment and user is logged in
      if (typeof window === 'undefined') {
        console.warn('⚠️ SSR environment detected, skipping real-time connection')
        setConnectionError('SSR environment')
        updateStableState('disconnected')
        return
      }

      const hasAuthToken = document.cookie.includes('auth-token=')
      if (!hasAuthToken) {
        console.warn('⚠️ No auth token found, skipping real-time connection')
        setConnectionError('Not authenticated')
        updateStableState('disconnected')
        return
      }

      console.log('🔄 Connecting to real-time attendance updates...')

      // Enhanced EventSource for production compatibility
      const eventSource = new EventSource('/api/admin/attendance/events')
      eventSourceRef.current = eventSource

      // Set a timeout to detect if connection fails to establish
      const connectionTimeout = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.warn('⚠️ Connection timeout - SSE endpoint may not be available')
          eventSource.close()
          setConnectionError('Connection timeout')
          updateStableState('disconnected')
        }
      }, 10000) // 10 second timeout

      eventSource.onopen = () => {
        console.log('✅ Real-time attendance connection established at', new Date().toISOString())
        clearTimeout(connectionTimeout) // Clear the connection timeout
        setIsConnected(true)
        setConnectionError(null)
        updateStableState('connected')

        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }

        // Log connection success for debugging
        console.log('🔗 EventSource readyState:', eventSource.readyState)
      }

      eventSource.onmessage = (event) => {
        try {
          const attendanceEvent: AttendanceEvent = JSON.parse(event.data)
          setLastEvent(attendanceEvent)

          // Only update count for non-heartbeat events to reduce UI updates
          if (attendanceEvent.type !== 'heartbeat') {
            const newCount = eventCount + 1
            setEventCount(newCount)
            updateDisplayEventCount(newCount)
          }

          console.log('📡 Received attendance event:', attendanceEvent.type, 'at', new Date().toISOString())

          // Handle different event types with immediate processing
          switch (attendanceEvent.type) {
            case 'verification':
              console.log('✅ Processing verification event for:', attendanceEvent.data.fullName)
              if (onVerification) {
                onVerification(attendanceEvent)
              }
              if (attendanceEvent.data.fullName) {
                success(`✅ ${attendanceEvent.data.fullName} verified successfully`)
              }
              break

            case 'status_change':
              console.log('🔄 Processing status change event:', attendanceEvent.data.message)
              if (onStatusChange) {
                onStatusChange(attendanceEvent)
              }
              break

            case 'new_scan':
              if (onNewScan) {
                onNewScan(attendanceEvent)
              }
              break

            case 'connected':
              console.log('🎉 Real-time updates connected:', attendanceEvent.data.message)
              break

            case 'heartbeat':
              // Silent heartbeat - just update connection status
              break

            case 'error':
              if (onError) {
                onError(attendanceEvent)
              }
              if (attendanceEvent.data.error) {
                console.error('🚨 Real-time error event:', attendanceEvent.data.error)
              }
              break

            default:
              console.log('📨 Unknown event type:', attendanceEvent.type)
          }
        } catch (error) {
          console.error('❌ Error parsing attendance event:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ Real-time attendance connection error:', error)

        // Check the readyState to determine the type of error
        const readyState = eventSource.readyState
        let errorMessage = 'Connection lost'

        if (readyState === EventSource.CONNECTING) {
          errorMessage = 'Failed to connect to real-time updates'
        } else if (readyState === EventSource.CLOSED) {
          errorMessage = 'Connection closed by server'
        }

        console.log(`🔍 EventSource readyState: ${readyState} (0=CONNECTING, 1=OPEN, 2=CLOSED)`)

        setIsConnected(false)
        setConnectionError(errorMessage)
        updateStableState('disconnected')

        eventSource.close()

        // In production, try polling fallback if EventSource fails repeatedly
        if (process.env.NODE_ENV === 'production' && !usePollingFallback) {
          console.log('🔄 EventSource failed in production, trying polling fallback...')
          startPollingFallback()
          return
        }

        // Auto-reconnect if enabled with immediate retry for better reliability
        if (autoReconnect && !reconnectTimeoutRef.current && !usePollingFallback) {
          console.log(`🔄 Reconnecting in ${reconnectInterval}ms...`)
          updateStableState('connecting')
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            console.log('🔄 Attempting reconnection...')
            connect()
          }, reconnectInterval)
        }
      }

    } catch (error) {
      console.error('❌ Failed to establish real-time connection:', error)
      setConnectionError('Failed to connect')
      setIsConnected(false)
    }
  }, [onVerification, onStatusChange, onNewScan, autoReconnect, reconnectInterval, success])

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from real-time attendance updates')

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (stateStabilizationTimeoutRef.current) {
      clearTimeout(stateStabilizationTimeoutRef.current)
      stateStabilizationTimeoutRef.current = null
    }

    if (eventCountUpdateTimeoutRef.current) {
      clearTimeout(eventCountUpdateTimeoutRef.current)
      eventCountUpdateTimeoutRef.current = null
    }

    // Stop polling fallback
    stopPollingFallback()

    setIsConnected(false)
    setConnectionError(null)
    setStableConnectionState('disconnected')
  }, [stopPollingFallback])

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested')
    disconnect()
    setTimeout(connect, 1000)
  }, [connect, disconnect])

  // Auto-connect on mount (only if enabled)
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      console.log('🔇 Real-time attendance updates disabled')
      setConnectionError('Disabled')
      updateStableState('disconnected')
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  // Handle page visibility changes
  useEffect(() => {
    // Only add event listener in browser environment
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - keep connection but reduce activity
        console.log('📱 Page hidden - maintaining connection')
      } else {
        // Page is visible - ensure connection is active
        console.log('👁️ Page visible - checking connection')
        if (!isConnected && autoReconnect) {
          reconnect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isConnected, autoReconnect, reconnect])

  return {
    isConnected: stableConnectionState === 'connected',
    connectionError: stableConnectionState === 'disconnected' ? (connectionError || 'Disconnected') : null,
    isConnecting: stableConnectionState === 'connecting',
    lastEvent,
    eventCount: displayEventCount, // Use throttled count for UI
    connect,
    disconnect,
    reconnect,
    // Raw states for debugging
    rawIsConnected: isConnected,
    rawConnectionError: connectionError,
    rawEventCount: eventCount,
    stableState: stableConnectionState
  }
}

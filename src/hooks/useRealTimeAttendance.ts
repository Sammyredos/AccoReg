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
}

export function useRealTimeAttendance(options: UseRealTimeAttendanceOptions = {}) {
  const {
    onVerification,
    onStatusChange,
    onNewScan,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<AttendanceEvent | null>(null)
  const [eventCount, setEventCount] = useState(0)

  // Stable state management to prevent flickering
  const [stableConnectionState, setStableConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const stateStabilizationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  const connect = useCallback(() => {
    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      console.log('🔄 Connecting to real-time attendance updates...')
      
      const eventSource = new EventSource('/api/admin/attendance/events')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('✅ Real-time attendance connection established')
        setIsConnected(true)
        setConnectionError(null)
        updateStableState('connected')

        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
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

          console.log('📡 Received attendance event:', attendanceEvent)

          // Handle different event types
          switch (attendanceEvent.type) {
            case 'verification':
              if (onVerification) {
                onVerification(attendanceEvent)
              }
              if (attendanceEvent.data.fullName) {
                success(`✅ ${attendanceEvent.data.fullName} verified successfully`)
              }
              break

            case 'status_change':
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
        setIsConnected(false)
        setConnectionError('Connection lost')
        updateStableState('disconnected')

        eventSource.close()

        // Auto-reconnect if enabled
        if (autoReconnect && !reconnectTimeoutRef.current) {
          console.log(`🔄 Reconnecting in ${reconnectInterval}ms...`)
          updateStableState('connecting')
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
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

    setIsConnected(false)
    setConnectionError(null)
    setStableConnectionState('disconnected')
  }, [])

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested')
    disconnect()
    setTimeout(connect, 1000)
  }, [connect, disconnect])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Handle page visibility changes
  useEffect(() => {
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

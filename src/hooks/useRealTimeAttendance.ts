'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useToast } from '@/contexts/ToastContext'

export interface AttendanceEvent {
  type: 'verification' | 'status_change' | 'new_scan' | 'connected' | 'heartbeat'
  data: {
    registrationId?: string
    fullName?: string
    status?: 'present' | 'absent' | 'late'
    timestamp: string
    scannerName?: string
    platoonName?: string
    roomName?: string
    message?: string
  }
}

export interface UseRealTimeAttendanceOptions {
  onVerification?: (event: AttendanceEvent) => void
  onStatusChange?: (event: AttendanceEvent) => void
  onNewScan?: (event: AttendanceEvent) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useRealTimeAttendance(options: UseRealTimeAttendanceOptions = {}) {
  const {
    onVerification,
    onStatusChange,
    onNewScan,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<AttendanceEvent | null>(null)
  const [eventCount, setEventCount] = useState(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { success, error: showError } = useToast()

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
          setEventCount(prev => prev + 1)

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
        
        eventSource.close()

        // Auto-reconnect if enabled
        if (autoReconnect && !reconnectTimeoutRef.current) {
          console.log(`🔄 Reconnecting in ${reconnectInterval}ms...`)
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
    
    setIsConnected(false)
    setConnectionError(null)
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
    isConnected,
    connectionError,
    lastEvent,
    eventCount,
    connect,
    disconnect,
    reconnect
  }
}

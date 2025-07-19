'use client'

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react'
import { useRealTimeAttendance } from '@/hooks/useRealTimeAttendance'

interface AccommodationUpdate {
  type: 'allocation' | 'deallocation' | 'room_update' | 'stats_update'
  data: {
    roomId?: string
    registrationId?: string
    participantName?: string
    roomName?: string
    gender?: string
    totalAllocated?: number
    totalUnallocated?: number
    roomOccupancy?: { [roomId: string]: number }
  }
  timestamp: number
}

interface AccommodationUpdatesContextType {
  // Trigger updates
  triggerAllocationUpdate: (roomId: string, registrationId: string, participantName: string, roomName: string) => void
  triggerDeallocationUpdate: (roomId: string, registrationId: string, participantName: string, roomName: string) => void
  triggerRoomUpdate: (roomId: string) => void
  triggerStatsUpdate: () => void
  
  // Subscribe to updates
  onUpdate: (callback: (update: AccommodationUpdate) => void) => () => void
  
  // Force refresh all data
  refreshAll: () => void
}

const AccommodationUpdatesContext = createContext<AccommodationUpdatesContextType | null>(null)

export function AccommodationUpdatesProvider({ children }: { children: React.ReactNode }) {
  const updateCallbacks = useRef<Set<(update: AccommodationUpdate) => void>>(new Set())
  const refreshCallbacks = useRef<Set<() => void>>(new Set())

  const broadcastUpdate = useCallback((update: AccommodationUpdate) => {
    updateCallbacks.current.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in accommodation update callback:', error)
      }
    })
  }, [])

  const triggerAllocationUpdate = useCallback((
    roomId: string, 
    registrationId: string, 
    participantName: string, 
    roomName: string
  ) => {
    broadcastUpdate({
      type: 'allocation',
      data: {
        roomId,
        registrationId,
        participantName,
        roomName
      },
      timestamp: Date.now()
    })
  }, [broadcastUpdate])

  const triggerDeallocationUpdate = useCallback((
    roomId: string, 
    registrationId: string, 
    participantName: string, 
    roomName: string
  ) => {
    broadcastUpdate({
      type: 'deallocation',
      data: {
        roomId,
        registrationId,
        participantName,
        roomName
      },
      timestamp: Date.now()
    })
  }, [broadcastUpdate])

  const triggerRoomUpdate = useCallback((roomId: string) => {
    broadcastUpdate({
      type: 'room_update',
      data: { roomId },
      timestamp: Date.now()
    })
  }, [broadcastUpdate])

  const triggerStatsUpdate = useCallback(() => {
    broadcastUpdate({
      type: 'stats_update',
      data: {},
      timestamp: Date.now()
    })
  }, [broadcastUpdate])

  const onUpdate = useCallback((callback: (update: AccommodationUpdate) => void) => {
    updateCallbacks.current.add(callback)
    
    return () => {
      updateCallbacks.current.delete(callback)
    }
  }, [])

  const refreshAll = useCallback(() => {
    refreshCallbacks.current.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in refresh callback:', error)
      }
    })
  }, [])

  // Register refresh callback
  const onRefresh = useCallback((callback: () => void) => {
    refreshCallbacks.current.add(callback)

    return () => {
      refreshCallbacks.current.delete(callback)
    }
  }, [])

  // Listen to real-time attendance events for verification/unverification
  useRealTimeAttendance({
    enabled: true, // Keep enabled for accommodation updates
    onVerification: useCallback((event) => {
      console.log('🏠 Accommodations: Real-time verification received:', event.data.fullName, 'at', new Date().toISOString())

      // Immediate stats update with multiple triggers for reliability
      triggerStatsUpdate()

      // Broadcast verification update immediately
      broadcastUpdate({
        type: 'stats_update',
        data: {
          participantName: event.data.fullName,
          totalAllocated: undefined, // Will be recalculated
          totalUnallocated: undefined // Will be recalculated
        },
        timestamp: Date.now()
      })

      // Additional delayed trigger to ensure update
      setTimeout(() => {
        triggerStatsUpdate()
        console.log('🔄 Secondary verification update triggered')
      }, 50)
    }, [triggerStatsUpdate, broadcastUpdate]),

    onStatusChange: useCallback((event) => {
      console.log('🏠 Accommodations: Real-time status change received:', event.data.message || 'Status change', 'at', new Date().toISOString())

      // Immediate stats update
      triggerStatsUpdate()

      // Broadcast general update immediately
      broadcastUpdate({
        type: 'stats_update',
        data: {
          participantName: event.data.fullName,
          message: event.data.message
        },
        timestamp: Date.now()
      })

      // Additional delayed trigger to ensure update
      setTimeout(() => {
        triggerStatsUpdate()
        console.log('🔄 Secondary status change update triggered')
      }, 50)
    }, [triggerStatsUpdate, broadcastUpdate])
  })

  const value: AccommodationUpdatesContextType = {
    triggerAllocationUpdate,
    triggerDeallocationUpdate,
    triggerRoomUpdate,
    triggerStatsUpdate,
    onUpdate,
    refreshAll
  }

  return (
    <AccommodationUpdatesContext.Provider value={value}>
      {children}
    </AccommodationUpdatesContext.Provider>
  )
}

export function useAccommodationUpdates() {
  const context = useContext(AccommodationUpdatesContext)
  if (!context) {
    throw new Error('useAccommodationUpdates must be used within AccommodationUpdatesProvider')
  }
  return context
}

// Hook for components that need to refresh on updates
export function useAccommodationRefresh(refreshFn: () => void, dependencies: string[] = []) {
  const { onUpdate } = useAccommodationUpdates()

  useEffect(() => {
    const unsubscribe = onUpdate((update) => {
      // Refresh if no dependencies specified, or if update affects our dependencies
      if (dependencies.length === 0) {
        refreshFn()
      } else {
        const shouldRefresh = dependencies.some(dep => {
          return update.data.roomId === dep || 
                 update.data.registrationId === dep ||
                 update.type === 'stats_update'
        })
        
        if (shouldRefresh) {
          refreshFn()
        }
      }
    })

    return unsubscribe
  }, [onUpdate, refreshFn, dependencies])
}

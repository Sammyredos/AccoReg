import { useState, useEffect, useCallback, useRef } from 'react'

export interface RealTimeStats {
  totalRegistrations: number
  verifiedRegistrations: number
  unverifiedRegistrations: number
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  totalUsers: number
  activeUsers: number
  totalMessages: number
  unreadMessages: number
  lastUpdated: string
}

interface UseRealTimeStatsOptions {
  interval?: number // Update interval in milliseconds (default: 30 seconds)
  enabled?: boolean // Whether to enable real-time updates
  endpoints?: string[] // Specific endpoints to poll
}

export function useRealTimeStats(options: UseRealTimeStatsOptions = {}) {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    endpoints = ['/api/admin/statistics']
  } = options

  const [stats, setStats] = useState<RealTimeStats>({
    totalRegistrations: 0,
    verifiedRegistrations: 0,
    unverifiedRegistrations: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    unreadMessages: 0,
    lastUpdated: new Date().toISOString()
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchStats = useCallback(async () => {
    if (!enabled || !mountedRef.current) return

    try {
      setError(null)
      
      // Fetch from multiple endpoints in parallel
      const responses = await Promise.allSettled(
        endpoints.map(endpoint => fetch(endpoint))
      )

      const data: Partial<RealTimeStats> = {
        lastUpdated: new Date().toISOString()
      }

      // Process each response
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i]
        const endpoint = endpoints[i]

        if (response.status === 'fulfilled' && response.value.ok) {
          const responseData = await response.value.json()
          
          // Map data based on endpoint
          if (endpoint.includes('/statistics')) {
            const stats = responseData.statistics || responseData
            data.totalRegistrations = stats.registrations?.total || 0
            data.verifiedRegistrations = stats.registrations?.verified || 0
            data.unverifiedRegistrations = stats.registrations?.unverified || 0
            data.totalRooms = stats.accommodations?.totalRooms || 0
            data.occupiedRooms = stats.accommodations?.occupiedRooms || 0
            data.availableRooms = stats.accommodations?.availableRooms || 0
          }
          
          if (endpoint.includes('/users')) {
            const userStats = responseData.stats || responseData
            data.totalUsers = userStats.total || 0
            data.activeUsers = userStats.active || userStats.total || 0
          }
          
          if (endpoint.includes('/messages') || endpoint.includes('/inbox')) {
            const messageStats = responseData.stats || responseData
            data.totalMessages = messageStats.total || 0
            data.unreadMessages = messageStats.unread || 0
          }
        }
      }

      if (mountedRef.current) {
        setStats(prev => ({ ...prev, ...data }))
        setLoading(false)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
        setLoading(false)
      }
    }
  }, [enabled, endpoints])

  const startPolling = useCallback(() => {
    if (!enabled) return

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Fetch immediately
    fetchStats()

    // Set up polling
    intervalRef.current = setInterval(fetchStats, interval)
  }, [enabled, interval, fetchStats])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchStats()
  }, [fetchStats])

  // Start polling on mount
  useEffect(() => {
    mountedRef.current = true
    startPolling()

    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [startPolling, stopPolling])

  // Restart polling when options change
  useEffect(() => {
    if (enabled) {
      startPolling()
    } else {
      stopPolling()
    }
  }, [enabled, interval, startPolling, stopPolling])

  return {
    stats,
    loading,
    error,
    refresh,
    startPolling,
    stopPolling
  }
}

// Hook for specific page stats
export function usePageStats(page: 'dashboard' | 'users' | 'attendance' | 'communications' | 'accommodations') {
  const endpoints = {
    dashboard: ['/api/admin/statistics'],
    users: ['/api/admin/users/directory'],
    attendance: ['/api/admin/attendance/stats'],
    communications: ['/api/registrations?limit=1'],
    accommodations: ['/api/admin/statistics']
  }

  return useRealTimeStats({
    endpoints: endpoints[page] || ['/api/admin/statistics'],
    interval: 30000 // 30 seconds
  })
}

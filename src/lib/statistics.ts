/**
 * Centralized statistics service to ensure consistent data across all pages
 * This prevents discrepancies between dashboard, accommodations, and other pages
 */

export interface SystemStatistics {
  registrations: {
    total: number
    allocated: number
    unallocated: number
    allocationRate: number
    byGender: {
      male: number
      female: number
    }
    recent: {
      today: number
      thisWeek: number
      thisMonth: number
    }
    permissions: {
      granted: number
      pending: number
    }
  }
  rooms: {
    total: number
    active: number
    byGender: {
      male: number
      female: number
    }
    capacity: {
      total: number
      occupied: number
      available: number
      utilizationRate: number
    }
  }
  allocations: {
    total: number
    byGender: {
      male: number
      female: number
    }
  }
}

/**
 * Fetch comprehensive system statistics
 * This function ensures all pages get the same accurate data
 */
export async function fetchSystemStatistics(): Promise<SystemStatistics> {
  try {
    // Fetch data from multiple endpoints to get complete picture
    const [registrationsResponse, accommodationsResponse, analyticsResponse] = await Promise.all([
      fetch('/api/registrations?limit=1'), // Just get pagination info (only need total count)
      fetch('/api/admin/accommodations'),
      fetch('/api/admin/analytics').catch(() => null) // Optional analytics
    ])

    let registrationsData = null
    let accommodationsData = null
    let analyticsData = null

    if (registrationsResponse.ok) {
      registrationsData = await registrationsResponse.json()
    }

    if (accommodationsResponse.ok) {
      accommodationsData = await accommodationsResponse.json()
    }

    if (analyticsResponse?.ok) {
      analyticsData = await analyticsResponse.json()
    }

    // Use accommodations API as primary source since it has the most complete stats
    const stats = accommodationsData?.stats || {}
    
    // Build comprehensive statistics object
    const systemStats: SystemStatistics = {
      registrations: {
        total: stats.totalRegistrations || registrationsData?.pagination?.total || 0,
        allocated: stats.allocatedRegistrations || 0,
        unallocated: stats.unallocatedRegistrations || 0,
        allocationRate: stats.allocationRate || 0,
        byGender: {
          male: 0, // Will be calculated from detailed data if available
          female: 0
        },
        recent: {
          today: analyticsData?.registrationsToday || 0,
          thisWeek: analyticsData?.registrationsThisWeek || 0,
          thisMonth: analyticsData?.registrationsThisMonth || 0
        },
        permissions: {
          granted: 0, // Will be calculated if needed
          pending: 0
        }
      },
      rooms: {
        total: stats.totalRooms || 0,
        active: stats.activeRooms || stats.totalRooms || 0,
        byGender: {
          male: 0, // Will be calculated from detailed data if available
          female: 0
        },
        capacity: {
          total: stats.totalCapacity || 0,
          occupied: stats.occupiedSpaces || 0,
          available: stats.availableSpaces || 0,
          utilizationRate: stats.totalCapacity > 0 ? Math.round((stats.occupiedSpaces / stats.totalCapacity) * 100) : 0
        }
      },
      allocations: {
        total: stats.occupiedSpaces || 0,
        byGender: {
          male: 0,
          female: 0
        }
      }
    }

    // Add gender-specific data if available from accommodations response
    if (accommodationsData?.roomsByGender) {
      const roomsByGender = accommodationsData.roomsByGender
      systemStats.rooms.byGender.male = roomsByGender.Male?.length || 0
      systemStats.rooms.byGender.female = roomsByGender.Female?.length || 0
    }

    if (accommodationsData?.unallocatedByGender) {
      const unallocatedByGender = accommodationsData.unallocatedByGender
      systemStats.registrations.byGender.male = unallocatedByGender.Male?.length || 0
      systemStats.registrations.byGender.female = unallocatedByGender.Female?.length || 0
    }

    return systemStats

  } catch (error) {
    console.error('Error fetching system statistics:', error)
    
    // Return default statistics in case of error
    return {
      registrations: {
        total: 0,
        allocated: 0,
        unallocated: 0,
        allocationRate: 0,
        byGender: { male: 0, female: 0 },
        recent: { today: 0, thisWeek: 0, thisMonth: 0 },
        permissions: { granted: 0, pending: 0 }
      },
      rooms: {
        total: 0,
        active: 0,
        byGender: { male: 0, female: 0 },
        capacity: { total: 0, occupied: 0, available: 0, utilizationRate: 0 }
      },
      allocations: {
        total: 0,
        byGender: { male: 0, female: 0 }
      }
    }
  }
}

/**
 * Format numbers for display with proper locale formatting
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Format percentage for display
 */
export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`
}

/**
 * Calculate allocation rate
 */
export function calculateAllocationRate(allocated: number, total: number): number {
  return total > 0 ? Math.round((allocated / total) * 100) : 0
}

/**
 * Get status color based on allocation rate
 */
export function getStatusColor(rate: number): string {
  if (rate >= 90) return 'text-green-600'
  if (rate >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Get status text based on allocation rate
 */
export function getStatusText(rate: number): string {
  if (rate >= 90) return 'Excellent'
  if (rate >= 70) return 'Good'
  if (rate >= 50) return 'Fair'
  return 'Needs Attention'
}

/**
 * Validate statistics for consistency
 */
export function validateStatistics(stats: SystemStatistics): {
  isValid: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  
  // Check if allocated + unallocated = total
  const totalCheck = stats.registrations.allocated + stats.registrations.unallocated
  if (totalCheck !== stats.registrations.total && stats.registrations.total > 0) {
    warnings.push(`Registration totals don't match: ${totalCheck} vs ${stats.registrations.total}`)
  }
  
  // Check if allocation count matches
  if (stats.allocations.total !== stats.registrations.allocated) {
    warnings.push(`Allocation counts don't match: ${stats.allocations.total} vs ${stats.registrations.allocated}`)
  }
  
  // Check capacity utilization
  if (stats.rooms.capacity.occupied > stats.rooms.capacity.total) {
    warnings.push(`Occupied spaces exceed total capacity`)
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  }
}

/**
 * Cache for statistics to prevent excessive API calls
 */
let statisticsCache: {
  data: SystemStatistics | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

/**
 * Get cached statistics or fetch fresh data
 */
export async function getCachedStatistics(): Promise<SystemStatistics> {
  const now = Date.now()
  
  // Return cached data if it's still fresh
  if (statisticsCache.data && (now - statisticsCache.timestamp) < CACHE_DURATION) {
    return statisticsCache.data
  }
  
  // Fetch fresh data
  const stats = await fetchSystemStatistics()
  
  // Update cache
  statisticsCache = {
    data: stats,
    timestamp: now
  }
  
  return stats
}

/**
 * Clear statistics cache (useful after data changes)
 */
export function clearStatisticsCache(): void {
  statisticsCache = {
    data: null,
    timestamp: 0
  }
}

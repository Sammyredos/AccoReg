/**
 * Accommodation Statistics Cards Component
 * Displays key accommodation metrics in a clean card layout
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
import {
  Users,
  UserCheck,
  UserX,
  BarChart3,
  Home,
  Bed
} from 'lucide-react'

interface AccommodationStats {
  totalRegistrations: number
  allocatedRegistrations: number
  unallocatedRegistrations: number
  allocationRate: number
  totalRooms: number
  activeRooms: number
  totalCapacity: number
  occupiedSpaces: number
  availableSpaces: number
  roomOccupancyRate: number
}

interface AccommodationStatsCardsProps {
  stats: AccommodationStats
  loading?: boolean
}

export const AccommodationStatsCards = React.memo(function AccommodationStatsCards({ stats, loading = false }: AccommodationStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }



  return (
    <StatsGrid columns={4}>
      <StatsCard
        title="Total Registrations"
        value={stats.totalRegistrations}
        subtitle="All participants registered"
        icon={Users}
        gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
        bgGradient="bg-gradient-to-br from-white to-blue-50"
        loading={loading}
      />

      <StatsCard
        title="Allocated"
        value={stats.allocatedRegistrations}
        subtitle={`${Math.round(stats.allocationRate)}% allocated`}
        icon={UserCheck}
        gradient="bg-gradient-to-r from-green-500 to-emerald-600"
        bgGradient="bg-gradient-to-br from-white to-green-50"
        loading={loading}
      />

      <StatsCard
        title="Unallocated"
        value={stats.unallocatedRegistrations}
        subtitle="Awaiting room assignment"
        icon={UserX}
        gradient="bg-gradient-to-r from-orange-500 to-amber-600"
        bgGradient="bg-gradient-to-br from-white to-orange-50"
        loading={loading}
      />

      <StatsCard
        title="Room Occupancy"
        value={`${Math.round(stats.roomOccupancyRate)}%`}
        subtitle={`${stats.occupiedSpaces} / ${stats.totalCapacity} spaces`}
        icon={BarChart3}
        gradient="bg-gradient-to-r from-purple-500 to-indigo-600"
        bgGradient="bg-gradient-to-br from-white to-purple-50"
        loading={loading}
      />
    </StatsGrid>
  )
})

// Skeleton version for loading states
export function AccommodationStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-xl animate-pulse flex-shrink-0"></div>
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

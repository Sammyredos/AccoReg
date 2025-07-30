/**
 * Platoon Statistics Cards Component
 * Displays key platoon allocation metrics in a clean card layout
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserCheck,
  UserX,
  Shield
} from 'lucide-react'

interface PlatoonStats {
  totalVerified: number
  totalAllocated: number
  totalUnallocated: number
  totalPlatoons: number
}

interface PlatoonStatsCardsProps {
  stats: PlatoonStats
  loading?: boolean
}

export const PlatoonStatsCards = React.memo(function PlatoonStatsCards({ stats, loading = false }: PlatoonStatsCardsProps) {
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

  const allocationRate = stats.totalVerified > 0 ? (stats.totalAllocated / stats.totalVerified) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Verified */}
      <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="p-4 sm:p-5">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                Total Verified
              </p>
              <p className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                {loading ? <Skeleton className="h-6 w-12" /> : stats.totalVerified.toLocaleString()}
              </p>
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                All verified participants
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Allocated */}
      <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="p-4 sm:p-5">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                Allocated
              </p>
              <p className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                {loading ? <Skeleton className="h-6 w-12" /> : stats.totalAllocated.toLocaleString()}
              </p>
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                {Math.round(allocationRate)}% allocated
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Unallocated */}
      <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="p-4 sm:p-5">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                Unallocated
              </p>
              <p className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                {loading ? <Skeleton className="h-6 w-12" /> : stats.totalUnallocated.toLocaleString()}
              </p>
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                Awaiting platoon assignment
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Total Platoons */}
      <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="p-4 sm:p-5">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                Total Platoons
              </p>
              <p className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                {loading ? <Skeleton className="h-6 w-12" /> : stats.totalPlatoons.toLocaleString()}
              </p>
              <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                Active platoon units
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
})

// Skeleton version for loading states
export function PlatoonStatsCardsSkeleton() {
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

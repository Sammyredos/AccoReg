'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/statistics'
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  BarChart3,
  Target
} from 'lucide-react'

interface PlatoonStats {
  totalRegistrations: number
  allocatedRegistrations: number
  unallocatedRegistrations: number
  allocationRate: number
  totalPlatoons: number
  activePlatoons: number
  totalCapacity: number
  occupiedSpaces: number
  availableSpaces: number
  platoonOccupancyRate: number
}

interface PlatoonStatsCardsProps {
  stats: PlatoonStats
  loading?: boolean
}

export function PlatoonStatsCards({ stats, loading = false }: PlatoonStatsCardsProps) {
  const statsCards = [
    {
      title: 'Total Registrations',
      value: stats.totalRegistrations,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'All registered participants'
    },
    {
      title: 'Allocated',
      value: stats.allocatedRegistrations,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Assigned to platoons'
    },
    {
      title: 'Unallocated',
      value: stats.unallocatedRegistrations,
      icon: UserX,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Awaiting assignment'
    },
    {
      title: 'Allocation Rate',
      value: `${stats.allocationRate}%`,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Participants allocated'
    },
    {
      title: 'Total Platoons',
      value: stats.totalPlatoons,
      icon: Shield,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'All platoons created'
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.platoonOccupancyRate}%`,
      icon: BarChart3,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      description: 'Platoon capacity used'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-apercu-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-apercu-bold text-gray-900 mb-1">
                {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
              </div>
              <p className="text-xs text-gray-500">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

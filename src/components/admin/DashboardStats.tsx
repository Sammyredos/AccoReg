/**
 * Simple dashboard stats component - no heavy animations for better performance
 */

import React from 'react'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
import {
  Users,
  UserCheck,
  UserX,
  Home,
  Lock,
  Unlock
} from 'lucide-react'

interface DashboardStatsProps {
  stats?: {
    totalRegistrations: number
    verifiedRegistrations: number
    unverifiedRegistrations: number
    totalRooms: number
    occupiedRooms: number
    availableRooms: number
  }
  loading?: boolean
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {

  return (
    <StatsGrid columns={4}>
      <StatsCard
        title="Total Registrations"
        value={stats?.totalRegistrations || 0}
        subtitle="All participants"
        icon={Users}
        gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
        bgGradient="bg-gradient-to-br from-white to-blue-50"
        loading={loading}
      />

      <StatsCard
        title="Verified"
        value={stats?.verifiedRegistrations || 0}
        subtitle="Attendance confirmed"
        icon={UserCheck}
        gradient="bg-gradient-to-r from-green-500 to-emerald-600"
        bgGradient="bg-gradient-to-br from-white to-green-50"
        loading={loading}
      />

      <StatsCard
        title="Unverified"
        value={stats?.unverifiedRegistrations || 0}
        subtitle="Pending verification"
        icon={UserX}
        gradient="bg-gradient-to-r from-orange-500 to-amber-600"
        bgGradient="bg-gradient-to-br from-white to-orange-50"
        loading={loading}
      />

      <StatsCard
        title="Total Rooms"
        value={stats?.totalRooms || 0}
        subtitle="Available rooms"
        icon={Home}
        gradient="bg-gradient-to-r from-purple-500 to-indigo-600"
        bgGradient="bg-gradient-to-br from-white to-purple-50"
        loading={loading}
      />
    </StatsGrid>
  )
}

'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Users,
  TrendingUp,
  Home,
  Activity
} from 'lucide-react'

interface DashboardChartsProps {
  analytics: {
    registrations: {
      total: number
      verified: number
      unverified: number
      genderDistribution: Array<{ gender: string; _count: { id: number } }>
      branchDistribution: Array<{ branch: string; _count: { id: number } }>
      children: {
        total: number
        byGender: Array<{ gender: string; _count: { id: number } }>
      }
    }
    accommodations: {
      totalRooms: number
      activeRooms: number
      allocatedRooms: number
      occupancyRate: number
      roomDetails: Array<{
        id: string
        name: string
        capacity: number
        occupied: number
        occupancyRate: number
        gender: string
        isActive: boolean
      }>
    }
    activity: {
      registrationsToday: number
      registrationsThisWeek: number
      registrationsThisMonth: number
    }
  }
}

// Beautiful consistent color palette matching dashboard theme
const COLORS = {
  primary: '#6366f1',    // Indigo
  secondary: '#8b5cf6',  // Violet
  success: '#10b981',    // Emerald
  warning: '#f59e0b',    // Amber
  error: '#ef4444',      // Red
  info: '#06b6d4',       // Cyan
  purple: '#a855f7',     // Purple
  orange: '#f97316',     // Orange
  blue: '#3b82f6',       // Blue
  teal: '#14b8a6'        // Teal
}

const CHART_COLORS = [
  COLORS.primary,    // Indigo
  COLORS.success,    // Emerald
  COLORS.warning,    // Amber
  COLORS.purple,     // Purple
  COLORS.info,       // Cyan
  COLORS.orange,     // Orange
  COLORS.blue,       // Blue
  COLORS.teal        // Teal
]

export function DashboardCharts({ analytics }: DashboardChartsProps) {
  // Prepare data for gender distribution
  const genderData = analytics.registrations.genderDistribution.map((item, index) => ({
    name: item.gender || 'Not Specified',
    value: item._count.id,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }))

  // Prepare data for branch distribution (top 5)
  const branchData = analytics.registrations.branchDistribution
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 5)
    .map((item, index) => ({
      name: item.branch.length > 12 ? item.branch.substring(0, 12) + '...' : item.branch,
      value: item._count.id,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))

  // Prepare accommodation data - Available should represent available bed spaces, not rooms
  const totalCapacity = analytics.accommodations.roomDetails.reduce((sum, room) => sum + room.capacity, 0)
  const occupiedSpaces = analytics.accommodations.roomDetails.reduce((sum, room) => sum + room.occupied, 0)
  const availableSpaces = Math.max(0, totalCapacity - occupiedSpaces)

  const accommodationData = [
    { name: 'Allocated', value: occupiedSpaces, color: COLORS.success },
    { name: 'Available', value: availableSpaces, color: COLORS.warning }
  ]

  // Activity data
  const activityData = [
    { name: 'Today', value: analytics.activity.registrationsToday },
    { name: 'This Week', value: analytics.activity.registrationsThisWeek },
    { name: 'This Month', value: analytics.activity.registrationsThisMonth }
  ]

  // Minimalistic tooltip
  const MinimalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 border border-gray-100 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-gray-600">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8">
      {/* Registration Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card className="shadow-sm bg-white border-b border-gray-100 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Gender Distribution</h3>
                <p className="text-xs text-gray-500">Participant demographics</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<MinimalTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {genderData.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Branch Distribution */}
        <Card className=" shadow-sm bg-white border-b border-gray-100 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Branch Registrations</h3>
                <p className="text-xs text-gray-500">Branch with Most Registrations</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<MinimalTooltip />} />
                  <Bar
                    dataKey="value"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accommodation & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accommodation Status */}
        <Card className="border-0 shadow-sm bg-white backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Room Allocation</h3>
                <p className="text-xs text-gray-500">Accommodation status</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accommodationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {accommodationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<MinimalTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {accommodationData.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Trends */}
        <Card className="shadow-sm bg-white border-b border-gray-100 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Registration Activity</h3>
                <p className="text-xs text-gray-500">Recent activity trends</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<MinimalTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

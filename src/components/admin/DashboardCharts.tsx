'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Shield, 
  TrendingUp, 
  Home, 
  UserCheck, 
  Activity,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react'

interface DashboardChartsProps {
  analytics: {
    roles: {
      distribution: Array<{
        id: string
        name: string
        userCount: number
        permissionCount: number
        permissions: string[]
      }>
      totalRoles: number
      totalActiveUsers: number
    }
    registrations: {
      total: number
      verified: number
      unverified: number
      verificationRate: number
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

// Color palettes for charts
const ROLE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
const GENDER_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B']
const ACCOMMODATION_COLORS = ['#10B981', '#F59E0B', '#EF4444']

export function DashboardCharts({ analytics }: DashboardChartsProps) {
  // Prepare data for role distribution chart
  const roleData = analytics.roles.distribution.map((role, index) => ({
    name: role.name,
    users: role.userCount,
    permissions: role.permissionCount,
    color: ROLE_COLORS[index % ROLE_COLORS.length]
  }))

  // Prepare data for registration verification chart
  const verificationData = [
    { name: 'Verified', value: analytics.registrations.verified, color: '#10B981' },
    { name: 'Unverified', value: analytics.registrations.unverified, color: '#F59E0B' }
  ]

  // Prepare data for gender distribution
  const genderData = analytics.registrations.genderDistribution.map((item, index) => ({
    name: item.gender,
    value: item._count.id,
    color: GENDER_COLORS[index % GENDER_COLORS.length]
  }))

  // Prepare data for branch distribution (top 6)
  const branchData = analytics.registrations.branchDistribution
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 6)
    .map(item => ({
      name: item.branch.length > 15 ? item.branch.substring(0, 15) + '...' : item.branch,
      value: item._count.id
    }))

  // Prepare accommodation data
  const accommodationData = [
    { name: 'Occupied', value: analytics.accommodations.allocatedRooms, color: '#EF4444' },
    { name: 'Available', value: analytics.accommodations.totalRooms - analytics.accommodations.allocatedRooms, color: '#10B981' }
  ]

  // Activity data
  const activityData = [
    { name: 'Today', value: analytics.activity.registrationsToday },
    { name: 'This Week', value: analytics.activity.registrationsThisWeek },
    { name: 'This Month', value: analytics.activity.registrationsThisMonth }
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-apercu-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-apercu-regular text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Role Distribution & User Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution Bar Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-apercu-bold text-lg text-gray-900">User Roles Distribution</CardTitle>
                <p className="font-apercu-regular text-sm text-gray-600">Active users by role</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fontFamily: 'Apercu' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12, fontFamily: 'Apercu' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {roleData.map((role, index) => (
                <Badge key={role.name} variant="secondary" className="text-xs">
                  {role.name}: {role.users} users, {role.permissions} permissions
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Registration Verification Pie Chart */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-apercu-bold text-lg text-gray-900">Registration Status</CardTitle>
                <p className="font-apercu-regular text-sm text-gray-600">Verification breakdown</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {verificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-apercu-bold text-gray-900">
                {analytics.registrations.verificationRate.toFixed(1)}%
              </p>
              <p className="text-sm font-apercu-regular text-gray-600">Verification Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gender & Branch Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-apercu-bold text-lg text-gray-900">Gender Distribution</CardTitle>
                <p className="font-apercu-regular text-sm text-gray-600">Participant demographics</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Branch Distribution */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-apercu-bold text-lg text-gray-900">Top Branches</CardTitle>
                <p className="font-apercu-regular text-sm text-gray-600">Registration by branch</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fontFamily: 'Apercu' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12, fontFamily: 'Apercu' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accommodation & Activity Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accommodation Status */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-apercu-bold text-lg text-gray-900">Accommodation Status</CardTitle>
                <p className="font-apercu-regular text-sm text-gray-600">Room occupancy overview</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accommodationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {accommodationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-apercu-bold text-gray-900">
                  {analytics.accommodations.occupancyRate.toFixed(1)}%
                </p>
                <p className="text-sm font-apercu-regular text-gray-600">Occupancy Rate</p>
              </div>
              <div>
                <p className="text-2xl font-apercu-bold text-gray-900">
                  {analytics.accommodations.totalRooms}
                </p>
                <p className="text-sm font-apercu-regular text-gray-600">Total Rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-apercu-bold text-lg text-gray-900">Registration Activity</CardTitle>
                <p className="font-apercu-regular text-sm text-gray-600">Recent registration trends</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fontFamily: 'Apercu' }}
                  />
                  <YAxis tick={{ fontSize: 12, fontFamily: 'Apercu' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8B5CF6"
                    fill="url(#colorActivity)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-apercu-regular text-gray-600">
                {analytics.registrations.children.total > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mr-2">
                    {analytics.registrations.children.total} Children Registered
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  {analytics.registrations.total} Total Registrations
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-apercu-medium text-blue-700">Active Roles</p>
                <p className="text-2xl font-apercu-bold text-blue-900">{analytics.roles.totalRoles}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-apercu-medium text-green-700">Total Users</p>
                <p className="text-2xl font-apercu-bold text-green-900">{analytics.roles.totalActiveUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-apercu-medium text-purple-700">Verification Rate</p>
                <p className="text-2xl font-apercu-bold text-purple-900">{analytics.registrations.verificationRate.toFixed(0)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-apercu-medium text-orange-700">Room Occupancy</p>
                <p className="text-2xl font-apercu-bold text-orange-900">{analytics.accommodations.occupancyRate.toFixed(0)}%</p>
              </div>
              <Home className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

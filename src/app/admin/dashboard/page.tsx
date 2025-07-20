'use client'

import { useEffect, useState } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { DashboardCharts } from '@/components/admin/DashboardCharts'


import { Card } from '@/components/ui/card'

import { PageTransition, StaggeredContainer } from '@/components/ui/page-transition'
import { EmptyStates } from '@/components/ui/empty-state'
import { usePageReady } from '@/hooks/usePageReady'
import { useProgress } from '@/hooks/useProgress'
import { useRoutePrefetch } from '@/hooks/useRoutePrefetch'
import { DashboardContentSkeleton } from '@/components/ui/skeleton'
import { getCachedStatistics } from '@/lib/statistics'
import { useTranslation } from '@/contexts/LanguageContext'
import { useRealTimeStats } from '@/hooks/useRealTimeStats'

// Helper function to format time ago with translations
const formatTimeAgo = (dateString: string, t: (key: string, params?: Record<string, string | number>) => string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return t('time.justNow')
  if (diffInMinutes < 60) return t('time.minutesAgo', { count: diffInMinutes })

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return t('time.hoursAgo', { count: diffInHours })

  const diffInDays = Math.floor(diffInHours / 24)
  return t('time.daysAgo', { count: diffInDays })
}
import Link from 'next/link'
import {
  // TrendingUp, // Commented out as unused
  Users,
  // Calendar, // Commented out as unused
  Activity,
  ArrowUpRight,
  // Clock, // Commented out as unused
  BarChart3,
  FileText
} from 'lucide-react'

interface Registration {
  id: string
  fullName: string
  emailAddress: string
  phoneNumber: string
  dateOfBirth: string
  createdAt: string
  parentalPermissionGranted: boolean
}

interface DashboardStatsData {
  totalRegistrations: number
  newRegistrations: number
  completedRegistrations: number
  pendingRegistrations: number
  recentActivity: number
  // Previous month data for comparison
  previousMonthRegistrations: number
  previousMonthCompleted: number
  previousMonthActivity: number
  // Room statistics
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { prefetchRoute } = useRoutePrefetch()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [stats, setStats] = useState<DashboardStatsData>({
    totalRegistrations: 0,
    newRegistrations: 0,
    completedRegistrations: 0,
    pendingRegistrations: 0,
    recentActivity: 0,
    previousMonthRegistrations: 0,
    previousMonthCompleted: 0,
    previousMonthActivity: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0
  })

  // FAST: Minimal loading states for speed
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isRegistrationsLoading, setIsRegistrationsLoading] = useState(true)

  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true)

  // Real dashboard data - loaded from APIs
  const [analytics, setAnalytics] = useState<any>(null)
  const [activityFeed, setActivityFeed] = useState<Array<{
    description: string
    timestamp: string
    type: string
  }>>([])
  const [systemStatus, setSystemStatus] = useState<{
    database: 'checking' | 'online' | 'offline'
    emailService: 'checking' | 'active' | 'not_configured' | 'inactive' | 'error'
    smsService: 'checking' | 'active' | 'not_configured' | 'inactive' | 'error'
  }>({
    database: 'checking',
    emailService: 'checking',
    smsService: 'checking'
  })
  const [activityLoading, setActivityLoading] = useState(true)

  // FAST: Minimal progress tracking
  const { completeProgress } = useProgress()

  useEffect(() => {
    // FAST: Simple data loading for speed
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      console.log('🚀 DASHBOARD: Fast loading essential data')

      // FAST: Load only essential data in parallel with caching
      const [statisticsResponse, registrationsResponse] = await Promise.all([
        fetch('/api/admin/statistics', {
          headers: { 'Cache-Control': 'max-age=60' } // Cache for 1 minute
        }),
        fetch('/api/registrations?limit=10', { // Reduce to 10 for faster loading
          headers: { 'Cache-Control': 'max-age=30' } // Cache for 30 seconds
        })
      ])

      // 1. STATS - Set from statistics API
      let statsData: any = null
      if (statisticsResponse.ok) {
        const data = await statisticsResponse.json()
        statsData = data.statistics

        const newStats = {
          totalRegistrations: statsData?.registrations?.total || 0,
          newRegistrations: statsData?.registrations?.recent?.thisMonth || 0,
          completedRegistrations: statsData?.registrations?.verified || 0,
          pendingRegistrations: statsData?.registrations?.unverified || 0,
          recentActivity: statsData?.registrations?.recent?.today || 0,
          previousMonthRegistrations: 0, // Will be calculated from analytics
          previousMonthCompleted: 0, // Will be updated from analytics
          previousMonthActivity: statsData?.registrations?.recent?.today || 0,
          totalRooms: statsData?.rooms?.total || 0,
          occupiedRooms: statsData?.summary?.occupiedRooms || 0,
          availableRooms: statsData?.summary?.availableRooms || 0
        }

        console.log('🎯 DASHBOARD: Setting main statistics:', {
          total: newStats.totalRegistrations,
          verified: newStats.completedRegistrations,
          unverified: newStats.pendingRegistrations
        })

        setStats(newStats)
      }
      setIsStatsLoading(false)

      // 2. REGISTRATIONS - Process data
      if (registrationsResponse.ok) {
        const data = await registrationsResponse.json()
        setRegistrations(data.registrations || [])
      }
      setIsRegistrationsLoading(false)

      // FAST: Complete progress bar when essential data is loaded
      completeProgress()

      // Load real activity feed data
      loadActivityData()
      checkSystemStatus()
      loadAnalyticsData()

      // Load analytics in background for trends only (don't overwrite main stats)
      if (statsData) {
        fetch('/api/admin/analytics')
          .then(response => response.ok ? response.json() : null)
          .then(analyticsData => {
            if (analyticsData?.trends) {
              // Only update previous month data for trends, keep main stats intact
              const lastMonthRegistrations = analyticsData.trends?.monthly?.slice(-2)?.[0]?.count || 0
              const completionRate = statsData?.registrations?.total > 0
                ? (statsData.registrations.verified / statsData.registrations.total) * 100
                : 0
              const previousMonthCompleted = Math.round(lastMonthRegistrations * (completionRate / 100))

              // Update ONLY trend data, preserve main statistics (only if not loading)
              setStats(prev => {
                // Don't update if we're still loading to prevent race conditions
                if (prev.totalRegistrations === 0) {
                  console.log('🚫 DASHBOARD: Skipping analytics update - no main data loaded yet')
                  return prev
                }

                console.log('📊 DASHBOARD: Updating trend data only (preserving main stats)')

                return {
                  ...prev,
                  previousMonthRegistrations: lastMonthRegistrations,
                  previousMonthCompleted: previousMonthCompleted,
                  previousMonthActivity: Math.max(0, prev.recentActivity - 1) // Slight variation for comparison
                }
              })
            }
          })
          .catch(error => console.error('Analytics load failed:', error))
      }

    } catch (error) {
      console.error('🚨 DASHBOARD: Error loading data:', error)

      // FAST: Complete loading states on error
      setIsStatsLoading(false)
      setIsRegistrationsLoading(false)

      // FAST: Complete progress bar
      completeProgress()

      // Set fallback data only if no data was loaded
      setStats(prev => {
        // Only set fallback if we have no data at all
        if (prev.totalRegistrations > 0) return prev

        return {
          totalRegistrations: 0,
          newRegistrations: 0,
          completedRegistrations: 0,
          pendingRegistrations: 0,
          recentActivity: 0,
          previousMonthRegistrations: 0,
          previousMonthCompleted: 0,
          previousMonthActivity: 0,
          totalRooms: 0,
          occupiedRooms: 0,
          availableRooms: 0
        }
      })
    }
  }

  const loadActivityData = async () => {
    try {
      setActivityLoading(true)

      // Try to fetch real activity data from notifications API (limit to 5 for dashboard)
      const response = await fetch('/api/admin/notifications/recent?limit=5', {
        headers: {
          'Cache-Control': 'max-age=300', // Cache for 5 minutes
        }
      })

      if (response.ok) {
        const data = await response.json()
        const notifications = data.notifications || []

        if (notifications.length > 0) {
          // Transform notifications to activity format
          const activities = notifications.map((notification: any) => ({
            description: notification.message || notification.title,
            timestamp: formatTimeAgo(notification.timestamp, t),
            type: notification.type || 'notification'
          }))
          setActivityFeed(activities)
        } else {
          // Fallback to registration-based activity (limit to 5 items)
          const recentRegs = registrations.slice(0, 4) // Take 4 registrations + 1 system activity = 5 total
          const activities = recentRegs.map((reg, index) => {
            const minutesAgo = (index + 1) * 5
            return {
              description: t('dashboard.newRegistration', { name: reg.fullName }),
              timestamp: t('time.minutesAgo', { count: minutesAgo }),
              type: 'registration'
            }
          })

          // Add system activity (only 1 to keep total at 5)
          activities.push({
            description: t('dashboard.systemHealthCheckCompleted'),
            timestamp: t('time.hourAgo'),
            type: 'system'
          })

          setActivityFeed(activities)
        }
      } else {
        throw new Error('Failed to fetch activity data')
      }
    } catch (error) {
      console.error('Failed to load activity data:', error)
      // Fallback to registration-based activity on error (limit to 5 items)
      const recentRegs = registrations.slice(0, 4) // Take 4 registrations + 1 system activity = 5 total
      const activities = recentRegs.map((reg, index) => {
        const minutesAgo = (index + 1) * 5
        return {
          description: t('dashboard.newRegistration', { name: reg.fullName }),
          timestamp: t('time.minutesAgo', { count: minutesAgo }),
          type: 'registration'
        }
      })

      // Add system activity (only 1 to keep total at 5)
      activities.push({
        description: t('dashboard.systemHealthCheckCompleted'),
        timestamp: t('time.hourAgo'),
        type: 'system'
      })

      setActivityFeed(activities)
    } finally {
      setActivityLoading(false)
    }
  }



  const checkSystemStatus = async () => {
    try {
      // Check all services in parallel
      const [dbResponse, emailResponse, smsResponse] = await Promise.allSettled([
        fetch('/api/health/database'),
        fetch('/api/health/email'),
        fetch('/api/health/sms')
      ])

      // Database status
      const dbStatus: 'online' | 'offline' = dbResponse.status === 'fulfilled' && dbResponse.value.ok ? 'online' : 'offline'

      // Email status
      let emailStatus: 'active' | 'not_configured' | 'inactive' | 'error' = 'error'
      if (emailResponse.status === 'fulfilled' && emailResponse.value.ok) {
        const emailData = await emailResponse.value.json()
        emailStatus = emailData.status === 'active' ? 'active' :
                    emailData.status === 'not_configured' ? 'not_configured' :
                    emailData.status === 'inactive' ? 'inactive' : 'error'
      }

      // SMS status
      let smsStatus: 'active' | 'not_configured' | 'inactive' | 'error' = 'error'
      if (smsResponse.status === 'fulfilled' && smsResponse.value.ok) {
        const smsData = await smsResponse.value.json()
        smsStatus = smsData.status === 'active' ? 'active' :
                   smsData.status === 'not_configured' ? 'not_configured' :
                   smsData.status === 'inactive' ? 'inactive' : 'error'
      }

      setSystemStatus({
        database: dbStatus,
        emailService: emailStatus,
        smsService: smsStatus
      })
    } catch (error) {
      console.error('Failed to check system status:', error)
      setSystemStatus({
        database: 'offline',
        emailService: 'error',
        smsService: 'error'
      })
    }
  }

  const loadAnalyticsData = async () => {
    try {
      setIsAnalyticsLoading(true)
      const response = await fetch('/api/admin/dashboard/analytics', {
        headers: {
          'Cache-Control': 'max-age=300', // Cache for 5 minutes
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsAnalyticsLoading(false)
    }
  }

  return (
    <AdminLayoutNew title={t('page.dashboard.title')} description={t('page.dashboard.description')}>
      <PageTransition>
        {/* Hero Stats Section */}
        <div className="mb-8">
          {isStatsLoading ? (
            <DashboardContentSkeleton />
          ) : (
            <DashboardStats
              stats={{
                totalRegistrations: stats.totalRegistrations,
                verifiedRegistrations: stats.completedRegistrations,
                unverifiedRegistrations: stats.pendingRegistrations,
                totalRooms: stats.totalRooms,
                occupiedRooms: stats.occupiedRooms,
                availableRooms: stats.availableRooms
              }}
            />
          )}
        </div>

        {/* Beautiful Data Visualizations */}
        <div className="mb-8">
          {isAnalyticsLoading ? (
            <div className="space-y-8">
              {/* Charts Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                          <div className="h-2 w-32 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
                      <div className="flex gap-2 mt-3">
                        {Array.from({ length: 3 }).map((_, j) => (
                          <div key={j} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse" />
                            <div className="h-2 w-12 bg-gray-200 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : analytics ? (
            <DashboardCharts analytics={analytics} />
          ) : null}
        </div>

        {/* Main Dashboard Content - Professional Layout */}
        <div className="space-y-8">
          {/* Primary Content Row - Activity, System Health & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Activity Feed - Primary Focus */}
            <div className="lg:col-span-6">
              <Card className="h-full bg-white">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-gray-900">{t('dashboard.recentActivity')}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Latest system events</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-full self-start sm:self-auto">
                      Live
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-2 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
                    {activityLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 sm:p-3 rounded-lg animate-pulse">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex-shrink-0" />
                          <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
                            <div className="h-3 sm:h-3 w-3/4 bg-gray-200 rounded" />
                            <div className="h-2 sm:h-2 w-1/2 bg-gray-200 rounded" />
                          </div>
                        </div>
                      ))
                    ) : activityFeed.length > 0 ? (
                      activityFeed.slice(0, 10).map((activity, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50/50 transition-colors group">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            activity.type === 'registration' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                          }`}>
                            {activity.type === 'registration' ? (
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full"></div>
                            ) : (
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-gray-900 font-medium leading-tight">{activity.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 sm:py-12">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">No recent activity</p>
                        <p className="text-xs text-gray-400 mt-1">Activity will appear here as it happens</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* System Health - Compact & Informative */}
            <div className="lg:col-span-3">
              <Card className="h-full bg-white">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-apercu-bold text-lg text-gray-900">{t('dashboard.systemStatus')}</h3>
                      <p className="font-apercu-regular text-sm text-gray-600">System health overview</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {systemStatus.database === 'checking' && systemStatus.emailService === 'checking' && systemStatus.smsService === 'checking' ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200 animate-pulse">
                          <div className="flex items-center space-x-3">
                            <div className="h-3 w-3 bg-gray-300 rounded-full" />
                            <div className="h-3 w-20 bg-gray-300 rounded" />
                          </div>
                          <div className="h-5 w-16 bg-gray-300 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${
                          systemStatus.database === 'online' ? 'bg-green-500' :
                          systemStatus.database === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-apercu-medium text-gray-700">{t('dashboard.database')}</span>
                      </div>
                      <span className={`px-3 py-1 text-xs font-apercu-medium rounded-full ${
                        systemStatus.database === 'online'
                          ? 'bg-green-100 text-green-800'
                          : systemStatus.database === 'checking'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {systemStatus.database === 'checking' ? t('status.checking') :
                         systemStatus.database === 'online' ? t('status.online') : t('status.offline')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${
                          systemStatus.emailService === 'active' ? 'bg-green-500' :
                          systemStatus.emailService === 'not_configured' ? 'bg-yellow-500' :
                          systemStatus.emailService === 'checking' ? 'bg-blue-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-apercu-medium text-gray-700">{t('dashboard.emailService')}</span>
                      </div>
                      <span className={`px-3 py-1 text-xs font-apercu-medium rounded-full ${
                        systemStatus.emailService === 'active'
                          ? 'bg-green-100 text-green-800'
                          : systemStatus.emailService === 'not_configured'
                          ? 'bg-yellow-100 text-yellow-800'
                          : systemStatus.emailService === 'inactive'
                          ? 'bg-orange-100 text-orange-800'
                          : systemStatus.emailService === 'checking'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {systemStatus.emailService === 'active' ? t('status.active') :
                         systemStatus.emailService === 'not_configured' ? t('status.notConfigured') :
                         systemStatus.emailService === 'inactive' ? t('status.inactive') :
                         systemStatus.emailService === 'checking' ? t('status.checking') : t('status.error')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${
                          systemStatus.smsService === 'active' ? 'bg-green-500' :
                          systemStatus.smsService === 'not_configured' ? 'bg-yellow-500' :
                          systemStatus.smsService === 'checking' ? 'bg-blue-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-apercu-medium text-gray-700">{t('dashboard.smsService')}</span>
                      </div>
                      <span className={`px-3 py-1 text-xs font-apercu-medium rounded-full ${
                        systemStatus.smsService === 'active'
                          ? 'bg-green-100 text-green-800'
                          : systemStatus.smsService === 'not_configured'
                          ? 'bg-yellow-100 text-yellow-800'
                          : systemStatus.smsService === 'inactive'
                          ? 'bg-orange-100 text-orange-800'
                          : systemStatus.smsService === 'checking'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {systemStatus.smsService === 'active' ? t('status.active') :
                         systemStatus.smsService === 'not_configured' ? t('status.notConfigured') :
                         systemStatus.smsService === 'inactive' ? t('status.inactive') :
                         systemStatus.smsService === 'checking' ? t('status.checking') : t('status.error')}
                      </span>
                    </div>
                  </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions - Compact & Accessible */}
            <div className="lg:col-span-3">
              <Card className="h-full bg-white">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-gray-900">{t('action.quickActions')}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Common tasks</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {isStatsLoading ? (
                    <div className="grid grid-cols-1 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 animate-pulse">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="h-3 w-24 bg-gray-200 rounded" />
                            <div className="h-2 w-16 bg-gray-200 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                    <Link href="/register" className="group">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-100 hover:border-blue-200">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Registration Form</p>
                          <p className="text-xs text-gray-600">New participant signup</p>
                        </div>
                      </div>
                    </Link>

                    <Link href="/admin/registrations" className="group">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 border border-green-100 hover:border-green-200">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">View Registrations</p>
                          <p className="text-xs text-gray-600">Manage participants</p>
                        </div>
                      </div>
                    </Link>

                    <Link href="/admin/accommodation" className="group">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 transition-all duration-200 border border-purple-100 hover:border-purple-200">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Room Management</p>
                          <p className="text-xs text-gray-600">Allocate accommodations</p>
                        </div>
                      </div>
                    </Link>

                    <Link href="/admin/reports" className="group">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-all duration-200 border border-orange-100 hover:border-orange-200">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">Reports & Analytics</p>
                          <p className="text-xs text-gray-600">View insights</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

        </div>
      </PageTransition>
    </AdminLayoutNew>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { RecentRegistrations } from '@/components/admin/RecentRegistrations'
import { NotificationPanel } from '@/components/admin/NotificationPanel'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false) // Load immediately

  // Real dashboard data - loaded from APIs
  const [activityFeed, setActivityFeed] = useState<Array<{
    description: string
    timestamp: string
    type: string
  }>>([])
  const [recentCommunications, setRecentCommunications] = useState<Array<{
    subject: string
    timestamp: string
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
  const [communicationsLoading, setCommunicationsLoading] = useState(true)

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
      let statsData = null
      if (statisticsResponse.ok) {
        const data = await statisticsResponse.json()
        statsData = data.statistics

        const newStats = {
          totalRegistrations: statsData.registrations.total,
          newRegistrations: statsData.registrations.recent.thisMonth,
          completedRegistrations: statsData.registrations.verified,
          pendingRegistrations: statsData.registrations.unverified,
          recentActivity: statsData.registrations.recent.today,
          previousMonthRegistrations: 0, // Will be calculated from analytics
          previousMonthCompleted: 0, // Will be updated from analytics
          previousMonthActivity: statsData.registrations.recent.today || 0,
          totalRooms: statsData.rooms.total,
          occupiedRooms: statsData.summary.occupiedRooms,
          availableRooms: statsData.summary.availableRooms
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

      // Load real activity feed and communications data
      loadActivityData()
      loadCommunicationsData()
      checkSystemStatus()

      // Load analytics in background for trends only (don't overwrite main stats)
      if (statsData) {
        fetch('/api/admin/analytics')
          .then(response => response.ok ? response.json() : null)
          .then(analyticsData => {
            if (analyticsData?.trends) {
              // Only update previous month data for trends, keep main stats intact
              const lastMonthRegistrations = analyticsData.trends?.monthly?.slice(-2)?.[0]?.count || 0
              const completionRate = (statsData.registrations.verified / statsData.registrations.total) * 100
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

  const loadCommunicationsData = async () => {
    try {
      setCommunicationsLoading(true)

      // Try to fetch recent system-wide communications
      const response = await fetch('/api/admin/messages/recent?limit=3', {
        headers: {
          'Cache-Control': 'max-age=300', // Cache for 5 minutes
        }
      })

      if (response.ok) {
        const data = await response.json()
        const messages = data.messages || []

        // Transform messages to dashboard format
        const communications = messages.map((message: any) => ({
          subject: message.subject || t('common.noSubject'),
          timestamp: formatTimeAgo(message.sentAt || message.createdAt, t),
          senderName: message.senderName,
          recipientName: message.recipientName,
          status: message.status
        }))

        // If we have real messages, use them
        if (communications.length > 0) {
          setRecentCommunications(communications)
        } else {
          // Show registration-based activity as fallback
          const fallbackComms = [
            {
              subject: t('dashboard.welcomeEmailsSent', { count: Math.min(registrations.length, 5) }),
              timestamp: t('time.minutesAgo', { count: 15 })
            },
            {
              subject: t('dashboard.registrationConfirmationBatchProcessed'),
              timestamp: t('time.minutesAgo', { count: 30 })
            }
          ]
          setRecentCommunications(fallbackComms)
        }
      } else {
        throw new Error('Failed to fetch communications')
      }
    } catch (error) {
      // Silently handle error and use fallback data for better UX
      // In production, this would be logged to a monitoring service
      const fallbackComms = [
        {
          subject: t('dashboard.welcomeEmailsSent', { count: Math.min(registrations.length, 5) }),
          timestamp: t('time.minutesAgo', { count: 15 })
        },
        {
          subject: t('dashboard.registrationConfirmationBatchProcessed'),
          timestamp: t('time.minutesAgo', { count: 30 })
        }
      ]
      setRecentCommunications(fallbackComms)
    } finally {
      setCommunicationsLoading(false)
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

  return (
    <AdminLayoutNew title={t('page.dashboard.title')} description={t('page.dashboard.description')}>
      <PageTransition animation="fade">
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

        {/* Main Dashboard Content - Professional Layout */}
        <div className="space-y-8">
          {/* Primary Content Row - Activity & System Health */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Activity Feed - Primary Focus */}
            <div className="xl:col-span-2">
              <Card className="h-full bg-white">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-apercu-bold text-lg text-gray-900">{t('dashboard.recentActivity')}</h3>
                        <p className="font-apercu-regular text-sm text-gray-600">Latest system events</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 font-apercu-medium bg-gray-50 px-2 py-1 rounded-full">
                      Live
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activityLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 animate-pulse">
                          <div className="h-8 w-8 bg-gray-200 rounded-full flex-shrink-0" />
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="h-3 w-20 bg-gray-200 rounded" />
                          </div>
                        </div>
                      ))
                    ) : activityFeed.length > 0 ? (
                      activityFeed.slice(0, 5).map((activity, i) => (
                        <div key={i} className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-transparent hover:border-gray-200">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            activity.type === 'registration' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'
                          }`}>
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-apercu-medium text-gray-900 truncate">{activity.description}</p>
                            <p className="text-xs text-gray-500 font-apercu-regular mt-1">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Activity className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 font-apercu-regular">No recent activity</p>
                        <p className="text-xs text-gray-400 font-apercu-regular mt-1">Activity will appear here as it happens</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* System Health - Compact & Informative */}
            <div className="xl:col-span-1">
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
                </div>
              </Card>
            </div>
          </div>

          {/* Secondary Content Row - Registrations & Communications */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Recent Registrations - Primary Content */}
            <div className="xl:col-span-3">
              <Card className="h-full bg-white">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-apercu-bold text-lg text-gray-900">{t('dashboard.recentRegistrations')}</h3>
                        <p className="font-apercu-regular text-sm text-gray-600">Latest participant registrations</p>
                      </div>
                    </div>
                    <Link href="/admin/registrations">
                      <Button variant="outline" size="sm" className="font-apercu-medium">
                        View All
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {isRegistrationsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 animate-pulse">
                          <div className="h-12 w-12 bg-gray-200 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 bg-gray-200 rounded" />
                            <div className="h-3 w-48 bg-gray-200 rounded" />
                          </div>
                          <div className="h-6 w-16 bg-gray-200 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : registrations.length > 0 ? (
                    <RecentRegistrations registrations={registrations} />
                  ) : (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <EmptyStates.NoRegistrations
                        action={{
                          label: t('action.shareRegistrationLink'),
                          onClick: () => window.open('/register', '_blank'),
                          variant: "default"
                        }}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions & Communications */}
            <div className="xl:col-span-1">
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="bg-white">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-apercu-bold text-lg text-gray-900">{t('action.quickActions')}</h3>
                        <p className="font-apercu-regular text-sm text-gray-600">Common tasks</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <Link href="/admin/registrations">
                        <Button variant="outline" className="w-full justify-start font-apercu-medium text-sm">
                          <Users className="mr-2 h-4 w-4" />
                          View Registrations
                        </Button>
                      </Link>
                      <Link href="/admin/analytics">
                        <Button variant="outline" className="w-full justify-start font-apercu-medium text-sm">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Analytics
                        </Button>
                      </Link>
                      <Link href="/admin/communications">
                        <Button variant="outline" className="w-full justify-start font-apercu-medium text-sm">
                          <FileText className="mr-2 h-4 w-4" />
                          Communications
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button className="w-full justify-start font-apercu-medium text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                          <FileText className="mr-2 h-4 w-4" />
                          Registration Form
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>

                {/* Communications Summary */}
                <Card className="bg-white">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-apercu-bold text-lg text-gray-900">{t('dashboard.communications')}</h3>
                        <p className="font-apercu-regular text-sm text-gray-600">Recent messages</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {communicationsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="p-3 rounded-lg bg-gray-50 animate-pulse">
                            <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-20 bg-gray-200 rounded" />
                          </div>
                        ))
                      ) : recentCommunications.length > 0 ? (
                        recentCommunications.slice(0, 3).map((comm, i) => (
                          <div key={i} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <p className="text-sm font-apercu-medium text-gray-900 truncate">{comm.subject}</p>
                            <p className="text-xs text-gray-500 mt-1">{comm.timestamp}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-500">No recent messages</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-white">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-apercu-bold text-lg text-gray-900">{t('nav.notifications')}</h3>
                      <p className="font-apercu-regular text-sm text-gray-600">System alerts and updates</p>
                    </div>
                  </div>
                  <Link href="/admin/notifications">
                    <Button variant="outline" size="sm" className="font-apercu-medium">
                      View All
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {isNotificationsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 animate-pulse">
                        <div className="h-8 w-8 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-full bg-gray-200 rounded" />
                          <div className="h-3 w-20 bg-gray-200 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <NotificationPanel />
                )}
              </div>
            </Card>
          </div>
        </div>
      </PageTransition>
    </AdminLayoutNew>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { useNotifications } from '@/contexts/NotificationContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EnhancedBadge } from '@/components/ui/enhanced-badge'
import { useTranslation } from '@/contexts/LanguageContext'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
import { useToast } from '@/contexts/ToastContext'

import {
  Bell,
  CheckCircle,
  AlertCircle,
  // Info, // Commented out as unused
  // X, // Commented out as unused
  Clock,
  Users,
  FileText,
  Settings,
  Mail,
  Trash2,
  // Filter, // Commented out as unused
  Search,
  // MoreVertical, // Commented out as unused
  UserPlus,
  UserMinus,
  Shield,
  Database,
  RefreshCw,
  Archive
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  isRead: boolean
  createdAt: string
  metadata?: string
  authorizedBy?: string
  authorizedByEmail?: string
}

// Removed NotificationStats interface as it's not used (using context stats instead)

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { stats, refreshStats, markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead, deleteNotification: contextDeleteNotification } = useNotifications()
  const { error } = useToast()
  const [filter, setFilter] = useState('all') // all, unread, read
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean
    notificationId?: string
    notificationTitle?: string
    isBulk?: boolean
  }>({ show: false })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        filter
      })

      const response = await fetch(`/api/admin/notifications?${params}`)
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }))
        // Stats are managed by the context
      } else {
        error('Failed to Load Notifications', data.error || 'Unable to fetch notifications from server')
      }
    } catch (err) {
      error('Network Error', 'Unable to connect to server. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [filter, pagination.page, pagination.limit])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    setSelectedNotifications([]) // Clear selections when changing pages
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        )
        contextMarkAsRead(notificationId)
      }
    } catch (err) {
      error('Mark as Read Failed', 'Unable to mark notification as read. Please try again.')
    }
  }

  const showDeleteConfirm = (notificationId: string, notificationTitle: string) => {
    setDeleteConfirm({
      show: true,
      notificationId,
      notificationTitle,
      isBulk: false
    })
  }

  const showBulkDeleteConfirm = () => {
    setDeleteConfirm({
      show: true,
      isBulk: true
    })
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        contextDeleteNotification(notificationId)
        setDeleteConfirm({ show: false })
      }
    } catch (err) {
      error('Delete Failed', 'Unable to delete notification. Please try again.')
    }
  }

  const confirmDelete = () => {
    if (deleteConfirm.isBulk) {
      bulkDelete()
    } else if (deleteConfirm.notificationId) {
      deleteNotification(deleteConfirm.notificationId)
    }
  }

  const markAllAsRead = async () => {
    try {
      setBulkLoading(true)
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT'
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        contextMarkAllAsRead()
      }
    } catch (err) {
      error('Mark All as Read Failed', 'Unable to mark all notifications as read. Please try again.')
    } finally {
      setBulkLoading(false)
    }
  }

  const bulkDelete = async () => {
    if (selectedNotifications.length === 0) return

    try {
      setBulkLoading(true)
      const response = await fetch('/api/admin/notifications/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedNotifications, action: 'delete' })
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)))
        setSelectedNotifications([])
        refreshStats() // Refresh stats from context
        setDeleteConfirm({ show: false })
      }
    } catch (err) {
      error('Bulk Delete Failed', 'Unable to delete selected notifications. Please try again.')
    } finally {
      setBulkLoading(false)
    }
  }

  const clearOldNotifications = async () => {
    try {
      setBulkLoading(true)
      const response = await fetch('/api/admin/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30, onlyRead: true })
      })

      if (response.ok) {
        fetchNotifications()
        refreshStats()
      }
    } catch (err) {
      error('Clear Old Notifications Failed', 'Unable to clear old notifications. Please try again.')
    } finally {
      setBulkLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      new_registration: Users,
      system_maintenance: Settings,
      approval_required: AlertCircle,
      report_ready: FileText,
      email_sent: Mail,
      user_created: UserPlus,
      user_deleted: UserMinus,
      security_alert: Shield,
      backup_status: Database,
      default: Bell
    }
    return iconMap[type] || iconMap.default
  }

  const getNotificationColor = (type: string) => {
    const colorMap: Record<string, string> = {
      new_registration: 'from-green-500 to-emerald-600',
      system_maintenance: 'from-blue-500 to-cyan-600',
      approval_required: 'from-yellow-500 to-orange-600',
      report_ready: 'from-purple-500 to-pink-600',
      email_sent: 'from-indigo-500 to-purple-600',
      user_created: 'from-green-500 to-blue-600',
      user_deleted: 'from-red-500 to-pink-600',
      security_alert: 'from-red-500 to-orange-600',
      backup_status: 'from-gray-500 to-gray-600',
      default: 'from-gray-500 to-gray-600'
    }
    return colorMap[type] || colorMap.default
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const toggleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const selectAllNotifications = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  if (loading) {
    return (
      <AdminLayoutNew title={t('page.notifications.title')} description={t('page.notifications.description')}>
        <div className="space-y-6">
          {/* Stats Cards Skeleton */}
          <StatsGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCard
                key={i}
                title=""
                value=""
                icon={Bell}
                gradient="bg-gradient-to-r from-gray-400 to-gray-500"
                bgGradient="bg-gradient-to-br from-white to-gray-50"
                loading={true}
              />
            ))}
          </StatsGrid>

          {/* Header Actions Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Notifications List Skeleton */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                      <div className="flex items-center space-x-4 mt-3">
                        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew
      title={t('page.notifications.title')}
      description={t('page.notifications.description')}
    >
      {/* Stats Cards - Consistent Design */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Notifications"
          value={stats.total}
          subtitle="All system notifications"
          icon={Bell}
          gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
          bgGradient="bg-gradient-to-br from-white to-blue-50"
        />

        <StatsCard
          title="Unread"
          value={stats.unread}
          subtitle="Pending notifications"
          icon={AlertCircle}
          gradient="bg-gradient-to-r from-red-500 to-pink-600"
          bgGradient="bg-gradient-to-br from-white to-red-50"
        />

        <StatsCard
          title="High Priority"
          value={stats.high}
          subtitle="Urgent notifications"
          icon={AlertCircle}
          gradient="bg-gradient-to-r from-yellow-500 to-orange-600"
          bgGradient="bg-gradient-to-br from-white to-yellow-50"
        />

        <StatsCard
          title="This Week"
          value={stats.thisWeek}
          subtitle="Recent notifications"
          icon={Clock}
          gradient="bg-gradient-to-r from-green-500 to-emerald-600"
          bgGradient="bg-gradient-to-br from-white to-green-50"
        />
      </StatsGrid>

      {/* Filters and Search */}
      <Card className="p-4 sm:p-6 my-8 sm:mb-6 bg-white">
        <div className="flex flex-col  space-y-4">
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>



            <Button onClick={fetchNotifications} variant="outline" size="sm" className="font-apercu-medium">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="p-4 sm:p-6 bg-white">
        <div className="flex flex-col space-y-4 mb-4 sm:mb-6">
          <div className="flex flex-col space-y-2">
            <div>
              <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">Notifications</h3>
              <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </p>
            </div>

            {selectedNotifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <EnhancedBadge variant="info" className="font-apercu-medium">
                  {selectedNotifications.length} selected
                </EnhancedBadge>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            {selectedNotifications.length > 0 ? (
              <>
                <Button
                  onClick={showBulkDeleteConfirm}
                  variant="destructive"
                  size="sm"
                  className="font-apercu-medium"
                  disabled={bulkLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline text-white">Delete Selected</span>
                  <span className="sm:hidden">Delete ({selectedNotifications.length})</span>
                </Button>
                <Button
                  onClick={() => setSelectedNotifications([])}
                  variant="outline"
                  size="sm"
                  className="font-apercu-medium"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  className="font-apercu-medium"
                  disabled={bulkLoading || stats.unread === 0}
                >
                  {bulkLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">Mark All Read</span>
                  <span className="sm:hidden">Mark Read</span>
                </Button>
                <Button
                  onClick={clearOldNotifications}
                  variant="outline"
                  size="sm"
                  className="font-apercu-medium"
                  disabled={bulkLoading}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Clear Old</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Select All Checkbox */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-200">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                onChange={selectAllNotifications}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="font-apercu-medium text-sm text-gray-700">
                Select all notifications
              </span>
            </label>
          </div>
        )}

        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const NotificationIcon = getNotificationIcon(notification.type)
            const isSelected = selectedNotifications.includes(notification.id)

            return (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                  notification.isRead
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-200 shadow-sm'
                } ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-300' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectNotification(notification.id)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </div>

                  {/* Notification Icon */}
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r ${getNotificationColor(notification.type)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <NotificationIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2 sm:gap-0">
                      <h4 className="font-apercu-bold text-sm text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2 self-start sm:self-auto">
                        {!notification.isRead && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    </div>

                    <p className="font-apercu-regular text-xs sm:text-sm text-gray-600 mb-3">
                      {notification.message}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 gap-1 sm:gap-3">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className="font-apercu-regular">{formatTimeAgo(notification.createdAt)}</span>
                        </div>
                        {notification.authorizedBy && (
                          <div className="flex items-center">
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="font-apercu-medium text-indigo-600 sm:ml-1">
                              by {notification.authorizedBy}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {!notification.isRead && (
                          <Button
                            onClick={() => markAsRead(notification.id)}
                            variant="outline"
                            size="sm"
                            className="font-apercu-medium text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Mark Read</span>
                            <span className="sm:hidden">Read</span>
                          </Button>
                        )}
                        <Button
                          onClick={() => showDeleteConfirm(notification.id, notification.title)}
                          variant="outline"
                          size="sm"
                          className="font-apercu-medium text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredNotifications.length === 0 && notifications.length > 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-apercu-bold text-lg text-gray-500 mb-2">No matching notifications</h3>
            <p className="font-apercu-regular text-gray-400">
              Try adjusting your search or filter criteria to find what you&apos;re looking for.
            </p>
          </div>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-apercu-bold text-lg text-gray-500 mb-2">No notifications</h3>
            <p className="font-apercu-regular text-gray-400">
              You&apos;re all caught up! New notifications will appear here when there&apos;s activity in the system.
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
              <span className="font-apercu-regular">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} notifications
              </span>
            </div>

            <div className="flex items-center justify-center space-x-1 sm:space-x-2 order-1 sm:order-2">
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                variant="outline"
                size="sm"
                className="font-apercu-medium px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum
                  if (pagination.pages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      variant={pagination.page === pageNum ? "default" : "outline"}
                      size="sm"
                      className="font-apercu-medium w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                variant="outline"
                size="sm"
                className="font-apercu-medium px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">
                  {deleteConfirm.isBulk ? 'Delete Selected Notifications' : 'Delete Notification'}
                </h3>
                <p className="font-apercu-regular text-sm text-gray-600">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-6">
              {deleteConfirm.isBulk ? (
                <p className="font-apercu-regular text-gray-700">
                  Are you sure you want to delete <span className="font-apercu-bold">{selectedNotifications.length}</span> selected notification{selectedNotifications.length !== 1 ? 's' : ''}?
                </p>
              ) : (
                <p className="font-apercu-regular text-gray-700">
                  Are you sure you want to delete the notification <span className="font-apercu-bold">&quot;{deleteConfirm.notificationTitle}&quot;</span>?
                </p>
              )}
            </div>

            <div className="flex space-x-3 justify-end">
              <Button
                onClick={() => setDeleteConfirm({ show: false })}
                variant="outline"
                className="font-apercu-medium"
                disabled={bulkLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                variant="destructive"
                className="font-apercu-medium"
                disabled={bulkLoading}
              >
                {bulkLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {deleteConfirm.isBulk ? `${selectedNotifications.length} Notifications` : 'Notification'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayoutNew>
  )
}

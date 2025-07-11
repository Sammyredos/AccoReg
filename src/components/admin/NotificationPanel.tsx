'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationSkeleton } from '@/components/ui/skeleton'
import { Bell, User, Clock, Mail, Phone, RefreshCw } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  details: {
    participantName: string
    participantEmail: string
    participantPhone: string
    parentGuardian: string
    registrationDate: string
  }
  timestamp: string
  read: boolean
  icon: string
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications/recent')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
  }

  useEffect(() => {
    fetchNotifications()

    // Auto-refresh every 2 minutes for better performance
    const interval = setInterval(fetchNotifications, 120000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <Card className="p-6">
        <NotificationSkeleton />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-apercu-bold text-lg text-gray-900">Recent Notifications</h3>
            <p className="font-apercu-regular text-sm text-gray-600">Latest registration activities</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="font-apercu-medium"
        >
          {refreshing ? (
            <div className="w-4 h-4 mr-2 bg-gray-300 rounded animate-pulse" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="font-apercu-medium text-gray-500">No recent notifications</p>
          <p className="font-apercu-regular text-sm text-gray-400">New registrations will appear here</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-lg">{notification.icon}</span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-apercu-bold text-sm text-gray-900">
                    {notification.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="font-apercu-medium text-xs">
                      New
                    </Badge>
                    <span className="font-apercu-regular text-xs text-gray-500">
                      {formatTimeAgo(notification.timestamp)}
                    </span>
                  </div>
                </div>
                
                <p className="font-apercu-regular text-sm text-gray-700 mb-3">
                  {notification.message}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center text-gray-600">
                    <User className="h-3 w-3 mr-1" />
                    <span className="font-apercu-medium">{notification.details.participantName}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-3 w-3 mr-1" />
                    <span className="font-apercu-regular">{notification.details.participantEmail}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-3 w-3 mr-1" />
                    <span className="font-apercu-regular">{notification.details.participantPhone}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    <span className="font-apercu-regular">
                      {new Date(notification.details.registrationDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

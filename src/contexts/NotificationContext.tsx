'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser } from '@/contexts/UserContext'

interface NotificationStats {
  total: number
  unread: number
  high: number
  thisWeek: number
  recent: number
}

interface NotificationContextType {
  stats: NotificationStats
  refreshStats: () => Promise<void>
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  deleteNotification: (notificationId: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    high: 0,
    thisWeek: 0,
    recent: 0
  })
  const { currentUser } = useUser()

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/notifications?limit=1')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || { total: 0, unread: 0, high: 0, thisWeek: 0, recent: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch notification stats:', error)
    }
  }

  const refreshStats = async () => {
    await fetchStats()
  }

  const markAsRead = (notificationId: string) => {
    setStats(prev => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1)
    }))
  }

  const markAllAsRead = () => {
    setStats(prev => ({
      ...prev,
      unread: 0
    }))
  }

  const deleteNotification = (notificationId: string) => {
    setStats(prev => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
      recent: Math.max(0, prev.recent - 1)
    }))
  }

  useEffect(() => {
    if (currentUser) {
      fetchStats()

      // Reduce polling frequency to 2 minutes for better performance
      const interval = setInterval(fetchStats, 120000)

      return () => clearInterval(interval)
    }
  }, [currentUser])

  const value: NotificationContextType = {
    stats,
    refreshStats,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

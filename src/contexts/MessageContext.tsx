'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser } from '@/contexts/UserContext'

interface MessageStats {
  total: number
  unread: number
  thisWeek: number
}

interface MessageContextType {
  stats: MessageStats
  refreshStats: () => Promise<void>
  markAsRead: (messageId: string) => void
  deleteMessage: (messageId: string) => void
}

const MessageContext = createContext<MessageContextType | undefined>(undefined)

interface MessageProviderProps {
  children: ReactNode
}

export function MessageProvider({ children }: MessageProviderProps) {
  const [stats, setStats] = useState<MessageStats>({
    total: 0,
    unread: 0,
    thisWeek: 0
  })
  const { currentUser } = useUser()

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/messages/inbox')
      if (response.ok) {
        const data = await response.json()
        const messages = data.messages || []

        // Calculate stats
        const total = messages.length
        const unread = messages.filter((msg: any) => !msg.readAt).length
        const thisWeek = messages.filter((msg: any) => {
          const msgDate = new Date(msg.sentAt)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return msgDate > weekAgo
        }).length

        setStats({ total, unread, thisWeek })
      }
    } catch (error) {
      console.error('Failed to fetch message stats:', error)
    }
  }

  const refreshStats = async () => {
    await fetchStats()
  }

  const markAsRead = (messageId: string) => {
    setStats(prev => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1)
    }))
  }

  const deleteMessage = (messageId: string) => {
    setStats(prev => ({
      ...prev,
      total: Math.max(0, prev.total - 1)
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

  const value: MessageContextType = {
    stats,
    refreshStats,
    markAsRead,
    deleteMessage
  }

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  )
}

export function useMessages() {
  const context = useContext(MessageContext)
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider')
  }
  return context
}

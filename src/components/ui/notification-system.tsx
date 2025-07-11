'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export interface NotificationProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationItemProps extends NotificationProps {
  onRemove: (id: string) => void
}

function NotificationItem({ id, type, title, message, duration = 5000, action, onRemove }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleRemove()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => onRemove(id), 300)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-white border-l-4 border-green-500 shadow-lg shadow-green-500/10'
      case 'error':
        return 'bg-white border-l-4 border-red-500 shadow-lg shadow-red-500/10'
      case 'warning':
        return 'bg-white border-l-4 border-amber-500 shadow-lg shadow-amber-500/10'
      case 'info':
        return 'bg-white border-l-4 border-blue-500 shadow-lg shadow-blue-500/10'
    }
  }

  return (
    <div
      className={cn(
        'transform transition-all duration-300 ease-in-out mb-3',
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        isLeaving && '-translate-x-full opacity-0'
      )}
    >
      <div className={cn(
        'max-w-sm w-full rounded-lg border border-gray-200 p-4',
        getStyles()
      )}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className="font-apercu-medium text-sm text-gray-900">
              {title}
            </p>
            {message && (
              <p className="font-apercu-regular text-sm text-gray-600 mt-1">
                {message}
              </p>
            )}
            {action && (
              <div className="mt-3">
                <button
                  onClick={action.onClick}
                  className="font-apercu-medium text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleRemove}
              className="inline-flex text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface NotificationSystemProps {
  notifications: NotificationProps[]
  onRemove: (id: string) => void
}

export function NotificationSystem({ notifications, onRemove }: NotificationSystemProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Return cleanup function
    return () => {
      // Cleanup if needed
    }
  }, [])

  if (!mounted || typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      <div className="pointer-events-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            {...notification}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}

// Hook for managing notifications
export function useNotificationSystem() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([])

  const addNotification = (notification: Omit<NotificationProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { ...notification, id }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    // Convenience methods
    success: (title: string, message?: string, options?: Partial<NotificationProps>) =>
      addNotification({ type: 'success', title, message, ...options }),
    error: (title: string, message?: string, options?: Partial<NotificationProps>) =>
      addNotification({ type: 'error', title, message, ...options }),
    warning: (title: string, message?: string, options?: Partial<NotificationProps>) =>
      addNotification({ type: 'warning', title, message, ...options }),
    info: (title: string, message?: string, options?: Partial<NotificationProps>) =>
      addNotification({ type: 'info', title, message, ...options })
  }
}

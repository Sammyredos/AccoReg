'use client'

import { createContext, useContext, ReactNode } from 'react'
import { NotificationSystem, useNotificationSystem, NotificationProps } from '@/components/ui/notification-system'

interface ToastContextType {
  addNotification: (notification: Omit<NotificationProps, 'id'>) => void
  success: (title: string, message?: string, options?: Partial<NotificationProps>) => void
  error: (title: string, message?: string, options?: Partial<NotificationProps>) => void
  warning: (title: string, message?: string, options?: Partial<NotificationProps>) => void
  info: (title: string, message?: string, options?: Partial<NotificationProps>) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const notificationSystem = useNotificationSystem()

  return (
    <ToastContext.Provider value={notificationSystem}>
      {children}
      <NotificationSystem
        notifications={notificationSystem.notifications}
        onRemove={notificationSystem.removeNotification}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

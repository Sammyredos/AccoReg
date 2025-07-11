'use client'

import { ReactNode, useEffect } from 'react'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { MessageProvider } from '@/contexts/MessageContext'
import { UserProvider } from '@/contexts/UserContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { BrandingProvider } from '@/contexts/BrandingContext'
import { PerformanceInitializer } from '@/components/performance/PerformanceInitializer'

interface AdminLayoutProps {
  children: ReactNode
}



export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <BrandingProvider>
      <UserProvider>
        <NotificationProvider>
          <MessageProvider>
            <ToastProvider>
              <PerformanceInitializer enablePreloading={true} enableMonitoring={true} />
              {children}
            </ToastProvider>
          </MessageProvider>
        </NotificationProvider>
      </UserProvider>
    </BrandingProvider>
  )
}

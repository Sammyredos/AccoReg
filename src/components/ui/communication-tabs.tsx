'use client'

import { cn } from '@/lib/utils'
import { Mail, Phone } from 'lucide-react'

interface CommunicationTabsProps {
  activeTab: 'email' | 'sms'
  onTabChangeAction: (tab: 'email' | 'sms') => void
  emailCount?: number
  smsCount?: number
  className?: string
}

export function CommunicationTabs({
  activeTab,
  onTabChangeAction,
  emailCount = 0,
  smsCount = 0,
  className
}: CommunicationTabsProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex bg-gray-100 rounded-2xl p-1.5 shadow-inner">
        {/* Email Tab */}
        <button
          onClick={() => onTabChangeAction('email')}
          className={cn(
            "flex-1 flex items-center justify-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-apercu-medium text-xs sm:text-sm transition-all duration-300 ease-in-out transform",
            activeTab === 'email'
              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 scale-[1.02]"
              : "text-green-600 hover:bg-green-50 hover:text-green-700"
          )}
        >
          <div className={cn(
            "h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0",
            activeTab === 'email'
              ? "bg-white/20 backdrop-blur-sm"
              : "bg-green-100"
          )}>
            <Mail className={cn(
              "h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300",
              activeTab === 'email' ? "text-white" : "text-green-600"
            )} />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className={cn(
              "font-apercu-bold text-xs sm:text-sm truncate",
              activeTab === 'email' ? "text-white" : "text-green-600"
            )}>
              <span className={cn(
                "hidden sm:inline font-apercu-bold",
                activeTab === 'email' ? "text-white" : "text-green-600"
              )}>Email Addresses</span>
              <span className={cn(
                "sm:hidden font-apercu-bold",
                activeTab === 'email' ? "text-white" : "text-green-600"
              )}>Emails</span>
            </span>
            <span className={cn(
              "text-xs font-apercu-regular",
              activeTab === 'email' ? "text-white" : "text-green-500"
            )}>
              {emailCount} email{emailCount !== 1 ? 's' : ''}
            </span>
          </div>
        </button>

        {/* SMS Tab */}
        <button
          onClick={() => onTabChangeAction('sms')}
          className={cn(
            "flex-1 flex items-center justify-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-apercu-medium text-xs sm:text-sm transition-all duration-300 ease-in-out transform",
            activeTab === 'sms'
              ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]"
              : "text-purple-600 hover:bg-purple-50 hover:text-purple-700"
          )}
        >
          <div className={cn(
            "h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0",
            activeTab === 'sms'
              ? "bg-white/20 backdrop-blur-sm"
              : "bg-purple-100"
          )}>
            <Phone className={cn(
              "h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300",
              activeTab === 'sms' ? "text-white" : "text-purple-600"
            )} />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className={cn(
              "font-apercu-bold text-xs sm:text-sm truncate",
              activeTab === 'sms' ? "text-white" : "text-purple-600"
            )}>
              <span className={cn(
                "hidden sm:inline font-apercu-bold",
                activeTab === 'sms' ? "text-white" : "text-purple-600"
              )}>Phone Numbers</span>
              <span className={cn(
                "sm:hidden font-apercu-bold",
                activeTab === 'sms' ? "text-white" : "text-purple-600"
              )}>SMS</span>
            </span>
            <span className={cn(
              "text-xs font-apercu-regular",
              activeTab === 'sms' ? "text-white" : "text-purple-500"
            )}>
              {smsCount} phone{smsCount !== 1 ? 's' : ''}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

interface CommunicationTabContentProps {
  type: 'email' | 'sms'
  children: React.ReactNode
  className?: string
}

export function CommunicationTabContent({ type, children, className }: CommunicationTabContentProps) {
  const gradientClass = type === 'email' 
    ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100" 
    : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100"

  return (
    <div className={cn(
      "p-6 rounded-2xl border-2 shadow-sm transition-all duration-300",
      gradientClass,
      className
    )}>
      {children}
    </div>
  )
}

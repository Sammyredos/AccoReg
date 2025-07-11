'use client'


import { cn } from '@/lib/utils'
import { Users } from 'lucide-react'

interface GenderTabsProps {
  activeTab: 'Male' | 'Female'
  onTabChangeAction: (tab: 'Male' | 'Female') => void
  maleCount?: number
  femaleCount?: number
  maleUnallocated?: number
  femaleUnallocated?: number
  className?: string
}

export function GenderTabs({
  activeTab,
  onTabChangeAction,
  maleCount = 0,
  femaleCount = 0,
  maleUnallocated = 0,
  femaleUnallocated = 0,
  className
}: GenderTabsProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex bg-gray-100 rounded-2xl p-1.5 shadow-inner">
        {/* Male Tab */}
        <button
          onClick={() => onTabChangeAction('Male')}
          className={cn(
            "flex-1 flex items-center text-left justify-center space-x-3 px-4 py-4 rounded-xl font-apercu-medium text-sm transition-all duration-300 ease-in-out transform",
            activeTab === 'Male'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
              : "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300",
            activeTab === 'Male'
              ? "bg-white/20 backdrop-blur-sm"
              : "bg-blue-100"
          )}>
            <Users className={cn(
              "h-4 w-4 transition-all duration-300",
              activeTab === 'Male' ? "text-white" : "text-blue-600"
            )} />
          </div>
          <div className="flex flex-col items-start flex-1">
            <div className="flex items-center space-x-2 w-full">
              <span className={cn(
                "font-apercu-bold",
                activeTab === 'Male' ? "text-white" : "text-blue-600"
              )}>
                Male Rooms
              </span>
              {maleUnallocated > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-apercu-medium",
                  activeTab === 'Male'
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-800"
                )}>
                  {maleUnallocated}
                </span>
              )}
            </div>
            <span className={cn(
              "text-xs font-apercu-regular",
              activeTab === 'Male' ? "text-white" : "text-blue-500"
            )}>
              {maleCount} room{maleCount !== 1 ? 's' : ''}{maleUnallocated > 0 ? ` • ${maleUnallocated} unallocated` : ''}
            </span>
          </div>
        </button>

        {/* Female Tab */}
        <button
          onClick={() => onTabChangeAction('Female')}
          className={cn(
            "flex-1 flex items-center text-left justify-center space-x-3 px-4 py-4 rounded-xl font-apercu-medium text-sm transition-all duration-300 ease-in-out transform",
            activeTab === 'Female'
              ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 scale-[1.02]"
              : "text-pink-600 hover:bg-pink-50 hover:text-pink-700"
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300",
            activeTab === 'Female'
              ? "bg-white/20 backdrop-blur-sm "
              : "text-white bg-pink-100"
          )}>
            <Users className={cn(
              "h-4 w-4 transition-all duration-300",
              activeTab === 'Female' ? "text-white" : "text-pink-600"
            )} />
          </div>
          <div className="flex flex-col items-start flex-1">
            <div className="flex items-center space-x-2 w-full">
              <span className={cn(
                "font-apercu-bold",
                activeTab === 'Female' ? "text-white" : "text-pink-600"
              )}>
                Female Rooms
              </span>
              {femaleUnallocated > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-apercu-medium",
                  activeTab === 'Female'
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-800"
                )}>
                  {femaleUnallocated}
                </span>
              )}
            </div>
            <span className={cn(
              "text-xs font-apercu-regular",
              activeTab === 'Female' ? "text-white" : "text-pink-500"
            )}>
              {femaleCount} room{femaleCount !== 1 ? 's' : ''}{femaleUnallocated > 0 ? ` • ${femaleUnallocated} unallocated` : ''}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

interface GenderTabContentProps {
  gender: 'Male' | 'Female'
  children: React.ReactNode
  className?: string
}

export function GenderTabContent({ gender, children, className }: GenderTabContentProps) {
  const gradientClass = gender === 'Male' 
    ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100" 
    : "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100"

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

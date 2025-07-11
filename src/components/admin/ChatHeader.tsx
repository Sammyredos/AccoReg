'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { memo } from 'react'

interface ChatHeaderProps {
  title: string
  subtitle: string
  isOnline: boolean
  onBack: () => void
}

function ChatHeaderComponent({ title, subtitle, isOnline, onBack }: ChatHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back button for mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="lg:hidden p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Avatar */}
          <div className="relative">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="font-apercu-bold text-white text-sm">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-indigo-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          {/* User info */}
          <div>
            <h3 className="font-apercu-bold text-sm text-gray-900">{title}</h3>
            <p className={`font-apercu-regular text-xs ${
              isOnline ? 'text-indigo-600' : 'text-gray-500'
            }`}>
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export memoized component for better performance
export const ChatHeader = memo(ChatHeaderComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.isOnline === nextProps.isOnline
  )
})

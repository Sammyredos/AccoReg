import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// SVG Illustrations
const EmptyIllustrations = {
  noData: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
      <path d="M70 90 L130 90 M70 110 L110 110 M70 130 L120 130" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="100" cy="100" r="40" fill="none" stroke="#d1d5db" strokeWidth="2" strokeDasharray="5,5"/>
      <text x="100" y="170" textAnchor="middle" className="fill-gray-400 text-sm">No data found</text>
    </svg>
  ),
  
  noUsers: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="80" r="25" fill="#e5e7eb"/>
      <path d="M60 140 Q100 120 140 140 L140 160 L60 160 Z" fill="#e5e7eb"/>
      <circle cx="100" cy="80" r="25" fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="3,3"/>
      <text x="100" y="180" textAnchor="middle" className="fill-gray-400 text-sm">No users yet</text>
    </svg>
  ),
  
  noRegistrations: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="40" width="80" height="100" rx="8" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="70" y="60" width="60" height="4" rx="2" fill="#d1d5db"/>
      <rect x="70" y="75" width="40" height="4" rx="2" fill="#d1d5db"/>
      <rect x="70" y="90" width="50" height="4" rx="2" fill="#d1d5db"/>
      <circle cx="100" cy="115" r="15" fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="2,2"/>
      <text x="100" y="170" textAnchor="middle" className="fill-gray-400 text-sm">No registrations</text>
    </svg>
  ),
  
  noMessages: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="60" width="120" height="80" rx="12" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
      <circle cx="70" cy="90" r="8" fill="#d1d5db"/>
      <rect x="85" y="85" width="60" height="4" rx="2" fill="#d1d5db"/>
      <rect x="85" y="95" width="40" height="4" rx="2" fill="#d1d5db"/>
      <path d="M80 140 L100 125 L120 140" fill="#e5e7eb"/>
      <text x="100" y="170" textAnchor="middle" className="fill-gray-400 text-sm">No messages</text>
    </svg>
  ),
  
  noReports: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="50" width="100" height="120" rx="8" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="60" y="70" width="80" height="40" rx="4" fill="#e5e7eb"/>
      <rect x="70" y="120" width="20" height="30" rx="2" fill="#d1d5db"/>
      <rect x="100" y="130" width="20" height="20" rx="2" fill="#d1d5db"/>
      <rect x="130" y="125" width="20" height="25" rx="2" fill="#d1d5db"/>
      <text x="100" y="190" textAnchor="middle" className="fill-gray-400 text-sm">No reports</text>
    </svg>
  ),
  
  noSettings: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
      <circle cx="100" cy="100" r="15" fill="#d1d5db"/>
      <rect x="95" y="40" width="10" height="20" rx="5" fill="#e5e7eb"/>
      <rect x="95" y="140" width="10" height="20" rx="5" fill="#e5e7eb"/>
      <rect x="40" y="95" width="20" height="10" rx="5" fill="#e5e7eb"/>
      <rect x="140" y="95" width="20" height="10" rx="5" fill="#e5e7eb"/>
      <text x="100" y="180" textAnchor="middle" className="fill-gray-400 text-sm">No settings</text>
    </svg>
  ),
  
  error: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="60" fill="#fef2f2" stroke="#fecaca" strokeWidth="2"/>
      <circle cx="100" cy="100" r="40" fill="#dc2626" fillOpacity="0.1"/>
      <path d="M80 80 L120 120 M120 80 L80 120" stroke="#dc2626" strokeWidth="4" strokeLinecap="round"/>
      <text x="100" y="180" textAnchor="middle" className="fill-red-500 text-sm">Something went wrong</text>
    </svg>
  ),
  
  search: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="90" r="35" fill="none" stroke="#d1d5db" strokeWidth="4"/>
      <path d="M120 120 L140 140" stroke="#d1d5db" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="90" cy="90" r="20" fill="#f3f4f6"/>
      <text x="100" y="170" textAnchor="middle" className="fill-gray-400 text-sm">No results found</text>
    </svg>
  )
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className, 
  size = 'md' 
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  }

  const iconSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center space-y-4',
      sizeClasses[size],
      className
    )}>
      {icon && (
        <div className={cn(
          'text-gray-400 scale-enter',
          iconSizes[size]
        )}>
          {icon}
        </div>
      )}
      
      <div className="space-y-2 page-enter-up">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {description}
        </p>
      </div>
      
      {action && (
        <div className="pt-2 scale-enter">
          <Button
            onClick={action.onClick}
            variant={action.variant || 'default'}
            className="btn-ripple hover-lift"
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}

// Predefined empty states for common scenarios
export const EmptyStates = {
  NoData: ({ action }: { action?: EmptyStateProps['action'] }) => (
    <EmptyState
      icon={EmptyIllustrations.noData}
      title="No data available"
      description="There's no data to display at the moment. Try refreshing the page or check back later."
      action={action}
    />
  ),
  
  NoUsers: ({ action }: { action?: EmptyStateProps['action'] }) => (
    <EmptyState
      icon={EmptyIllustrations.noUsers}
      title="No users found"
      description="No users have been added yet. Start by creating your first user account."
      action={action || {
        label: "Add User",
        onClick: () => {},
        variant: "default"
      }}
    />
  ),
  
  NoRegistrations: ({ action }: { action?: EmptyStateProps['action'] }) => (
    <EmptyState
      icon={EmptyIllustrations.noRegistrations}
      title="No registrations yet"
      description="No one has registered for this event yet. Share the registration link to get started."
      action={action || {
        label: "Share Registration",
        onClick: () => {},
        variant: "default"
      }}
    />
  ),
  
  NoMessages: ({ action }: { action?: EmptyStateProps['action'] }) => (
    <EmptyState
      icon={EmptyIllustrations.noMessages}
      title="No messages"
      description="Your inbox is empty. When you receive messages, they'll appear here."
      action={action}
    />
  ),
  
  NoReports: ({ action }: { action?: EmptyStateProps['action'] }) => (
    <EmptyState
      icon={EmptyIllustrations.noReports}
      title="No reports available"
      description="No reports have been generated yet. Create your first report to see analytics and insights."
      action={action || {
        label: "Generate Report",
        onClick: () => {},
        variant: "default"
      }}
    />
  ),
  
  NoSearchResults: ({ searchTerm, action }: { searchTerm?: string; action?: EmptyStateProps['action'] }) => (
    <EmptyState
      icon={EmptyIllustrations.search}
      title="No results found"
      description={searchTerm 
        ? `No results found for "${searchTerm}". Try adjusting your search terms.`
        : "No results match your search criteria. Try different keywords."
      }
      action={action}
    />
  ),
  
  Error: ({ action }: { action?: EmptyStateProps['action'] }) => (
    <EmptyState
      icon={EmptyIllustrations.error}
      title="Something went wrong"
      description="We encountered an error while loading this content. Please try again."
      action={action || {
        label: "Try Again",
        onClick: () => window.location.reload(),
        variant: "outline"
      }}
    />
  )
}

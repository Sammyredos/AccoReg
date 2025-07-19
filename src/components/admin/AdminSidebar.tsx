'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useBranding } from '@/contexts/BrandingContext'
import { useUser } from '@/contexts/UserContext'
import { useSafeTranslation } from '@/contexts/LanguageContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useMessages } from '@/contexts/MessageContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarLogo } from '@/components/ui/UniversalLogo'
import { redirectAfterLogout } from '@/lib/redirect-utils'


import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  LogOut,
  FileText,
  Bell,
  Mail,
  MessageSquare,
  Home,
  UserCheck,
  Heart
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge: string | null
  requiredRoles: string[]
}

const getNavigation = (t: (key: string) => string): NavigationItem[] => [
  {
    name: t('nav.dashboard'),
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    badge: null,
    requiredRoles: [], // Available to all roles
  },
  {
    name: t('nav.registrations'),
    href: '/admin/registrations',
    icon: Users,
    badge: 'New',
    requiredRoles: [], // Available to all roles
  },
  {
    name: 'Children',
    href: '/admin/children',
    icon: Heart,
    badge: null,
    requiredRoles: [], // Available to all roles
  },
  {
    name: t('nav.attendance'),
    href: '/admin/attendance',
    icon: UserCheck,
    badge: null,
    requiredRoles: ['Super Admin', 'Admin', 'Manager', 'Staff'], // Staff and above can verify attendance
  },
  {
    name: t('nav.accommodations'),
    href: '/admin/accommodations',
    icon: Home,
    badge: null,
    requiredRoles: ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'], // All roles can access
  },
  {
    name: t('nav.communications'),
    href: '/admin/communications',
    icon: Mail,
    badge: null,
    requiredRoles: ['Super Admin', 'Admin', 'Manager', 'Staff'], // Super Admin, Admin, Manager, and Staff
  },

  {
    name: t('nav.inbox'),
    href: '/admin/inbox',
    icon: MessageSquare,
    badge: null,
    requiredRoles: [], // Available to all roles
  },

  {
    name: t('nav.reports'),
    href: '/admin/reports',
    icon: FileText,
    badge: null,
    requiredRoles: [], // Available to all roles including Staff (view only)
  },
  {
    name: t('nav.notifications'),
    href: '/admin/notifications',
    icon: Bell,
    badge: null,
    requiredRoles: [], // Available to all roles
  },
  {
    name: t('nav.userManagement'),
    href: '/admin/users',
    icon: UserPlus,
    badge: null,
    requiredRoles: ['Super Admin', 'Admin', 'Manager'], // Super Admin, Admin, and Manager
  },
  {
    name: t('nav.settings'),
    href: '/admin/settings',
    icon: Settings,
    badge: null,
    requiredRoles: ['Super Admin', 'Admin'], // Only Super Admin and Admin
  },
]

export function AdminSidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { t, isHydrated } = useSafeTranslation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { branding, isLoading } = useBranding()
  const { currentUser, loading: isLoadingUser } = useUser()

  // Use actual notification and message contexts with error handling
  let stats = { total: 0, unread: 0, high: 0, thisWeek: 0, recent: 0 }
  let messageStats = { total: 0, unread: 0, thisWeek: 0 }

  try {
    const notificationContext = useNotifications()
    stats = notificationContext.stats
  } catch (error) {
    // Fallback to default stats if context not available
    console.warn('Notification context not available:', error)
  }

  try {
    const messageContext = useMessages()
    messageStats = messageContext.stats
  } catch (error) {
    // Fallback to default stats if context not available
    console.warn('Message context not available:', error)
  }

  const handleNavigation = (href: string) => {
    // Navigation handling without progress bar
    console.log('Navigating to:', href)
  }

  const handleLogout = async () => {
    if (isLoggingOut) return // Prevent multiple clicks

    try {
      setIsLoggingOut(true)
      console.log('🚪 Starting logout process...')

      // Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      console.log('📡 Logout response status:', response.status)

      // Use the reliable redirect utility
      redirectAfterLogout('/admin/login')

    } catch (error) {
      console.error('Logout failed:', error)
      // Force redirect even on error
      redirectAfterLogout('/admin/login')
    }
  }

  // Memoize filtered navigation to prevent unnecessary re-renders
  const dynamicNavigation = useMemo(() => {
    if (!currentUser || !isHydrated) return []

    const navigation = getNavigation(t)
    const filteredNavigation = navigation.filter(item => {
      // If no required roles specified, show to everyone
      if (item.requiredRoles.length === 0) return true

      // Check if user's role is in the required roles
      const userRole = currentUser.role?.name || ''
      return item.requiredRoles.includes(userRole)
    })

    // Add dynamic badges
    return filteredNavigation.map(item => {
      if (item.href === '/admin/inbox') {
        return {
          ...item,
          badge: messageStats.unread > 0 ? messageStats.unread.toString() : null
        }
      }
      if (item.href === '/admin/notifications') {
        return {
          ...item,
          badge: stats.unread > 0 ? stats.unread.toString() : null
        }
      }
      return item
    })
  }, [currentUser, messageStats.unread, stats.unread, t, isHydrated])

  // Generate user initials
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Remove fallback skeleton - use inline skeletons for better UX

  try {
    return (
    <div className={cn('flex h-full w-64 flex-col bg-white border-r border-gray-200', className)}>
      {/* Logo */}
      <div className="flex h-16 items-center px-4 sm:px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <SidebarLogo
            fallbackText={branding.systemName.charAt(0) || 'M'}
            className="rounded-lg border border-gray-200"
          />
          <div>
            {isLoading ? (
              // Skeleton loader for system name and subtitle
              <>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
              </>
            ) : (
              <>
                <h1 className="font-apercu-bold text-lg text-gray-900">{branding.systemName}</h1>
                <p className="font-apercu-regular text-xs text-gray-500">{t('admin.panel')}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto">
        {isLoadingUser ? (
          // Skeleton loader for navigation
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 px-3 py-2.5">
              <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))
        ) : (
          dynamicNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 text-sm font-apercu-medium rounded-lg transition-colors duration-150 hover:scale-[1.02] active:scale-[0.98] no-underline hover:no-underline',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={cn(
                    'h-5 w-5 transition-colors duration-150',
                    isActive ? 'text-indigo-600' : 'text-gray-400'
                  )} />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={item.badge === 'New' ? 'success' : 'info'}
                    className="h-5 px-2 text-xs font-apercu-medium flex-shrink-0 ml-2"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })
        )}
      </nav>

      <div className="px-3 sm:px-4">
        <Separator />
      </div>

      {/* User section */}
      <div className="p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          {isLoadingUser ? (
            // Skeleton loader for user avatar
            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          ) : (
            <div className="h-10 w-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-apercu-bold text-sm">
                {currentUser ? getUserInitials(currentUser.name) : 'U'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isLoadingUser ? (
              // Skeleton loader for user info
              <>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              </>
            ) : (
              <>
                <p className="font-apercu-medium text-sm text-gray-900 truncate">
                  {currentUser?.name || 'Unknown User'}
                </p>
                <p className="font-apercu-regular text-xs text-gray-500 truncate">
                  {currentUser?.email || 'No email'}
                </p>
                {currentUser?.role && (
                  <p className="font-apercu-regular text-xs text-indigo-600 truncate">
                    {currentUser.role.name}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {isLoadingUser ? (
          // Skeleton loader for logout button
          <div className="h-8 sm:h-9 w-full bg-gray-200 rounded animate-pulse" />
        ) : (
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="outline"
            size="sm"
            className="w-full h-8 sm:h-9 font-apercu-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
          >
            {isLoggingOut ? (
              <>
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Signing Out...</span>
                <span className="sm:hidden">Signing Out</span>
              </>
            ) : (
              <>
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.signOut')}</span>
                <span className="sm:hidden">Sign Out</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
    )
  } catch (error) {
    console.error('AdminSidebar render error:', error)
    return (
      <div className={cn('flex h-full w-64 flex-col bg-white border-r border-gray-200', className)}>
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-apercu-bold text-lg text-gray-900">Mopgomglobal</h1>
              <p className="font-apercu-regular text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Loading sidebar...</p>
        </div>
      </div>
    )
  }
}

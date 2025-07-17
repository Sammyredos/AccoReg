'use client'

import { ReactNode, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
// AdminHeader component removed - using simplified layout
import { useRoutePrefetch } from '@/hooks/useRoutePrefetch'
import { pagePreloader } from '@/lib/page-preloader'

interface AdminLayoutOptimizedProps {
  children: ReactNode
  title?: string
  description?: string
}

export function AdminLayoutOptimized({ 
  children, 
  title, 
  description 
}: AdminLayoutOptimizedProps) {
  const { setupHoverPrefetch, observeElement } = useRoutePrefetch()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Setup intelligent prefetching for navigation links
    if (sidebarRef.current) {
      const navLinks = sidebarRef.current.querySelectorAll('a[href^="/admin/"]')
      
      navLinks.forEach((link) => {
        const href = link.getAttribute('href')
        if (href) {
          // Setup hover prefetching with 100ms delay
          const cleanup = setupHoverPrefetch(link as HTMLElement, href, 100)
          
          // Also observe for intersection-based prefetching
          observeElement(link as HTMLElement)
          
          // Store cleanup function for later
          ;(link as any)._prefetchCleanup = cleanup
        }
      })
    }

    // Cleanup on unmount
    return () => {
      if (sidebarRef.current) {
        const navLinks = sidebarRef.current.querySelectorAll('a[href^="/admin/"]')
        navLinks.forEach((link) => {
          const cleanup = (link as any)._prefetchCleanup
          if (cleanup) cleanup()
        })
      }
    }
  }, [setupHoverPrefetch, observeElement])

  useEffect(() => {
    // Preload critical resources on layout mount
    const preloadCritical = async () => {
      try {
        // Preload most likely next pages based on current route
        const currentPath = window.location.pathname
        const likelyNextPages = getLikelyNextPages(currentPath)
        
        // Preload in background with low priority
        likelyNextPages.forEach((page, index) => {
          setTimeout(() => {
            pagePreloader.prefetchRoute(page)
          }, index * 500) // Stagger the requests
        })
      } catch (error) {
        console.warn('Failed to preload critical resources:', error)
      }
    }

    // Use requestIdleCallback for non-critical preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadCritical)
    } else {
      setTimeout(preloadCritical, 1000)
    }

    // Return cleanup function
    return () => {
      // Cleanup any pending operations if needed
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar with prefetch optimization */}
      <div ref={sidebarRef} className="hidden lg:flex lg:flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Simple header replacement */}
        {title && (
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-apercu-bold text-gray-900">{title}</h1>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </header>
        )}
        
        <main 
          ref={contentRef}
          className="flex-1 overflow-y-auto focus:outline-none"
          role="main"
          aria-label={title ? `${title} content` : 'Main content'}
        >
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * Get likely next pages based on current route
 * This implements intelligent prefetching based on common user flows
 */
function getLikelyNextPages(currentPath: string): string[] {
  const navigationPatterns: Record<string, string[]> = {
    '/admin/dashboard': [
      '/admin/registrations',
      '/admin/users', 
      '/admin/accommodations',
      '/admin/communications'
    ],
    '/admin/registrations': [
      '/admin/users',
      '/admin/accommodations', 
      '/admin/communications',
      '/admin/analytics'
    ],
    '/admin/users': [
      '/admin/registrations',
      '/admin/accommodations',
      '/admin/settings',
      '/admin/communications'
    ],
    '/admin/accommodations': [
      '/admin/registrations',
      '/admin/users',
      '/admin/platoons',
      '/admin/reports',
      '/admin/analytics'
    ],
    '/admin/platoons': [
      '/admin/accommodations',
      '/admin/registrations',
      '/admin/users',
      '/admin/analytics'
    ],
    '/admin/communications': [
      '/admin/notifications',
      '/admin/users',
      '/admin/inbox',
      '/admin/settings'
    ],
    '/admin/notifications': [
      '/admin/communications',
      '/admin/settings',
      '/admin/users',
      '/admin/dashboard'
    ],
    '/admin/analytics': [
      '/admin/reports',
      '/admin/dashboard',
      '/admin/registrations',
      '/admin/users'
    ],
    '/admin/reports': [
      '/admin/analytics',
      '/admin/dashboard',
      '/admin/settings',
      '/admin/registrations'
    ],
    '/admin/settings': [
      '/admin/users',
      '/admin/communications',
      '/admin/notifications',
      '/admin/dashboard'
    ],
    '/admin/inbox': [
      '/admin/communications',
      '/admin/notifications',
      '/admin/users',
      '/admin/dashboard'
    ]
  }

  // Return top 3 most likely next pages
  return navigationPatterns[currentPath]?.slice(0, 3) || [
    '/admin/dashboard',
    '/admin/registrations',
    '/admin/users'
  ]
}

/**
 * Enhanced Link component with automatic prefetching
 */
interface OptimizedLinkProps {
  href: string
  children: ReactNode
  className?: string
  prefetch?: boolean
  priority?: 'high' | 'medium' | 'low'
}

export function OptimizedLink({ 
  href, 
  children, 
  className, 
  prefetch = true,
  priority = 'medium'
}: OptimizedLinkProps) {
  const { setupHoverPrefetch } = useRoutePrefetch()
  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (prefetch && linkRef.current && href.startsWith('/admin/')) {
      const cleanup = setupHoverPrefetch(linkRef.current, href, 100)
      return cleanup
    }
  }, [href, prefetch, setupHoverPrefetch])

  const handleClick = (e: React.MouseEvent) => {
    // Preload the target page immediately on click for instant navigation
    if (href.startsWith('/admin/')) {
      pagePreloader.preloadRoute(href)
    }
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      data-prefetch={prefetch}
      data-priority={priority}
    >
      {children}
    </Link>
  )
}

/**
 * Performance monitoring component
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
      // This would integrate with a real performance monitoring service
      console.log('🔍 Performance monitoring active')
    }

    // Monitor page load performance
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            console.log('📊 Page Load Metrics:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              firstPaint: navEntry.responseEnd - navEntry.requestStart
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['navigation'] })
      
      return () => observer.disconnect()
    }
  }, [])

  return null
}

export default AdminLayoutOptimized

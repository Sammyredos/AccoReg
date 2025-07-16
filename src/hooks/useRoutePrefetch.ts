/**
 * Route Prefetching Hook
 * Implements intelligent route prefetching based on user behavior
 * Following international standards for web performance optimization
 */

import { useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { pagePreloader } from '@/lib/page-preloader'

interface PrefetchOptions {
  priority?: 'high' | 'medium' | 'low'
  delay?: number
  onHover?: boolean
  onVisible?: boolean
  preloadData?: boolean
}

interface RouteAnalytics {
  route: string
  visits: number
  lastVisit: number
  avgTimeSpent: number
  exitRate: number
}

class RoutePrefetchManager {
  private analytics = new Map<string, RouteAnalytics>()
  private prefetchQueue = new Set<string>()
  private intersectionObserver?: IntersectionObserver
  private hoverTimeouts = new Map<string, NodeJS.Timeout>()

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.loadAnalytics()
      this.setupIntersectionObserver()
    }
  }

  private loadAnalytics() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('route-analytics')
      if (stored) {
        const data = JSON.parse(stored)
        this.analytics = new Map(Object.entries(data))
      }
    } catch (error) {
      console.warn('Failed to load route analytics:', error)
    }
  }

  private saveAnalytics() {
    if (typeof window === 'undefined') return

    try {
      const data = Object.fromEntries(this.analytics)
      localStorage.setItem('route-analytics', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save route analytics:', error)
    }
  }

  private setupIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            const href = element.getAttribute('href') || element.dataset.href
            if (href && href.startsWith('/admin/')) {
              this.prefetchRoute(href, { priority: 'low' })
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: '50px' }
    )
  }

  public trackRouteVisit(route: string, timeSpent?: number) {
    const existing = this.analytics.get(route) || {
      route,
      visits: 0,
      lastVisit: 0,
      avgTimeSpent: 0,
      exitRate: 0
    }

    existing.visits++
    existing.lastVisit = Date.now()
    
    if (timeSpent) {
      existing.avgTimeSpent = (existing.avgTimeSpent + timeSpent) / 2
    }

    this.analytics.set(route, existing)
    this.saveAnalytics()
  }

  public prefetchRoute(route: string, options: PrefetchOptions = {}) {
    if (this.prefetchQueue.has(route)) return

    const { priority = 'medium', delay = 0 } = options

    const doPrefetch = () => {
      this.prefetchQueue.add(route)
      
      // Use the page preloader for actual prefetching
      if (priority === 'high') {
        pagePreloader.preloadRoute(route)
      } else {
        pagePreloader.prefetchRoute(route)
      }

      // Preload associated data if requested
      if (options.preloadData) {
        this.preloadRouteData(route)
      }
    }

    if (delay > 0) {
      setTimeout(doPrefetch, delay)
    } else {
      doPrefetch()
    }
  }

  private async preloadRouteData(route: string) {
    // Map routes to their critical API endpoints
    const routeDataMap: Record<string, string[]> = {
      '/admin/dashboard': [
        '/api/admin/statistics',
        '/api/registrations?limit=20',
        '/api/admin/notifications/recent?limit=5'
      ],
      '/admin/registrations': [
        '/api/registrations?limit=50'
      ],
      '/admin/users': [
        '/api/admin/users',
        '/api/admin/roles'
      ],
      '/admin/accommodations': [
        '/api/admin/accommodations',
        '/api/admin/rooms'
      ],
      '/admin/communications': [
        '/api/admin/messages',
        '/api/admin/templates'
      ],
      '/admin/notifications': [
        '/api/admin/notifications',
        '/api/admin/notification-templates'
      ],

      '/admin/settings': [
        '/api/admin/settings',
        '/api/admin/system-status'
      ]
    }

    const endpoints = routeDataMap[route]
    if (endpoints) {
      try {
        await Promise.all(
          endpoints.map(endpoint =>
            fetch(endpoint, {
              headers: { 'Cache-Control': 'max-age=300' }
            }).catch(error => 
              console.warn(`Failed to preload ${endpoint}:`, error)
            )
          )
        )
        console.log(`✅ Preloaded data for ${route}`)
      } catch (error) {
        console.warn(`Failed to preload data for ${route}:`, error)
      }
    }
  }

  public observeElement(element: HTMLElement) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element)
    }
  }

  public unobserveElement(element: HTMLElement) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element)
    }
  }

  public setupHoverPrefetch(element: HTMLElement, route: string, delay = 100) {
    const handleMouseEnter = () => {
      const timeout = setTimeout(() => {
        this.prefetchRoute(route, { priority: 'medium', preloadData: true })
      }, delay)
      
      this.hoverTimeouts.set(route, timeout)
    }

    const handleMouseLeave = () => {
      const timeout = this.hoverTimeouts.get(route)
      if (timeout) {
        clearTimeout(timeout)
        this.hoverTimeouts.delete(route)
      }
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      const timeout = this.hoverTimeouts.get(route)
      if (timeout) {
        clearTimeout(timeout)
        this.hoverTimeouts.delete(route)
      }
    }
  }

  public getPopularRoutes(limit = 5): string[] {
    return Array.from(this.analytics.values())
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit)
      .map(item => item.route)
  }

  public predictNextRoute(currentRoute: string): string | null {
    // Simple prediction based on common navigation patterns
    const patterns: Record<string, string[]> = {
      '/admin/dashboard': ['/admin/registrations', '/admin/users', '/admin/accommodations'],
      '/admin/registrations': ['/admin/users', '/admin/accommodations', '/admin/communications'],
      '/admin/users': ['/admin/registrations', '/admin/settings', '/admin/communications'],
      '/admin/accommodations': ['/admin/registrations', '/admin/users', '/admin/reports'],
      '/admin/communications': ['/admin/notifications', '/admin/users', '/admin/settings'],
      '/admin/notifications': ['/admin/communications', '/admin/settings', '/admin/dashboard'],
      '/admin/reports': ['/admin/dashboard', '/admin/settings'],
      '/admin/settings': ['/admin/users', '/admin/communications', '/admin/dashboard']
    }

    const possibleNext = patterns[currentRoute]
    if (possibleNext && possibleNext.length > 0) {
      // Return the most visited route from possible next routes
      const analytics = possibleNext
        .map(route => this.analytics.get(route))
        .filter(Boolean)
        .sort((a, b) => (b?.visits || 0) - (a?.visits || 0))

      return analytics[0]?.route || possibleNext[0]
    }

    return null
  }
}

// Global instance
const routePrefetchManager = new RoutePrefetchManager()

export function useRoutePrefetch() {
  const router = useRouter()
  const pathname = usePathname()
  const visitStartTime = useRef<number>(Date.now())

  // Track route visits
  useEffect(() => {
    visitStartTime.current = Date.now()
    
    return () => {
      const timeSpent = Date.now() - visitStartTime.current
      routePrefetchManager.trackRouteVisit(pathname, timeSpent)
    }
  }, [pathname])

  // Prefetch likely next routes
  useEffect(() => {
    const predictedNext = routePrefetchManager.predictNextRoute(pathname)
    if (predictedNext) {
      routePrefetchManager.prefetchRoute(predictedNext, { 
        priority: 'low', 
        delay: 1000,
        preloadData: true 
      })
    }

    // Prefetch popular routes
    const popularRoutes = routePrefetchManager.getPopularRoutes(3)
    popularRoutes.forEach(route => {
      if (route !== pathname) {
        routePrefetchManager.prefetchRoute(route, { 
          priority: 'low', 
          delay: 2000 
        })
      }
    })
  }, [pathname])

  const prefetchRoute = useCallback((route: string, options?: PrefetchOptions) => {
    routePrefetchManager.prefetchRoute(route, options)
  }, [])

  const observeElement = useCallback((element: HTMLElement) => {
    routePrefetchManager.observeElement(element)
  }, [])

  const setupHoverPrefetch = useCallback((element: HTMLElement, route: string, delay?: number) => {
    return routePrefetchManager.setupHoverPrefetch(element, route, delay)
  }, [])

  return {
    prefetchRoute,
    observeElement,
    setupHoverPrefetch,
    getPopularRoutes: () => routePrefetchManager.getPopularRoutes(),
    predictNextRoute: (route: string) => routePrefetchManager.predictNextRoute(route)
  }
}

export { routePrefetchManager }

/**
 * Page Preloader System
 * Implements international standards for web performance optimization
 * - Resource Hints (W3C Recommendation)
 * - Service Worker API (W3C Recommendation)
 * - Navigation Timing API (W3C Recommendation)
 */

interface PreloadConfig {
  priority: 'high' | 'medium' | 'low'
  prefetch: boolean
  preload: boolean
  cache: boolean
}

interface PageRoute {
  path: string
  component: string
  config: PreloadConfig
}

// Admin routes with preload configuration
const ADMIN_ROUTES: PageRoute[] = [
  {
    path: '/admin/dashboard',
    component: 'dashboard',
    config: { priority: 'high', prefetch: true, preload: true, cache: true }
  },
  {
    path: '/admin/registrations',
    component: 'registrations',
    config: { priority: 'high', prefetch: true, preload: true, cache: true }
  },
  {
    path: '/admin/users',
    component: 'users',
    config: { priority: 'high', prefetch: true, preload: true, cache: true }
  },
  {
    path: '/admin/accommodations',
    component: 'accommodations',
    config: { priority: 'medium', prefetch: true, preload: true, cache: true }
  },
  {
    path: '/admin/communications',
    component: 'communications',
    config: { priority: 'medium', prefetch: true, preload: true, cache: true }
  },
  {
    path: '/admin/notifications',
    component: 'notifications',
    config: { priority: 'medium', prefetch: true, preload: true, cache: true }
  },
  {
    path: '/admin/analytics',
    component: 'analytics',
    config: { priority: 'medium', prefetch: true, preload: false, cache: true }
  },
  {
    path: '/admin/reports',
    component: 'reports',
    config: { priority: 'medium', prefetch: true, preload: false, cache: true }
  },
  {
    path: '/admin/settings',
    component: 'settings',
    config: { priority: 'low', prefetch: true, preload: false, cache: true }
  },
  {
    path: '/admin/inbox',
    component: 'inbox',
    config: { priority: 'low', prefetch: true, preload: false, cache: true }
  }
]

class PagePreloader {
  private preloadedRoutes = new Set<string>()
  private prefetchedRoutes = new Set<string>()
  private isPreloading = false
  private preloadQueue: PageRoute[] = []
  private isInitialized = false

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializePreloader()
    }
  }

  private initializePreloader() {
    if (this.isInitialized) return

    // Wait for DOM to be ready
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupPreloader())
      } else {
        this.setupPreloader()
      }
    }
  }

  private setupPreloader() {
    if (this.isInitialized || typeof window === 'undefined') return

    this.isInitialized = true

    // Register service worker for caching
    this.registerServiceWorker()

    // Setup intersection observer for intelligent prefetching
    this.setupIntersectionObserver()

    // Setup idle callback for background preloading
    this.setupIdlePreloading()
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('🚀 Service Worker registered:', registration.scope)
      } catch (error) {
        console.warn('Service Worker registration failed:', error)
      }
    }
  }

  private setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement
            const href = link.getAttribute('href')
            if (href && href.startsWith('/admin/')) {
              this.prefetchRoute(href)
            }
          }
        })
      }, { threshold: 0.1 })

      // Observe all admin navigation links
      document.querySelectorAll('a[href^="/admin/"]').forEach((link) => {
        observer.observe(link)
      })
    }
  }

  private setupIdlePreloading() {
    if ('requestIdleCallback' in window) {
      const idleCallback = (deadline: IdleDeadline) => {
        while (deadline.timeRemaining() > 0 && this.preloadQueue.length > 0) {
          const route = this.preloadQueue.shift()
          if (route) {
            this.preloadRoute(route.path)
          }
        }
        
        if (this.preloadQueue.length > 0) {
          requestIdleCallback(idleCallback)
        }
      }
      
      requestIdleCallback(idleCallback)
    }
  }

  /**
   * Start preloading all admin pages after successful login
   */
  public async preloadAllPages(): Promise<void> {
    if (typeof window === 'undefined' || this.isPreloading) return

    this.isPreloading = true
    console.log('🚀 Starting comprehensive page preloading...')
    
    try {
      // Sort routes by priority
      const sortedRoutes = [...ADMIN_ROUTES].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.config.priority] - priorityOrder[b.config.priority]
      })

      // Preload high priority routes immediately
      const highPriorityRoutes = sortedRoutes.filter(r => r.config.priority === 'high')
      await Promise.all(highPriorityRoutes.map(route => this.preloadRoute(route.path)))

      // Queue medium and low priority routes for idle preloading
      const otherRoutes = sortedRoutes.filter(r => r.config.priority !== 'high')
      this.preloadQueue.push(...otherRoutes)

      console.log('✅ High priority pages preloaded, queued remaining pages for idle loading')
    } catch (error) {
      console.error('❌ Error during page preloading:', error)
    } finally {
      this.isPreloading = false
    }
  }

  /**
   * Preload a specific route
   */
  public async preloadRoute(path: string): Promise<void> {
    if (typeof window === 'undefined' || this.preloadedRoutes.has(path)) return

    try {
      // Create link element for prefetching (less aggressive than preload)
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = path

      // Add to document head
      document.head.appendChild(link)

      // Mark as preloaded without fetching to avoid interference with Next.js routing
      this.preloadedRoutes.add(path)
      console.log(`✅ Prefetched: ${path}`)
    } catch (error) {
      console.warn(`⚠️ Failed to preload ${path}:`, error)
    }
  }

  /**
   * Prefetch a route (lighter than preload)
   */
  public prefetchRoute(path: string): void {
    if (typeof window === 'undefined' || this.prefetchedRoutes.has(path)) return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = path
    document.head.appendChild(link)
    
    this.prefetchedRoutes.add(path)
    console.log(`🔄 Prefetched: ${path}`)
  }

  /**
   * Preload critical API endpoints
   */
  public async preloadCriticalAPIs(): Promise<void> {
    if (typeof window === 'undefined') return

    const criticalAPIs = [
      '/api/admin/statistics',
      '/api/registrations?limit=20',
      '/api/admin/notifications/recent?limit=5',
      '/api/health/database',
      '/api/health/email',
      '/api/health/sms'
    ]

    try {
      await Promise.all(
        criticalAPIs.map(async (endpoint) => {
          try {
            await fetch(endpoint, {
              headers: { 'Cache-Control': 'max-age=300' }
            })
            console.log(`✅ API preloaded: ${endpoint}`)
          } catch (error) {
            console.warn(`⚠️ Failed to preload API ${endpoint}:`, error)
          }
        })
      )
    } catch (error) {
      console.error('❌ Error preloading critical APIs:', error)
    }
  }

  /**
   * Get preload status
   */
  public getPreloadStatus() {
    return {
      preloadedRoutes: Array.from(this.preloadedRoutes),
      prefetchedRoutes: Array.from(this.prefetchedRoutes),
      isPreloading: this.isPreloading,
      queueLength: this.preloadQueue.length
    }
  }

  /**
   * Clear all preloaded resources
   */
  public clearPreloadCache(): void {
    this.preloadedRoutes.clear()
    this.prefetchedRoutes.clear()
    this.preloadQueue.length = 0

    // Remove preload links from document
    if (typeof document !== 'undefined') {
      document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach(link => {
        if (link.getAttribute('href')?.startsWith('/admin/')) {
          link.remove()
        }
      })
    }
  }
}

// Global instance
export const pagePreloader = new PagePreloader()

// Export for use in components
export { PagePreloader, ADMIN_ROUTES }
export type { PreloadConfig, PageRoute }

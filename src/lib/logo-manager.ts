/**
 * Global Logo Management System
 * Handles logo updates, cache invalidation, and propagation across all components
 */

import { Logger } from '@/lib/logger'

const logger = Logger('LogoManager')

// Global logo state
let globalLogoUrl: string | null = null
let globalLogoTimestamp: number = 0
let logoUpdateListeners: Array<(logoUrl: string | null) => void> = []

export class LogoManager {
  
  /**
   * Update the global logo URL and notify all listeners
   */
  static updateGlobalLogo(logoUrl: string | null, forceUpdate = false) {
    const timestamp = Date.now()
    
    // Only update if the URL actually changed or force update is requested
    if (globalLogoUrl !== logoUrl || forceUpdate) {
      logger.info('Updating global logo', { 
        oldUrl: globalLogoUrl, 
        newUrl: logoUrl,
        forceUpdate 
      })
      
      globalLogoUrl = logoUrl
      globalLogoTimestamp = timestamp
      
      // Clear all caches
      this.clearAllCaches()
      
      // Notify all listeners
      logoUpdateListeners.forEach(listener => {
        try {
          listener(logoUrl)
        } catch (error) {
          logger.error('Error notifying logo listener', error)
        }
      })
      
      // Force browser cache invalidation
      this.invalidateBrowserCaches()
    }
  }
  
  /**
   * Get the current global logo URL with cache-busting
   */
  static getCurrentLogo(): string | null {
    if (!globalLogoUrl) return null
    
    // Add cache-busting parameter
    const separator = globalLogoUrl.includes('?') ? '&' : '?'
    return `${globalLogoUrl}${separator}v=${globalLogoTimestamp}`
  }
  
  /**
   * Subscribe to logo updates
   */
  static subscribe(listener: (logoUrl: string | null) => void): () => void {
    logoUpdateListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = logoUpdateListeners.indexOf(listener)
      if (index > -1) {
        logoUpdateListeners.splice(index, 1)
      }
    }
  }
  
  /**
   * Clear all logo caches
   */
  static clearAllCaches() {
    if (typeof window !== 'undefined') {
      // Clear localStorage caches
      localStorage.removeItem('logo-url')
      localStorage.removeItem('logo-cache-timestamp')
      localStorage.removeItem('logo-api-timestamp')
      localStorage.removeItem('system-logo')
      localStorage.removeItem('branding-cache')
      
      // Clear sessionStorage caches
      sessionStorage.removeItem('logo-url')
      sessionStorage.removeItem('branding-data')
      
      logger.info('Cleared all logo caches')
    }
  }
  
  /**
   * Force browser cache invalidation (with rate limiting)
   */
  static invalidateBrowserCaches() {
    if (typeof window !== 'undefined') {
      // Rate limit cache invalidation to prevent excessive requests
      const lastInvalidation = localStorage.getItem('last-logo-cache-invalidation')
      const now = Date.now()

      if (lastInvalidation && (now - parseInt(lastInvalidation)) < 5000) {
        logger.debug('Skipping cache invalidation due to rate limiting')
        return
      }

      localStorage.setItem('last-logo-cache-invalidation', now.toString())

      // Only invalidate if we have a valid logo URL
      if (globalLogoUrl) {
        // Force reload of all logo images
        const logoImages = document.querySelectorAll('img[src*="logo"], img[src*="branding"]')
        logoImages.forEach((img: any) => {
          if (img.src && img.src.includes(globalLogoUrl.split('/').pop() || '')) {
            const originalSrc = img.src.split('?')[0] // Remove existing cache-busting params
            img.src = `${originalSrc}?v=${Date.now()}`
          }
        })

        // Force reload of favicon only if it's using our logo
        const faviconLinks = document.querySelectorAll('link[rel*="icon"]')
        faviconLinks.forEach((link: any) => {
          if (link.href && link.href.includes('uploads/branding')) {
            const originalHref = link.href.split('?')[0]
            link.href = `${originalHref}?v=${Date.now()}`
          }
        })

        logger.info('Invalidated browser caches for logo elements')
      } else {
        logger.debug('No logo URL available, skipping cache invalidation')
      }
    }
  }
  
  /**
   * Load logo from API and update global state
   */
  static async loadLogoFromAPI(): Promise<string | null> {
    try {
      logger.info('Loading logo from API')
      
      const response = await fetch('/api/system/branding', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const logoUrl = data.logoUrl
        
        logger.info('Logo loaded from API', { logoUrl })
        
        // Update global state
        this.updateGlobalLogo(logoUrl, true)
        
        return logoUrl
      } else {
        logger.error('Failed to load logo from API', { status: response.status })
        return null
      }
    } catch (error) {
      logger.error('Error loading logo from API', error)
      return null
    }
  }
  
  /**
   * Initialize logo manager
   */
  static async initialize() {
    logger.info('Initializing LogoManager')
    
    // Load initial logo
    await this.loadLogoFromAPI()
    
    // Set up periodic refresh (every 5 minutes to reduce API calls)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.loadLogoFromAPI()
      }, 300000) // 5 minutes instead of 30 seconds
    }
  }
  
  /**
   * Force refresh logo from server
   */
  static async forceRefresh() {
    logger.info('Force refreshing logo')
    this.clearAllCaches()
    await this.loadLogoFromAPI()
  }
  
  /**
   * Get logo URL for specific component with cache-busting
   */
  static getLogoForComponent(componentName: string): string | null {
    const logoUrl = this.getCurrentLogo()
    
    if (logoUrl) {
      logger.debug(`Providing logo for component: ${componentName}`, { logoUrl })
    }
    
    return logoUrl
  }
}

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure DOM is ready
  setTimeout(() => {
    LogoManager.initialize()
  }, 100)
}

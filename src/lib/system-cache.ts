/**
 * System Cache Manager
 * Prevents multiple simultaneous API calls and manages caching
 */

interface SystemData {
  systemName: string
  logoUrl: string | null
  timestamp: number
}

class SystemCacheManager {
  private cache: SystemData | null = null
  private loading: Promise<SystemData> | null = null
  private lastFetch: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async getSystemData(): Promise<SystemData> {
    // Return cached data if still valid
    if (this.cache && (Date.now() - this.lastFetch) < this.CACHE_DURATION) {
      return this.cache
    }

    // If already loading, return the existing promise
    if (this.loading) {
      return this.loading
    }

    // Start new fetch
    this.loading = this.fetchSystemData()
    
    try {
      const data = await this.loading
      this.cache = data
      this.lastFetch = Date.now()
      return data
    } finally {
      this.loading = null
    }
  }

  private async fetchSystemData(): Promise<SystemData> {
    try {
      // Try localStorage first
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('system-cache')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed.timestamp && (Date.now() - parsed.timestamp) < this.CACHE_DURATION) {
              return parsed
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }
      }

      const response = await fetch('/api/system/branding', {
        cache: 'force-cache',
        next: { revalidate: 300 }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const systemData: SystemData = {
        systemName: data.systemName || 'Mopgomglobal',
        logoUrl: data.logoUrl || null,
        timestamp: Date.now()
      }

      // Cache in localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('system-cache', JSON.stringify(systemData))
          localStorage.setItem('system-name', systemData.systemName)
        } catch (e) {
          // Storage quota exceeded, ignore
        }
      }

      return systemData
    } catch (error) {
      console.error('Failed to fetch system data:', error)
      
      // Return fallback data
      return {
        systemName: 'Mopgomglobal',
        logoUrl: null,
        timestamp: Date.now()
      }
    }
  }

  // Clear cache (useful for settings updates)
  clearCache(): void {
    this.cache = null
    this.lastFetch = 0
    if (typeof window !== 'undefined') {
      localStorage.removeItem('system-cache')
    }
  }

  // Get cached system name synchronously
  getCachedSystemName(): string {
    if (this.cache) {
      return this.cache.systemName
    }
    
    if (typeof window !== 'undefined') {
      return localStorage.getItem('system-name') || 'Mopgomglobal'
    }
    
    return 'Mopgomglobal'
  }
}

export const systemCache = new SystemCacheManager()

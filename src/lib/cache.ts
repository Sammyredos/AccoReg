// Simple in-memory cache for database queries
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 100 // Maximum number of entries

  set<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear entries matching a pattern
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
export const cache = new SimpleCache()

// Cache key generators
export const cacheKeys = {
  accommodations: () => 'accommodations:all',
  registrations: (limit?: number) => `registrations:${limit || 'all'}`,
  notifications: (userId: string, page?: number, limit?: number) => 
    `notifications:${userId}:${page || 1}:${limit || 20}`,
  messages: (userId: string) => `messages:${userId}`,
  userProfile: (userId: string) => `user:${userId}`,
  settings: () => 'settings:global'
}

// Helper function for cached database queries
export async function withCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlMs = 5 * 60 * 1000
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Execute query and cache result
  const result = await queryFn()
  cache.set(key, result, ttlMs)
  
  return result
}

// Cache invalidation helpers
export const invalidateCache = {
  accommodations: () => {
    cache.clearPattern('accommodations')
    cache.clearPattern('registrations')
  },
  registrations: () => {
    cache.clearPattern('registrations')
    cache.clearPattern('accommodations')
  },
  notifications: (userId?: string) => {
    if (userId) {
      cache.clearPattern(`notifications:${userId}`)
    } else {
      cache.clearPattern('notifications')
    }
  },
  messages: (userId?: string) => {
    if (userId) {
      cache.clearPattern(`messages:${userId}`)
    } else {
      cache.clearPattern('messages')
    }
  },
  user: (userId: string) => {
    cache.delete(cacheKeys.userProfile(userId))
  },
  settings: () => {
    cache.delete(cacheKeys.settings())
  },
  all: () => {
    cache.clear()
  }
}

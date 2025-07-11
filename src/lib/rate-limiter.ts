import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'
import { prisma } from '@/lib/db'

// Redis client for rate limiting (fallback to memory if Redis not available)
let redis: Redis | null = null

// Disable Redis in development and during build to avoid connection issues
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL && !process.env.NEXT_PHASE) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 5000
    })

    // Handle connection errors gracefully
    redis.on('error', (error) => {
      // Silently fall back to memory-based rate limiting
      redis = null
    })
  } catch (error) {
    // Silently use memory-based rate limiting
  }
}

// In-memory store for rate limiting (fallback)
const memoryStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  message?: string
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    }
  }

  async checkLimit(request: NextRequest, identifier?: string): Promise<RateLimitResult> {
    const key = this.generateKey(request, identifier)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      if (redis) {
        return await this.checkRedisLimit(key, now, windowStart)
      } else {
        return await this.checkMemoryLimit(key, now, windowStart)
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      }
    }
  }

  private generateKey(request: NextRequest, identifier?: string): string {
    if (identifier) return `rate_limit:${identifier}`
    
    // Use IP address as default identifier
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const path = new URL(request.url).pathname
    return `rate_limit:${ip}:${path}`
  }

  private async checkRedisLimit(key: string, now: number, windowStart: number): Promise<RateLimitResult> {
    if (!redis) throw new Error('Redis not available')

    const pipeline = redis.pipeline()
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    
    // Set expiration
    pipeline.expire(key, Math.ceil(this.config.windowMs / 1000))
    
    const results = await pipeline.exec()
    const count = results?.[1]?.[1] as number || 0
    
    const resetTime = now + this.config.windowMs
    const remaining = Math.max(0, this.config.maxRequests - count - 1)
    
    return {
      success: count < this.config.maxRequests,
      limit: this.config.maxRequests,
      remaining,
      resetTime,
      message: count >= this.config.maxRequests ? this.config.message : undefined
    }
  }

  private async checkMemoryLimit(key: string, now: number, windowStart: number): Promise<RateLimitResult> {
    // Clean up old entries
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetTime < now) {
        memoryStore.delete(k)
      }
    }

    const current = memoryStore.get(key)
    const resetTime = now + this.config.windowMs
    
    if (!current || current.resetTime < now) {
      // New window
      memoryStore.set(key, { count: 1, resetTime })
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime
      }
    }
    
    // Increment count
    current.count++
    memoryStore.set(key, current)
    
    const remaining = Math.max(0, this.config.maxRequests - current.count)
    
    return {
      success: current.count <= this.config.maxRequests,
      limit: this.config.maxRequests,
      remaining,
      resetTime: current.resetTime,
      message: current.count > this.config.maxRequests ? this.config.message : undefined
    }
  }
}

// Dynamic rate limit configuration from settings
interface DynamicRateLimitConfig {
  apiRequests: { limit: number; window: 'minute' | 'hour' | 'day' }
  registrations: { limit: number; window: 'minute' | 'hour' | 'day' }
  loginAttempts: { limit: number; window: 'minute' | 'hour' | 'day' }
  messaging: { limit: number; window: 'minute' | 'hour' | 'day' }
  enabled: boolean
  whitelistAdminIPs: boolean
  burstAllowance: number
}

// Cache for dynamic configuration
let dynamicConfigCache: DynamicRateLimitConfig | null = null
let dynamicConfigCacheTime = 0
const DYNAMIC_CONFIG_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Load dynamic rate limit configuration from database
async function loadDynamicRateLimitConfig(): Promise<DynamicRateLimitConfig> {
  const now = Date.now()

  // Return cached config if still valid
  if (dynamicConfigCache && (now - dynamicConfigCacheTime) < DYNAMIC_CONFIG_CACHE_DURATION) {
    return dynamicConfigCache
  }

  try {
    const settings = await prisma.setting.findMany({
      where: { category: 'rateLimits' }
    })

    const config: DynamicRateLimitConfig = {
      apiRequests: { limit: 100, window: 'minute' },
      registrations: { limit: 5, window: 'minute' },
      loginAttempts: { limit: 10, window: 'minute' },
      messaging: { limit: 20, window: 'hour' },
      enabled: true,
      whitelistAdminIPs: true,
      burstAllowance: 150
    }

    settings.forEach(setting => {
      try {
        const value = JSON.parse(setting.value)
        switch (setting.key) {
          case 'apiRequests':
            config.apiRequests = value
            break
          case 'registrations':
            config.registrations = value
            break
          case 'loginAttempts':
            config.loginAttempts = value
            break
          case 'messaging':
            config.messaging = value
            break
          case 'enabled':
            config.enabled = Boolean(value)
            break
          case 'whitelistAdminIPs':
            config.whitelistAdminIPs = Boolean(value)
            break
          case 'burstAllowance':
            config.burstAllowance = Number(value)
            break
        }
      } catch (error) {
        console.error(`Error parsing rate limit setting ${setting.key}:`, error)
      }
    })

    // Cache the configuration
    dynamicConfigCache = config
    dynamicConfigCacheTime = now

    return config
  } catch (error) {
    console.error('Error loading dynamic rate limit configuration:', error)
    // Return default configuration on error
    return {
      apiRequests: { limit: 100, window: 'minute' },
      registrations: { limit: 5, window: 'minute' },
      loginAttempts: { limit: 10, window: 'minute' },
      messaging: { limit: 20, window: 'hour' },
      enabled: true,
      whitelistAdminIPs: true,
      burstAllowance: 150
    }
  }
}

// Convert time window to milliseconds
function getWindowMs(window: 'minute' | 'hour' | 'day'): number {
  switch (window) {
    case 'minute': return 60 * 1000
    case 'hour': return 60 * 60 * 1000
    case 'day': return 24 * 60 * 60 * 1000
    default: return 60 * 1000
  }
}

// Create dynamic rate limiter based on settings
export async function createDynamicRateLimiter(type: 'apiRequests' | 'registrations' | 'loginAttempts' | 'messaging'): Promise<RateLimiter> {
  const config = await loadDynamicRateLimitConfig()

  if (!config.enabled) {
    // Return a permissive rate limiter if disabled
    return new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 999999,
      message: 'Rate limiting is disabled'
    })
  }

  const limitConfig = config[type]
  const windowMs = getWindowMs(limitConfig.window)
  const maxRequests = Math.floor(limitConfig.limit * (config.burstAllowance / 100))

  return new RateLimiter({
    windowMs,
    maxRequests,
    message: `Rate limit exceeded for ${type}. Please try again later.`
  })
}

// Predefined rate limiters for different endpoints (legacy - use dynamic ones above)
export const rateLimiters = {
  // Authentication endpoints - stricter limits
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  }),

  // API endpoints - moderate limits
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'API rate limit exceeded. Please slow down your requests.'
  }),

  // File upload endpoints - stricter limits
  upload: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    message: 'Upload rate limit exceeded. Please wait before uploading more files.'
  }),

  // Email endpoints - very strict limits
  email: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 emails per hour
    message: 'Email rate limit exceeded. Please wait before sending more emails.'
  }),

  // Registration endpoints - moderate limits
  registration: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 registrations per minute
    message: 'Registration rate limit exceeded. Please wait before submitting again.'
  })
}

// Middleware function to apply rate limiting
export async function withRateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  identifier?: string
): Promise<NextResponse | null> {
  const result = await limiter.checkLimit(request, identifier)
  
  if (!result.success) {
    return NextResponse.json(
      { 
        error: result.message,
        rateLimitExceeded: true,
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.resetTime
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }

  return null // Continue with request
}

// Helper function to get user-specific rate limiting
export function getUserRateLimitIdentifier(request: NextRequest): string | undefined {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (token) {
      // Extract user ID from token for user-specific rate limiting
      const payload = JSON.parse(atob(token.split('.')[1]))
      return `user:${payload.adminId || payload.userId}`
    }
  } catch (error) {
    // Fallback to IP-based rate limiting
  }
  return undefined
}

// Convenience function for applying dynamic rate limiting
export async function withDynamicRateLimit(
  request: NextRequest,
  type: 'apiRequests' | 'registrations' | 'loginAttempts' | 'messaging',
  identifier?: string
): Promise<NextResponse | null> {
  const limiter = await createDynamicRateLimiter(type)
  return withRateLimit(request, limiter, identifier)
}

// Example usage in API routes:
/*
// For registration endpoints:
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withDynamicRateLimit(request, 'registrations')
  if (rateLimitResponse) return rateLimitResponse

  // Your API logic here
  return NextResponse.json({ success: true })
}

// For login endpoints:
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withDynamicRateLimit(request, 'loginAttempts')
  if (rateLimitResponse) return rateLimitResponse

  // Your authentication logic here
  return NextResponse.json({ success: true })
}

// For general API endpoints:
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withDynamicRateLimit(request, 'apiRequests')
  if (rateLimitResponse) return rateLimitResponse

  // Your API logic here
  return NextResponse.json({ data: [] })
}

// For messaging endpoints:
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withDynamicRateLimit(request, 'messaging')
  if (rateLimitResponse) return rateLimitResponse

  // Your email/SMS logic here
  return NextResponse.json({ sent: true })
}
*/

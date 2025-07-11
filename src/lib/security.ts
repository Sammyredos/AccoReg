import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from './logger'

const logger = createLogger('Security')

export interface SecurityConfig {
  enableCSP: boolean
  enableHSTS: boolean
  enableXFrameOptions: boolean
  enableXContentTypeOptions: boolean
  enableReferrerPolicy: boolean
  enablePermissionsPolicy: boolean
}

export class SecurityHeaders {
  private config: SecurityConfig

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableCSP: process.env.CSP_ENABLED === 'true',
      enableHSTS: process.env.HSTS_ENABLED === 'true',
      enableXFrameOptions: true,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      ...config
    }
  }

  apply(response: NextResponse): NextResponse {
    const headers = response.headers

    // Content Security Policy
    if (this.config.enableCSP) {
      const csp = this.generateCSP()
      headers.set('Content-Security-Policy', csp)
      logger.debug('CSP header applied', { csp })
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS && process.env.NODE_ENV === 'production') {
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }

    // X-Frame-Options
    if (this.config.enableXFrameOptions) {
      headers.set('X-Frame-Options', 'DENY')
    }

    // X-Content-Type-Options
    if (this.config.enableXContentTypeOptions) {
      headers.set('X-Content-Type-Options', 'nosniff')
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      const permissionsPolicy = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'accelerometer=()',
        'gyroscope=()'
      ].join(', ')
      headers.set('Permissions-Policy', permissionsPolicy)
    }

    // Additional security headers
    headers.set('X-DNS-Prefetch-Control', 'off')
    headers.set('X-Download-Options', 'noopen')
    headers.set('X-Permitted-Cross-Domain-Policies', 'none')
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    headers.set('Cross-Origin-Resource-Policy', 'same-origin')

    return response
  }

  private generateCSP(): string {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    const directives = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Next.js in development
        "'unsafe-eval'", // Required for Next.js in development
        'https://vercel.live',
        ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'" // Required for styled-components and CSS-in-JS
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https://res.cloudinary.com', // Cloudinary images
        'https://images.unsplash.com' // If using Unsplash
      ],
      'font-src': [
        "'self'"
      ],
      'connect-src': [
        "'self'",
        'https://api.cloudinary.com',
        ...(isDevelopment ? ['ws://localhost:*', 'wss://localhost:*'] : [])
      ],
      'media-src': ["'self'", 'https://res.cloudinary.com'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    }

    return Object.entries(directives)
      .map(([directive, sources]) => 
        sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
      )
      .join('; ')
  }
}

export class InputSanitizer {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000) // Limit length
  }

  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return ''
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const sanitized = email.trim().toLowerCase()
    
    return emailRegex.test(sanitized) ? sanitized : ''
  }

  static sanitizePhone(phone: string): string {
    if (typeof phone !== 'string') return ''
    
    // Remove all non-digit characters except + and spaces
    return phone.replace(/[^\d+\s-()]/g, '').substring(0, 20)
  }

  static sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') return ''
    
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 255) // Limit length
  }

  static validateFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase()
    return extension ? allowedTypes.includes(extension) : false
  }

  static validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize
  }
}

export class SecurityValidator {
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  static detectSuspiciousActivity(request: NextRequest): boolean {
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    
    // Check for common bot patterns
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i
    ]
    
    const isSuspiciousUserAgent = botPatterns.some(pattern => pattern.test(userAgent))
    
    // Check for suspicious referers
    const suspiciousReferers = [
      'http://localhost',
      'file://',
      'data:',
      'javascript:'
    ]
    
    const isSuspiciousReferer = suspiciousReferers.some(pattern => 
      referer.startsWith(pattern)
    )
    
    return isSuspiciousUserAgent || isSuspiciousReferer
  }

  static logSecurityEvent(event: string, request: NextRequest, details?: any) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    logger.securityEvent(event, {
      ip,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      url: request.url,
      method: request.method,
      ...details
    })
  }
}

// Export default security headers instance
export const securityHeaders = new SecurityHeaders()

// Helper function to apply security to any response
export function withSecurity(response: NextResponse): NextResponse {
  return securityHeaders.apply(response)
}

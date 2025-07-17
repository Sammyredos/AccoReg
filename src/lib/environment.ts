/**
 * Environment Detection and Configuration Utilities
 * Handles both localhost and production environments
 */

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production'
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isTest = process.env.NODE_ENV === 'test'

// Server-side environment detection
export const isServer = typeof window === 'undefined'
export const isClient = typeof window !== 'undefined'

// URL and domain detection
export function getBaseUrl(): string {
  if (isServer) {
    // Server-side: Use environment variable or default
    return process.env.NEXTAUTH_URL || 'http://localhost:3000'
  } else {
    // Client-side: Use current origin
    return window.location.origin
  }
}

export function getApiUrl(endpoint: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

// Database configuration
export function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const isPostgreSQL = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')
  const isSQLite = databaseUrl.startsWith('file:')
  const isMySQL = databaseUrl.startsWith('mysql://')

  return {
    url: databaseUrl,
    isPostgreSQL,
    isSQLite,
    isMySQL,
    type: isPostgreSQL ? 'postgresql' : isSQLite ? 'sqlite' : isMySQL ? 'mysql' : 'unknown',
    // Extract connection details for PostgreSQL
    ...(isPostgreSQL && {
      host: databaseUrl.match(/@([^:]+)/)?.[1] || 'localhost',
      port: databaseUrl.match(/:(\d+)\//)?.[1] || '5432',
      database: databaseUrl.match(/\/([^?]+)/)?.[1] || 'accoreg',
      username: databaseUrl.match(/\/\/([^:]+):/)?.[1] || 'postgres'
    })
  }
}

// Email configuration
export function getEmailConfig() {
  return {
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'AccoReg',
    replyTo: process.env.EMAIL_REPLY_TO || 'noreply@yourdomain.com',
  }
}

// Security configuration
export function getSecurityConfig() {
  return {
    headersEnabled: process.env.SECURITY_HEADERS_ENABLED === 'true',
    cspEnabled: process.env.CSP_ENABLED === 'true',
    hstsEnabled: process.env.HSTS_ENABLED === 'true',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
  }
}

// Feature flags
export function getFeatureFlags() {
  return {
    smsEnabled: process.env.SMS_ENABLED === 'true',
    gdprEnabled: process.env.GDPR_ENABLED !== 'false', // Default to true
    healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED !== 'false', // Default to true
    backupEnabled: process.env.BACKUP_ENABLED === 'true',
    monitoringEnabled: process.env.APM_ENABLED === 'true',
  }
}

// Logging configuration
export function getLogConfig() {
  return {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    dir: process.env.LOG_DIR || './logs',
  }
}

// Port configuration
export function getPort(): number {
  return parseInt(process.env.PORT || '3000')
}

// Environment validation
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required environment variables
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`)
    }
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long')
  }

  // Validate NEXTAUTH_SECRET length
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters long')
  }

  // Validate database URL format
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && !dbUrl.match(/^(postgresql|postgres|mysql|file):/)) {
    errors.push('DATABASE_URL must start with postgresql://, mysql://, or file:')
  }

  // Production-specific validations
  if (isProduction) {
    if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes('localhost')) {
      errors.push('NEXTAUTH_URL must be set to your production domain in production')
    }

    if (dbUrl && dbUrl.startsWith('file:')) {
      console.warn('⚠️ Warning: Using SQLite in production. Consider PostgreSQL for better performance.')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Environment info for debugging
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    isProduction,
    isDevelopment,
    isTest,
    isServer,
    isClient,
    baseUrl: getBaseUrl(),
    port: getPort(),
    database: getDatabaseConfig(),
    email: getEmailConfig(),
    security: getSecurityConfig(),
    features: getFeatureFlags(),
    logging: getLogConfig(),
  }
}

// Environment startup check
export function checkEnvironmentOnStartup() {
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🚀 Base URL: ${getBaseUrl()}`)
  console.log(`📊 Port: ${getPort()}`)

  const validation = validateEnvironment()
  if (!validation.valid) {
    console.error('❌ Environment validation failed:')
    validation.errors.forEach(error => console.error(`   - ${error}`))
    
    if (isProduction) {
      console.error('🚨 Cannot start in production with invalid environment')
      process.exit(1)
    } else {
      console.warn('⚠️ Development mode: Continuing with warnings')
    }
  } else {
    console.log('✅ Environment validation passed')
  }

  // Log feature status
  const features = getFeatureFlags()
  console.log('🔧 Features:')
  Object.entries(features).forEach(([key, enabled]) => {
    console.log(`   ${enabled ? '✅' : '❌'} ${key}`)
  })
}

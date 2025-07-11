/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

import { z } from 'zod'

// Define the schema for environment variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  
  // Application
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // Redis (for rate limiting)
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis URL').optional(),
  
  // Email Configuration
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required for email functionality'),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('587'),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email address'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_SECURE: z.string().transform(val => val === 'true').default('false'),
  EMAIL_FROM_NAME: z.string().min(1).default('AccoReg'),
  EMAIL_REPLY_TO: z.string().email().optional(),
  ADMIN_EMAILS: z.string().min(1, 'At least one admin email is required'),
  
  // File Upload (Cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // SMS Configuration
  SMS_ENABLED: z.string().transform(val => val === 'true').default('false'),
  SMS_PROVIDER: z.enum(['twilio', 'aws-sns', 'local-gateway', 'mock']).default('mock'),
  SMS_API_KEY: z.string().optional(),
  SMS_API_SECRET: z.string().optional(),
  SMS_FROM_NUMBER: z.string().optional(),
  SMS_REGION: z.string().default('us-east-1'),
  SMS_GATEWAY_URL: z.string().url().optional(),
  
  // Security
  SECURITY_HEADERS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  CSP_ENABLED: z.string().transform(val => val === 'true').default('true'),
  HSTS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Backup Configuration
  BACKUP_DIR: z.string().default('./backups'),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().min(1)).default('30'),
  BACKUP_COMPRESSION: z.string().transform(val => val === 'true').default('true'),
  BACKUP_ENCRYPTION: z.string().transform(val => val === 'true').default('false'),
  BACKUP_ENCRYPTION_KEY: z.string().optional(),
  
  // GDPR Compliance
  GDPR_ENABLED: z.string().transform(val => val === 'true').default('true'),
  DATA_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().min(1)).default('2555'),
  CONSENT_VERSION: z.string().default('1.0'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  APM_ENABLED: z.string().transform(val => val === 'true').default('false'),
  ELASTIC_APM_SERVER_URL: z.string().url().optional(),
  ELASTIC_APM_SECRET_TOKEN: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default('100'),
  
  // SSL/TLS
  SSL_CERT_PATH: z.string().optional(),
  SSL_KEY_PATH: z.string().optional(),
  SSL_AUTO_RENEWAL: z.string().transform(val => val === 'true').default('false'),
  
  // Health Checks
  HEALTH_CHECK_ENABLED: z.string().transform(val => val === 'true').default('true'),
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).pipe(z.number().min(1000)).default('30000'),
})

// Production-specific validations
const productionSchema = envSchema.extend({
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL is required in production'),
  REDIS_URL: z.string().url('REDIS_URL is required in production for rate limiting'),
  SENTRY_DSN: z.string().url('SENTRY_DSN is recommended in production for error tracking'),
  BACKUP_ENCRYPTION: z.literal('true', { 
    errorMap: () => ({ message: 'Backup encryption must be enabled in production' })
  }),
  BACKUP_ENCRYPTION_KEY: z.string().min(32, 'BACKUP_ENCRYPTION_KEY must be at least 32 characters in production'),
})

export type EnvConfig = z.infer<typeof envSchema>

class EnvironmentValidationError extends Error {
  constructor(public errors: z.ZodError) {
    super('Environment validation failed')
    this.name = 'EnvironmentValidationError'
  }
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): EnvConfig {
  try {
    const schema = process.env.NODE_ENV === 'production' ? productionSchema : envSchema
    return schema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new EnvironmentValidationError(error)
    }
    throw error
  }
}

/**
 * Check for missing optional but recommended environment variables
 */
export function checkRecommendedEnvVars(): string[] {
  const warnings: string[] = []
  
  if (!process.env.SENTRY_DSN) {
    warnings.push('SENTRY_DSN: Error tracking is recommended for production')
  }
  
  if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    warnings.push('REDIS_URL: Redis is recommended for production rate limiting')
  }
  
  if (!process.env.SSL_CERT_PATH && process.env.NODE_ENV === 'production') {
    warnings.push('SSL_CERT_PATH: SSL certificate is required for production')
  }
  
  if (!process.env.ELASTIC_APM_SERVER_URL) {
    warnings.push('ELASTIC_APM_SERVER_URL: APM monitoring is recommended for production')
  }
  
  return warnings
}

/**
 * Generate example environment file
 */
export function generateEnvExample(): string {
  return `# Youth Registration System - Environment Configuration

# Application
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secure-nextauth-secret-at-least-32-chars

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/accoreg

# JWT
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
EMAIL_FROM_NAME=AccoReg
EMAIL_REPLY_TO=noreply@yourdomain.com
ADMIN_EMAILS=admin@yourdomain.com,manager@yourdomain.com

# File Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true

# Backup Configuration
BACKUP_DIR=/var/backups/accoreg
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=true
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key-32-chars

# GDPR Compliance
GDPR_ENABLED=true
DATA_RETENTION_DAYS=2555
CONSENT_VERSION=1.0

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/accoreg

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
APM_ENABLED=true
ELASTIC_APM_SERVER_URL=http://localhost:8200
ELASTIC_APM_SECRET_TOKEN=your-apm-secret-token

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/yourdomain.crt
SSL_KEY_PATH=/etc/ssl/private/yourdomain.key
SSL_AUTO_RENEWAL=true

# Health Checks
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
`
}

// Initialize environment validation on module load
let envConfig: EnvConfig

try {
  envConfig = validateEnvironment()
  
  // Check for missing recommended variables (silent in production)
  const warnings = checkRecommendedEnvVars()
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Recommended environment variables missing:')
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error('❌ Environment validation failed. Please check your .env file.')
    process.exit(1)
  }
  throw error
}

export { envConfig }

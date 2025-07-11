/**
 * Application Performance Monitoring (APM) Setup
 * Integrates with Elastic APM for comprehensive monitoring
 */

import { envConfig } from './env-validation'

let apm: any = null

// Initialize APM only in production or when explicitly enabled
if (envConfig.APM_ENABLED && envConfig.ELASTIC_APM_SERVER_URL) {
  try {
    apm = require('elastic-apm-node').start({
      // Service configuration
      serviceName: 'youth-registration-system',
      serviceVersion: process.env.npm_package_version || '1.0.0',
      environment: envConfig.NODE_ENV,
      
      // Server configuration
      serverUrl: envConfig.ELASTIC_APM_SERVER_URL,
      secretToken: envConfig.ELASTIC_APM_SECRET_TOKEN,
      
      // Performance settings
      captureBody: 'errors',
      captureHeaders: true,
      captureErrorLogStackTraces: 'always',
      
      // Sampling configuration
      transactionSampleRate: envConfig.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Custom configuration
      logLevel: envConfig.LOG_LEVEL,
      active: true,
      
      // Framework detection
      frameworkName: 'Next.js',
      frameworkVersion: '14.0.0',
      
      // Custom tags
      globalLabels: {
        environment: envConfig.NODE_ENV,
        service: 'youth-registration-system',
        version: process.env.npm_package_version || '1.0.0'
      }
    })
    
    // APM initialized successfully
  } catch (error) {
    // APM initialization failed - continue without APM
  }
}

/**
 * Custom transaction wrapper for API routes
 */
export function withAPMTransaction<T extends any[], R>(
  name: string,
  type: string = 'request'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: T): Promise<R> {
      if (!apm) {
        return originalMethod.apply(this, args)
      }
      
      const transaction = apm.startTransaction(name, type)
      
      try {
        const result = await originalMethod.apply(this, args)
        transaction.result = 'success'
        return result
      } catch (error) {
        apm.captureError(error)
        transaction.result = 'error'
        throw error
      } finally {
        transaction.end()
      }
    }
    
    return descriptor
  }
}

/**
 * Custom span wrapper for database operations
 */
export function withAPMSpan(name: string, type: string = 'db') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      if (!apm) {
        return originalMethod.apply(this, args)
      }
      
      const span = apm.startSpan(name, type)
      
      try {
        const result = await originalMethod.apply(this, args)
        return result
      } catch (error) {
        apm.captureError(error)
        throw error
      } finally {
        if (span) span.end()
      }
    }
    
    return descriptor
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()
  
  /**
   * Record a custom metric
   */
  static recordMetric(name: string, value: number, labels?: Record<string, string>) {
    // Store in local metrics
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
    
    // Send to APM if available
    if (apm) {
      apm.setCustomContext({
        metrics: {
          [name]: value
        },
        labels
      })
    }
  }
  
  /**
   * Record response time
   */
  static recordResponseTime(endpoint: string, duration: number) {
    this.recordMetric(`response_time_${endpoint}`, duration, {
      endpoint,
      type: 'response_time'
    })
  }
  
  /**
   * Record database query time
   */
  static recordDatabaseQuery(query: string, duration: number) {
    this.recordMetric('database_query_time', duration, {
      query_type: query,
      type: 'database'
    })
  }
  
  /**
   * Record user action
   */
  static recordUserAction(action: string, userId?: string) {
    this.recordMetric('user_action', 1, {
      action,
      user_id: userId || 'anonymous',
      type: 'user_action'
    })
  }
  
  /**
   * Get metric statistics
   */
  static getMetricStats(name: string) {
    const values = this.metrics.get(name) || []
    if (values.length === 0) return null
    
    const sorted = [...values].sort((a, b) => a - b)
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
  
  /**
   * Clear old metrics (keep last 1000 entries per metric)
   */
  static cleanupMetrics() {
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 1000) {
        this.metrics.set(name, values.slice(-1000))
      }
    }
  }
}

/**
 * Middleware for Next.js API routes
 */
export function withAPMMiddleware(handler: any) {
  return async (req: any, res: any) => {
    const startTime = Date.now()
    const endpoint = `${req.method} ${req.url}`
    
    // Start APM transaction
    let transaction = null
    if (apm) {
      transaction = apm.startTransaction(endpoint, 'request')
      apm.setUserContext({
        id: req.user?.id,
        email: req.user?.email,
        username: req.user?.name
      })
    }
    
    try {
      // Execute the handler
      const result = await handler(req, res)
      
      // Record success metrics
      const duration = Date.now() - startTime
      PerformanceMonitor.recordResponseTime(endpoint, duration)
      
      if (transaction) {
        transaction.result = 'success'
        transaction.setLabel('status_code', res.statusCode)
      }
      
      return result
    } catch (error) {
      // Record error metrics
      const duration = Date.now() - startTime
      PerformanceMonitor.recordResponseTime(endpoint, duration)
      
      if (apm) {
        apm.captureError(error, {
          request: req,
          response: res,
          custom: {
            endpoint,
            duration,
            user_id: req.user?.id
          }
        })
      }
      
      if (transaction) {
        transaction.result = 'error'
        transaction.setLabel('status_code', res.statusCode || 500)
      }
      
      throw error
    } finally {
      if (transaction) {
        transaction.end()
      }
    }
  }
}

/**
 * Database query monitoring
 */
export function monitorDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()
    let span = null
    
    if (apm) {
      span = apm.startSpan(`db.${queryName}`, 'db.postgresql.query')
    }
    
    try {
      const result = await queryFn()
      const duration = Date.now() - startTime
      
      PerformanceMonitor.recordDatabaseQuery(queryName, duration)
      
      if (span) {
        span.setLabel('query_name', queryName)
        span.setLabel('duration_ms', duration)
      }
      
      resolve(result)
    } catch (error) {
      const duration = Date.now() - startTime
      PerformanceMonitor.recordDatabaseQuery(queryName, duration)
      
      if (apm) {
        apm.captureError(error, {
          custom: {
            query_name: queryName,
            duration,
            type: 'database_error'
          }
        })
      }
      
      reject(error)
    } finally {
      if (span) span.end()
    }
  })
}

/**
 * Custom error reporting
 */
export function reportError(error: Error, context?: Record<string, any>) {
  if (apm) {
    apm.captureError(error, {
      custom: context
    })
  }
  
  // Also log to console in development
  if (envConfig.NODE_ENV === 'development') {
    console.error('APM Error:', error, context)
  }
}

/**
 * Set user context for APM
 */
export function setUserContext(user: {
  id: string
  email?: string
  name?: string
  role?: string
}) {
  if (apm) {
    apm.setUserContext({
      id: user.id,
      email: user.email,
      username: user.name
    })
    
    apm.setCustomContext({
      user_role: user.role
    })
  }
}

/**
 * Add custom labels to current transaction
 */
export function addTransactionLabels(labels: Record<string, string | number>) {
  if (apm && apm.currentTransaction) {
    Object.entries(labels).forEach(([key, value]) => {
      apm.currentTransaction.setLabel(key, value)
    })
  }
}

// Cleanup metrics periodically
if (typeof window === 'undefined') {
  setInterval(() => {
    PerformanceMonitor.cleanupMetrics()
  }, 5 * 60 * 1000) // Every 5 minutes
}

export { apm }
export default apm

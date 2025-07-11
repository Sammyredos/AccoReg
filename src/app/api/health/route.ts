import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: {
    database: HealthCheckResult
    memory: HealthCheckResult
    disk: HealthCheckResult
    external: HealthCheckResult
  }
}

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn'
  responseTime: number
  details?: any
  error?: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Perform all health checks
    const [database, memory, disk, external] = await Promise.allSettled([
      checkDatabase(),
      checkMemory(),
      checkDisk(),
      checkExternalServices()
    ])

    const checks = {
      database: database.status === 'fulfilled' ? database.value : { status: 'fail' as const, responseTime: 0, error: 'Check failed' },
      memory: memory.status === 'fulfilled' ? memory.value : { status: 'fail' as const, responseTime: 0, error: 'Check failed' },
      disk: disk.status === 'fulfilled' ? disk.value : { status: 'fail' as const, responseTime: 0, error: 'Check failed' },
      external: external.status === 'fulfilled' ? external.value : { status: 'fail' as const, responseTime: 0, error: 'Check failed' }
    }

    // Determine overall status
    const hasFailures = Object.values(checks).some(check => check.status === 'fail')
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn')
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded'
    if (hasFailures) {
      overallStatus = 'unhealthy'
    } else if (hasWarnings) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }

    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    }

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(healthCheck, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': overallStatus
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: 'Health check failed',
      responseTime: Date.now() - startTime
    }, { status: 503 })
  }
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`
    
    // Test a more complex query to ensure database is responsive
    const userCount = await prisma.admin.count()
    
    const responseTime = Date.now() - startTime
    
    return {
      status: responseTime < 1000 ? 'pass' : 'warn',
      responseTime,
      details: {
        connected: true,
        userCount,
        responseTimeMs: responseTime
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

async function checkMemory(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    const memUsage = process.memoryUsage()
    const totalMemory = memUsage.heapTotal
    const usedMemory = memUsage.heapUsed
    const memoryUsagePercent = (usedMemory / totalMemory) * 100
    
    let status: 'pass' | 'warn' | 'fail'
    if (memoryUsagePercent > 90) {
      status = 'fail'
    } else if (memoryUsagePercent > 75) {
      status = 'warn'
    } else {
      status = 'pass'
    }
    
    return {
      status,
      responseTime: Date.now() - startTime,
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent)
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Memory check failed'
    }
  }
}

async function checkDisk(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // For Node.js, we'll check if we can write to the temp directory
    const fs = require('fs').promises
    const path = require('path')
    const os = require('os')
    
    const testFile = path.join(os.tmpdir(), `health-check-${Date.now()}.tmp`)
    
    await fs.writeFile(testFile, 'health check test')
    await fs.unlink(testFile)
    
    return {
      status: 'pass',
      responseTime: Date.now() - startTime,
      details: {
        writable: true,
        tempDir: os.tmpdir()
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Disk check failed'
    }
  }
}

async function checkExternalServices(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    const checks: Array<{ service: string; status: string; error?: string }> = []
    
    // Check Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/list`
        const response = await fetch(cloudinaryUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        checks.push({
          service: 'cloudinary',
          status: response.ok ? 'pass' : 'fail',
          responseTime: Date.now() - startTime
        })
      } catch (error) {
        checks.push({
          service: 'cloudinary',
          status: 'fail',
          error: 'Connection failed'
        })
      }
    }
    
    // Check Redis if configured
    if (process.env.REDIS_URL) {
      try {
        const Redis = require('ioredis')
        const redis = new Redis(process.env.REDIS_URL)
        await redis.ping()
        await redis.disconnect()
        checks.push({
          service: 'redis',
          status: 'pass',
          responseTime: Date.now() - startTime
        })
      } catch (error) {
        checks.push({
          service: 'redis',
          status: 'fail',
          error: 'Connection failed'
        })
      }
    }
    
    const hasFailures = checks.some(check => check.status === 'fail')
    
    return {
      status: hasFailures ? 'warn' : 'pass',
      responseTime: Date.now() - startTime,
      details: {
        services: checks,
        totalServices: checks.length
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'External services check failed'
    }
  }
}

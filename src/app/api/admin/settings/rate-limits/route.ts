import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// Rate limit configuration interface
interface RateLimitConfig {
  apiRequests: {
    limit: number
    window: 'minute' | 'hour' | 'day'
  }
  registrations: {
    limit: number
    window: 'minute' | 'hour' | 'day'
  }
  loginAttempts: {
    limit: number
    window: 'minute' | 'hour' | 'day'
  }
  messaging: {
    limit: number
    window: 'minute' | 'hour' | 'day'
  }
  enabled: boolean
  whitelistAdminIPs: boolean
  burstAllowance: number
}

// Default rate limit settings
const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  apiRequests: { limit: 100, window: 'minute' },
  registrations: { limit: 5, window: 'minute' },
  loginAttempts: { limit: 10, window: 'minute' },
  messaging: { limit: 20, window: 'hour' },
  enabled: true,
  whitelistAdminIPs: true,
  burstAllowance: 150
}

// GET - Retrieve current rate limit settings
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Check if user has admin permissions
    const userRole = authResult.user?.role?.name
    if (!['Super Admin', 'Admin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Admin and Super Admin can view rate limit settings.' },
        { status: 403 }
      )
    }

    // Get rate limit settings from database
    const rateLimitSettings = await prisma.setting.findMany({
      where: {
        category: 'rateLimits'
      }
    })

    // Convert database settings to structured format
    const config: RateLimitConfig = { ...DEFAULT_RATE_LIMITS }
    
    rateLimitSettings.forEach(setting => {
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

    return NextResponse.json({
      success: true,
      rateLimits: config
    })

  } catch (error) {
    console.error('Error fetching rate limit settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rate limit settings' },
      { status: 500 }
    )
  }
}

// PUT - Update rate limit settings
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Check if user has admin permissions (Super Admin only for modifications)
    const userRole = authResult.user?.role?.name
    if (userRole !== 'Super Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Super Admin can modify rate limit settings.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const config: RateLimitConfig = body

    // Validate the configuration
    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Invalid rate limit configuration' },
        { status: 400 }
      )
    }

    // Validate individual settings
    const validWindows = ['minute', 'hour', 'day']
    const validations = [
      { field: 'apiRequests', config: config.apiRequests },
      { field: 'registrations', config: config.registrations },
      { field: 'loginAttempts', config: config.loginAttempts },
      { field: 'messaging', config: config.messaging }
    ]

    for (const validation of validations) {
      if (!validation.config || 
          typeof validation.config.limit !== 'number' || 
          validation.config.limit < 1 ||
          !validWindows.includes(validation.config.window)) {
        return NextResponse.json(
          { error: `Invalid ${validation.field} configuration` },
          { status: 400 }
        )
      }
    }

    if (typeof config.burstAllowance !== 'number' || config.burstAllowance < 100 || config.burstAllowance > 500) {
      return NextResponse.json(
        { error: 'Burst allowance must be between 100% and 500%' },
        { status: 400 }
      )
    }

    // Save settings to database
    const settingsToSave = [
      { key: 'apiRequests', value: JSON.stringify(config.apiRequests) },
      { key: 'registrations', value: JSON.stringify(config.registrations) },
      { key: 'loginAttempts', value: JSON.stringify(config.loginAttempts) },
      { key: 'messaging', value: JSON.stringify(config.messaging) },
      { key: 'enabled', value: JSON.stringify(config.enabled) },
      { key: 'whitelistAdminIPs', value: JSON.stringify(config.whitelistAdminIPs) },
      { key: 'burstAllowance', value: JSON.stringify(config.burstAllowance) }
    ]

    // Use transaction to ensure all settings are saved together
    await prisma.$transaction(async (tx) => {
      for (const setting of settingsToSave) {
        await tx.setting.upsert({
          where: {
            category_key: {
              category: 'rateLimits',
              key: setting.key
            }
          },
          update: {
            value: setting.value,
            updatedAt: new Date()
          },
          create: {
            category: 'rateLimits',
            key: setting.key,
            value: setting.value,
            name: setting.key.charAt(0).toUpperCase() + setting.key.slice(1),
            description: `Rate limit configuration for ${setting.key}`,
            type: 'text'
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Rate limit settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating rate limit settings:', error)
    return NextResponse.json(
      { error: 'Failed to update rate limit settings' },
      { status: 500 }
    )
  }
}

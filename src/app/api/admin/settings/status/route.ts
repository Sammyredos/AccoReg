/**
 * Settings Status API
 * GET /api/admin/settings/status
 * Returns the current status of all system configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { Logger } from '@/lib/logger'
import { getSMSStatus } from '@/lib/sms'

// Force Node.js runtime for bcryptjs and jsonwebtoken compatibility
export const runtime = 'nodejs'

const logger = Logger('Settings-Status')

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin access
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to view settings status
    const allowedRoles = ['Super Admin', 'Admin']
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    logger.info('Settings status requested', { userId: authResult.user.id })

    // Get all settings from database
    const settings = await prisma.setting.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {}
      }
      
      let parsedValue
      try {
        parsedValue = JSON.parse(setting.value)
      } catch {
        parsedValue = setting.value
      }
      
      acc[setting.category][setting.key] = {
        value: parsedValue,
        type: setting.type,
        name: setting.name,
        description: setting.description
      }
      
      return acc
    }, {} as Record<string, any>)

    // Check service configurations
    const serviceStatus = {
      email: await getEmailStatus(groupedSettings.email || {}),
      sms: await getSMSConfigStatus(groupedSettings.sms || {}),
      database: await getDatabaseStatus(),
      system: await getSystemStatus(groupedSettings.system || {})
    }

    // Calculate overall health score
    const healthScore = calculateHealthScore(serviceStatus)

    return NextResponse.json({
      success: true,
      settings: groupedSettings,
      serviceStatus,
      healthScore,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error in settings status endpoint', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to get settings status'
      },
      { status: 500 }
    )
  }
}

/**
 * Get email configuration status
 */
async function getEmailStatus(emailSettings: any) {
  try {
    const requiredSettings = ['smtpHost', 'smtpUser']
    const configuredSettings = requiredSettings.filter(key => 
      emailSettings[key]?.value && emailSettings[key].value.trim() !== ''
    )

    const isConfigured = configuredSettings.length === requiredSettings.length
    const hasEnvironmentVars = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

    return {
      configured: isConfigured || hasEnvironmentVars,
      status: isConfigured || hasEnvironmentVars ? 'ready' : 'not_configured',
      details: {
        settingsConfigured: isConfigured,
        environmentConfigured: hasEnvironmentVars,
        smtpHost: emailSettings.smtpHost?.value || process.env.SMTP_HOST || 'Not set',
        smtpPort: emailSettings.smtpPort?.value || process.env.SMTP_PORT || 'Not set',
        fromName: emailSettings.emailFromName?.value || process.env.EMAIL_FROM_NAME || 'Not set',
        hasCredentials: !!(emailSettings.smtpUser?.value || process.env.SMTP_USER)
      },
      message: isConfigured || hasEnvironmentVars 
        ? 'Email configuration is ready'
        : 'Email configuration incomplete'
    }
  } catch (error) {
    return {
      configured: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Email status check failed'
    }
  }
}

/**
 * Get SMS configuration status
 */
async function getSMSConfigStatus(smsSettings: any) {
  try {
    const smsStatus = getSMSStatus()
    const isEnabled = smsSettings.smsEnabled?.value || process.env.SMS_ENABLED === 'true'
    const provider = smsSettings.smsProvider?.value || process.env.SMS_PROVIDER || 'mock'

    return {
      configured: smsStatus.configured,
      enabled: isEnabled,
      status: isEnabled ? (smsStatus.configured ? 'ready' : 'not_configured') : 'disabled',
      provider: provider,
      details: {
        settingsConfigured: !!smsSettings.smsProvider?.value,
        environmentConfigured: !!process.env.SMS_PROVIDER,
        hasApiKey: !!(smsSettings.smsApiKey?.value || process.env.SMS_API_KEY),
        fromNumber: smsSettings.smsFromNumber?.value || process.env.SMS_FROM_NUMBER || 'Not set'
      },
      message: !isEnabled 
        ? 'SMS functionality is disabled'
        : smsStatus.configured 
          ? `SMS ready with ${provider} provider`
          : `SMS enabled but ${provider} provider not properly configured`
    }
  } catch (error) {
    return {
      configured: false,
      enabled: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'SMS status check failed'
    }
  }
}

/**
 * Get database status
 */
async function getDatabaseStatus() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Get basic stats
    const [userCount, registrationCount, settingCount] = await Promise.all([
      prisma.user.count(),
      prisma.registration.count(),
      prisma.setting.count()
    ])

    return {
      connected: true,
      status: 'ready',
      details: {
        userCount,
        registrationCount,
        settingCount,
        connectionPool: 'active'
      },
      message: 'Database connection is healthy'
    }
  } catch (error) {
    return {
      connected: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

/**
 * Get system status
 */
async function getSystemStatus(systemSettings: any) {
  try {
    const isMaintenanceMode = systemSettings.maintenanceMode?.value || false
    const isDebugMode = systemSettings.debugMode?.value || false
    const systemName = systemSettings.systemName?.value || 'AccoReg'

    return {
      operational: !isMaintenanceMode,
      status: isMaintenanceMode ? 'maintenance' : 'operational',
      details: {
        systemName,
        maintenanceMode: isMaintenanceMode,
        debugMode: isDebugMode,
        nodeEnv: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      message: isMaintenanceMode 
        ? 'System is in maintenance mode'
        : 'System is operational'
    }
  } catch (error) {
    return {
      operational: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'System status check failed'
    }
  }
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(serviceStatus: any): number {
  const services = ['email', 'sms', 'database', 'system']
  let totalScore = 0
  let serviceCount = 0

  for (const service of services) {
    const status = serviceStatus[service]
    if (!status) continue

    serviceCount++
    
    switch (status.status) {
      case 'ready':
      case 'operational':
        totalScore += 100
        break
      case 'disabled':
        totalScore += 75 // Not an error, just disabled
        break
      case 'not_configured':
        totalScore += 50
        break
      case 'maintenance':
        totalScore += 25
        break
      case 'error':
        totalScore += 0
        break
      default:
        totalScore += 50
    }
  }

  return serviceCount > 0 ? Math.round(totalScore / serviceCount) : 0
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

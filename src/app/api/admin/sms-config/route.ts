/**
 * SMS Configuration Display API
 * GET /api/admin/sms-config
 * Returns SMS configuration for display in communications page
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { getSMSStatus } from '@/lib/sms'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Get SMS settings from database first
    const smsSettings = await prisma.setting.findMany({
      where: { category: 'sms' }
    })

    // Transform settings to object
    const settings = smsSettings.reduce((acc, setting) => {
      let value
      try {
        value = JSON.parse(setting.value)
      } catch {
        value = setting.value
      }
      acc[setting.key] = value
      return acc
    }, {} as Record<string, any>)

    // Get SMS configuration from settings database, fallback to environment variables
    const smsEnabled = settings.smsEnabled !== undefined ? settings.smsEnabled : (process.env.SMS_ENABLED === 'true')
    const smsProvider = settings.smsProvider || process.env.SMS_PROVIDER || 'mock'
    const smsApiKey = settings.smsApiKey || process.env.SMS_API_KEY || ''
    const smsFromNumber = settings.smsFromNumber || process.env.SMS_FROM_NUMBER || 'YouthReg'
    const smsUsername = settings.smsUsername || process.env.SMS_USERNAME || ''
    const smsRegion = settings.smsRegion || process.env.SMS_REGION || 'us-east-1'

    // Get SMS status (now async)
    const smsStatus = await getSMSStatus()

    // Determine if SMS is configured
    const isConfigured = smsStatus.configured && smsEnabled

    const smsConfig = {
      smsEnabled: smsEnabled,
      smsProvider: smsProvider,
      smsFromNumber: smsFromNumber,
      smsApiKey: smsApiKey ? smsApiKey.substring(0, 8) + '...' : '', // Mask API key for security
      smsUsername: smsUsername,
      smsRegion: smsRegion,
      isConfigured: isConfigured,
      environment: process.env.NODE_ENV || 'development',
      source: smsSettings.length > 0 ? 'database' : 'environment',
      status: smsStatus
    }

    return NextResponse.json({
      config: smsConfig,
      status: isConfigured ? 'configured' : 'not_configured',
      message: isConfigured 
        ? `SMS system is properly configured and ready to send messages (source: ${smsConfig.source})`
        : 'SMS system requires configuration to send messages. Configure in Settings → SMS Configuration.'
    })

  } catch (error) {
    console.error('Error fetching SMS config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SMS configuration' },
      { status: 500 }
    )
  }
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

/**
 * SMS Settings API
 * GET/PUT /api/admin/settings/sms
 * Manages SMS configuration settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Logger } from '@/lib/logger'
import { getSMSStatus } from '@/lib/sms'

const logger = Logger('SMS-Settings')

// Create different schemas for development and production
const createSmsSettingsSchema = (isDevelopment: boolean) => {
  if (isDevelopment) {
    // More lenient validation for development
    return z.object({
      smsEnabled: z.union([z.boolean(), z.string()]).transform((val) => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1'
        }
        return Boolean(val)
      }).default(true),
      smsProvider: z.enum(['twilio', 'aws-sns', 'local-gateway', 'kudisms', 'termii', 'bulk-sms-nigeria', 'smart-sms']).default('twilio'),
      smsApiKey: z.string().default(''),
      smsApiSecret: z.string().optional(),
      smsFromNumber: z.string().default('YouthReg'),
      smsRegion: z.string().default('us-east-1'),
      smsGatewayUrl: z.string().default(''),
      smsUsername: z.string().default('')
    })
  } else {
    // Strict validation for production
    return z.object({
      smsEnabled: z.union([z.boolean(), z.string()]).transform((val) => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1'
        }
        return Boolean(val)
      }),
      smsProvider: z.enum(['twilio', 'aws-sns', 'local-gateway', 'kudisms', 'termii', 'bulk-sms-nigeria', 'smart-sms']),
      smsApiKey: z.string().optional(),
      smsApiSecret: z.string().optional(),
      smsFromNumber: z.string().optional(),
      smsRegion: z.string().default('us-east-1'),
      smsGatewayUrl: z.string().optional(),
      smsUsername: z.string().optional()
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate request object
    if (!request || typeof request !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get token from cookie with validation
    const token = request.cookies?.get('auth-token')?.value
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json({ error: 'Unauthorized - No valid token provided' }, { status: 401 })
    }

    // Verify token with error handling
    let payload
    try {
      payload = verifyToken(token)
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })
      }
    } catch (tokenError) {
      logger.error('Token verification failed', tokenError)
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
    }

    // Validate payload structure
    if (!payload.adminId || typeof payload.adminId !== 'string') {
      return NextResponse.json({ error: 'Invalid token structure' }, { status: 401 })
    }

    // Determine user type from token
    const userType = payload.type || 'admin'

    let currentUser
    if (userType === 'admin') {
      currentUser = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    } else {
      currentUser = await prisma.user.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    }

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to view SMS settings
    const allowedRoles = ['Super Admin', 'Admin']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get SMS settings from database
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

    // Merge with environment variables (env vars as fallback)
    const smsConfig = {
      smsEnabled: settings.smsEnabled !== undefined ? settings.smsEnabled : (process.env.SMS_ENABLED === 'true'),
      smsProvider: settings.smsProvider || process.env.SMS_PROVIDER || 'twilio',
      smsApiKey: settings.smsApiKey || process.env.SMS_API_KEY || '',
      smsFromNumber: settings.smsFromNumber || process.env.SMS_FROM_NUMBER || '',
      smsRegion: settings.smsRegion || process.env.SMS_REGION || 'us-east-1',
      smsGatewayUrl: settings.smsGatewayUrl || process.env.SMS_GATEWAY_URL || '',
      smsUsername: settings.smsUsername || process.env.SMS_USERNAME || '',
      isConfigured: getSMSStatus().configured
    }

    return NextResponse.json({
      success: true,
      settings: smsConfig,
      status: getSMSStatus()
    })

  } catch (error) {
    logger.error('Error getting SMS settings', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to get SMS settings'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Validate request object
    if (!request || typeof request !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get token from cookie with validation
    const token = request.cookies?.get('auth-token')?.value
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json({ error: 'Unauthorized - No valid token provided' }, { status: 401 })
    }

    // Verify token with error handling
    let payload
    try {
      payload = verifyToken(token)
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })
      }
    } catch (tokenError) {
      logger.error('Token verification failed', tokenError)
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
    }

    // Validate payload structure
    if (!payload.adminId || typeof payload.adminId !== 'string') {
      return NextResponse.json({ error: 'Invalid token structure' }, { status: 401 })
    }

    // Determine user type from token
    const userType = payload.type || 'admin'

    let currentUser
    if (userType === 'admin') {
      currentUser = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    } else {
      currentUser = await prisma.user.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    }

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to update SMS settings (Super Admin only)
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Only Super Admin can modify SMS settings' }, { status: 403 })
    }

    // Parse request body with validation
    let body
    try {
      body = await request.json()
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
      }
    } catch (parseError) {
      logger.error('Failed to parse request body', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }



    // Create schema based on environment
    const isDevelopment = process.env.NODE_ENV === 'development'
    const smsSettingsSchema = createSmsSettingsSchema(isDevelopment)

    // Validate request body with enhanced error handling
    const validation = smsSettingsSchema.safeParse(body)
    if (!validation.success) {
      console.error('SMS settings validation failed:', validation.error.errors) // Debug log

      const errorDetails = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.input
      }))

      return NextResponse.json(
        {
          error: 'Invalid SMS settings data',
          message: 'Validation failed for SMS settings',
          details: errorDetails,
          receivedData: body,
          environment: process.env.NODE_ENV
        },
        { status: 400 }
      )
    }

    const settings = validation.data

    logger.info('SMS settings update requested', {
      userId: currentUser.id,
      smsEnabled: settings.smsEnabled,
      smsProvider: settings.smsProvider
    })

    // Validate provider-specific requirements
    if (settings.smsEnabled) {
      const validationError = validateProviderSettings(settings)
      if (validationError) {
        return NextResponse.json(
          {
            error: 'SMS provider configuration invalid',
            message: validationError
          },
          { status: 400 }
        )
      }
    }

    // Update settings in database
    const settingsToUpdate = [
      { key: 'smsEnabled', value: settings.smsEnabled },
      { key: 'smsProvider', value: settings.smsProvider },
      { key: 'smsApiKey', value: settings.smsApiKey || '' },
      { key: 'smsFromNumber', value: settings.smsFromNumber || '' },
      { key: 'smsRegion', value: settings.smsRegion },
      { key: 'smsGatewayUrl', value: settings.smsGatewayUrl || '' },
      { key: 'smsUsername', value: settings.smsUsername || '' }
    ]

    // Only update API secret if provided
    if (settings.smsApiSecret) {
      settingsToUpdate.push({ key: 'smsApiSecret', value: settings.smsApiSecret })
    }

    const updatePromises = settingsToUpdate.map(async (setting) => {
      return prisma.setting.upsert({
        where: {
          category_key: {
            category: 'sms',
            key: setting.key
          }
        },
        update: {
          value: JSON.stringify(setting.value),
          updatedAt: new Date()
        },
        create: {
          category: 'sms',
          key: setting.key,
          value: JSON.stringify(setting.value),
          name: setting.key.charAt(0).toUpperCase() + setting.key.slice(1),
          type: typeof setting.value === 'boolean' ? 'toggle' : 'text',
          description: `SMS configuration: ${setting.key}`
        }
      })
    })

    await Promise.all(updatePromises)

    // Test SMS configuration if enabled
    let testResult = null
    if (settings.smsEnabled) {
      try {
        testResult = await testSMSConfiguration(settings)
      } catch (error) {
        logger.warn('SMS configuration test failed', error)
        // Don't fail the update, just warn
        testResult = {
          success: false,
          message: error instanceof Error ? error.message : 'SMS test failed'
        }
      }
    }

    logger.info('SMS settings updated successfully', {
      userId: currentUser.id,
      settingsCount: settingsToUpdate.length,
      testResult
    })

    return NextResponse.json({
      success: true,
      message: 'SMS settings updated successfully',
      testResult
    })

  } catch (error) {
    logger.error('Error updating SMS settings', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update SMS settings'
      },
      { status: 500 }
    )
  }
}

/**
 * Validate provider-specific settings
 */
function validateProviderSettings(settings: any): string | null {
  switch (settings.smsProvider) {
    case 'twilio':
      if (!settings.smsApiKey) return 'Twilio requires API Key (Account SID)'
      if (!settings.smsApiSecret) return 'Twilio requires API Secret (Auth Token)'
      if (!settings.smsFromNumber) return 'Twilio requires From Number'
      break

    case 'aws-sns':
      if (!settings.smsApiKey) return 'AWS SNS requires API Key (Access Key ID)'
      if (!settings.smsApiSecret) return 'AWS SNS requires API Secret (Secret Access Key)'
      break

    case 'local-gateway':
      if (!settings.smsGatewayUrl) return 'Local Gateway requires Gateway URL'
      break

    case 'kudisms':
      if (!settings.smsApiKey) return 'KudiSMS requires API Key (Password)'
      if (!settings.smsUsername) return 'KudiSMS requires Username'
      break

    case 'termii':
      if (!settings.smsApiKey) return 'Termii requires API Key'
      break

    case 'bulk-sms-nigeria':
      if (!settings.smsApiKey) return 'Bulk SMS Nigeria requires API Token'
      break

    case 'smart-sms':
      if (!settings.smsApiKey) return 'Smart SMS requires API Key (Password)'
      if (!settings.smsUsername) return 'Smart SMS requires Username'
      break



    default:
      return `Unsupported SMS provider: ${settings.smsProvider}`
  }

  return null
}

/**
 * Test SMS configuration
 */
async function testSMSConfiguration(settings: any) {
  // For now, just validate the configuration
  // In a real implementation, you might send a test SMS
  
  switch (settings.smsProvider) {
    case 'twilio':
      // Could test Twilio API connection here
      return {
        success: true,
        message: 'Twilio configuration appears valid'
      }
      
    case 'aws-sns':
      // Could test AWS SNS connection here
      return {
        success: true,
        message: 'AWS SNS configuration appears valid'
      }
      
    case 'local-gateway':
      // Could test local gateway connection here
      try {
        const response = await fetch(settings.smsGatewayUrl, {
          method: 'GET',
          timeout: 5000
        })
        return {
          success: response.ok,
          message: response.ok ? 'Local gateway is reachable' : 'Local gateway is not responding'
        }
      } catch (error) {
        return {
          success: false,
          message: 'Cannot reach local gateway'
        }
      }
      
    default:
      return {
        success: false,
        message: 'Unknown SMS provider'
      }
  }
}

// Handle unsupported methods
export async function POST() {
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

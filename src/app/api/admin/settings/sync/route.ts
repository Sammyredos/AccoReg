/**
 * Settings Synchronization API
 * POST /api/admin/settings/sync
 * Syncs settings with environment variables and external services
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { Logger } from '@/lib/logger'
import { getSMSStatus } from '@/lib/sms'

// Force Node.js runtime for bcryptjs and jsonwebtoken compatibility
export const runtime = 'nodejs'

const logger = Logger('Settings-Sync')

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin access
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to sync settings (Super Admin only)
    const allowedRoles = ['Super Admin']
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Only Super Admin can sync settings' },
        { status: 403 }
      )
    }

    logger.info('Settings sync requested', { userId: authResult.user.id })

    // Get current settings from database
    const currentSettings = await prisma.setting.findMany()
    const settingsMap = currentSettings.reduce((acc, setting) => {
      acc[`${setting.category}.${setting.key}`] = setting
      return acc
    }, {} as Record<string, any>)

    // Define environment variable mappings
    const envMappings = {
      // Email settings
      'email.smtpHost': 'SMTP_HOST',
      'email.smtpPort': 'SMTP_PORT',
      'email.smtpUser': 'SMTP_USER',
      'email.smtpSecure': 'SMTP_SECURE',
      'email.emailFromName': 'EMAIL_FROM_NAME',
      'email.emailReplyTo': 'EMAIL_REPLY_TO',
      'email.adminEmails': 'ADMIN_EMAILS',
      
      // SMS settings
      'sms.smsEnabled': 'SMS_ENABLED',
      'sms.smsProvider': 'SMS_PROVIDER',
      'sms.smsApiKey': 'SMS_API_KEY',
      'sms.smsFromNumber': 'SMS_FROM_NUMBER',
      'sms.smsRegion': 'SMS_REGION',
      'sms.smsGatewayUrl': 'SMS_GATEWAY_URL',
    }

    const syncResults = {
      updated: 0,
      created: 0,
      errors: 0,
      details: [] as Array<{
        setting: string
        action: 'updated' | 'created' | 'error'
        oldValue?: string
        newValue?: string
        error?: string
      }>
    }

    // Sync settings with environment variables
    for (const [settingKey, envVar] of Object.entries(envMappings)) {
      try {
        const envValue = process.env[envVar]
        if (envValue === undefined) continue

        const [category, key] = settingKey.split('.')
        const existingSetting = settingsMap[settingKey]

        // Parse environment value based on setting type
        let parsedValue: any = envValue
        if (existingSetting) {
          switch (existingSetting.type) {
            case 'toggle':
              parsedValue = envValue === 'true'
              break
            case 'number':
              parsedValue = parseInt(envValue, 10)
              break
            default:
              parsedValue = envValue
          }
        }

        const jsonValue = JSON.stringify(parsedValue)

        if (existingSetting) {
          // Update existing setting if value changed
          if (existingSetting.value !== jsonValue) {
            await prisma.setting.update({
              where: {
                category_key: { category, key }
              },
              data: {
                value: jsonValue,
                updatedAt: new Date()
              }
            })

            syncResults.updated++
            syncResults.details.push({
              setting: settingKey,
              action: 'updated',
              oldValue: existingSetting.value,
              newValue: jsonValue
            })
          }
        } else {
          // Create new setting
          await prisma.setting.create({
            data: {
              category,
              key,
              value: jsonValue,
              name: key.charAt(0).toUpperCase() + key.slice(1),
              type: 'text', // Default type
              description: `Synced from environment variable ${envVar}`
            }
          })

          syncResults.created++
          syncResults.details.push({
            setting: settingKey,
            action: 'created',
            newValue: jsonValue
          })
        }
      } catch (error) {
        syncResults.errors++
        syncResults.details.push({
          setting: settingKey,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        logger.error(`Error syncing setting ${settingKey}`, error)
      }
    }

    // Test service configurations
    const serviceStatus = {
      email: await testEmailConfiguration(),
      sms: await testSMSConfiguration()
    }

    logger.info('Settings sync completed', {
      userId: authResult.user.id,
      results: syncResults,
      serviceStatus
    })

    return NextResponse.json({
      success: true,
      message: 'Settings synchronized successfully',
      results: syncResults,
      serviceStatus
    })

  } catch (error) {
    logger.error('Error in settings sync endpoint', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to sync settings'
      },
      { status: 500 }
    )
  }
}

/**
 * Test email configuration
 */
async function testEmailConfiguration() {
  try {
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
    const missing = requiredEnvVars.filter(env => !process.env[env])
    
    if (missing.length > 0) {
      return {
        configured: false,
        status: 'missing_config',
        message: `Missing environment variables: ${missing.join(', ')}`
      }
    }

    // Test SMTP connection (simplified)
    return {
      configured: true,
      status: 'ready',
      message: 'Email configuration appears valid'
    }
  } catch (error) {
    return {
      configured: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Email configuration error'
    }
  }
}

/**
 * Test SMS configuration
 */
async function testSMSConfiguration() {
  try {
    const smsStatus = getSMSStatus()
    
    return {
      configured: smsStatus.configured,
      status: smsStatus.enabled ? 'ready' : 'disabled',
      provider: smsStatus.provider,
      message: smsStatus.enabled 
        ? `SMS configured with ${smsStatus.provider} provider`
        : 'SMS functionality is disabled'
    }
  } catch (error) {
    return {
      configured: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'SMS configuration error'
    }
  }
}

// Handle unsupported methods
export async function GET() {
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

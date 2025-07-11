/**
 * Manual Email Configuration API
 * POST /api/admin/settings/email/configure
 * 
 * Allows manual configuration of email settings from environment variables
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { PrismaClient } from '@prisma/client'
import { Logger } from '@/lib/logger'

const prisma = new PrismaClient()
const logger = new Logger('EmailConfigure')

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to configure email
    const allowedRoles = ['Super Admin']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions to configure email settings' }, { status: 403 })
    }

    logger.info('Manual email configuration requested', { userId: currentUser.id })

    // Check if environment variables are available
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        error: 'Missing environment variables',
        message: `The following environment variables are not configured: ${missingVars.join(', ')}`,
        missingVars
      }, { status: 400 })
    }

    // Define email settings to configure
    const emailSettings = [
      {
        key: 'smtpHost',
        name: 'SMTP Host',
        value: process.env.SMTP_HOST,
        type: 'text',
        description: 'SMTP server hostname'
      },
      {
        key: 'smtpPort',
        name: 'SMTP Port',
        value: process.env.SMTP_PORT,
        type: 'number',
        description: 'SMTP server port'
      },
      {
        key: 'smtpUser',
        name: 'SMTP Username',
        value: process.env.SMTP_USER,
        type: 'text',
        description: 'SMTP authentication username'
      },
      {
        key: 'smtpPass',
        name: 'SMTP Password',
        value: process.env.SMTP_PASS,
        type: 'password',
        description: 'SMTP authentication password'
      },
      {
        key: 'smtpSecure',
        name: 'SMTP Secure',
        value: process.env.SMTP_SECURE === 'true',
        type: 'boolean',
        description: 'Use SSL/TLS encryption'
      },
      {
        key: 'emailFromName',
        name: 'From Name',
        value: process.env.EMAIL_FROM_NAME || 'Mopgomyouth',
        type: 'text',
        description: 'Display name for outgoing emails'
      },
      {
        key: 'emailReplyTo',
        name: 'Reply To',
        value: process.env.EMAIL_REPLY_TO || process.env.SMTP_USER,
        type: 'text',
        description: 'Reply-to email address'
      },
      {
        key: 'adminEmails',
        name: 'Admin Emails',
        value: process.env.ADMIN_EMAILS || '',
        type: 'text',
        description: 'Comma-separated list of admin email addresses'
      }
    ]

    let updatedCount = 0
    let createdCount = 0
    const results = []

    for (const setting of emailSettings) {
      try {
        // Check if setting already exists
        const existingSetting = await prisma.setting.findFirst({
          where: {
            category: 'email',
            key: setting.key
          }
        })

        const settingData = {
          category: 'email',
          key: setting.key,
          name: setting.name,
          value: JSON.stringify(setting.value),
          type: setting.type,
          description: setting.description,
          updatedAt: new Date()
        }

        if (existingSetting) {
          // Update existing setting
          await prisma.setting.update({
            where: { id: existingSetting.id },
            data: settingData
          })
          updatedCount++
          results.push({ action: 'updated', key: setting.key, name: setting.name })
        } else {
          // Create new setting
          await prisma.setting.create({
            data: {
              ...settingData,
              createdAt: new Date()
            }
          })
          createdCount++
          results.push({ action: 'created', key: setting.key, name: setting.name })
        }
      } catch (error) {
        logger.error(`Failed to configure ${setting.name}`, error)
        results.push({ 
          action: 'failed', 
          key: setting.key, 
          name: setting.name, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Verify configuration
    const allEmailSettings = await prisma.setting.findMany({
      where: { category: 'email' }
    })

    const settingsMap = allEmailSettings.reduce((acc, setting) => {
      try {
        acc[setting.key] = JSON.parse(setting.value)
      } catch {
        acc[setting.key] = setting.value
      }
      return acc
    }, {} as Record<string, any>)

    const isConfigured = !!(settingsMap.smtpHost && settingsMap.smtpUser && settingsMap.smtpPass)

    logger.info('Email configuration completed', {
      userId: currentUser.id,
      created: createdCount,
      updated: updatedCount,
      isConfigured
    })

    return NextResponse.json({
      success: true,
      message: 'Email settings configured successfully from environment variables',
      summary: {
        created: createdCount,
        updated: updatedCount,
        total: createdCount + updatedCount,
        isConfigured
      },
      results,
      configuration: {
        smtpHost: settingsMap.smtpHost,
        smtpPort: settingsMap.smtpPort,
        smtpUser: settingsMap.smtpUser,
        emailFromName: settingsMap.emailFromName,
        isConfigured
      }
    })

  } catch (error) {
    logger.error('Error configuring email settings', error)
    return NextResponse.json(
      { 
        error: 'Failed to configure email settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to configure email settings.' },
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

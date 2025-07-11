/**
 * Initialize Email Settings API
 * POST /api/admin/settings/email/init
 * 
 * Creates missing email settings in the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { PrismaClient } from '@prisma/client'
import { Logger } from '@/lib/logger'

const prisma = new PrismaClient()
const logger = new Logger('EmailInit')

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to initialize email settings
    const allowedRoles = ['Super Admin']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions to initialize email settings' }, { status: 403 })
    }

    logger.info('Email settings initialization requested', { userId: currentUser.id })

    // Define all required email settings
    const requiredEmailSettings = [
      {
        key: 'smtpHost',
        name: 'SMTP Host',
        type: 'text',
        description: 'SMTP server hostname (e.g., smtp.gmail.com)',
        value: process.env.SMTP_HOST || ''
      },
      {
        key: 'smtpPort',
        name: 'SMTP Port',
        type: 'number',
        description: 'SMTP server port (587 for TLS, 465 for SSL)',
        value: process.env.SMTP_PORT || '587'
      },
      {
        key: 'smtpUser',
        name: 'SMTP Username',
        type: 'text',
        description: 'SMTP authentication username (usually your email address)',
        value: process.env.SMTP_USER || ''
      },
      {
        key: 'smtpPass',
        name: 'SMTP Password',
        type: 'password',
        description: 'SMTP authentication password (use app password for Gmail)',
        value: process.env.SMTP_PASS || ''
      },
      {
        key: 'smtpSecure',
        name: 'Use SSL/TLS',
        type: 'toggle',
        description: 'Enable SSL/TLS encryption (true for port 465, false for port 587)',
        value: process.env.SMTP_SECURE === 'true'
      },
      {
        key: 'emailFromName',
        name: 'From Name',
        type: 'text',
        description: 'Display name for outgoing emails',
        value: process.env.EMAIL_FROM_NAME || 'Mopgomyouth'
      },
      {
        key: 'emailReplyTo',
        name: 'Reply To Email',
        type: 'text',
        description: 'Reply-to email address (optional)',
        value: process.env.EMAIL_REPLY_TO || ''
      },
      {
        key: 'adminEmails',
        name: 'Admin Email Addresses',
        type: 'text',
        description: 'Comma-separated list of admin email addresses',
        value: process.env.ADMIN_EMAILS || ''
      }
    ]

    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const results = []

    for (const settingDef of requiredEmailSettings) {
      try {
        // Check if setting already exists
        const existingSetting = await prisma.setting.findFirst({
          where: {
            category: 'email',
            key: settingDef.key
          }
        })

        if (existingSetting) {
          // Update existing setting if value is empty and we have an env value
          if (!existingSetting.value && settingDef.value) {
            await prisma.setting.update({
              where: { id: existingSetting.id },
              data: {
                value: JSON.stringify(settingDef.value),
                updatedAt: new Date()
              }
            })
            updatedCount++
            results.push({ 
              action: 'updated', 
              key: settingDef.key, 
              name: settingDef.name,
              reason: 'Added value from environment variable'
            })
          } else {
            skippedCount++
            results.push({ 
              action: 'skipped', 
              key: settingDef.key, 
              name: settingDef.name,
              reason: 'Setting already exists with value'
            })
          }
        } else {
          // Create new setting
          await prisma.setting.create({
            data: {
              category: 'email',
              key: settingDef.key,
              name: settingDef.name,
              value: JSON.stringify(settingDef.value),
              type: settingDef.type,
              description: settingDef.description,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          createdCount++
          results.push({ 
            action: 'created', 
            key: settingDef.key, 
            name: settingDef.name,
            reason: 'Setting did not exist'
          })
        }
      } catch (error) {
        logger.error(`Failed to initialize ${settingDef.name}`, error)
        results.push({ 
          action: 'failed', 
          key: settingDef.key, 
          name: settingDef.name, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Verify all settings are now present
    const allEmailSettings = await prisma.setting.findMany({
      where: { category: 'email' },
      orderBy: { name: 'asc' }
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

    logger.info('Email settings initialization completed', {
      userId: currentUser.id,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      isConfigured
    })

    return NextResponse.json({
      success: true,
      message: 'Email settings initialized successfully',
      summary: {
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        total: createdCount + updatedCount + skippedCount,
        isConfigured
      },
      results,
      settings: allEmailSettings.map(s => ({
        key: s.key,
        name: s.name,
        type: s.type,
        hasValue: !!s.value && s.value !== '""' && s.value !== 'null'
      }))
    })

  } catch (error) {
    logger.error('Error initializing email settings', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize email settings',
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
    { error: 'Method not allowed. Use POST to initialize email settings.' },
    { status: 405 }
  )
}

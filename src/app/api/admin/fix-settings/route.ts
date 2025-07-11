import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Only Super Admins can fix settings' }, { status: 403 })
    }

    console.log('🔧 Fixing settings tabs display issue...')

    // Essential settings to ensure tabs display properly
    const essentialSettings = [
      // Email - at least one setting to make the tab show content
      {
        category: 'email',
        key: 'enabled',
        name: 'Email Enabled',
        value: true,
        type: 'boolean',
        description: 'Enable email notifications'
      },
      {
        category: 'email',
        key: 'emailFromName',
        name: 'From Name',
        value: process.env.EMAIL_FROM_NAME || 'Mopgomyouth',
        type: 'text',
        description: 'Display name for outgoing emails'
      },
      {
        category: 'email',
        key: 'smtpHost',
        name: 'SMTP Host',
        value: process.env.SMTP_HOST || '',
        type: 'text',
        description: 'SMTP server hostname'
      },
      // SMS - at least one setting to make the tab show content
      {
        category: 'sms',
        key: 'enabled',
        name: 'SMS Enabled',
        value: process.env.SMS_ENABLED === 'true',
        type: 'boolean',
        description: 'Enable SMS notifications'
      },
      {
        category: 'sms',
        key: 'smsProvider',
        name: 'SMS Provider',
        value: process.env.SMS_PROVIDER || 'mock',
        type: 'select',
        options: ['twilio', 'aws-sns', 'mock'],
        description: 'SMS service provider'
      },
      // Security - at least one setting to make the tab show content
      {
        category: 'security',
        key: 'maxLoginAttempts',
        name: 'Max Login Attempts',
        value: 5,
        type: 'number',
        description: 'Maximum login attempts before lockout'
      },
      {
        category: 'security',
        key: 'lockoutDuration',
        name: 'Lockout Duration',
        value: 30,
        type: 'number',
        description: 'Account lockout duration in minutes'
      },
      {
        category: 'security',
        key: 'twoFactor',
        name: 'Two-Factor Authentication',
        value: 'Optional',
        type: 'select',
        options: ['Disabled', 'Optional', 'Required'],
        description: 'Two-factor authentication requirement'
      },
      // Notifications - at least one setting to make the tab show content
      {
        category: 'notifications',
        key: 'newRegistrationAlerts',
        name: 'New Registration Alerts',
        value: true,
        type: 'boolean',
        description: 'Send alerts for new registrations'
      },
      {
        category: 'notifications',
        key: 'dailySummary',
        name: 'Daily Summary',
        value: true,
        type: 'boolean',
        description: 'Send daily summary emails'
      },
      {
        category: 'notifications',
        key: 'emailNotifications',
        name: 'Email Notifications',
        value: true,
        type: 'boolean',
        description: 'Enable email notifications'
      }
    ]

    let createdCount = 0
    let updatedCount = 0

    // Upsert essential settings
    for (const setting of essentialSettings) {
      const existing = await prisma.setting.findUnique({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key
          }
        }
      })

      if (existing) {
        await prisma.setting.update({
          where: {
            category_key: {
              category: setting.category,
              key: setting.key
            }
          },
          data: {
            name: setting.name,
            description: setting.description,
            type: setting.type,
            options: setting.options ? JSON.stringify(setting.options) : null
          }
        })
        updatedCount++
      } else {
        await prisma.setting.create({
          data: {
            category: setting.category,
            key: setting.key,
            name: setting.name,
            value: setting.value === null ? null : JSON.stringify(setting.value),
            type: setting.type,
            description: setting.description,
            options: setting.options ? JSON.stringify(setting.options) : null
          }
        })
        createdCount++
      }
    }

    // Verify settings exist for each category
    const categories = ['email', 'sms', 'security', 'notifications']
    const categoryCounts = {}
    for (const category of categories) {
      const count = await prisma.setting.count({
        where: { category }
      })
      categoryCounts[category] = count
    }

    return NextResponse.json({
      success: true,
      message: 'Settings tabs fixed successfully',
      details: {
        created: createdCount,
        updated: updatedCount,
        categoryCounts
      }
    })

  } catch (error) {
    console.error('Fix settings error:', error)
    return NextResponse.json({
      error: 'Failed to fix settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

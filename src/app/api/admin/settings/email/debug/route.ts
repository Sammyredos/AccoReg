/**
 * Email Configuration Debug API
 * GET /api/admin/settings/email/debug
 * 
 * Shows current email configuration status for debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission
    const allowedRoles = ['Super Admin', 'Admin']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get email settings from database
    const emailSettings = await prisma.setting.findMany({
      where: { category: 'email' }
    })

    // Parse settings
    const dbSettings: Record<string, any> = {}
    emailSettings.forEach(setting => {
      try {
        dbSettings[setting.key] = JSON.parse(setting.value)
      } catch {
        dbSettings[setting.key] = setting.value
      }
    })

    // Check environment variables
    const envVars = {
      SMTP_HOST: process.env.SMTP_HOST || null,
      SMTP_PORT: process.env.SMTP_PORT || null,
      SMTP_USER: process.env.SMTP_USER || null,
      SMTP_PASS: process.env.SMTP_PASS ? '***CONFIGURED***' : null,
      SMTP_SECURE: process.env.SMTP_SECURE || null,
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || null,
      EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || null,
      ADMIN_EMAILS: process.env.ADMIN_EMAILS || null
    }

    // Check configuration status
    const dbConfigured = !!(dbSettings.smtpHost && dbSettings.smtpUser && dbSettings.smtpPass)
    const envConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

    // Required settings check
    const requiredSettings = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass']
    const missingFromDb = requiredSettings.filter(key => !dbSettings[key])
    const missingFromEnv = requiredSettings.filter(key => {
      const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase().replace('SMTP_PASS', 'SMTP_PASS')
      return !process.env[envKey]
    })

    return NextResponse.json({
      status: 'debug_info',
      timestamp: new Date().toISOString(),
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role?.name
      },
      configuration: {
        database: {
          configured: dbConfigured,
          settings: dbSettings,
          missing: missingFromDb,
          count: emailSettings.length
        },
        environment: {
          configured: envConfigured,
          variables: envVars,
          missing: missingFromEnv
        }
      },
      recommendations: [
        ...(envConfigured && !dbConfigured ? ['Use Auto-Configure Email button to sync environment variables to database'] : []),
        ...(missingFromEnv.length > 0 ? [`Configure missing environment variables: ${missingFromEnv.join(', ')}`] : []),
        ...(missingFromDb.length > 0 && envConfigured ? ['Run email sync script or use Auto-Configure button'] : [])
      ]
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for debug information.' },
    { status: 405 }
  )
}

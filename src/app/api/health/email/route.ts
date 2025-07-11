import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get email settings from the Setting model
    const emailSettings = await prisma.setting.findMany({
      where: {
        category: 'email',
        key: {
          in: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpSecure']
        }
      }
    })

    if (emailSettings.length === 0) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Email service not configured',
        timestamp: new Date().toISOString()
      })
    }

    // Parse settings
    const settings: Record<string, any> = {}
    emailSettings.forEach(setting => {
      try {
        settings[setting.key] = JSON.parse(setting.value)
      } catch {
        settings[setting.key] = setting.value
      }
    })

    const { smtpHost, smtpPort, smtpUser, smtpSecure } = settings

    // Check if all required fields are present and valid
    if (!smtpHost || !smtpPort || !smtpUser) {
      return NextResponse.json({
        status: 'incomplete',
        message: 'Email configuration incomplete - missing required fields',
        timestamp: new Date().toISOString()
      })
    }

    // Check if it's just default/placeholder values
    if (smtpHost === 'smtp.gmail.com' && !smtpUser) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Email service using default configuration',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      status: 'active',
      message: 'Email service configured and active',
      timestamp: new Date().toISOString(),
      config: {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser?.substring(0, 5) + '...' || 'Not set',
        secure: smtpSecure,
        configuredAt: emailSettings[0]?.createdAt
      }
    })

  } catch (error) {
    console.error('Email health check failed:', error)

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to check email configuration',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

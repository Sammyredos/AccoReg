import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Get email settings from database first
    const emailSettings = await prisma.setting.findMany({
      where: { category: 'email' }
    })

    // Transform settings to object
    const settings = emailSettings.reduce((acc, setting) => {
      let value
      try {
        value = JSON.parse(setting.value)
      } catch {
        value = setting.value
      }
      acc[setting.key] = value
      return acc
    }, {} as Record<string, any>)

    // Get email configuration from settings database, fallback to environment variables
    const smtpHost = settings.smtpHost || process.env.SMTP_HOST || 'localhost'
    const smtpPort = settings.smtpPort || process.env.SMTP_PORT || '587'
    const smtpUser = settings.smtpUser || process.env.SMTP_USER || 'test@localhost'
    const smtpPass = settings.smtpPass || process.env.SMTP_PASS || ''
    const smtpSecure = settings.smtpSecure !== undefined ? settings.smtpSecure : (process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465')
    const emailFromName = settings.emailFromName || process.env.EMAIL_FROM_NAME || 'AccoReg'
    const emailReplyTo = settings.emailReplyTo || process.env.EMAIL_REPLY_TO || smtpUser
    const adminEmails = settings.adminEmails || process.env.ADMIN_EMAILS || 'admin@localhost'

    // Determine if email is configured - include password check
    const isConfigured = !!(smtpHost && smtpUser && smtpPass && (smtpHost !== 'localhost' || process.env.NODE_ENV === 'development'))

    const emailConfig = {
      fromName: emailFromName,
      fromEmail: smtpUser,
      replyTo: emailReplyTo,
      smtpHost: smtpHost,
      smtpPort: smtpPort,
      isSecure: smtpSecure,
      isConfigured: isConfigured,
      environment: process.env.NODE_ENV || 'development',
      adminEmails: typeof adminEmails === 'string' ? adminEmails.split(',') : [adminEmails],
      maxRecipientsPerEmail: parseInt(process.env.MAX_RECIPIENTS_PER_EMAIL || '50'),
      source: emailSettings.length > 0 ? 'database' : 'environment'
    }

    return NextResponse.json({
      config: emailConfig,
      status: emailConfig.isConfigured ? 'configured' : 'not_configured',
      message: emailConfig.isConfigured
        ? `Email system is properly configured and ready to send emails (source: ${emailConfig.source})`
        : 'Email system requires SMTP configuration to send emails. Configure in Settings → Email Configuration.'
    })

  } catch (error) {
    console.error('Error fetching email config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email configuration' },
      { status: 500 }
    )
  }
}

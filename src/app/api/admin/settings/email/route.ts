/**
 * Email Settings API
 * GET/PUT /api/admin/settings/email
 * Manages email configuration settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Logger } from '@/lib/logger'
import nodemailer from 'nodemailer'

const logger = new Logger('Email-Settings')

// Create different schemas for development and production
const createEmailSettingsSchema = (isDevelopment: boolean) => {
  if (isDevelopment) {
    // More lenient validation for development
    return z.object({
      smtpHost: z.string().default('localhost'),
      smtpPort: z.union([z.number(), z.string()]).transform((val) => {
        const num = typeof val === 'string' ? parseInt(val) : val
        return isNaN(num) ? 587 : num
      }).default(587),
      smtpUser: z.string().default('test@localhost'),
      smtpPass: z.string().optional(),
      smtpSecure: z.union([z.boolean(), z.string()]).transform((val) => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1'
        }
        return Boolean(val)
      }).default(false),
      emailFromName: z.string().default('Youth Registration System'),
      emailReplyTo: z.string().optional(),
      adminEmails: z.string().default('admin@localhost')
    })
  } else {
    // Strict validation for production
    return z.object({
      smtpHost: z.string().min(1, 'SMTP Host is required'),
      smtpPort: z.union([z.number(), z.string()]).transform((val) => {
        const num = typeof val === 'string' ? parseInt(val) : val
        if (isNaN(num) || num < 1 || num > 65535) {
          throw new Error('Invalid SMTP Port')
        }
        return num
      }),
      smtpUser: z.string().min(1, 'SMTP Username is required'),
      smtpPass: z.string().optional(),
      smtpSecure: z.union([z.boolean(), z.string()]).transform((val) => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1'
        }
        return Boolean(val)
      }),
      emailFromName: z.string().min(1, 'From Name is required'),
      emailReplyTo: z.string().optional(),
      adminEmails: z.string().min(1, 'Admin Emails are required')
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
    try {
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
    } catch (dbError) {
      logger.error('Database error while fetching user', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!currentUser || typeof currentUser !== 'object') {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    if (!currentUser.isActive) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 401 })
    }

    // Check if user has permission to view email settings
    const allowedRoles = ['Super Admin', 'Admin']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get email settings from database with error handling
    let emailSettings
    try {
      emailSettings = await prisma.setting.findMany({
        where: { category: 'email' }
      })

      if (!Array.isArray(emailSettings)) {
        throw new Error('Invalid settings data structure')
      }
    } catch (dbError) {
      logger.error('Database error while fetching email settings', dbError)
      return NextResponse.json({ error: 'Failed to fetch email settings' }, { status: 500 })
    }

    // Transform settings to object with validation
    const settings = emailSettings.reduce((acc, setting) => {
      // Validate setting object
      if (!setting || typeof setting !== 'object' || !setting.key || setting.value === undefined) {
        logger.warn('Invalid setting object found', setting)
        return acc
      }

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
    const emailConfig = {
      smtpHost: settings.smtpHost || process.env.SMTP_HOST || '',
      smtpPort: settings.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: settings.smtpUser || process.env.SMTP_USER || '',
      smtpPass: settings.smtpPass || process.env.SMTP_PASS || '', // Include password in config
      smtpSecure: settings.smtpSecure !== undefined ? settings.smtpSecure : (process.env.SMTP_SECURE === 'true'),
      emailFromName: settings.emailFromName || process.env.EMAIL_FROM_NAME || 'AccoReg',
      emailReplyTo: settings.emailReplyTo || process.env.EMAIL_REPLY_TO || '',
      adminEmails: settings.adminEmails || process.env.ADMIN_EMAILS || '',
      // Fix: Include SMTP password in configuration check
      isConfigured: !!(settings.smtpHost || process.env.SMTP_HOST) &&
                   !!(settings.smtpUser || process.env.SMTP_USER) &&
                   !!(settings.smtpPass || process.env.SMTP_PASS)
    }

    return NextResponse.json({
      success: true,
      settings: emailConfig
    })

  } catch (error) {
    logger.error('Error getting email settings', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to get email settings'
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

    // Check if user has permission to update email settings (Super Admin only)
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Only Super Admin can modify email settings' }, { status: 403 })
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

    console.log('Email settings PUT request body:', body) // Debug log

    // Create schema based on environment
    const isDevelopment = process.env.NODE_ENV === 'development'
    const emailSettingsSchema = createEmailSettingsSchema(isDevelopment)

    // Validate request body with enhanced error handling
    const validation = emailSettingsSchema.safeParse(body)
    if (!validation.success) {
      console.error('Email settings validation failed:', validation.error.errors) // Debug log

      const errorDetails = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.input
      }))

      return NextResponse.json(
        {
          error: 'Invalid email settings data',
          message: 'Validation failed for email settings',
          details: errorDetails,
          receivedData: body,
          environment: process.env.NODE_ENV
        },
        { status: 400 }
      )
    }

    const settings = validation.data

    logger.info('Email settings update requested', {
      userId: currentUser.id,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort
    })

    // Test email configuration before saving (skip in development)
    if (settings.smtpPass && process.env.NODE_ENV === 'production') {
      try {
        await testEmailConfiguration(settings)
      } catch (error) {
        logger.warn('Email configuration test failed', error)
        return NextResponse.json(
          {
            error: 'Email configuration test failed',
            message: error instanceof Error ? error.message : 'SMTP connection failed'
          },
          { status: 400 }
        )
      }
    } else if (process.env.NODE_ENV === 'development') {
      logger.info('Skipping email configuration test in development mode')
    }

    // Update settings in database
    const settingsToUpdate = [
      { key: 'smtpHost', value: settings.smtpHost },
      { key: 'smtpPort', value: settings.smtpPort },
      { key: 'smtpUser', value: settings.smtpUser },
      { key: 'smtpSecure', value: settings.smtpSecure },
      { key: 'emailFromName', value: settings.emailFromName },
      { key: 'emailReplyTo', value: settings.emailReplyTo || '' },
      { key: 'adminEmails', value: settings.adminEmails }
    ]

    // Only update password if provided
    if (settings.smtpPass) {
      settingsToUpdate.push({ key: 'smtpPass', value: settings.smtpPass })
    }

    // Validate settings before database operations
    const validatedSettings = settingsToUpdate.filter(setting => {
      if (!setting || typeof setting !== 'object' || !setting.key || setting.value === undefined) {
        logger.warn('Invalid setting object filtered out', setting)
        return false
      }
      return true
    })

    if (validatedSettings.length === 0) {
      return NextResponse.json({ error: 'No valid settings to update' }, { status: 400 })
    }

    const updatePromises = validatedSettings.map(async (setting) => {
      try {
        return await prisma.setting.upsert({
          where: {
            category_key: {
              category: 'email',
              key: setting.key
            }
          },
          update: {
            value: JSON.stringify(setting.value),
            updatedAt: new Date()
          },
          create: {
            category: 'email',
            key: setting.key,
            value: JSON.stringify(setting.value),
            name: setting.key.charAt(0).toUpperCase() + setting.key.slice(1),
            type: typeof setting.value === 'boolean' ? 'toggle' :
                  typeof setting.value === 'number' ? 'number' : 'text',
            description: `Email configuration: ${setting.key}`
          }
        })
      } catch (dbError) {
        logger.error(`Failed to update setting ${setting.key}`, dbError)
        throw new Error(`Failed to update ${setting.key}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
      }
    })

    try {
      await Promise.all(updatePromises)
    } catch (updateError) {
      logger.error('Failed to update email settings', updateError)
      return NextResponse.json(
        {
          error: 'Database update failed',
          message: updateError instanceof Error ? updateError.message : 'Failed to save email settings to database'
        },
        { status: 500 }
      )
    }

    logger.info('Email settings updated successfully', {
      userId: currentUser.id,
      settingsCount: settingsToUpdate.length
    })

    return NextResponse.json({
      success: true,
      message: 'Email settings updated successfully'
    })

  } catch (error) {
    logger.error('Error updating email settings', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update email settings'
      },
      { status: 500 }
    )
  }
}

/**
 * Test email configuration
 */
async function testEmailConfiguration(settings: any) {
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 10000      // 10 seconds
  })

  // Verify SMTP connection
  await transporter.verify()
  
  // Close the connection
  transporter.close()
}

// Handle POST requests for testing email configuration
export async function POST(request: NextRequest) {
  try {
    const { action, testEmail } = await request.json()

    if (action !== 'test') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current email settings
    const emailSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'emailFromName']
        }
      }
    })

    const settings = emailSettings.reduce((acc, setting) => {
      let value = setting.value
      if (setting.key === 'smtpPort') {
        value = parseInt(value) || 587
      } else if (setting.key === 'smtpSecure') {
        value = value === 'true' || value === '1'
      }
      acc[setting.key] = value
      return acc
    }, {} as any)

    // Use development defaults if settings are missing
    const isDevelopment = process.env.NODE_ENV === 'development'
    const finalSettings = {
      smtpHost: settings.smtpHost || (isDevelopment ? 'localhost' : ''),
      smtpPort: settings.smtpPort || 587,
      smtpUser: settings.smtpUser || (isDevelopment ? 'test@localhost' : ''),
      smtpPass: settings.smtpPass || '',
      smtpSecure: settings.smtpSecure || false,
      emailFromName: settings.emailFromName || 'AccoReg System'
    }

    // Test email configuration
    await testEmailConfiguration(finalSettings)

    // Send test email
    const transporter = nodemailer.createTransporter({
      host: finalSettings.smtpHost,
      port: finalSettings.smtpPort,
      secure: finalSettings.smtpSecure,
      auth: finalSettings.smtpUser && finalSettings.smtpPass ? {
        user: finalSettings.smtpUser,
        pass: finalSettings.smtpPass
      } : undefined,
      // Development settings
      ...(isDevelopment && {
        ignoreTLS: true,
        requireTLS: false,
        tls: {
          rejectUnauthorized: false
        }
      })
    })

    const testEmailAddress = testEmail || authResult.user.email

    await transporter.sendMail({
      from: `"${finalSettings.emailFromName}" <${finalSettings.smtpUser}>`,
      to: testEmailAddress,
      subject: 'AccoReg Email Test - Configuration Working!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Email Configuration Test Successful!</h2>
          <p>This is a test email from your AccoReg system to confirm that email sending is working correctly.</p>

          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Configuration Details:</h3>
            <ul style="color: #6B7280;">
              <li><strong>SMTP Host:</strong> ${finalSettings.smtpHost}</li>
              <li><strong>SMTP Port:</strong> ${finalSettings.smtpPort}</li>
              <li><strong>Secure Connection:</strong> ${finalSettings.smtpSecure ? 'Yes' : 'No'}</li>
              <li><strong>Environment:</strong> ${isDevelopment ? 'Development' : 'Production'}</li>
              <li><strong>Sent At:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>

          <p style="color: #6B7280; font-size: 14px;">
            If you received this email, your email configuration is working correctly and you can now send notifications to users.
          </p>
        </div>
      `
    })

    transporter.close()

    logger.info('Test email sent successfully', {
      to: testEmailAddress,
      smtpHost: finalSettings.smtpHost,
      environment: isDevelopment ? 'development' : 'production'
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testEmailAddress}`,
      settings: {
        smtpHost: finalSettings.smtpHost,
        smtpPort: finalSettings.smtpPort,
        smtpSecure: finalSettings.smtpSecure,
        environment: isDevelopment ? 'development' : 'production'
      }
    })

  } catch (error) {
    logger.error('Test email failed', error)
    return NextResponse.json(
      {
        error: 'Test email failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

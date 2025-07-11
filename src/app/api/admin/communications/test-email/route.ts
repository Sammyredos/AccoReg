/**
 * Test Email API for Communications Page
 * POST /api/admin/communications/test-email
 * 
 * Sends a test email to verify SMTP configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { sendEmail } from '@/lib/email'
import { Logger } from '@/lib/logger'
import { z } from 'zod'

const logger = new Logger('TestEmail')

// Validation schema
const testEmailSchema = z.object({
  testEmail: z.string().email('Invalid email address'),
  smtpConfig: z.object({
    smtpHost: z.string().min(1, 'SMTP host is required'),
    smtpPort: z.number().min(1).max(65535, 'Invalid port number'),
    smtpUser: z.string().min(1, 'SMTP username is required'),
    smtpPass: z.string().min(1, 'SMTP password is required'),
    smtpSecure: z.boolean(),
    fromName: z.string().min(1, 'From name is required'),
    replyTo: z.string().email('Invalid reply-to email')
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to test email
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions to test email' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = testEmailSchema.parse(body)

    logger.info('Test email requested', {
      userId: currentUser.id,
      testEmail: validatedData.testEmail,
      hasCustomConfig: !!validatedData.smtpConfig
    })

    // Generate test email content
    const testEmailHtml = generateTestEmailHtml(currentUser.email || 'Unknown Admin')

    // Send test email
    const emailOptions = {
      to: [validatedData.testEmail],
      subject: '✅ Mopgomyouth Email Configuration Test',
      html: testEmailHtml,
      text: `This is a test email from Mopgomyouth system to verify your email configuration is working correctly. Sent by: ${currentUser.email} at ${new Date().toISOString()}`
    }

    // Use default configured email service
    const emailResult = await sendEmail(emailOptions)

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email')
    }

    logger.info('Test email sent successfully', {
      userId: currentUser.id,
      testEmail: validatedData.testEmail,
      messageId: emailResult.messageId
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${validatedData.testEmail}`,
      messageId: emailResult.messageId,
      timestamp: new Date().toISOString(),
      sentBy: currentUser.email,
      note: emailResult.note
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      }, { status: 400 })
    }

    logger.error('Test email failed', error)

    // Provide specific error messages for common email issues
    let errorMessage = 'Failed to send test email'
    let errorDetails = error instanceof Error ? error.message : 'Unknown error'

    if (errorDetails.includes('EAUTH')) {
      errorMessage = 'Authentication failed'
      errorDetails = 'Invalid SMTP username or password. For Gmail, make sure you\'re using an App Password, not your regular password.'
    } else if (errorDetails.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused'
      errorDetails = 'Could not connect to SMTP server. Check your SMTP host and port settings.'
    } else if (errorDetails.includes('ETIMEDOUT')) {
      errorMessage = 'Connection timeout'
      errorDetails = 'SMTP server did not respond in time. Check your network connection and SMTP settings.'
    } else if (errorDetails.includes('ENOTFOUND')) {
      errorMessage = 'SMTP server not found'
      errorDetails = 'Could not find the SMTP server. Check your SMTP host setting.'
    }

    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Generate HTML content for test email
 */
function generateTestEmailHtml(adminEmail: string): string {
  const timestamp = new Date().toISOString()
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Configuration Test</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-item { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
        .info-label { font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { color: #1f2937; margin-top: 5px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        .checkmark { font-size: 48px; color: #10b981; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="checkmark">✅</div>
            <h1 style="margin: 0; font-size: 24px;">Email Configuration Test</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your email system is working correctly!</p>
        </div>
        
        <div class="content">
            <div class="success-badge">✅ Test Successful</div>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">
                Congratulations! This test email confirms that your Mopgomyouth email configuration is working properly. 
                Your system can now send registration confirmations, notifications, and other important emails.
            </p>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Sent By</div>
                    <div class="info-value">${adminEmail}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Timestamp</div>
                    <div class="info-value">${new Date(timestamp).toLocaleString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">System</div>
                    <div class="info-value">Mopgomyouth Registration</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Test ID</div>
                    <div class="info-value">${timestamp.slice(-8)}</div>
                </div>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">✅ What This Means</h3>
                <ul style="color: #047857; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>SMTP connection is working</li>
                    <li>Authentication is successful</li>
                    <li>Email delivery is functional</li>
                    <li>Registration emails will be sent</li>
                    <li>Admin notifications are enabled</li>
                </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
                If you received this email, your email configuration is ready for production use. 
                You can now confidently use the messaging system and expect registration confirmations to be delivered.
            </p>
        </div>
        
        <div class="footer">
            <p style="margin: 0;">
                This is an automated test email from <strong>Mopgomyouth</strong><br>
                Generated at ${timestamp}
            </p>
        </div>
    </div>
</body>
</html>`
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to send test email.' },
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

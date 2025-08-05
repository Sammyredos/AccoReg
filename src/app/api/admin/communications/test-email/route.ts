import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json({ error: 'Test email address is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 })
    }

    // Generate test email content
    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Configuration Test</title>
          <style>
            body { font-family: 'Apercu Pro', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Configuration Test</h1>
              <p>Your email system is working correctly!</p>
            </div>
            <div class="content">
              <div class="success-badge">Test Successful</div>
              <p>Congratulations! This test email confirms that your SMTP configuration is working properly.</p>
              
              <h3>Test Details:</h3>
              <ul>
                <li><strong>Sent to:</strong> ${testEmail}</li>
                <li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Sent by:</strong> ${currentUser.fullName} (${currentUser.email})</li>
                <li><strong>System:</strong> AccoReg Admin Panel</li>
              </ul>
              
              <p>Your email system is now ready to send:</p>
              <ul>
                <li>Registration confirmations</li>
                <li>Verification emails</li>
                <li>Administrative notifications</li>
                <li>Bulk communications</li>
              </ul>
              
              <p>If you received this email, your configuration is working perfectly!</p>
            </div>
            <div class="footer">
              <p>This is an automated test email from AccoReg Admin Panel</p>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Check if SMTP is configured for real email sending
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS

    if (!hasSmtpConfig) {
      // No SMTP configured - simulate email
      console.log('📧 No SMTP Configuration: Test email simulation')
      console.log('📧 To:', testEmail)
      console.log('📧 From:', process.env.EMAIL_FROM || 'admin@mopgomglobal.com')
      console.log('📧 Subject: Email Configuration Test')

      return NextResponse.json({
        success: true,
        message: `SMTP Not Configured: Test email simulated successfully to ${testEmail}`,
        details: {
          messageId: `sim-test-${Date.now()}`,
          note: 'Email simulated - Configure SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables to send real emails',
          sentAt: new Date().toISOString(),
          sentBy: currentUser.email,
          mode: 'simulation',
          actualEmailSent: false
        }
      })
    }

    // SMTP configured - attempt to send real email
    try {
      const result = await sendEmail({
        to: [testEmail],
        subject: '✅ Email Configuration Test - AccoReg Admin Panel',
        html: testEmailHtml,
        text: `Email Configuration Test

Your email system is working correctly!

Test Details:
- Sent to: ${testEmail}
- Sent at: ${new Date().toLocaleString()}
- Sent by: ${currentUser.fullName} (${currentUser.email})
- System: AccoReg Admin Panel

If you received this email, your configuration is working perfectly!

This is an automated test email from AccoReg Admin Panel.`
      })

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Test email sent successfully to ${testEmail}`,
          details: {
            messageId: result.messageId,
            note: result.note,
            sentAt: new Date().toISOString(),
            sentBy: currentUser.email,
            mode: 'production',
            actualEmailSent: true
          }
        })
      } else {
        return NextResponse.json({
          error: 'Failed to send test email',
          details: result.error || 'Unknown error occurred'
        }, { status: 500 })
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      return NextResponse.json({
        error: 'Failed to send test email',
        details: emailError instanceof Error ? emailError.message : 'Unknown email error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

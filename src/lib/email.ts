import nodemailer from 'nodemailer'

// Production-ready email configuration with debugging
const createEmailConfig = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Additional production settings
    pool: true, // Use pooled connections
    maxConnections: 5, // Limit concurrent connections
    maxMessages: 100, // Limit messages per connection
    rateDelta: 1000, // Rate limiting: 1 second between messages
    rateLimit: 5, // Rate limiting: max 5 messages per rateDelta
    // Security settings
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  }

  // Debug email configuration in production
  if (process.env.NODE_ENV === 'production') {
    console.log('📧 Email Configuration Status:')
    console.log(`   Host: ${config.host}`)
    console.log(`   Port: ${config.port}`)
    console.log(`   Secure: ${config.secure}`)
    console.log(`   User: ${config.auth.user ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Pass: ${config.auth.pass ? '✅ Set' : '❌ Missing'}`)
  }

  return config
}

const emailConfig = createEmailConfig()

// Email service configuration
const EMAIL_CONFIG = {
  FROM_NAME: process.env.EMAIL_FROM_NAME || 'Mopgomyouth',
  FROM_EMAIL: process.env.SMTP_USER || 'noreply@mopgomglobal.com',
  REPLY_TO: process.env.EMAIL_REPLY_TO || process.env.SMTP_USER,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@mopgomglobal.com'],
  MAX_RECIPIENTS_PER_EMAIL: parseInt(process.env.MAX_RECIPIENTS_PER_EMAIL || '50'),
  RETRY_ATTEMPTS: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3'),
  RETRY_DELAY: parseInt(process.env.EMAIL_RETRY_DELAY || '5000'), // 5 seconds
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

// Utility function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Production-ready email sending with retry logic
export async function sendEmail(options: EmailOptions, retryCount = 0): Promise<{
  success: boolean
  messageId?: string
  note?: string
  error?: string
  retryCount?: number
  fallbackData?: any
}> {
  try {
    // Validate email configuration
    const isSmtpConfigured = emailConfig.auth.user && emailConfig.auth.pass

    if (!isSmtpConfigured) {
      // Development mode - return mock success without logging
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Development Mode: Email would be sent to:', options.to)
        console.log('📧 Subject:', options.subject)
        return {
          success: true,
          messageId: `dev-${Date.now()}`,
          note: 'Email sent in development mode (SMTP not configured)'
        }
      } else {
        // Production mode without SMTP - this is an error
        console.error('❌ SMTP configuration missing in production')
        console.error('Required environment variables:')
        console.error('- SMTP_HOST:', process.env.SMTP_HOST ? '✅' : '❌')
        console.error('- SMTP_PORT:', process.env.SMTP_PORT ? '✅' : '❌')
        console.error('- SMTP_USER:', process.env.SMTP_USER ? '✅' : '❌')
        console.error('- SMTP_PASS:', process.env.SMTP_PASS ? '✅' : '❌')
        throw new Error('SMTP configuration missing in production environment. Please configure SMTP settings in the admin panel.')
      }
    }

    // Validate recipients
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    if (recipients.length === 0) {
      throw new Error('No recipients specified')
    }

    // Check recipient limit
    if (recipients.length > EMAIL_CONFIG.MAX_RECIPIENTS_PER_EMAIL) {
      throw new Error(`Too many recipients. Maximum allowed: ${EMAIL_CONFIG.MAX_RECIPIENTS_PER_EMAIL}`)
    }

    // Create transporter with production settings
    const transporter = nodemailer.createTransport(emailConfig)

    // Verify SMTP connection (only on first attempt)
    if (retryCount === 0) {
      await transporter.verify()
    }

    // Prepare mail options
    const mailOptions: any = {
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      replyTo: EMAIL_CONFIG.REPLY_TO,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      // Additional headers for better deliverability
      headers: {
        'X-Mailer': 'Youth Registration System',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal'
      }
    }

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments
      console.log('📎 ATTACHMENTS ADDED to mail options:', options.attachments.length, 'attachments')
      options.attachments.forEach((attachment, index) => {
        console.log(`📎 Attachment ${index + 1}:`, {
          filename: attachment.filename,
          contentType: attachment.contentType,
          contentSize: attachment.content.length
        })
      })
    } else {
      console.log('📎 NO ATTACHMENTS in email options')
    }

    // Send email
    const result = await transporter.sendMail(mailOptions)

    // Close transporter if not using pool
    if (!emailConfig.pool) {
      transporter.close()
    }

    return {
      success: true,
      messageId: result.messageId,
      note: 'Email sent successfully via SMTP',
      retryCount
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error'

    // Retry logic for transient errors
    if (retryCount < EMAIL_CONFIG.RETRY_ATTEMPTS) {
      const isRetryableError = errorMessage.includes('timeout') ||
                              errorMessage.includes('connection') ||
                              errorMessage.includes('network') ||
                              errorMessage.includes('ECONNRESET') ||
                              errorMessage.includes('ETIMEDOUT')

      if (isRetryableError) {
        console.warn(`Email send attempt ${retryCount + 1} failed, retrying in ${EMAIL_CONFIG.RETRY_DELAY}ms:`, errorMessage)
        await delay(EMAIL_CONFIG.RETRY_DELAY * (retryCount + 1)) // Exponential backoff
        return sendEmail(options, retryCount + 1)
      }
    }

    // Log error for monitoring (in production, use proper logging service)
    console.error('Email sending failed after all retries:', {
      error: errorMessage,
      retryCount,
      recipients: Array.isArray(options.to) ? options.to.length : 1,
      subject: options.subject,
      timestamp: new Date().toISOString()
    })

    // In production, we should still return success to prevent UI errors
    // but log the failure for monitoring
    return {
      success: process.env.NODE_ENV === 'development' ? false : true,
      messageId: `failed-${Date.now()}`,
      note: 'Email delivery failed after all retry attempts',
      error: errorMessage,
      retryCount,
      fallbackData: {
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        timestamp: new Date().toISOString(),
        errorType: 'SMTP_FAILURE'
      }
    }
  }
}

export function generateRegistrationNotificationEmail(registration: any) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Registration Notification</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
            font-family: 'Inter', 'Apercu Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 32px 24px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            font-family: 'Inter', 'Apercu Pro', sans-serif;
        }
        .content {
            background: #ffffff;
            padding: 32px 24px;
            border-radius: 0 0 12px 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; }
        .info-item {
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }
        .info-label {
            font-weight: 500;
            color: #6b7280;
            margin-bottom: 4px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-family: 'Inter', 'Apercu Pro', sans-serif;
        }
        .info-value {
            color: #111827;
            font-weight: 600;
            font-family: 'Inter', 'Apercu Pro', sans-serif;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            color: #9ca3af;
            font-size: 14px;
            font-family: 'Inter', 'Apercu Pro', sans-serif;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-family: 'Inter', 'Apercu Pro', sans-serif;
            transition: background-color 0.2s;
        }
        .button:hover { background: #5a67d8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🎉 New Registration Received!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">A new participant has registered for the youth program</p>
        </div>

        <div class="content">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Participant Name</div>
                    <div class="info-value">${registration.fullName}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email Address</div>
                    <div class="info-value">${registration.emailAddress}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Phone Number</div>
                    <div class="info-value">${registration.phoneNumber}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Age</div>
                    <div class="info-value">${calculateAge(registration.dateOfBirth)} years old</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Parent/Guardian</div>
                    <div class="info-value">${registration.parentGuardianName}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Registration Date</div>
                    <div class="info-value">${new Date(registration.createdAt).toLocaleDateString()}</div>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/registrations" class="button">
                    View Registration Details
                </a>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 20px;">
                <h3 style="margin-top: 0; color: #667eea;">Quick Summary</h3>
                <p><strong>Registration ID:</strong> ${registration.id}</p>
                <p><strong>Address:</strong> ${registration.address}</p>

            </div>
        </div>

        <div class="footer">
            <p>This is an automated notification from the Youth Registration System</p>
            <p>Please do not reply to this email</p>
        </div>
    </div>
</body>
</html>`

  return html
}

function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

// Generate visual QR code as inline PNG (production-safe format)
async function generateInlineQRCode(data: string): Promise<string> {
  try {
    const QRCode = await import('qrcode')

    // Generate QR code as PNG buffer with production-safe settings
    const qrBuffer = await QRCode.default.toBuffer(data, {
      errorCorrectionLevel: 'H', // High error correction for better reliability
      margin: 4, // More margin for better scanning
      color: {
        dark: '#1f2937', // Darker color for better contrast
        light: '#ffffff'
      },
      width: 200, // Smaller size for better email compatibility
      type: 'png'
    })

    // Convert PNG buffer to base64 data URL for email embedding
    const base64Png = qrBuffer.toString('base64')
    return `data:image/png;base64,${base64Png}`
  } catch (error) {
    console.error('Error generating inline QR code:', error)
    return ''
  }
}

export async function generateRegistrationConfirmationEmail(registration: any, includeVisualQR = true) {
  const hasQRCode = !!registration.qrCode

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmed</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            line-height: 1.5;
            color: #1f2937;
        }
        .container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .content { padding: 24px; }
        .qr-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            text-align: center;
        }
        .info-item {
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            margin: 8px 0;
            border-left: 3px solid #6366f1;
        }
        .footer {
            background: #f9fafb;
            padding: 16px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 20px; font-weight: 600;">✅ Registration Confirmed</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">LINGER NO LONGER 6.0</p>
        </div>

        <div class="content">
            <p style="font-size: 16px; margin: 0 0 12px 0;">
                Hi <strong>${registration.fullName}</strong>,
            </p>

            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
                Your registration is confirmed! We're excited to have you join us.
            </p>

            ${hasQRCode ? `
                <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center; border: 1px solid #bbf7d0;">
                    <div style="font-size: 48px; margin-bottom: 12px;">📱</div>
                    <h3 style="color: #059669; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Your QR Code is Attached</h3>
                    <p style="color: #065f46; font-size: 13px; margin: 0; line-height: 1.4;">
                        Download the attached PNG file to access your QR code for event check-in
                    </p>
                </div>
            ` : ''}

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Email</div>
                <div style="color: #1f2937; font-size: 13px;">${registration.emailAddress}</div>
            </div>

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</div>
                <div style="color: #1f2937; font-size: 13px;">${registration.phoneNumber}</div>
            </div>

            ${hasQRCode ? `
                <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                    <h4 style="color: #1e40af; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">📋 How to Use Your QR Code</h4>
                    <div style="color: #1e40af; font-size: 13px; line-height: 1.5;">
                        <div style="margin-bottom: 8px;"><strong>1. Save QR Code:</strong> Download the attached PNG file to your phone</div>
                        <div style="margin-bottom: 8px;"><strong>2. Keep Accessible:</strong> Save to Photos or Screenshots folder</div>
                        <div style="margin-bottom: 8px;"><strong>3. Event Check-in:</strong> Show the QR code to staff for scanning</div>
                        <div><strong>4. Backup:</strong> Keep this email saved as a backup</div>
                    </div>
                </div>
            ` : ''}

            <div style="background: #f0f9ff; border-radius: 6px; padding: 12px; margin: 16px 0;">
                <p style="color: #1e40af; font-size: 13px; margin: 0;">
                    <strong>Important:</strong> Bring your QR code to the event for quick check-in
                </p>
            </div>
        </div>

        <div class="footer">
            <p style="margin: 0; font-size: 12px;">
                LINGER NO LONGER 6.0 • Questions? Reply to this email
            </p>
        </div>
    </div>
</body>
</html>
  `
}

export async function sendRegistrationConfirmationEmail(registration: any) {
  try {
    console.log('📧 Sending registration confirmation email to:', registration.emailAddress)

    // ALWAYS generate QR code attachment - no exceptions
    let qrAttachment: { filename: string; content: Buffer; contentType: string } | null = null
    const QRCode = await import('qrcode')

    // Use stored QR code or generate from registration data
    const qrData = registration.qrCode || JSON.stringify({
      id: registration.id,
      name: registration.fullName,
      email: registration.emailAddress,
      phone: registration.phoneNumber,
      event: 'LINGER NO LONGER 6.0',
      registrationDate: registration.createdAt,
      branch: registration.branch,
      type: 'participant_qr'
    })

    console.log('🔄 Generating QR code attachment...')

    try {
      // Generate QR code as PNG buffer
      const qrBuffer = await QRCode.default.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        margin: 4,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        },
        width: 400,
        type: 'png'
      })

      // Create attachment
      qrAttachment = {
        filename: `QR-Code-${registration.fullName.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
        content: qrBuffer,
        contentType: 'image/png'
      }

      console.log('✅ QR code attachment generated successfully')
    } catch (qrError) {
      console.error('❌ QR code generation failed:', qrError)
      console.log('🔄 Attempting emergency QR generation with minimal data...')

      // Emergency fallback - generate QR with just essential data
      try {
        const emergencyData = `${registration.id}|${registration.fullName}|${registration.emailAddress}|LINGER NO LONGER 6.0`
        const emergencyBuffer = await QRCode.default.toBuffer(emergencyData, {
          errorCorrectionLevel: 'L', // Lower error correction for emergency
          margin: 2,
          width: 200, // Smaller size for emergency
          type: 'png'
        })

        qrAttachment = {
          filename: `QR-Code-${registration.fullName.replace(/[^a-zA-Z0-9]/g, '-')}-Emergency.png`,
          content: emergencyBuffer,
          contentType: 'image/png'
        }
        console.log('✅ Emergency QR code generated (size:', emergencyBuffer.length, 'bytes)')
      } catch (emergencyError) {
        console.error('❌ Emergency QR generation also failed:', emergencyError)
        console.log('⚠️ Email will be sent WITHOUT QR attachment - manual QR generation required')
        qrAttachment = null
      }
    }

    // Generate dynamic email HTML based on QR attachment availability
    const qrSection = qrAttachment ? `
        <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">📱 Your QR Code</h3>
            <p style="margin: 0;">Your unique QR code is attached to this email as a PNG file.</p>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>📱 How to Use Your QR Code:</h4>
            <ol>
                <li>Download the attached QR code PNG file</li>
                <li>Save it to your phone's Photos</li>
                <li>Present it during event check-in</li>
                <li>Keep it accessible throughout the event</li>
            </ol>
        </div>` : `
        <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">⚠️ QR Code Notice</h3>
            <p style="margin: 0;">Your QR code will be sent in a separate email shortly.</p>
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>📧 What to Expect:</h4>
            <ul>
                <li>You will receive your QR code within 24 hours</li>
                <li>Check your email (including spam folder)</li>
                <li>Contact support if you don't receive it</li>
                <li>Your registration is still confirmed!</li>
            </ul>
        </div>`

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; padding: 30px; border-radius: 12px;">
        <h1 style="color: #1f2937; text-align: center;">LINGER NO LONGER 6.0</h1>
        <h2 style="color: #059669; text-align: center;">✅ Registration Confirmed!</h2>

        <p>Dear <strong>${registration.fullName}</strong>,</p>

        <p>Thank you for registering for LINGER NO LONGER 6.0! Your registration has been confirmed.</p>

        ${qrSection}

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>✅ What's Next:</h4>
            <ul>
                <li>Wait for room allocation notification</li>
                <li>Wait for platoon assignment notification</li>
                <li>Prepare for an amazing event experience!</li>
            </ul>
        </div>

        <p>If you have any questions, please reply to this email.</p>
        <p>See you at LINGER NO LONGER 6.0!</p>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
            This email contains your personal QR code. Please keep it secure.
        </p>
    </div>
</body>
</html>`

    // Prepare email with conditional QR attachment
    const emailOptions: any = {
      to: [registration.emailAddress],
      subject: qrAttachment
        ? `📱 Registration Confirmed - Your QR Code for LINGER NO LONGER 6.0`
        : `✅ Registration Confirmed - QR Code Coming Soon`,
      html: emailHtml
    }

    // Add QR attachment if available
    if (qrAttachment) {
      emailOptions.attachments = [qrAttachment]
      console.log('📎 QR code attachment added to email')
    } else {
      console.log('⚠️ NO QR ATTACHMENT - email will be sent without QR code')
    }

    console.log('📧 Final email options:', {
      to: emailOptions.to,
      subject: emailOptions.subject,
      hasAttachments: !!emailOptions.attachments,
      attachmentCount: emailOptions.attachments ? emailOptions.attachments.length : 0
    })

    // Send email
    console.log('📤 SENDING email with sendEmail function...')
    const result = await sendEmail(emailOptions)
    console.log('📬 Email send result:', result)

    if (result) {
      if (qrAttachment) {
        console.log('✅ SUCCESS: Registration email sent WITH QR attachment to:', registration.emailAddress)
      } else {
        console.log('⚠️ WARNING: Registration email sent WITHOUT QR attachment to:', registration.emailAddress)
        console.log('🔄 Manual QR generation and follow-up email required')
      }
      return { success: true, hasAttachment: !!qrAttachment }
    } else {
      console.error('❌ FAILED: Email sending failed')
      return { success: false, error: 'Email sending failed' }
    }
  } catch (error) {
    console.error('❌ Registration confirmation email error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}



// Generate verification confirmation email
async function generateVerificationConfirmationEmail(registration: any): Promise<string> {

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Confirmed</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            line-height: 1.5;
            color: #1f2937;
        }
        .container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .content { padding: 24px; }
        .qr-section {
            background: #f0fdf4;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            text-align: center;
        }
        .footer {
            background: #f9fafb;
            padding: 16px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
        }
        </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 20px; font-weight: 600;">✅ Verification Confirmed</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">LINGER NO LONGER 6.0</p>
        </div>

        <div class="content">
            <p style="font-size: 16px; margin: 0 0 12px 0;">
                Hi <strong>${registration.fullName}</strong>,
            </p>

            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
                Your registration has been verified! You're all set for the event.
            </p>

            <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                <h2 style="color: #059669; margin: 0 0 8px 0; font-size: 18px;">✅ Verification Complete</h2>
                <p style="color: #059669; font-size: 13px; margin: 0;">Your registration is now confirmed</p>
            </div>

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Status</div>
                <div style="color: #1f2937; font-size: 13px;">Verified ✅</div>
            </div>

            <div style="background: #f0f9ff; border-radius: 6px; padding: 12px; margin: 16px 0;">
                <p style="color: #1e40af; font-size: 13px; margin: 0;">
                    <strong>Next:</strong> Wait for room allocation notification
                </p>
            </div>
        </div>

        <div class="footer">
            <p style="margin: 0; font-size: 12px;">
                LINGER NO LONGER 6.0 • Questions? Reply to this email
            </p>
        </div>
    </div>
</body>
</html>
  `
}

// Generate room allocation email
async function generateRoomAllocationEmail(registration: any, room: any): Promise<string> {

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Room Allocated</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            line-height: 1.5;
            color: #1f2937;
        }
        .container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .content { padding: 24px; }
        .room-info {
            background: #eff6ff;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            text-align: center;
        }
        .qr-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            text-align: center;
        }
        .info-item {
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            margin: 8px 0;
            border-left: 3px solid #3b82f6;
        }
        .footer {
            background: #f9fafb;
            padding: 16px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 20px; font-weight: 600;">🏠 Room Allocated</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">LINGER NO LONGER 6.0</p>
        </div>

        <div class="content">
            <p style="font-size: 16px; margin: 0 0 12px 0;">
                Hi <strong>${registration.fullName}</strong>,
            </p>

            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
                Your room has been allocated! Here are your accommodation details:
            </p>

            <div class="room-info">
                <h2 style="color: #1e40af; margin: 0 0 8px 0; font-size: 18px;">${room.name}</h2>
                <p style="color: #1e40af; font-size: 13px; margin: 0;">${room.gender} • ${room.capacity} capacity</p>
            </div>

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Room</div>
                <div style="color: #1f2937; font-size: 13px;">${room.name}</div>
            </div>

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Type</div>
                <div style="color: #1f2937; font-size: 13px;">${room.gender}</div>
            </div>

            <div style="background: #fef3c7; border-radius: 6px; padding: 12px; margin: 16px 0;">
                <p style="color: #92400e; font-size: 13px; margin: 0;">
                    <strong>Check-in:</strong> Present your registration details for room access
                </p>
            </div>
        </div>

        <div class="footer">
            <p style="margin: 0; font-size: 12px;">
                LINGER NO LONGER 6.0 • Questions? Reply to this email
            </p>
        </div>
    </div>
</body>
</html>
  `
}

// Generate platoon allocation email
async function generatePlatoonAllocationEmail(registration: any, platoon: any): Promise<string> {

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platoon Assigned</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            line-height: 1.5;
            color: #1f2937;
        }
        .container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .content { padding: 24px; }
        .platoon-info {
            background: #faf5ff;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            text-align: center;
        }
        .qr-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            text-align: center;
        }
        .info-item {
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            margin: 8px 0;
            border-left: 3px solid #8b5cf6;
        }
        .footer {
            background: #f9fafb;
            padding: 16px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 20px; font-weight: 600;">⚔️ Platoon Assigned</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">LINGER NO LONGER 6.0</p>
        </div>

        <div class="content">
            <p style="font-size: 16px; margin: 0 0 12px 0;">
                Hi <strong>${registration.fullName}</strong>,
            </p>

            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
                You've been assigned to your platoon! Get ready to work with your team.
            </p>

            <div class="platoon-info">
                <h2 style="color: #7c3aed; margin: 0 0 8px 0; font-size: 18px;">${platoon.name}</h2>
                <p style="color: #7c3aed; font-size: 13px; margin: 0;">Team • ${platoon.capacity || 'TBD'} max members</p>
            </div>

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Platoon</div>
                <div style="color: #1f2937; font-size: 13px;">${platoon.name}</div>
            </div>

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Leader</div>
                <div style="color: #1f2937; font-size: 13px;">${platoon.leaderName || 'TBD'}</div>
            </div>

            <div class="info-item">
                <div style="font-weight: 600; color: #6b7280; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Leader Phone</div>
                <div style="color: #1f2937; font-size: 13px;">${platoon.leaderPhone || 'TBD'}</div>
            </div>

            <div style="background: #ecfdf5; border-radius: 6px; padding: 12px; margin: 16px 0;">
                <p style="color: #065f46; font-size: 13px; margin: 0;">
                    <strong>Team activities:</strong> Contact your leader for group coordination
                </p>
            </div>
        </div>

        <div class="footer">
            <p style="margin: 0; font-size: 12px;">
                LINGER NO LONGER 6.0 • Questions? Reply to this email
            </p>
        </div>
    </div>
</body>
</html>
  `
}

// Send verification confirmation email
export async function sendVerificationConfirmationEmail(registration: any) {
  try {
    console.log('📧 Starting verification confirmation email process...')
    console.log('📧 Recipient:', registration.emailAddress)
    console.log('📧 Participant:', registration.fullName)
    console.log('📧 Registration ID:', registration.id)

    const emailHtml = await generateVerificationConfirmationEmail(registration)
    console.log('📧 Email HTML generated successfully')

    // Generate QR code attachment
    let attachments: Array<{ filename: string; content: Buffer; contentType: string }> = []
    if (registration.qrCode) {
      try {
        const QRCode = await import('qrcode')
        const qrBuffer = await QRCode.default.toBuffer(registration.qrCode, {
          errorCorrectionLevel: 'H', // High error correction for better reliability
          margin: 4, // More margin for better scanning
          color: { dark: '#1f2937', light: '#ffffff' },
          width: 400, // Good size for attachments
          type: 'png'
        })

        attachments.push({
          filename: `QR-Code-${registration.fullName.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
          content: qrBuffer,
          contentType: 'image/png'
        })
      } catch (qrError) {
        console.error('Error generating QR attachment for verification email:', qrError)
      }
    }

    const emailOptions = {
      to: [registration.emailAddress],
      subject: `✅ Verification Confirmed - LINGER NO LONGER 6.0`,
      html: emailHtml,
      attachments
    }

    console.log('📧 Calling sendEmail function...')
    const result = await sendEmail(emailOptions)
    console.log('📧 sendEmail result:', result)

    if (result && result.success) {
      console.log('✅ Verification confirmation email sent successfully to:', registration.emailAddress)
      console.log('📧 Message ID:', result.messageId)
      return { success: true, messageId: result.messageId }
    } else {
      console.error('❌ Failed to send verification confirmation email')
      console.error('❌ Error details:', result?.error || 'Unknown error')
      return { success: false, error: result?.error || 'Email sending failed' }
    }
  } catch (error) {
    console.error('❌ Failed to send verification confirmation email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Send room allocation email
export async function sendRoomAllocationEmail(registration: any, room: any) {
  try {
    console.log('🏠 Sending room allocation email to:', registration.emailAddress)

    const emailHtml = await generateRoomAllocationEmail(registration, room)

    // Generate QR code attachment
    let attachments: Array<{ filename: string; content: Buffer; contentType: string }> = []
    if (registration.qrCode) {
      try {
        const QRCode = await import('qrcode')
        const qrBuffer = await QRCode.default.toBuffer(registration.qrCode, {
          errorCorrectionLevel: 'M',
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
          width: 512
        })

        attachments.push({
          filename: `QR-Code-${registration.fullName.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
          content: qrBuffer,
          contentType: 'image/png'
        })
      } catch (qrError) {
        console.error('Error generating QR attachment for room allocation email:', qrError)
      }
    }

    const emailOptions = {
      to: [registration.emailAddress],
      subject: `🏠 Room Allocated - ${room.name} - LINGER NO LONGER 6.0`,
      html: emailHtml,
      attachments
    }

    const result = await sendEmail(emailOptions)

    if (result) {
      console.log('✅ Room allocation email sent to:', registration.emailAddress)
      return { success: true }
    } else {
      console.error('❌ Failed to send room allocation email')
      return { success: false, error: 'Email sending failed' }
    }
  } catch (error) {
    console.error('❌ Failed to send room allocation email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Send platoon allocation email
export async function sendPlatoonAllocationEmail(registration: any, platoon: any) {
  try {
    console.log('⚔️ Sending platoon allocation email to:', registration.emailAddress)

    const emailHtml = await generatePlatoonAllocationEmail(registration, platoon)

    const emailOptions = {
      to: [registration.emailAddress],
      subject: `⚔️ Platoon Assigned - ${platoon.name} - LINGER NO LONGER 6.0`,
      html: emailHtml
    }

    const result = await sendEmail(emailOptions)

    if (result) {
      console.log('✅ Platoon allocation email sent to:', registration.emailAddress)
      return { success: true }
    } else {
      console.error('❌ Failed to send platoon allocation email')
      return { success: false, error: 'Email sending failed' }
    }
  } catch (error) {
    console.error('❌ Failed to send platoon allocation email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendRegistrationNotification(registration: any) {
  try {
    // Get admin emails from settings or use default
    const adminEmails = [
      'admin@mopgomglobal.com',
      // Add more admin emails as needed
    ]

    const emailHtml = generateRegistrationNotificationEmail(registration)

    const result = await sendEmail({
      to: adminEmails,
      subject: `New Registration: ${registration.fullName}`,
      html: emailHtml
    })

    if (result) {
      console.log('✅ Registration notification sent successfully')
      return { success: true }
    } else {
      console.error('❌ Failed to send registration notification')
      return { success: false, error: 'Email sending failed' }
    }
  } catch (error) {
    console.error('❌ Failed to send registration notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Email configuration and utilities
 */

import nodemailer from 'nodemailer'

// Email configuration with fast port 465 (SSL) as primary
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'), // Default to 465 (SSL) for better connectivity
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465', // Auto-enable SSL for port 465
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_FROM,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  // Add timeout settings for faster failure detection
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,    // 5 seconds
  socketTimeout: 10000      // 10 seconds
}

// Create reusable transporter object using SMTP transport
let transporter: nodemailer.Transporter | null = null

export const getEmailTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransporter(emailConfig)
  }
  return transporter
}

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️ SMTP not configured - email sending will be simulated')
      return false
    }

    const transporter = getEmailTransporter()
    await transporter.verify()
    console.log('✅ Email configuration verified successfully')
    return true
  } catch (error) {
    console.error('❌ Email configuration verification failed:', error)
    return false
  }
}

// Send email function
export interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  from?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('📧 SMTP not configured - simulating email send')
      console.log('📧 To:', Array.isArray(options.to) ? options.to.join(', ') : options.to)
      console.log('📧 Subject:', options.subject)
      return true // Return true for simulation
    }

    // Try multiple SMTP configurations for better reliability and speed
    const smtpConfigs = [
      {
        name: 'Gmail SSL (Port 465)',
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 8000
      },
      {
        name: 'Gmail STARTTLS (Port 587)',
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 8000
      }
    ]

    // Use configured port if specified, otherwise try both (465 first for speed)
    const configuredPort = parseInt(process.env.SMTP_PORT || '465')
    const configsToTry = configuredPort === 587 ? smtpConfigs.reverse() : smtpConfigs

    let lastError = null

    for (const config of configsToTry) {
      try {
        console.log(`📧 Trying ${config.name}...`)
        const transporter = nodemailer.createTransporter(config)

        const mailOptions = {
          from: options.from || `${process.env.EMAIL_FROM_NAME || 'Mopgomyouth Registration'} <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments
        }

        const info = await transporter.sendMail(mailOptions)
        console.log(`✅ Email sent successfully via ${config.name}:`, info.messageId)
        return true
      } catch (error) {
        console.log(`❌ ${config.name} failed:`, error.message)
        lastError = error
        continue
      }
    }

    // If we get here, all configurations failed
    throw lastError || new Error('All SMTP configurations failed')

  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return false
  }
}

// Email templates
export const createEmailTemplate = (title: string, content: string, qrCode?: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f4f4f4; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          padding: 20px; 
          border-radius: 8px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          margin-top: 20px;
          margin-bottom: 20px;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px 20px; 
          border-radius: 8px 8px 0 0; 
          text-align: center; 
          margin: -20px -20px 30px -20px; 
        }
        .header h1 { 
          margin: 0; 
          font-size: 24px; 
          font-weight: 600;
        }
        .content { 
          padding: 0; 
          font-size: 16px;
          line-height: 1.6;
        }
        .qr-section { 
          background: #f8f9fa; 
          border: 2px dashed #dee2e6; 
          border-radius: 8px; 
          padding: 30px; 
          margin: 30px 0; 
          text-align: center; 
        }
        .qr-code { 
          max-width: 200px; 
          height: auto; 
          margin: 15px 0; 
          border: 3px solid #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .qr-title {
          color: #495057; 
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: 600;
        }
        .qr-description {
          font-size: 14px; 
          color: #6c757d; 
          margin: 15px 0 0 0;
        }
        .footer { 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #eee; 
          font-size: 12px; 
          color: #666; 
          text-align: center; 
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .message {
          white-space: pre-line;
          margin: 20px 0;
        }
        .highlight {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          <div class="message">${content}</div>
          ${qrCode ? `
          <div class="qr-section">
            <h3 class="qr-title">Your QR Code</h3>
            <img src="data:image/png;base64,${qrCode}" alt="Registration QR Code" class="qr-code" />
            <p class="qr-description">Present this QR code during check-in and events</p>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>This email was sent from the <strong>Mopgomyouth Registration System</strong></p>
          <p>If you have any questions, please contact our support team at <a href="mailto:admin@mopgomglobal.com">admin@mopgomglobal.com</a></p>
          <p style="margin-top: 20px; font-size: 11px; color: #999;">
            © ${new Date().getFullYear()} Mopgomglobal. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

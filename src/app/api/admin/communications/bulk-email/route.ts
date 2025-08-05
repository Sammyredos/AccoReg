import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { NotificationService } from '@/lib/notifications'
import QRCode from 'qrcode'

// Generate visual QR code as inline PNG for bulk emails (production-safe)
async function generateInlineQRCodeForBulk(data: string): Promise<string> {
  try {
    // Generate QR code as PNG buffer with production-safe settings
    const qrBuffer = await QRCode.toBuffer(data, {
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
    console.error('Error generating inline QR code for bulk email:', error)
    return ''
  }
}

// Helper function to generate QR code attachment for email
async function generateQRCodeAttachment(registration: any): Promise<any> {
  try {
    if (!registration.qrCode) {
      console.log('⚠️ No QR code data for registration:', registration.id)
      return null
    }

    console.log('🔄 Generating QR code attachment for bulk email...')

    // Generate QR code as PNG buffer with production-safe settings
    const qrBuffer = await QRCode.toBuffer(registration.qrCode, {
      errorCorrectionLevel: 'H', // High error correction for better reliability
      margin: 4, // More margin for better scanning
      color: {
        dark: '#1f2937', // Darker color for better contrast
        light: '#ffffff'
      },
      width: 400, // Good size for attachments
      type: 'png'
    })

    console.log('✅ QR code attachment generated for bulk email')

    return {
      filename: `QR-Code-${registration.fullName.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
      content: qrBuffer,
      contentType: 'image/png'
    }
  } catch (error) {
    console.error('❌ Error generating QR code attachment for bulk email:', error)
    return null
  }
}

// Helper function to generate QR section HTML for email with visual QR code
async function generateQRSectionHTML(registration: any): Promise<string> {
  if (!registration.qrCode) {
    return ''
  }

  // Generate visual QR code
  const visualQRCode = await generateInlineQRCodeForBulk(registration.qrCode)

  return `
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin: 32px 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    ${visualQRCode ? `
    <div style="text-align: center; margin: 24px 0; padding: 24px; background: #f8fafc; border-radius: 12px;">
      <img src="${visualQRCode}" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #e5e7eb; border-radius: 8px; display: block; margin: 0 auto;" />
    </div>
    ` : ''}

    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #4b5563; font-weight: 600; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">📋 QR Code Data</p>
      <code style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; color: #374151; word-break: break-all; line-height: 1.4; background: #ffffff; padding: 8px; border-radius: 4px; display: block;">${registration.qrCode}</code>
    </div>

    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 18px;">💡</span>
        <div>
          <p style="color: #0369a1; margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">How to use your QR code:</p>
          <ul style="color: #0369a1; margin: 0; padding-left: 16px; font-size: 12px; line-height: 1.5;">
            <li>Show the QR code above during check-in</li>
            <li>Or download the attached QR image file</li>
            <li>Backup: Use the QR data above for manual entry</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  `
}
import { PrismaClient } from '@prisma/client'

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

    // Check permissions - only Super Admin, Admin, and Manager can send bulk emails
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']

    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({
        error: 'Insufficient permissions',
        message: 'Only Super Admins, Admins, and Managers can send bulk emails',
        userRole: currentUser.role?.name,
        allowedRoles
      }, { status: 403 })
    }

    const body = await request.json()
    const { recipients, subject, message, includeNames } = body

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({
        error: 'Recipients required',
        message: 'Please provide at least one email recipient'
      }, { status: 400 })
    }

    if (!subject || !message) {
      return NextResponse.json({
        error: 'Subject and message required',
        message: 'Please provide both subject and message for the email'
      }, { status: 400 })
    }

    // Get registration data for personalization if needed
    let registrationData = []
    if (includeNames) {
      registrationData = await prisma.registration.findMany({
        where: {
          emailAddress: {
            in: recipients
          }
        },
        select: {
          id: true,
          emailAddress: true,
          fullName: true,
          dateOfBirth: true,
          gender: true,
          phoneNumber: true,
          createdAt: true,
          qrCode: true
        }
      })
    }

    const results = []
    const errors = []

    // Send emails individually to allow for personalization
    for (const email of recipients) {
      try {
        let personalizedMessage = message
        let personalizedSubject = subject
        let currentRegistration = null

        if (includeNames) {
          currentRegistration = registrationData.find(r => r.emailAddress === email)
          if (currentRegistration) {
            // Handle registration information template
            if (message.includes('[Registration ID]') || message.includes('[Date of Birth]') || message.includes('[Gender]') || message.includes('[Phone Number]') || message.includes('[Email Address]') || message.includes('[Registration Date]')) {
              personalizedMessage = message
                .replace(/\[Name\]/g, currentRegistration.fullName)
                .replace(/\[Your Name\]/g, currentRegistration.fullName)
                .replace(/\[Registration ID\]/g, currentRegistration.id)
                .replace(/\[Date of Birth\]/g, currentRegistration.dateOfBirth ? new Date(currentRegistration.dateOfBirth).toLocaleDateString() : 'Not provided')
                .replace(/\[Gender\]/g, currentRegistration.gender || 'Not specified')
                .replace(/\[Phone Number\]/g, currentRegistration.phoneNumber || 'Not provided')
                .replace(/\[Email Address\]/g, currentRegistration.emailAddress)
                .replace(/\[Registration Date\]/g, currentRegistration.createdAt ? new Date(currentRegistration.createdAt).toLocaleDateString() : 'Unknown')
            } else {
              // Standard personalization
              personalizedMessage = `Dear ${currentRegistration.fullName},\n\n${message}`
            }
            personalizedSubject = subject.replace(/\[Name\]/g, currentRegistration.fullName)
          }
        }

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${personalizedSubject}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 32px; border-radius: 12px; text-align: center; margin: -32px -32px 32px -32px; }
              .content { padding: 24px 0; }
              .message { white-space: pre-wrap; margin: 24px 0; font-size: 16px; line-height: 1.7; }
              .qr-section { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center; }
              .qr-code { max-width: 200px; height: auto; margin: 16px 0; border-radius: 8px; }
              .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">${personalizedSubject}</h1>
              </div>
              <div class="content">
                <div class="message">${personalizedMessage}</div>
                ${currentRegistration && currentRegistration.qrCode ? await generateQRSectionHTML(currentRegistration) : ''}
              </div>
              <div class="footer">
                <p>This email was sent from the Youth Registration System.</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </body>
          </html>
        `

        // Generate QR code attachment if registration has QR code
        let qrAttachment = null
        if (currentRegistration && currentRegistration.qrCode) {
          qrAttachment = await generateQRCodeAttachment(currentRegistration)
        }

        // Prepare email options
        const emailOptions: any = {
          to: email,
          subject: personalizedSubject,
          html: emailHtml
        }

        // Add QR attachment if available
        if (qrAttachment) {
          emailOptions.attachments = [qrAttachment]
        }

        const result = await sendEmail(emailOptions)

        results.push({
          email,
          success: result,
          messageId: result ? `sent-${Date.now()}` : null
        })

      } catch (error) {
        errors.push({
          email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Create notification for bulk email sent
    try {
      await NotificationService.create({
        type: 'bulk_email_sent',
        title: 'Bulk Email Sent',
        message: `Bulk email "${subject}" sent to ${results.filter(r => r.success).length} recipients`,
        priority: 'medium',
        authorizedBy: currentUser.name || currentUser.email,
        authorizedByEmail: currentUser.email,
        metadata: {
          sender: currentUser.email,
          subject,
          recipientCount: recipients.length,
          successCount: results.filter(r => r.success).length,
          errorCount: errors.length
        }
      })
    } catch {
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: `Bulk email sent successfully`,
      results: {
        total: recipients.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length,
        details: results,
        errors: errors.length > 0 ? errors : undefined
      }
    })

  } catch (error) {
    console.error('Bulk email error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to send bulk email',
      message: 'An error occurred while sending the bulk email. Please try again or contact support.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

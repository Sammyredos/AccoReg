import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { NotificationService } from '@/lib/notifications'
import QRCode from 'qrcode'

// Generate QR code attachment for bulk emails (production-safe)
async function generateQRCodeAttachment(data: string, filename: string): Promise<any> {
  try {
    // Generate QR code as PNG buffer with production-safe settings
    const qrBuffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H', // High error correction for better reliability
      margin: 4, // More margin for better scanning
      color: {
        dark: '#1f2937', // Darker color for better contrast
        light: '#ffffff'
      },
      width: 400, // Good size for attachments
      type: 'png'
    })

    return {
      filename: filename,
      content: qrBuffer,
      contentType: 'image/png'
    }
  } catch (error) {
    console.error('Error generating QR code attachment for bulk email:', error)
    return null
  }
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

    console.log(`🚀 Preparing to send ${recipients.length} emails in batches...`)

    // Process emails in batches to prevent server overload
    const BATCH_SIZE = 10 // Process 10 emails at a time
    const results: any[] = []

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recipients.length / BATCH_SIZE)} (${batch.length} emails)`)

      const batchPromises = batch.map(async (email) => {
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

        // Generate QR code attachment only for registration info emails (performance optimization)
        let qrAttachment = null
        if (currentRegistration && (message.includes('{{REGISTRATION_INFO}}') || subject.toLowerCase().includes('registration'))) {
          try {
            const filename = `QR-Code-${currentRegistration.fullName.replace(/[^a-zA-Z0-9]/g, '-')}.png`

            // Use cached QR code if available, otherwise generate
            let qrData = currentRegistration.qrCode
            if (!qrData) {
              qrData = JSON.stringify({
                id: currentRegistration.id,
                name: currentRegistration.fullName,
                email: currentRegistration.emailAddress,
                phone: currentRegistration.phoneNumber,
                event: 'LINGER NO LONGER 6.0',
                registrationDate: currentRegistration.createdAt,
                type: 'participant_qr'
              })
            }

            qrAttachment = await generateQRCodeAttachment(qrData, filename)
            console.log('📎 QR attachment generated for registration email:', filename)
          } catch (qrError) {
            console.error('QR generation error:', qrError)
            // Continue without QR code if generation fails
          }
        }

        // Prepare email options with FORCED QR attachment
        const emailOptions: any = {
          to: email,
          subject: personalizedSubject,
          html: emailHtml,
          attachments: qrAttachment ? [qrAttachment] : [] // FORCE attachments array
        }

        // Minimal logging for performance
        if (qrAttachment) {
          console.log('📎 QR attachment included for:', email)
        }

        const result = await sendEmail(emailOptions)

        return {
          email,
          success: result,
          messageId: result ? `sent-${Date.now()}` : null
        }

      } catch (error) {
        return {
          email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
      })

      // Process this batch
      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults)

      // Add a small delay between batches to prevent overwhelming the server
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    }

    console.log(`📧 All batches completed: ${results.length} emails processed`)

    // Process results
    const successfulResults = []
    const errors = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successfulResults.push(result.value)
        } else {
          errors.push({
            email: recipients[index],
            error: result.value.error || 'Email sending failed'
          })
        }
      } else {
        errors.push({
          email: recipients[index],
          error: result.reason?.message || 'Promise rejected'
        })
      }
    })

    console.log(`✅ Bulk email completed: ${successfulResults.length}/${recipients.length} sent successfully`)

    // Create notification for bulk email sent
    try {
      await NotificationService.create({
        type: 'bulk_email_sent',
        title: 'Bulk Email Sent',
        message: `Bulk email "${subject}" sent to ${successfulResults.length} recipients`,
        priority: 'medium',
        authorizedBy: currentUser.name || currentUser.email,
        authorizedByEmail: currentUser.email,
        metadata: {
          sender: currentUser.email,
          subject,
          recipientCount: recipients.length,
          successCount: successfulResults.length,
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
        successful: successfulResults.length,
        failed: errors.length,
        details: successfulResults,
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

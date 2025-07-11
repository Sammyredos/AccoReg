import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { NotificationService } from '@/lib/notifications'
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
          emailAddress: true,
          fullName: true
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

        if (includeNames) {
          const registration = registrationData.find(r => r.emailAddress === email)
          if (registration) {
            personalizedMessage = `Dear ${registration.fullName},\n\n${message}`
            personalizedSubject = subject
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
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; margin: -20px -20px 20px -20px; }
              .content { padding: 20px 0; }
              .message { white-space: pre-wrap; margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
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
                <p>This email was sent from the Youth Registration System.</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </body>
          </html>
        `

        const result = await sendEmail({
          to: email,
          subject: personalizedSubject,
          html: emailHtml
        })

        results.push({
          email,
          success: result.success,
          messageId: result.messageId
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

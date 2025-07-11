import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
// import { messageQueue } from '@/lib/message-queue' // Commented out as unused

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!
    const userType = currentUser.type
    const body = await request.json()
    const { recipientId, recipientType, subject, message } = body

    // Validate required fields
    if (!recipientId || !recipientType || !subject || !message) {
      return NextResponse.json(
        { error: 'Recipient ID, type, subject, and message are required' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message cannot exceed 1000 characters' },
        { status: 400 }
      )
    }

    // Get recipient information
    // Support both ID and email as recipientId
    let recipient
    const isEmail = recipientId.includes('@')

    if (recipientType === 'admin') {
      recipient = await prisma.admin.findUnique({
        where: isEmail ? { email: recipientId } : { id: recipientId },
        include: { role: true }
      })
    } else {
      recipient = await prisma.user.findUnique({
        where: isEmail ? { email: recipientId } : { id: recipientId },
        include: { role: true }
      })
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Create message record in database with optimistic status
    const messageRecord = await prisma.message.create({
      data: {
        subject,
        content: message,
        senderEmail: currentUser.email,
        senderName: currentUser.name,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        senderType: userType,
        recipientType,
        status: 'pending',
        sentAt: new Date()
      }
    })

    // Immediately return success to client for fast response
    const responsePromise = NextResponse.json({
      success: true,
      messageId: messageRecord.id,
      message: 'Message sent successfully'
    })

    // Process email sending asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        const emailHtml = generateMessageEmail({
          subject,
          message,
          senderName: currentUser.name,
          senderEmail: currentUser.email,
          recipientName: recipient.name
        })

        await sendEmail({
          to: recipient.email,
          subject: `Message from ${currentUser.name}: ${subject}`,
          html: emailHtml
        })

        // Update message status to delivered
        await prisma.message.update({
          where: { id: messageRecord.id },
          data: {
            status: 'delivered',
            deliveredAt: new Date()
          }
        })

      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Update message status to failed
        await prisma.message.update({
          where: { id: messageRecord.id },
          data: {
            status: 'failed',
            error: emailError instanceof Error ? emailError.message : 'Email delivery failed'
          }
        })
      }
    })

    // Note: Messages appear in inbox only, not in notifications

    return responsePromise

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

function generateMessageEmail({ subject, message, senderName, senderEmail, recipientName }: {
  subject: string
  message: string
  senderName: string
  senderEmail: string
  recipientName: string
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Message</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
        .sender-info { background: #e8f2ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📨 New Message</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">You have received a new message</p>
        </div>

        <div class="content">
            <h2 style="color: #667eea; margin-top: 0;">Hello ${recipientName},</h2>

            <div class="sender-info">
                <h3 style="margin: 0 0 10px 0; color: #333;">Message from:</h3>
                <p style="margin: 0;"><strong>${senderName}</strong></p>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${senderEmail}</p>
            </div>

            <div class="message-box">
                <h3 style="margin: 0 0 15px 0; color: #667eea;">Subject: ${subject}</h3>
                <div style="white-space: pre-wrap; line-height: 1.6;">${message}</div>
            </div>

            <p style="margin-top: 20px;">
                <a href="mailto:${senderEmail}?subject=Re: ${subject}" class="btn">Reply to ${senderName}</a>
            </p>
        </div>

        <div class="footer">
            <p>This message was sent through the Youth Registration System.</p>
            <p>Please do not reply to this email directly. Use the reply button above to respond.</p>
        </div>
    </div>
</body>
</html>`
}

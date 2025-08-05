import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

// POST - Send email to platoon team members
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to send emails
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { platoonId, subject, message, emailTarget } = body

    // Validate required fields
    if (!platoonId) {
      return NextResponse.json({ error: 'Platoon ID is required' }, { status: 400 })
    }
    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Email subject is required' }, { status: 400 })
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Email message is required' }, { status: 400 })
    }
    if (!emailTarget || !['leader', 'team', 'all'].includes(emailTarget)) {
      return NextResponse.json({ error: 'Valid email target is required' }, { status: 400 })
    }

    // Get platoon with participants
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      include: {
        participants: {
          include: {
            registration: {
              select: {
                id: true,
                fullName: true,
                emailAddress: true,
                gender: true,
                branch: true
              }
            }
          }
        }
      }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Determine recipients based on target
    let recipients: Array<{ name: string; email: string; type: string }> = []

    if (emailTarget === 'leader' || emailTarget === 'all') {
      recipients.push({
        name: platoon.leaderName,
        email: platoon.leaderEmail,
        type: 'Leader'
      })
    }

    if (emailTarget === 'team' || emailTarget === 'all') {
      platoon.participants.forEach(participant => {
        if (participant.registration.emailAddress) {
          recipients.push({
            name: participant.registration.fullName,
            email: participant.registration.emailAddress,
            type: 'Participant'
          })
        }
      })
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid email recipients found' }, { status: 400 })
    }

    console.log(`📧 Sending emails to ${recipients.length} recipients for platoon ${platoon.name}...`)

    // Generate simplified email HTML for faster processing
    const generateEmailHtml = (recipientName: string, recipientType: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          .header {
            background: #dc2626;
            color: white;
            padding: 15px;
            border-radius: 4px;
            text-align: center;
            margin-bottom: 20px;
          }
          .message-content {
            background: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #dc2626;
            margin: 15px 0;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">⚔️ ${platoon.name} - LINGER NO LONGER 6.0</h2>
          </div>

          <p><strong>Dear ${recipientName}</strong> (${recipientType}),</p>

          <div class="message-content">
            <strong>From:</strong> ${currentUser.name || currentUser.email}<br><br>
            ${message}
          </div>

          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This email was sent from the LINGER NO LONGER 6.0 Admin System
          </p>
        </div>
      </body>
      </html>
    `

    // Send emails in parallel
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const emailOptions = {
          to: [recipient.email],
          subject: `⚔️ ${subject} - ${platoon.name}`,
          html: generateEmailHtml(recipient.name, recipient.type)
        }

        const result = await sendEmail(emailOptions)
        
        return {
          recipient: recipient.name,
          email: recipient.email,
          type: recipient.type,
          success: result,
          error: result ? null : 'Email sending failed'
        }
      } catch (error) {
        return {
          recipient: recipient.name,
          email: recipient.email,
          type: recipient.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    const results = await Promise.allSettled(emailPromises)
    
    // Process results
    const emailResults = []
    let successful = 0
    let failed = 0

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        emailResults.push(result.value)
        if (result.value.success) {
          successful++
        } else {
          failed++
        }
      } else {
        emailResults.push({
          recipient: recipients[index].name,
          email: recipients[index].email,
          type: recipients[index].type,
          success: false,
          error: result.reason?.message || 'Promise rejected'
        })
        failed++
      }
    })

    console.log(`✅ Team email completed: ${successful}/${recipients.length} sent successfully`)

    // Store email history in database
    try {
      await prisma.platoonEmailHistory.create({
        data: {
          platoonId,
          subject: subject.trim(),
          message: message.trim(),
          emailTarget,
          recipientCount: recipients.length,
          successCount: successful,
          failedCount: failed,
          sentBy: currentUser.id,
          senderName: currentUser.name || currentUser.email,
          senderEmail: currentUser.email
        }
      })
      console.log(`📝 Email history saved for platoon ${platoon.name}`)
    } catch (historyError) {
      console.error('Failed to save email history:', historyError)
      // Don't fail the main request if history saving fails
    }

    return NextResponse.json({
      success: true,
      message: `Email sent to ${successful} recipients`,
      results: {
        total: recipients.length,
        successful,
        failed,
        details: emailResults
      }
    })

  } catch (error) {
    console.error('Error sending team email:', error)
    return NextResponse.json(
      { error: 'Failed to send team email' },
      { status: 500 }
    )
  }
}

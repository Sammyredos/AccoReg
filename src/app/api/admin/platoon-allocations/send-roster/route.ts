import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

// POST - Send participant roster to platoon leader
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
    const { platoonId, subject, message } = body

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
                phoneNumber: true,
                gender: true,
                branch: true,
                dateOfBirth: true
              }
            }
          }
        }
      }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    console.log(`📧 Sending participant roster to platoon leader for ${platoon.name}...`)

    // Generate participant roster table
    const generateParticipantTable = () => {
      if (platoon.participants.length === 0) {
        return '<p style="text-align: center; color: #6b7280; font-style: italic;">No participants assigned yet</p>'
      }

      return `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">#</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Name</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Gender</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Branch</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Contact</th>
            </tr>
          </thead>
          <tbody>
            ${platoon.participants.map((participant, index) => `
              <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                <td style="border: 1px solid #d1d5db; padding: 8px;">${index + 1}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-weight: 500;">${participant.registration.fullName}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px;">${participant.registration.gender}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px;">${participant.registration.branch}</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; font-size: 12px;">
                  ${participant.registration.emailAddress ? `📧 ${participant.registration.emailAddress}<br>` : ''}
                  ${participant.registration.phoneNumber ? `📞 ${participant.registration.phoneNumber}` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }

    // Generate email HTML
    const emailHtml = `
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
            max-width: 800px; 
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
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
          }
          .stat-card {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #e5e7eb;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
            display: block;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .message-content {
            background: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #dc2626;
            margin: 15px 0;
            white-space: pre-wrap;
          }
          .roster-section {
            margin: 25px 0;
          }
          .roster-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #dc2626;
          }
          @media (max-width: 600px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            table { font-size: 12px; }
            th, td { padding: 4px !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">👥 ${platoon.name} - Participant Roster</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">LINGER NO LONGER 6.0</p>
          </div>

          <p><strong>Dear ${platoon.leaderName}</strong>,</p>

          <div class="message-content">
            <strong>From:</strong> ${currentUser.name || currentUser.email}<br><br>
            ${message}
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-number">${platoon.participants.length}</span>
              <span class="stat-label">Current Participants</span>
            </div>
            <div class="stat-card">
              <span class="stat-number">${platoon.capacity}</span>
              <span class="stat-label">Total Capacity</span>
            </div>
            <div class="stat-card">
              <span class="stat-number">${Math.round((platoon.participants.length / platoon.capacity) * 100)}%</span>
              <span class="stat-label">Filled</span>
            </div>
            <div class="stat-card">
              <span class="stat-number">${platoon.capacity - platoon.participants.length}</span>
              <span class="stat-label">Available Spots</span>
            </div>
          </div>

          <div class="roster-section">
            <div class="roster-title">📋 Complete Participant Roster</div>
            ${generateParticipantTable()}
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">📝 Leader Notes:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #78350f;">
              <li>This roster is current as of ${new Date().toLocaleString()}</li>
              <li>Contact details are provided for coordination purposes</li>
              <li>Please keep participant information confidential</li>
              <li>You'll receive updates when new participants join</li>
            </ul>
          </div>

          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This email was sent from the LINGER NO LONGER 6.0 Admin System<br>
            <strong>Platoon:</strong> ${platoon.name} (${platoon.label}) | <strong>Generated:</strong> ${new Date().toLocaleString()}
          </p>
        </div>
      </body>
      </html>
    `

    const emailOptions = {
      to: [platoon.leaderEmail],
      subject: `👥 ${subject} - ${platoon.name} Roster | LINGER NO LONGER 6.0`,
      html: emailHtml
    }

    const result = await sendEmail(emailOptions)

    if (result) {
      console.log(`✅ Participant roster sent to ${platoon.leaderEmail} for platoon ${platoon.name}`)

      // Store email history in database
      try {
        await prisma.platoonEmailHistory.create({
          data: {
            platoonId,
            subject: subject.trim(),
            message: message.trim(),
            emailTarget: 'participants-to-leader',
            recipientCount: 1,
            successCount: 1,
            failedCount: 0,
            sentBy: currentUser.id,
            senderName: currentUser.name || currentUser.email,
            senderEmail: currentUser.email
          }
        })
        console.log(`📝 Roster email history saved for platoon ${platoon.name}`)
      } catch (historyError) {
        console.error('Failed to save email history:', historyError)
        // Don't fail the main request if history saving fails
      }

      return NextResponse.json({
        success: true,
        message: `Participant roster sent successfully to ${platoon.leaderName}`,
        details: {
          platoonName: platoon.name,
          leaderEmail: platoon.leaderEmail,
          participantCount: platoon.participants.length,
          capacity: platoon.capacity
        }
      })
    } else {
      throw new Error('Email sending failed')
    }

  } catch (error) {
    console.error('Error sending participant roster:', error)
    return NextResponse.json(
      { error: 'Failed to send participant roster' },
      { status: 500 }
    )
  }
}

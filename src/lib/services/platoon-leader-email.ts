/**
 * Platoon Leader Email Service
 * Handles sending emails to platoon leaders
 */

import { PrismaClient } from '@prisma/client'
import { sendEmail } from '@/lib/email'
import { Logger } from '@/lib/logger'

const prisma = new PrismaClient()
const logger = new Logger('PlatoonLeaderEmail')

interface PlatoonLeaderEmailOptions {
  platoonId: string
  subject: string
  message: string
  senderName: string
  senderEmail: string
}

interface PlatoonFullNotificationOptions {
  platoonId: string
  allocatedBy: string
}

export class PlatoonLeaderEmailService {

  /**
   * Send confirmation email to platoon leader when platoon is created
   */
  static async sendPlatoonCreationConfirmation(platoonId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Sending platoon creation confirmation', { platoonId })

      // Get platoon details
      const platoon = await prisma.platoonAllocation.findUnique({
        where: { id: platoonId }
      })

      if (!platoon) {
        throw new Error('Platoon not found')
      }

      // Generate confirmation email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Platoon Leader Assignment - ${platoon.name}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8fafc;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626, #b91c1c);
              color: white;
              padding: 25px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 25px;
            }
            .welcome-badge {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              font-weight: bold;
              margin: 20px 0;
              font-size: 16px;
            }
            .platoon-info {
              background: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 8px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: bold;
              color: #6b7280;
              flex: 1;
            }
            .info-value {
              color: #1f2937;
              flex: 2;
              text-align: right;
            }
            .next-steps {
              background: #fef3c7;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .next-steps h3 {
              margin: 0 0 15px 0;
              color: #92400e;
            }
            .next-steps ul {
              margin: 0;
              padding-left: 20px;
            }
            .next-steps li {
              margin: 8px 0;
              color: #92400e;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #6b7280;
              font-size: 14px;
            }
            .contact-info {
              background: #e0f2fe;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            @media (max-width: 600px) {
              body { padding: 10px; }
              .container { padding: 20px; }
              .info-row { flex-direction: column; align-items: flex-start; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">⚔️ Platoon Leader Assignment</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">LINGER NO LONGER 6.0</p>
            </div>

            <div style="text-align: center;">
              <div class="welcome-badge">
                🎖️ Congratulations, Platoon Leader!
              </div>
            </div>

            <p style="font-size: 18px; color: #1f2937;">
              Dear <strong>${platoon.leaderName}</strong>,
            </p>

            <p style="font-size: 16px; line-height: 1.6;">
              Congratulations! You have been assigned as the leader of <strong>${platoon.name}</strong> for the upcoming LINGER NO LONGER 6.0 event. This is an important leadership role, and we're excited to have you guide your platoon through this amazing experience.
            </p>

            <div class="platoon-info">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Your Platoon Details</h3>
              <div class="info-row">
                <span class="info-label">Platoon Name:</span>
                <span class="info-value">${platoon.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Platoon Label:</span>
                <span class="info-value">${platoon.label}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Maximum Capacity:</span>
                <span class="info-value">${platoon.capacity} participants</span>
              </div>
              <div class="info-row">
                <span class="info-label">Your Contact Email:</span>
                <span class="info-value">${platoon.leaderEmail}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Your Contact Phone:</span>
                <span class="info-value">${platoon.leaderPhone}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Created On:</span>
                <span class="info-value">${new Date(platoon.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div class="next-steps">
              <h3>🎯 What's Next as a Platoon Leader?</h3>
              <ul>
                <li><strong>Prepare for Leadership</strong> - You'll be responsible for guiding your team members</li>
                <li><strong>Wait for Participant Assignments</strong> - Team members will be allocated to your platoon soon</li>
                <li><strong>Receive Updates</strong> - You'll get email notifications when participants join your platoon</li>
                <li><strong>Plan Team Activities</strong> - Start thinking about how to build team spirit and unity</li>
                <li><strong>Stay Connected</strong> - Keep this email for your records and future communications</li>
              </ul>
            </div>

            <div class="contact-info">
              <p style="margin: 0; font-weight: bold; color: #0369a1;">
                📞 Questions or Need Support?
              </p>
              <p style="margin: 5px 0 0 0; color: #0369a1;">
                If you have any questions about your leadership role, please reply to this email or contact our admin team.
              </p>
            </div>

            <div class="footer">
              <p>
                Welcome to the LINGER NO LONGER 6.0 Leadership Team!<br>
                <strong>Platoon:</strong> ${platoon.name} (${platoon.label})<br>
                <strong>Generated on:</strong> ${new Date().toLocaleString()}
              </p>
              <p style="margin-top: 15px; font-size: 12px;">
                This email confirms your assignment as a platoon leader. Please keep it for your records.
              </p>
            </div>
          </div>
        </body>
        </html>
      `

      const emailOptions = {
        to: [platoon.leaderEmail],
        subject: `🎖️ Platoon Leader Assignment - ${platoon.name} | LINGER NO LONGER 6.0`,
        html: emailHtml
      }

      const result = await sendEmail(emailOptions)

      if (result) {
        logger.info('Platoon creation confirmation sent successfully', {
          platoonId,
          leaderEmail: platoon.leaderEmail,
          platoonName: platoon.name
        })
        return { success: true }
      } else {
        throw new Error('Email sending failed')
      }

    } catch (error) {
      logger.error('Failed to send platoon creation confirmation', error, { platoonId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Send email to platoon leader
   */
  static async sendEmailToPlatoonLeader(options: PlatoonLeaderEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const { platoonId, subject, message, senderName, senderEmail } = options
      
      logger.info('Sending email to platoon leader', { platoonId, subject, senderEmail })
      
      // Get platoon with leader details
      const platoon = await prisma.platoonAllocation.findUnique({
        where: { id: platoonId },
        include: {
          participants: {
            include: {
              registration: {
                select: {
                  id: true,
                  fullName: true,
                  gender: true,
                  branch: true
                }
              }
            }
          }
        }
      })

      if (!platoon) {
        throw new Error('Platoon not found')
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
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
              background-color: #f8fafc;
            }
            .container { 
              background: white; 
              padding: 30px; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #dc2626, #b91c1c);
              color: white; 
              padding: 25px; 
              border-radius: 8px; 
              text-align: center; 
              margin-bottom: 25px;
            }
            .platoon-info {
              background: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .message-content {
              background: #fefefe;
              padding: 20px;
              border-left: 4px solid #dc2626;
              margin: 20px 0;
              white-space: pre-wrap;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #e2e8f0; 
              color: #6b7280; 
              font-size: 14px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">⚔️ Platoon Leader Communication</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">LINGER NO LONGER 6.0</p>
            </div>

            <p style="font-size: 18px; color: #1f2937;">
              Dear <strong>${platoon.leaderName}</strong>,
            </p>

            <div class="platoon-info">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Your Platoon Details</h3>
              <div style="display: grid; gap: 8px;">
                <div><strong>Platoon:</strong> ${platoon.name} (${platoon.label})</div>
                <div><strong>Current Size:</strong> ${platoon.participants.length}/${platoon.capacity} participants</div>
                <div><strong>Your Contact:</strong> ${platoon.leaderEmail}</div>
                <div><strong>Phone:</strong> ${platoon.leaderPhone}</div>
              </div>
            </div>

            <div class="message-content">
              <h4 style="margin: 0 0 15px 0; color: #dc2626;">📧 Message from ${senderName}</h4>
              ${message}
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">👥 Your Platoon Members</h4>
              ${platoon.participants.length > 0 ? `
                <div style="font-size: 14px; color: #78350f;">
                  ${platoon.participants.map(p => 
                    `• ${p.registration.fullName} (${p.registration.gender}, ${p.registration.branch})`
                  ).join('<br>')}
                </div>
              ` : '<p style="margin: 0; color: #78350f; font-style: italic;">No participants assigned yet</p>'}
            </div>

            <div class="footer">
              <p>
                This email was sent from the LINGER NO LONGER 6.0 Admin System<br>
                <strong>Sender:</strong> ${senderName} (${senderEmail})
              </p>
            </div>
          </div>
        </body>
        </html>
      `

      const emailOptions = {
        to: [platoon.leaderEmail],
        subject: `⚔️ ${subject} - ${platoon.name}`,
        html: emailHtml
      }

      const result = await sendEmail(emailOptions)

      if (result) {
        logger.info('Email sent to platoon leader successfully', {
          platoonId,
          leaderEmail: platoon.leaderEmail,
          platoonName: platoon.name
        })
        return { success: true }
      } else {
        throw new Error('Email sending failed')
      }

    } catch (error) {
      logger.error('Failed to send email to platoon leader', error, { platoonId: options.platoonId })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Send notification to platoon leader when platoon is full
   */
  static async sendPlatoonFullNotification(options: PlatoonFullNotificationOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const { platoonId, allocatedBy } = options
      
      logger.info('Sending platoon full notification', { platoonId, allocatedBy })
      
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
                  gender: true,
                  branch: true,
                  phoneNumber: true,
                  emailAddress: true
                }
              }
            }
          }
        }
      })

      if (!platoon) {
        throw new Error('Platoon not found')
      }

      const subject = `Platoon ${platoon.name} is Now Full!`
      const message = `Great news! Your platoon "${platoon.name}" has reached its maximum capacity of ${platoon.capacity} participants.

All participant slots are now filled and your platoon is ready for the upcoming event.

You can review your complete platoon roster in the details below. Please prepare for an amazing experience leading this group!

If you have any questions or need to make any adjustments, please contact the admin team immediately.`

      return await this.sendEmailToPlatoonLeader({
        platoonId,
        subject,
        message,
        senderName: 'LINGER NO LONGER 6.0 Admin System',
        senderEmail: allocatedBy
      })

    } catch (error) {
      logger.error('Failed to send platoon full notification', error, { platoonId: options.platoonId })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Send bulk emails to multiple platoon leaders
   */
  static async sendBulkEmailsToPlatoonLeaders(
    platoonIds: string[], 
    subject: string, 
    message: string, 
    senderName: string, 
    senderEmail: string
  ): Promise<{ 
    summary: { total: number; successful: number; failed: number }; 
    results: Array<{ platoonId: string; success: boolean; error?: string }> 
  }> {
    logger.info('Sending bulk emails to platoon leaders', { 
      platoonCount: platoonIds.length, 
      subject, 
      senderEmail 
    })

    const results = []
    let successful = 0
    let failed = 0

    for (const platoonId of platoonIds) {
      try {
        const result = await this.sendEmailToPlatoonLeader({
          platoonId,
          subject,
          message,
          senderName,
          senderEmail
        })

        results.push({
          platoonId,
          success: result.success,
          error: result.error
        })

        if (result.success) {
          successful++
        } else {
          failed++
        }

        // Removed delay for faster processing

      } catch (error) {
        results.push({
          platoonId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
      }
    }

    logger.info('Bulk email to platoon leaders completed', {
      total: platoonIds.length,
      successful,
      failed
    })

    return {
      summary: {
        total: platoonIds.length,
        successful,
        failed
      },
      results
    }
  }
}

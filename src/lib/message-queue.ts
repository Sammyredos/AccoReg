/**
 * Message Queue System for Fast Message Delivery
 * Implements async message processing for improved performance
 */

import { prisma } from './db'
import { sendEmail } from './email'

interface QueuedMessage {
  id: string
  subject: string
  content: string
  senderEmail: string
  senderName: string
  recipientEmail: string
  recipientName: string
  senderType: string
  recipientType: string
  priority: 'high' | 'normal' | 'low'
  retryCount: number
  maxRetries: number
  createdAt: Date
}

class MessageQueue {
  private static instance: MessageQueue
  private queue: QueuedMessage[] = []
  private processing = false
  private processingInterval: NodeJS.Timeout | null = null

  static getInstance(): MessageQueue {
    if (!MessageQueue.instance) {
      MessageQueue.instance = new MessageQueue()
    }
    return MessageQueue.instance
  }

  constructor() {
    this.startProcessing()
  }

  /**
   * Add message to queue for async processing
   */
  async enqueue(message: Omit<QueuedMessage, 'id' | 'retryCount' | 'maxRetries' | 'createdAt'>) {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    }

    // Add to queue based on priority
    if (message.priority === 'high') {
      this.queue.unshift(queuedMessage)
    } else {
      this.queue.push(queuedMessage)
    }

    console.log(`Message queued: ${queuedMessage.id} (Priority: ${message.priority})`)
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue()
    }

    return queuedMessage.id
  }

  /**
   * Start automatic queue processing
   */
  private startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }

    // Process queue every 1 second
    this.processingInterval = setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processQueue()
      }
    }, 1000)
  }

  /**
   * Process messages in queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    console.log(`Processing queue: ${this.queue.length} messages`)

    while (this.queue.length > 0) {
      const message = this.queue.shift()
      if (!message) continue

      try {
        await this.processMessage(message)
        console.log(`Message processed successfully: ${message.id}`)
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error)
        await this.handleFailedMessage(message, error)
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.processing = false
  }

  /**
   * Process individual message
   */
  private async processMessage(message: QueuedMessage) {
    // Create message record in database
    const messageRecord = await prisma.message.create({
      data: {
        subject: message.subject,
        content: message.content,
        senderEmail: message.senderEmail,
        senderName: message.senderName,
        recipientEmail: message.recipientEmail,
        recipientName: message.recipientName,
        senderType: message.senderType,
        recipientType: message.recipientType,
        status: 'pending',
        sentAt: new Date()
      }
    })

    // Generate email HTML
    const emailHtml = this.generateMessageEmail(message)

    // Send email
    const emailResult = await sendEmail({
      to: message.recipientEmail,
      subject: `Message from ${message.senderName}: ${message.subject}`,
      html: emailHtml
    })

    // Update message status based on email result
    if (emailResult.success) {
      await prisma.message.update({
        where: { id: messageRecord.id },
        data: {
          status: 'delivered',
          deliveredAt: new Date()
        }
      })
    } else {
      await prisma.message.update({
        where: { id: messageRecord.id },
        data: {
          status: 'failed',
          error: emailResult.error || 'Email delivery failed'
        }
      })
      throw new Error(emailResult.error || 'Email delivery failed')
    }

    return messageRecord
  }

  /**
   * Handle failed message processing
   */
  private async handleFailedMessage(message: QueuedMessage, error: any) {
    message.retryCount++

    if (message.retryCount < message.maxRetries) {
      // Re-queue with exponential backoff
      const delay = Math.pow(2, message.retryCount) * 1000 // 2s, 4s, 8s
      setTimeout(() => {
        this.queue.push(message)
        console.log(`Message re-queued for retry ${message.retryCount}/${message.maxRetries}: ${message.id}`)
      }, delay)
    } else {
      console.error(`Message failed permanently after ${message.maxRetries} retries: ${message.id}`, error)
      
      // Log to database as permanently failed
      try {
        await prisma.message.create({
          data: {
            subject: message.subject,
            content: message.content,
            senderEmail: message.senderEmail,
            senderName: message.senderName,
            recipientEmail: message.recipientEmail,
            recipientName: message.recipientName,
            senderType: message.senderType,
            recipientType: message.recipientType,
            status: 'failed',
            error: `Failed after ${message.maxRetries} retries: ${error.message}`,
            sentAt: new Date()
          }
        })
      } catch (dbError) {
        console.error('Failed to log failed message to database:', dbError)
      }
    }
  }

  /**
   * Generate email HTML for message
   */
  private generateMessageEmail(message: QueuedMessage): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📨 New Message</h1>
            <p>You have received a new message from ${message.senderName}</p>
          </div>
          <div class="content">
            <div class="message-box">
              <h3>Subject: ${message.subject}</h3>
              <p><strong>From:</strong> ${message.senderName} (${message.senderEmail})</p>
              <p><strong>Message:</strong></p>
              <p>${message.content.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="footer">
              <p>This message was sent through the youth registration messaging system.</p>
              <p>Please log in to your account to reply.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      highPriorityCount: this.queue.filter(m => m.priority === 'high').length,
      normalPriorityCount: this.queue.filter(m => m.priority === 'normal').length,
      lowPriorityCount: this.queue.filter(m => m.priority === 'low').length
    }
  }

  /**
   * Clear queue (for testing/maintenance)
   */
  clearQueue() {
    this.queue = []
    console.log('Message queue cleared')
  }

  /**
   * Stop processing
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.processing = false
    console.log('Message queue processing stopped')
  }
}

// Export singleton instance
export const messageQueue = MessageQueue.getInstance()
export default messageQueue

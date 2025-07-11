/**
 * Bulk SMS API Route
 * POST /api/admin/communications/bulk-sms
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendBulkSMS } from '@/lib/sms'
import { prisma } from '@/lib/db'
import { Logger } from '@/lib/logger'
import { verifyToken } from '@/lib/auth'

const logger = new Logger('Bulk-SMS')

const bulkSmsSchema = z.object({
  recipients: z.array(z.string().min(10, 'Invalid phone number')).min(1, 'At least one recipient required'),
  message: z.string().min(1, 'Message is required').max(160, 'SMS message too long (max 160 characters)'),
  includeNames: z.boolean().default(false)
})

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

    // Check if user has permission to send bulk messages
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validation = bulkSmsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { recipients, message, includeNames } = validation.data

    logger.info('Bulk SMS request received', {
      recipientCount: recipients.length,
      messageLength: message.length,
      includeNames,
      userId: currentUser.id
    })

    // Get registration data for personalization if needed
    let registrationMap: Record<string, any> = {}
    if (includeNames) {
      const registrations = await prisma.registration.findMany({
        where: {
          phoneNumber: {
            in: recipients
          }
        },
        select: {
          phoneNumber: true,
          fullName: true
        }
      })

      registrationMap = registrations.reduce((acc, reg) => {
        acc[reg.phoneNumber] = reg
        return acc
      }, {} as Record<string, any>)
    }

    // Prepare SMS messages
    const smsMessages = recipients.map(phoneNumber => {
      let personalizedMessage = message

      if (includeNames && registrationMap[phoneNumber]) {
        const firstName = registrationMap[phoneNumber].fullName.split(' ')[0]
        personalizedMessage = `Hi ${firstName}, ${message}`
      }

      return {
        to: phoneNumber,
        message: personalizedMessage,
        type: 'notification' as const
      }
    })

    // Send bulk SMS
    const results = await sendBulkSMS(smsMessages)

    // Count successful and failed sends
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    // Log results
    logger.info('Bulk SMS completed', {
      total: recipients.length,
      successful,
      failed,
      userId: currentUser.id
    })

    // Log failed sends for debugging
    const failedResults = results.filter(r => !r.success)
    if (failedResults.length > 0) {
      logger.warn('Some SMS messages failed to send', {
        failedCount: failedResults.length,
        errors: failedResults.map(r => r.error)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Bulk SMS processing completed',
      results: {
        total: recipients.length,
        successful,
        failed,
        details: results
      }
    })

  } catch (error) {
    logger.error('Error in bulk SMS endpoint', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to send bulk SMS'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

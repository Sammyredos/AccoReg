/**
 * SMS Authentication - Resend Verification Code
 * POST /api/auth/sms/resend-code
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { smsAuthService } from '@/lib/sms-auth'
import { Logger } from '@/lib/logger'

const logger = new Logger('SMS-Auth-Resend')

const resendCodeSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = resendCodeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { phoneNumber } = validation.data

    logger.info('SMS verification code resend requested', { phoneNumber })

    // Resend verification code
    const result = await smsAuthService.resendCode(phoneNumber)

    if (!result.success) {
      logger.warn('Failed to resend SMS verification code', { 
        phoneNumber, 
        error: result.error 
      })
      
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    logger.info('SMS verification code resent successfully', { phoneNumber })

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully'
    })

  } catch (error) {
    logger.error('Error in SMS resend code endpoint', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
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

/**
 * SMS Authentication - Verify Code
 * POST /api/auth/sms/verify-code
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { smsAuthService } from '@/lib/sms-auth'
import { Logger } from '@/lib/logger'

const logger = new Logger('SMS-Auth-Verify')

const verifyCodeSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format'),
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = verifyCodeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { phoneNumber, code } = validation.data

    logger.info('SMS verification code verification requested', { phoneNumber })

    // Verify code
    const result = await smsAuthService.verifyCode(phoneNumber, code)

    if (!result.success) {
      logger.warn('SMS verification failed', { 
        phoneNumber, 
        error: result.error,
        attemptsRemaining: result.attemptsRemaining
      })
      
      return NextResponse.json(
        { 
          error: result.error,
          attemptsRemaining: result.attemptsRemaining
        },
        { status: 400 }
      )
    }

    logger.info('SMS verification successful', { phoneNumber })

    // Set authentication cookie
    const response = NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      token: result.token
    })

    // Set HTTP-only cookie for authentication
    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    logger.error('Error in SMS verify code endpoint', error)
    
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

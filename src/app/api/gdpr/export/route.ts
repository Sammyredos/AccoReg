import { NextRequest, NextResponse } from 'next/server'
import { gdprCompliance } from '@/lib/gdpr'
import { createLogger } from '@/lib/logger'
import { rateLimiters, withRateLimit } from '@/lib/rate-limiter'

const logger = createLogger('GDPR-Export')

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for GDPR requests
    const rateLimitResponse = await withRateLimit(request, rateLimiters.api)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { email, userId } = body

    // Validate required fields
    if (!email && !userId) {
      return NextResponse.json({
        error: 'Either email or userId is required'
      }, { status: 400 })
    }

    // Log the request
    logger.info('GDPR data export requested', { 
      email: email ? 'provided' : 'not provided',
      userId: userId ? 'provided' : 'not provided',
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // Process the export request
    const exportRequest = await gdprCompliance.requestDataExport(
      userId || email, 
      email || userId
    )

    return NextResponse.json({
      success: true,
      message: 'Data export request submitted successfully',
      requestId: exportRequest.userId,
      status: exportRequest.status,
      requestDate: exportRequest.requestDate,
      estimatedCompletion: '24-48 hours'
    })

  } catch (error) {
    logger.error('GDPR data export request failed', error)
    
    return NextResponse.json({
      error: 'Failed to process data export request',
      message: 'Please try again later or contact support'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const email = searchParams.get('email')

    if (!requestId && !email) {
      return NextResponse.json({
        error: 'Request ID or email is required'
      }, { status: 400 })
    }

    // In production, you'd query the export requests table
    // For now, return a mock response
    return NextResponse.json({
      success: true,
      status: 'completed',
      downloadUrl: 'https://secure-downloads.example.com/export-123.json',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      message: 'Your data export is ready for download'
    })

  } catch (error) {
    logger.error('Failed to check export status', error)
    
    return NextResponse.json({
      error: 'Failed to check export status'
    }, { status: 500 })
  }
}

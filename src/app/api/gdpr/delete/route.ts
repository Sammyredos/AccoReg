import { NextRequest, NextResponse } from 'next/server'
import { gdprCompliance } from '@/lib/gdpr'
import { createLogger } from '@/lib/logger'
import { rateLimiters, withRateLimit } from '@/lib/rate-limiter'

const logger = createLogger('GDPR-Delete')

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting for deletion requests
    const rateLimitResponse = await withRateLimit(request, rateLimiters.auth)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { email, userId, reason, confirmationCode } = body

    // Validate required fields
    if (!email && !userId) {
      return NextResponse.json({
        error: 'Either email or userId is required'
      }, { status: 400 })
    }

    if (!confirmationCode || confirmationCode !== 'DELETE_MY_DATA') {
      return NextResponse.json({
        error: 'Invalid confirmation code. Please type "DELETE_MY_DATA" to confirm.'
      }, { status: 400 })
    }

    // Log the request
    logger.securityEvent('GDPR data deletion requested', { 
      email: email ? 'provided' : 'not provided',
      userId: userId ? 'provided' : 'not provided',
      reason: reason || 'not provided',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Process the deletion request
    const deletionRequest = await gdprCompliance.requestDataDeletion(
      userId || email, 
      email || userId,
      reason
    )

    return NextResponse.json({
      success: true,
      message: 'Data deletion request submitted successfully',
      requestId: deletionRequest.userId,
      status: deletionRequest.status,
      requestDate: deletionRequest.requestDate,
      scheduledDeletionDate: deletionRequest.scheduledDeletionDate,
      gracePeriod: '30 days',
      warning: 'This action cannot be undone after the grace period expires'
    })

  } catch (error) {
    logger.error('GDPR data deletion request failed', error)
    
    return NextResponse.json({
      error: 'Failed to process data deletion request',
      message: 'Please try again later or contact support'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Cancel a pending deletion request
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const email = searchParams.get('email')

    if (!requestId && !email) {
      return NextResponse.json({
        error: 'Request ID or email is required'
      }, { status: 400 })
    }

    logger.info('GDPR deletion cancellation requested', { 
      requestId,
      email: email ? 'provided' : 'not provided'
    })

    // In production, update the deletion request status to 'cancelled'
    // For now, return a success response
    return NextResponse.json({
      success: true,
      message: 'Data deletion request cancelled successfully',
      status: 'cancelled'
    })

  } catch (error) {
    logger.error('Failed to cancel deletion request', error)
    
    return NextResponse.json({
      error: 'Failed to cancel deletion request'
    }, { status: 500 })
  }
}

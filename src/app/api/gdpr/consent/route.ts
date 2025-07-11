import { NextRequest, NextResponse } from 'next/server'
import { gdprCompliance } from '@/lib/gdpr'
import { createLogger } from '@/lib/logger'

const logger = createLogger('GDPR-Consent')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, consentType, granted, version = '1.0' } = body

    // Validate required fields
    if (!userId || !consentType || typeof granted !== 'boolean') {
      return NextResponse.json({
        error: 'userId, consentType, and granted (boolean) are required'
      }, { status: 400 })
    }

    // Validate consent type
    const validConsentTypes = ['marketing', 'analytics', 'functional', 'necessary']
    if (!validConsentTypes.includes(consentType)) {
      return NextResponse.json({
        error: `Invalid consent type. Must be one of: ${validConsentTypes.join(', ')}`
      }, { status: 400 })
    }

    // Record consent
    await gdprCompliance.recordConsent({
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      version
    })

    logger.info('Consent recorded', { 
      userId,
      consentType,
      granted,
      version
    })

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully',
      consentType,
      granted,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to record consent', error)
    
    return NextResponse.json({
      error: 'Failed to record consent'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        error: 'userId is required'
      }, { status: 400 })
    }

    // Get consent history
    const consentHistory = await gdprCompliance.getConsentHistory(userId)

    return NextResponse.json({
      success: true,
      userId,
      consentHistory,
      totalRecords: consentHistory.length
    })

  } catch (error) {
    logger.error('Failed to get consent history', error)
    
    return NextResponse.json({
      error: 'Failed to get consent history'
    }, { status: 500 })
  }
}

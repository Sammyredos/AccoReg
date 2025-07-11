import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { generateRegistrationQR } from '@/lib/qr-code'
import { Logger } from '@/lib/logger'

const logger = Logger('QRGeneration')

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await authenticateRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: authResult.status || 401 }
      )
    }

    const registrationId = params.id

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    logger.info('QR code generation requested', {
      registrationId,
      requestedBy: authResult.user.email
    })

    // Generate QR code
    const result = await generateRegistrationQR(registrationId)

    if (!result.success) {
      logger.error('QR code generation failed', {
        registrationId,
        error: result.error,
        requestedBy: authResult.user.email
      })

      return NextResponse.json(
        { error: result.error || 'Failed to generate QR code' },
        { status: 400 }
      )
    }

    logger.info('QR code generated successfully', {
      registrationId,
      requestedBy: authResult.user.email
    })

    return NextResponse.json({
      success: true,
      qrCode: result.qrCode,
      qrDataUrl: result.qrDataUrl,
      message: 'QR code generated successfully'
    })

  } catch (error) {
    logger.error('Error in QR code generation endpoint', error)
    
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

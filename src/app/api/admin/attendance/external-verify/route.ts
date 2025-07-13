/**
 * External Scanner Verification API
 * POST /api/admin/attendance/external-verify
 * 
 * Simplified endpoint for external QR scanner apps and handheld devices
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyQRCode, generateRegistrationQR } from '@/lib/qr-code'
import { Logger } from '@/lib/logger'
import { broadcastAttendanceEvent } from '../events/route'

const logger = new Logger('ExternalScanner')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qrData, scannerDevice, operatorId } = body

    // Validate required fields
    if (!qrData) {
      return NextResponse.json({ 
        success: false,
        error: 'QR code data is required' 
      }, { status: 400 })
    }

    logger.info(`External scanner verification attempt`, { 
      scannerDevice, 
      operatorId,
      timestamp: new Date().toISOString()
    })

    // Verify QR code
    const verificationResult = await verifyQRCode(qrData)
    
    if (!verificationResult.success) {
      logger.warn(`QR verification failed`, { 
        error: verificationResult.error,
        qrData: qrData.substring(0, 50) + '...' 
      })
      
      return NextResponse.json({
        success: false,
        error: verificationResult.error || 'Invalid QR code'
      }, { status: 400 })
    }

    const registrationData = verificationResult.data!

    // Check if already verified
    const existingRegistration = await prisma.registration.findUnique({
      where: { id: registrationData.id }
    })

    if (!existingRegistration) {
      return NextResponse.json({
        success: false,
        error: 'Registration not found'
      }, { status: 404 })
    }

    if (existingRegistration.attendanceVerified) {
      return NextResponse.json({
        success: false,
        error: 'Already verified',
        participant: {
          name: existingRegistration.fullName,
          verifiedAt: existingRegistration.attendanceVerifiedAt
        }
      }, { status: 409 })
    }

    // Mark as verified
    const updatedRegistration = await prisma.registration.update({
      where: { id: registrationData.id },
      data: {
        attendanceVerified: true,
        attendanceVerifiedAt: new Date(),
        verificationMethod: 'external_scanner',
        verificationDevice: scannerDevice || 'unknown',
        verificationOperator: operatorId || 'unknown'
      }
    })

    logger.info(`Attendance verified successfully`, {
      registrationId: registrationData.id,
      participantName: updatedRegistration.fullName,
      scannerDevice,
      operatorId
    })

    // Auto-regenerate QR code after external verification to ensure fresh, reusable QR codes
    try {
      const qrResult = await generateRegistrationQR(registrationData.id)
      if (qrResult.success) {
        logger.info('QR code regenerated after external verification', {
          registrationId: registrationData.id,
          participantName: updatedRegistration.fullName,
          scannerDevice,
          operatorId
        })
      } else {
        logger.warn('Failed to regenerate QR code after external verification', {
          registrationId: registrationData.id,
          error: qrResult.error
        })
      }
    } catch (qrError) {
      logger.error('Error regenerating QR code after external verification', {
        registrationId: registrationData.id,
        error: qrError
      })
      // Don't fail the verification if QR regeneration fails
    }

    // Broadcast real-time event
    broadcastAttendanceEvent({
      type: 'verification',
      data: {
        registrationId: registrationData.id,
        fullName: updatedRegistration.fullName,
        status: 'present',
        timestamp: new Date().toISOString(),
        scannerName: `External Scanner (${scannerDevice || 'Unknown'})`,
        platoonName: undefined, // External scanner doesn't have platoon info
        roomName: undefined
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Attendance verified successfully',
      participant: {
        id: updatedRegistration.id,
        name: updatedRegistration.fullName,
        gender: updatedRegistration.gender,
        phoneNumber: updatedRegistration.phoneNumber,
        verifiedAt: updatedRegistration.attendanceVerifiedAt
      }
    })

  } catch (error) {
    logger.error('External scanner verification error', { error })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint for scanner app configuration
export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      apiVersion: '1.0',
      supportedFormats: ['QR_CODE'],
      verificationEndpoint: '/api/admin/attendance/external-verify',
      requiredFields: ['qrData'],
      optionalFields: ['scannerDevice', 'operatorId'],
      responseFormat: {
        success: 'boolean',
        message: 'string',
        participant: 'object',
        error: 'string (on failure)'
      }
    }
  })
}

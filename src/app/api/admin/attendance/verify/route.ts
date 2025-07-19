/**
 * Attendance Verification API
 * POST /api/admin/attendance/verify
 * 
 * Verifies a registrant's attendance and marks them as verified for room allocation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { verifyQRCode, generateRegistrationQR } from '@/lib/qr-code'
import { Logger } from '@/lib/logger'
import { broadcastAttendanceEvent } from '../events/route'

const logger = new Logger('AttendanceVerification')

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to verify attendance
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { method, registrationId, qrCode } = data

    let registration

    if (method === 'qr' && qrCode) {
      // Verify using QR code
      const qrResult = await verifyQRCode(qrCode)
      
      if (!qrResult.success || !qrResult.isValid) {
        logger.warn('QR code verification failed', {
          error: qrResult.error,
          verifiedBy: currentUser.email
        })
        
        return NextResponse.json({
          error: qrResult.error || 'Invalid QR code'
        }, { status: 400 })
      }

      registration = qrResult.registration

    } else if (method === 'manual' && registrationId) {
      // Manual verification by registration ID
      registration = await prisma.registration.findUnique({
        where: { id: registrationId }
      })

      if (!registration) {
        return NextResponse.json({
          error: 'Registration not found'
        }, { status: 404 })
      }

    } else {
      return NextResponse.json({
        error: 'Invalid verification method. Use "qr" with qrCode or "manual" with registrationId'
      }, { status: 400 })
    }

    // Check if already verified
    if (registration.isVerified) {
      return NextResponse.json({
        error: 'Registration is already verified',
        registration: {
          id: registration.id,
          fullName: registration.fullName,
          isVerified: registration.isVerified,
          verifiedAt: registration.verifiedAt,
          verifiedBy: registration.verifiedBy
        }
      }, { status: 400 })
    }

    // Mark as verified
    const updatedRegistration = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: currentUser.email,
        attendanceMarked: true,
        attendanceTime: new Date()
      }
    })

    // Auto-regenerate QR code after verification to ensure fresh, reusable QR codes
    try {
      const qrResult = await generateRegistrationQR(registration.id)
      if (qrResult.success) {
        logger.info('QR code regenerated after verification', {
          registrationId: registration.id,
          participantName: registration.fullName,
          verifiedBy: currentUser.email
        })
      } else {
        logger.warn('Failed to regenerate QR code after verification', {
          registrationId: registration.id,
          error: qrResult.error
        })
      }
    } catch (qrError) {
      logger.error('Error regenerating QR code after verification', {
        registrationId: registration.id,
        error: qrError
      })
      // Don't fail the verification if QR regeneration fails
    }

    logger.info('Registration verified successfully', {
      registrationId: registration.id,
      fullName: registration.fullName,
      method,
      verifiedBy: currentUser.email
    })

    // Small delay to ensure database transaction is committed before broadcasting
    await new Promise(resolve => setTimeout(resolve, 50))

    // Broadcast real-time event to all connected clients
    broadcastAttendanceEvent({
      type: 'verification',
      data: {
        registrationId: registration.id,
        fullName: registration.fullName,
        status: 'present',
        timestamp: new Date().toISOString(),
        scannerName: currentUser.fullName || currentUser.email,
        platoonName: registration.platoonAllocation?.platoon?.name,
        roomName: registration.roomAllocation?.room?.name,
        method: method, // Include the verification method
        verifiedBy: currentUser.email
      }
    })

    logger.info('Real-time event broadcasted for verification', {
      registrationId: registration.id,
      fullName: registration.fullName
    })

    return NextResponse.json({
      success: true,
      message: 'Registration verified successfully',
      registration: {
        id: updatedRegistration.id,
        fullName: updatedRegistration.fullName,
        gender: updatedRegistration.gender,
        dateOfBirth: updatedRegistration.dateOfBirth,
        phoneNumber: updatedRegistration.phoneNumber,
        emailAddress: updatedRegistration.emailAddress,
        isVerified: updatedRegistration.isVerified,
        verifiedAt: updatedRegistration.verifiedAt,
        verifiedBy: updatedRegistration.verifiedBy,
        attendanceMarked: updatedRegistration.attendanceMarked,
        attendanceTime: updatedRegistration.attendanceTime
      }
    })

  } catch (error) {
    logger.error('Error in attendance verification', error)
    return NextResponse.json(
      { error: 'Failed to verify attendance' },
      { status: 500 }
    )
  }
}

// Get verification status
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const registrationId = searchParams.get('registrationId')

    if (!registrationId) {
      return NextResponse.json({
        error: 'Registration ID is required'
      }, { status: 400 })
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        fullName: true,
        gender: true,
        dateOfBirth: true,
        phoneNumber: true,
        emailAddress: true,
        isVerified: true,
        verifiedAt: true,
        verifiedBy: true,
        attendanceMarked: true,
        attendanceTime: true,
        roomAllocation: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                gender: true,
                capacity: true
              }
            }
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json({
        error: 'Registration not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      registration
    })

  } catch (error) {
    logger.error('Error getting verification status', error)
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    )
  }
}

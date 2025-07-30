/**
 * QR Toggle API
 * POST /api/admin/attendance/qr-toggle
 * 
 * Checks what action should be taken for a QR code (verify/unverify/block)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { verifyQRCode } from '@/lib/qr-code'
import { Logger } from '@/lib/logger'

const logger = new Logger('QRToggle')

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 QR Toggle API called')

    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      console.log('❌ Authentication failed:', authResult.error)
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!
    console.log('✅ User authenticated:', currentUser.email)

    // Check if user has permission to verify attendance
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      console.log('❌ Insufficient permissions for user:', currentUser.email, 'Role:', currentUser.role?.name)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { qrCode } = data

    console.log('📋 QR Code received, length:', qrCode?.length || 0)

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code is required' }, { status: 400 })
    }

    // Verify QR code format and extract registration data
    console.log('🔍 Verifying QR code...')
    const qrResult = await verifyQRCode(qrCode)

    console.log('📋 QR verification result:', {
      success: qrResult.success,
      isValid: qrResult.isValid,
      error: qrResult.error
    })

    if (!qrResult.success || !qrResult.isValid) {
      logger.warn('QR code verification failed', {
        error: qrResult.error,
        checkedBy: currentUser.email
      })

      console.log('❌ QR verification failed:', qrResult.error)

      return NextResponse.json({
        error: qrResult.error || 'Invalid QR code'
      }, { status: 400 })
    }

    // Extract registration ID from QR data
    let registrationId: string
    try {
      const qrData = JSON.parse(qrCode)
      registrationId = qrData.id
      if (!registrationId) {
        throw new Error('Missing registration ID in QR code')
      }
    } catch (parseError) {
      logger.error('Failed to parse QR code for registration ID', { error: parseError })
      return NextResponse.json({
        error: 'Invalid QR code format - missing registration ID'
      }, { status: 400 })
    }

    // Find the registration
    console.log('🔍 Looking up registration:', registrationId)
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        roomAllocation: {
          include: {
            room: true
          }
        }
      }
    })

    if (!registration) {
      console.log('❌ Registration not found:', registrationId)
      return NextResponse.json({
        error: 'Registration not found'
      }, { status: 404 })
    }

    console.log('✅ Registration found:', {
      id: registration.id,
      name: registration.fullName,
      isVerified: registration.isVerified,
      hasRoomAllocation: !!registration.roomAllocation
    })

    // Check current verification status and determine action
    if (!registration.isVerified) {
      // Not verified - ready to verify
      return NextResponse.json({
        action: 'verify_ready',
        registration: {
          id: registration.id,
          fullName: registration.fullName,
          emailAddress: registration.emailAddress,
          isVerified: registration.isVerified
        }
      })
    } else {
      // Already verified - check if they have room allocation
      if (registration.roomAllocation) {
        // Has room allocation - show unverify blocked modal
        return NextResponse.json({
          action: 'unverify_blocked',
          registration: {
            id: registration.id,
            fullName: registration.fullName,
            emailAddress: registration.emailAddress,
            isVerified: registration.isVerified
          },
          roomAllocation: {
            roomName: registration.roomAllocation.room.name,
            roomId: registration.roomAllocation.room.id,
            roomGender: registration.roomAllocation.room.gender,
            roomCapacity: registration.roomAllocation.room.capacity,
            currentOccupancy: registration.roomAllocation.room.occupancy,
            allocationDate: registration.roomAllocation.createdAt
          }
        })
      } else {
        // No room allocation - ready to unverify
        return NextResponse.json({
          action: 'unverify_ready',
          registration: {
            id: registration.id,
            fullName: registration.fullName,
            emailAddress: registration.emailAddress,
            isVerified: registration.isVerified
          }
        })
      }
    }

  } catch (error) {
    logger.error('QR toggle check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      checkedBy: currentUser?.email
    })

    console.error('❌ QR toggle API error:', error)

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check QR code status'
    }, { status: 500 })
  }
}

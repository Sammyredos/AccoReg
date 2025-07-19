/**
 * QR Toggle API - Determines what action to take for a scanned QR code
 * POST /api/admin/attendance/qr-toggle
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyQRCode } from '@/lib/qr-code'
import { Logger } from '@/lib/logger'

const logger = new Logger('QRToggle')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qrCode } = body

    if (!qrCode) {
      return NextResponse.json({
        success: false,
        error: 'QR code data is required'
      }, { status: 400 })
    }

    logger.info('QR toggle check initiated', { 
      qrDataLength: qrCode.length,
      timestamp: new Date().toISOString()
    })

    // Verify the QR code first
    const verificationResult = await verifyQRCode(qrCode)
    
    if (!verificationResult.success) {
      logger.warn('QR verification failed', { error: verificationResult.error })
      return NextResponse.json({
        success: false,
        error: verificationResult.error || 'Invalid QR code'
      }, { status: 400 })
    }

    const registration = verificationResult.registration
    if (!registration) {
      return NextResponse.json({
        success: false,
        error: 'Registration not found'
      }, { status: 404 })
    }

    logger.info('QR verified for registration', {
      registrationId: registration.id,
      fullName: registration.fullName,
      currentStatus: registration.isVerified ? 'verified' : 'unverified'
    })

    // Check current verification status and determine action
    if (!registration.isVerified) {
      // Registration is not verified - ready to verify
      return NextResponse.json({
        success: true,
        action: 'verify_ready',
        registration: {
          id: registration.id,
          fullName: registration.fullName,
          emailAddress: registration.emailAddress,
          phoneNumber: registration.phoneNumber,
          gender: registration.gender,
          isVerified: registration.isVerified
        }
      })
    } else {
      // Registration is already verified - check if they have room allocation
      const roomAllocation = await prisma.roomAllocation.findFirst({
        where: { registrationId: registration.id },
        include: {
          room: true
        }
      })

      if (roomAllocation) {
        // User is allocated to a room - cannot unverify without removing from room
        logger.info('Unverification blocked - user has room allocation', {
          registrationId: registration.id,
          roomId: roomAllocation.roomId,
          roomName: roomAllocation.room.name
        })

        return NextResponse.json({
          success: true,
          action: 'unverify_blocked',
          registration: {
            id: registration.id,
            fullName: registration.fullName,
            emailAddress: registration.emailAddress,
            phoneNumber: registration.phoneNumber,
            gender: registration.gender,
            isVerified: registration.isVerified
          },
          roomAllocation: {
            roomId: roomAllocation.roomId,
            roomName: roomAllocation.room.name,
            roomGender: roomAllocation.room.gender,
            roomCapacity: roomAllocation.room.capacity,
            currentOccupancy: roomAllocation.room.currentOccupancy,
            allocationDate: roomAllocation.createdAt.toISOString()
          }
        })
      } else {
        // User is verified but not allocated - ready to unverify
        logger.info('Ready to unverify - no room allocation', {
          registrationId: registration.id
        })

        return NextResponse.json({
          success: true,
          action: 'unverify_ready',
          registration: {
            id: registration.id,
            fullName: registration.fullName,
            emailAddress: registration.emailAddress,
            phoneNumber: registration.phoneNumber,
            gender: registration.gender,
            isVerified: registration.isVerified
          }
        })
      }
    }

  } catch (error) {
    logger.error('QR toggle check failed', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process QR code'
    }, { status: 500 })
  }
}

/**
 * Attendance Unverification API
 * POST /api/admin/attendance/unverify
 * 
 * Unverifies a registrant's attendance and removes them from room allocation if allocated
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { generateRegistrationQR } from '@/lib/qr-code'
import { Logger } from '@/lib/logger'
import { broadcastAttendanceEvent } from '../events/route'

const logger = new Logger('AttendanceUnverification')

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - Super Admin, Admin, Manager, and Staff can unverify
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({
        error: 'Insufficient permissions. Only Super Admin, Admin, Manager, and Staff can unverify attendees.'
      }, { status: 403 })
    }

    const data = await request.json()
    const { registrationId, forceUnverify = false } = data

    if (!registrationId) {
      return NextResponse.json({
        error: 'Registration ID is required'
      }, { status: 400 })
    }

    // Get registration with room allocation details
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        roomAllocation: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                gender: true,
                capacity: true,
                allocations: {
                  include: {
                    registration: {
                      select: {
                        id: true,
                        fullName: true
                      }
                    }
                  }
                }
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

    // Check if already unverified
    if (!registration.isVerified) {
      return NextResponse.json({
        error: 'Registration is already unverified',
        registration: {
          id: registration.id,
          fullName: registration.fullName,
          isVerified: registration.isVerified
        }
      }, { status: 400 })
    }

    // Check if user has room allocation
    if (registration.roomAllocation && !forceUnverify) {
      const roomInfo = registration.roomAllocation.room
      const roommates = roomInfo.allocations
        .filter(alloc => alloc.registrationId !== registrationId)
        .map(alloc => alloc.registration.fullName)

      return NextResponse.json({
        error: 'ROOM_ALLOCATED',
        message: 'Cannot unverify: User is allocated to a room',
        roomAllocation: {
          roomId: roomInfo.id,
          roomName: roomInfo.name,
          roomGender: roomInfo.gender,
          roomCapacity: roomInfo.capacity,
          currentOccupancy: roomInfo.allocations.length,
          roommates: roommates,
          registrantName: registration.fullName,
          registrantGender: registration.gender,
          allocationDate: registration.roomAllocation.allocatedAt,
          allocatedBy: registration.roomAllocation.allocatedBy
        },
        registration: {
          id: registration.id,
          fullName: registration.fullName,
          gender: registration.gender,
          dateOfBirth: registration.dateOfBirth,
          phoneNumber: registration.phoneNumber,
          emailAddress: registration.emailAddress
        }
      }, { status: 409 }) // Conflict status
    }

    // Perform unverification in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Remove room allocation if exists
      if (registration.roomAllocation) {
        await tx.roomAllocation.delete({
          where: { id: registration.roomAllocation.id }
        })
        
        logger.info('Room allocation removed during unverification', {
          registrationId: registration.id,
          roomId: registration.roomAllocation.roomId,
          roomName: registration.roomAllocation.room.name,
          unverifiedBy: currentUser.email
        })
      }

      // Mark as unverified
      const updatedRegistration = await tx.registration.update({
        where: { id: registration.id },
        data: {
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
          attendanceMarked: false,
          attendanceTime: null,
          // Add unverification tracking
          unverifiedAt: new Date(),
          unverifiedBy: currentUser.email
        }
      })

      return updatedRegistration
    })

    logger.info('Attendance unverified successfully', {
      registrationId: registration.id,
      participantName: registration.fullName,
      hadRoomAllocation: !!registration.roomAllocation,
      unverifiedBy: currentUser.email,
      forceUnverify
    })

    // Auto-regenerate QR code after unverification to ensure fresh, reusable QR codes
    try {
      const qrResult = await generateRegistrationQR(registration.id)
      if (qrResult.success) {
        logger.info('QR code regenerated after unverification', {
          registrationId: registration.id,
          participantName: registration.fullName,
          unverifiedBy: currentUser.email
        })
      } else {
        logger.warn('Failed to regenerate QR code after unverification', {
          registrationId: registration.id,
          error: qrResult.error
        })
      }
    } catch (qrError) {
      logger.error('Error regenerating QR code after unverification', {
        registrationId: registration.id,
        error: qrError
      })
      // Don't fail the unverification if QR regeneration fails
    }

    // Small delay to ensure database transaction is committed before broadcasting
    await new Promise(resolve => setTimeout(resolve, 50))

    // Broadcast real-time event to all connected clients
    broadcastAttendanceEvent({
      type: 'status_change',
      data: {
        registrationId: registration.id,
        fullName: registration.fullName,
        status: 'unverified',
        timestamp: new Date().toISOString(),
        scannerName: currentUser.fullName || currentUser.email,
        platoonName: registration.platoonAllocation?.platoon?.name,
        roomName: registration.roomAllocation?.room?.name,
        message: `${registration.fullName} has been unverified`
      }
    })

    return NextResponse.json({
      success: true,
      message: `${registration.fullName} has been unverified successfully${registration.roomAllocation ? ' and removed from room allocation' : ''}`,
      registration: {
        id: result.id,
        fullName: result.fullName,
        isVerified: result.isVerified,
        unverifiedAt: result.unverifiedAt,
        unverifiedBy: result.unverifiedBy,
        roomRemoved: !!registration.roomAllocation
      }
    })

  } catch (error) {
    logger.error('Error unverifying attendance', error)
    return NextResponse.json(
      { error: 'Failed to unverify attendance' },
      { status: 500 }
    )
  }
}

// Get unverification eligibility
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
      include: {
        roomAllocation: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                gender: true,
                capacity: true,
                allocations: {
                  include: {
                    registration: {
                      select: {
                        id: true,
                        fullName: true
                      }
                    }
                  }
                }
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

    const canUnverify = registration.isVerified
    const hasRoomAllocation = !!registration.roomAllocation
    
    let roomDetails = null
    if (hasRoomAllocation && registration.roomAllocation) {
      const roomInfo = registration.roomAllocation.room
      roomDetails = {
        roomId: roomInfo.id,
        roomName: roomInfo.name,
        roomGender: roomInfo.gender,
        roomCapacity: roomInfo.capacity,
        currentOccupancy: roomInfo.allocations.length,
        roommates: roomInfo.allocations
          .filter(alloc => alloc.registrationId !== registrationId)
          .map(alloc => alloc.registration.fullName),
        allocationDate: registration.roomAllocation.allocatedAt,
        allocatedBy: registration.roomAllocation.allocatedBy
      }
    }

    return NextResponse.json({
      success: true,
      canUnverify,
      hasRoomAllocation,
      roomDetails,
      registration: {
        id: registration.id,
        fullName: registration.fullName,
        gender: registration.gender,
        dateOfBirth: registration.dateOfBirth,
        phoneNumber: registration.phoneNumber,
        emailAddress: registration.emailAddress,
        isVerified: registration.isVerified,
        verifiedAt: registration.verifiedAt,
        verifiedBy: registration.verifiedBy
      }
    })

  } catch (error) {
    logger.error('Error checking unverification eligibility', error)
    return NextResponse.json(
      { error: 'Failed to check unverification eligibility' },
      { status: 500 }
    )
  }
}

/**
 * Manual Room Allocation Email Sending API
 * POST /api/admin/accommodations/send-allocation-emails
 * 
 * Allows admins to manually send room allocation emails to registrants
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { RoomAllocationEmailService } from '@/lib/services/room-allocation-email'
import { Logger } from '@/lib/logger'

const prisma = new PrismaClient()
const logger = new Logger('ManualAllocationEmails')

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin, Admin, and Manager can send emails
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin, Admin, and Manager can send allocation emails.' 
      }, { status: 403 })
    }

    const data = await request.json()
    const { 
      registrationIds, 
      sendToAll = false, 
      gender, 
      roomId,
      eventDetails 
    } = data

    let targetRegistrationIds: string[] = []

    if (sendToAll) {
      // Send to all allocated registrants
      const whereClause: any = {
        roomAllocation: {
          isNot: null
        }
      }

      // Filter by gender if specified
      if (gender && gender !== 'All') {
        whereClause.gender = gender
      }

      // Filter by room if specified
      if (roomId) {
        whereClause.roomAllocation = {
          roomId: roomId
        }
      }

      const allocatedRegistrations = await prisma.registration.findMany({
        where: whereClause,
        select: { id: true }
      })

      targetRegistrationIds = allocatedRegistrations.map(reg => reg.id)

    } else if (registrationIds && Array.isArray(registrationIds)) {
      // Send to specific registrants
      targetRegistrationIds = registrationIds
    } else {
      return NextResponse.json({
        error: 'Either provide registrationIds array or set sendToAll to true'
      }, { status: 400 })
    }

    if (targetRegistrationIds.length === 0) {
      return NextResponse.json({
        error: 'No allocated registrations found to send emails to'
      }, { status: 400 })
    }

    // Validate that all registrations are actually allocated
    const allocatedCount = await prisma.registration.count({
      where: {
        id: { in: targetRegistrationIds },
        roomAllocation: { isNot: null }
      }
    })

    if (allocatedCount !== targetRegistrationIds.length) {
      return NextResponse.json({
        error: 'Some registrations are not allocated to rooms. Only allocated registrants can receive room allocation emails.'
      }, { status: 400 })
    }

    logger.info('Sending manual room allocation emails', {
      count: targetRegistrationIds.length,
      sendToAll,
      gender,
      roomId,
      requestedBy: currentUser.email
    })

    // Send emails
    const emailResults = eventDetails 
      ? await RoomAllocationEmailService.sendBulkRoomAllocationEmails({
          registrationIds: targetRegistrationIds,
          allocatedBy: currentUser.email,
          eventDetails
        })
      : await RoomAllocationEmailService.sendBulkRoomAllocationEmailsWithDefaults(
          targetRegistrationIds,
          currentUser.email
        )

    logger.info('Manual room allocation emails completed', {
      total: emailResults.summary.total,
      successful: emailResults.summary.successful,
      failed: emailResults.summary.failed,
      requestedBy: currentUser.email
    })

    return NextResponse.json({
      success: true,
      message: `Room allocation emails sent to ${emailResults.summary.successful} out of ${emailResults.summary.total} registrants`,
      results: {
        total: emailResults.summary.total,
        successful: emailResults.summary.successful,
        failed: emailResults.summary.failed,
        details: emailResults.results
      }
    })

  } catch (error) {
    logger.error('Error sending manual room allocation emails', error)
    return NextResponse.json(
      { error: 'Failed to send room allocation emails' },
      { status: 500 }
    )
  }
}

// Get email sending status and options
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get statistics about allocated registrations
    const [totalAllocated, maleAllocated, femaleAllocated, rooms] = await Promise.all([
      prisma.registration.count({
        where: { roomAllocation: { isNot: null } }
      }),
      prisma.registration.count({
        where: { 
          roomAllocation: { isNot: null },
          gender: 'Male'
        }
      }),
      prisma.registration.count({
        where: { 
          roomAllocation: { isNot: null },
          gender: 'Female'
        }
      }),
      prisma.room.findMany({
        where: { 
          isActive: true,
          allocations: { some: {} }
        },
        select: {
          id: true,
          name: true,
          gender: true,
          capacity: true,
          _count: {
            select: { allocations: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    ])

    // Get default event details
    const defaultEventDetails = await RoomAllocationEmailService.getDefaultEventDetails()

    return NextResponse.json({
      success: true,
      statistics: {
        totalAllocated,
        maleAllocated,
        femaleAllocated,
        roomsWithAllocations: rooms.length
      },
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        gender: room.gender,
        capacity: room.capacity,
        currentOccupancy: room._count.allocations
      })),
      defaultEventDetails,
      canSendEmails: true
    })

  } catch (error) {
    logger.error('Error getting email sending options', error)
    return NextResponse.json(
      { error: 'Failed to get email sending options' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { invalidateCache } from '@/lib/cache'
import { broadcastAttendanceEvent } from '@/app/api/admin/attendance/events/route'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { currentUser, error: authError } = await authenticateRequest(request)
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to empty all rooms (Staff cannot empty all rooms)
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to empty all rooms' },
        { status: 403 }
      )
    }

    const { gender } = await request.json()

    if (!gender || !['Male', 'Female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Valid gender (Male or Female) is required' },
        { status: 400 }
      )
    }

    console.log(`🧹 Starting empty all ${gender} rooms operation by ${currentUser.email}`)

    // Get all rooms for the specified gender with their allocations
    const rooms = await prisma.room.findMany({
      where: {
        gender,
        isActive: true
      },
      include: {
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
    })

    // Get all allocation IDs to remove
    const allocationIds = rooms.flatMap(room => 
      room.allocations.map(allocation => allocation.registration.id)
    )

    if (allocationIds.length === 0) {
      return NextResponse.json({
        message: `No allocations found for ${gender} rooms`,
        removedAllocations: 0,
        affectedRooms: []
      })
    }

    const affectedRooms = rooms.filter(room => room.allocations.length > 0).map(room => room.name)

    console.log(`🏠 Found ${allocationIds.length} allocations to remove from ${affectedRooms.length} ${gender} rooms`)

    // Remove all allocations for the specified gender in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all room allocations for the specified gender
      const deletedAllocations = await tx.roomAllocation.deleteMany({
        where: {
          registrationId: {
            in: allocationIds
          }
        }
      })

      return deletedAllocations
    })

    // Broadcast real-time deallocation events for each participant
    for (const room of rooms) {
      for (const allocation of room.allocations) {
        try {
          broadcastAttendanceEvent({
            type: 'status_change',
            data: {
              registrationId: allocation.registration.id,
              fullName: allocation.registration.fullName,
              status: 'present',
              timestamp: new Date().toISOString(),
              roomName: null // Participant is now unallocated
            }
          })
        } catch (broadcastError) {
          console.warn('Failed to broadcast deallocation event:', broadcastError)
          // Continue with the operation even if broadcasting fails
        }
      }
    }

    console.log('🏠 Real-time bulk deallocation events broadcasted:', {
      gender,
      totalDeallocations: result.count,
      affectedRooms,
      deallocatedBy: currentUser.email
    })

    // Invalidate cache to ensure fresh data is fetched
    invalidateCache.accommodations()

    console.log(`✅ Successfully emptied all ${gender} rooms: ${result.count} allocations removed`)

    return NextResponse.json({
      message: `Successfully emptied all ${gender} rooms`,
      removedAllocations: result.count,
      affectedRooms
    })

  } catch (error) {
    console.error('❌ Error emptying all rooms:', error)
    return NextResponse.json(
      { error: 'Failed to empty all rooms' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

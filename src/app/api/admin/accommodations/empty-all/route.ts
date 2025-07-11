import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { invalidateCache } from '@/lib/cache'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to empty rooms (Admin and Manager only)
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { gender } = data

    // Validate gender
    if (!gender || !['Male', 'Female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Valid gender (Male or Female) is required' },
        { status: 400 }
      )
    }

    // Get all rooms for the specified gender with their allocations
    const rooms = await prisma.room.findMany({
      where: { 
        gender: gender,
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

    if (rooms.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No ${gender.toLowerCase()} rooms found`,
        removedAllocations: 0,
        affectedRooms: 0
      })
    }

    // Count total allocations to be removed
    const totalAllocations = rooms.reduce((total, room) => total + room.allocations.length, 0)

    if (totalAllocations === 0) {
      return NextResponse.json({
        success: true,
        message: `All ${gender.toLowerCase()} rooms are already empty`,
        removedAllocations: 0,
        affectedRooms: 0
      })
    }

    // Get all allocation IDs to remove
    const allocationIds = rooms.flatMap(room => 
      room.allocations.map(allocation => allocation.registration.id)
    )

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

    // Count affected rooms (rooms that had allocations)
    const affectedRooms = rooms.filter(room => room.allocations.length > 0).length

    // Invalidate cache to ensure fresh data is fetched
    invalidateCache.accommodations()

    return NextResponse.json({
      success: true,
      message: `Successfully emptied all ${gender.toLowerCase()} rooms`,
      removedAllocations: result.count,
      affectedRooms: affectedRooms,
      totalRooms: rooms.length,
      details: {
        gender: gender,
        roomsEmptied: affectedRooms,
        participantsReturned: result.count
      }
    })

  } catch (error) {
    console.error('Error emptying all rooms:', error)
    return NextResponse.json(
      { error: 'Failed to empty all rooms' },
      { status: 500 }
    )
  }
}

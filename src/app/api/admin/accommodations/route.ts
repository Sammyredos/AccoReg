import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { withCache, cacheKeys, invalidateCache } from '@/lib/cache'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to view accommodations
    if (!['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get accommodation data with caching
    const accommodationData = await withCache(
      cacheKeys.accommodations(),
      async () => {
        // Get accommodation statistics
        const [
          totalRegistrations,
          verifiedRegistrations,
          allocatedRegistrations,
          totalRooms,
          activeRooms,
          totalCapacity,
          occupiedSpaces
        ] = await Promise.all([
          prisma.registration.count(),
          prisma.registration.count({
            where: { isVerified: true }
          }),
          prisma.registration.count({
            where: {
              roomAllocation: {
                isNot: null
              }
            }
          }),
          prisma.room.count(),
          prisma.room.count({
            where: { isActive: true }
          }),
          prisma.room.aggregate({
            where: { isActive: true },
            _sum: { capacity: true }
          }),
          prisma.roomAllocation.count()
        ])

        return {
          totalRegistrations,
          verifiedRegistrations,
          allocatedRegistrations,
          totalRooms,
          activeRooms,
          totalCapacity,
          occupiedSpaces
        }
      },
      2 * 60 * 1000 // Cache for 2 minutes
    )

    // Get room details with allocations (only Male and Female rooms)
    const rooms = await prisma.room.findMany({
      where: {
        gender: {
          in: ['Male', 'Female']
        }
      },
      include: {
        allocations: {
          include: {
            registration: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                phoneNumber: true,
                emailAddress: true
              }
            }
          }
        }
      },
      orderBy: [
        { gender: 'asc' },
        { name: 'asc' }
      ]
    })

    // Get unallocated VERIFIED registrations (only Male and Female)
    const unallocatedRegistrations = await prisma.registration.findMany({
      where: {
        roomAllocation: null,
        isVerified: true, // Only verified attendees can be allocated
        gender: {
          in: ['Male', 'Female']
        }
      },
      select: {
        id: true,
        fullName: true,
        gender: true,
        dateOfBirth: true,
        phoneNumber: true,
        emailAddress: true,
        isVerified: true,
        verifiedAt: true,
        verifiedBy: true
      },
      orderBy: [
        { gender: 'asc' },
        { fullName: 'asc' }
      ]
    })

    // Calculate statistics - unallocated should only include VERIFIED participants
    const verifiedUnallocated = accommodationData.verifiedRegistrations - accommodationData.allocatedRegistrations
    const totalCapacity = accommodationData.totalCapacity._sum.capacity || 0
    const occupiedSpaces = accommodationData.occupiedSpaces || 0

    // Debug logging for room occupancy calculation
    console.log('🏠 Room Occupancy Debug:', {
      totalCapacity,
      occupiedSpaces,
      calculation: totalCapacity > 0 ? Math.round((occupiedSpaces / totalCapacity) * 100) : 0,
      rawCapacityData: accommodationData.totalCapacity
    })

    const stats = {
      totalRegistrations: accommodationData.totalRegistrations,
      verifiedRegistrations: accommodationData.verifiedRegistrations,
      allocatedRegistrations: accommodationData.allocatedRegistrations,
      unallocatedRegistrations: Math.max(0, verifiedUnallocated), // Only verified participants awaiting allocation
      allocationRate: accommodationData.verifiedRegistrations > 0 ? Math.round((accommodationData.allocatedRegistrations / accommodationData.verifiedRegistrations) * 100) : 0,
      totalRooms: accommodationData.totalRooms,
      activeRooms: accommodationData.activeRooms,
      totalCapacity,
      occupiedSpaces,
      availableSpaces: totalCapacity - occupiedSpaces,
      roomOccupancyRate: totalCapacity > 0 ? Math.round((occupiedSpaces / totalCapacity) * 100) : 0
    }

    // Group rooms by gender for better organization
    const roomsByGender = rooms.reduce((groups, room) => {
      if (!groups[room.gender]) {
        groups[room.gender] = []
      }
      groups[room.gender].push({
        ...room,
        occupancy: room.allocations.length,
        availableSpaces: room.capacity - room.allocations.length,
        occupancyRate: room.capacity > 0 ? Math.round((room.allocations.length / room.capacity) * 100) : 0
      })
      return groups
    }, {} as Record<string, any[]>)

    // Group unallocated registrations by gender
    const unallocatedByGender = unallocatedRegistrations.reduce((groups, reg) => {
      if (!groups[reg.gender]) {
        groups[reg.gender] = []
      }
      groups[reg.gender].push(reg)
      return groups
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      success: true,
      stats,
      roomsByGender,
      unallocatedByGender,
      message: 'Accommodation data retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching accommodation data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accommodation data' },
      { status: 500 }
    )
  }
}

// Remove allocation
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to modify allocations (Staff can remove allocations)
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const registrationId = searchParams.get('registrationId')

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    // Check if allocation exists
    const allocation = await prisma.roomAllocation.findUnique({
      where: { registrationId }
    })

    if (!allocation) {
      return NextResponse.json(
        { error: 'Allocation not found' },
        { status: 404 }
      )
    }

    // Remove allocation
    await prisma.roomAllocation.delete({
      where: { registrationId }
    })

    // Invalidate cache after modification
    invalidateCache.accommodations()

    return NextResponse.json({
      success: true,
      message: 'Allocation removed successfully'
    })

  } catch (error) {
    console.error('Error removing allocation:', error)
    return NextResponse.json(
      { error: 'Failed to remove allocation' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all platoon allocation data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view platoon allocations
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
    if (!allowedRoles.includes(session.user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch all verified participants who are not allocated to any platoon
    const unallocatedParticipants = await prisma.registration.findMany({
      where: {
        isVerified: true,
        platoonAllocation: null
      },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        emailAddress: true,
        phoneNumber: true,
        branch: true
      },
      orderBy: {
        fullName: 'asc'
      }
    })

    // Fetch all platoons with their participants
    const platoons = await prisma.platoonAllocation.findMany({
      include: {
        participants: {
          include: {
            registration: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                phoneNumber: true,
                emailAddress: true,
                branch: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calculate occupancy and rates for each platoon
    const platoonsWithStats = platoons.map(platoon => ({
      ...platoon,
      occupancy: platoon.participants.length,
      occupancyRate: platoon.capacity > 0 ? Math.round((platoon.participants.length / platoon.capacity) * 100) : 0
    }))

    // Calculate overall statistics
    const totalVerified = await prisma.registration.count({
      where: { isVerified: true }
    })

    const totalAllocated = await prisma.platoonParticipant.count()
    const totalUnallocated = unallocatedParticipants.length
    const allocationRate = totalVerified > 0 ? Math.round((totalAllocated / totalVerified) * 100) : 0

    const stats = {
      totalVerified,
      totalAllocated,
      totalUnallocated,
      allocationRate,
      totalPlatoons: platoons.length,
      activePlatoons: platoons.filter(p => p.participants.length > 0).length
    }

    return NextResponse.json({
      stats,
      platoons: platoonsWithStats,
      unallocatedParticipants
    })

  } catch (error) {
    console.error('Error fetching platoon allocation data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platoon allocation data' },
      { status: 500 }
    )
  }
}

// POST - Create new platoon
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create platoons
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(session.user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, leaderName, label, leaderPhone, capacity } = body

    // Validate required fields
    if (!name || !leaderName || !label || !leaderPhone || !capacity) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Validate capacity
    if (capacity < 1 || capacity > 200) {
      return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
    }

    // Check if platoon name already exists
    const existingPlatoon = await prisma.platoonAllocation.findFirst({
      where: { name }
    })

    if (existingPlatoon) {
      return NextResponse.json({ error: 'Platoon name already exists' }, { status: 400 })
    }

    // Check if platoon label already exists
    const existingLabel = await prisma.platoonAllocation.findFirst({
      where: { label }
    })

    if (existingLabel) {
      return NextResponse.json({ error: 'Platoon label already exists' }, { status: 400 })
    }

    // Create the platoon
    const platoon = await prisma.platoonAllocation.create({
      data: {
        name,
        leaderName,
        label,
        leaderPhone,
        capacity,
        createdBy: session.user.id
      }
    })

    return NextResponse.json(platoon, { status: 201 })

  } catch (error) {
    console.error('Error creating platoon:', error)
    return NextResponse.json(
      { error: 'Failed to create platoon' },
      { status: 500 }
    )
  }
}

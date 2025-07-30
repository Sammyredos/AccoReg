import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Fetch all platoon allocation data
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user details from database
    const user = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to view platoon allocations
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Temporary workaround: Return mock data until Prisma client is updated
    // Reduced logging frequency to avoid console spam
    if (Math.random() < 0.1) { // Only log 10% of the time
      console.log('⚠️ Platoon models not available in Prisma client. Returning mock data.')
    }

    // Fetch verified participants
    const allVerifiedParticipants = await prisma.registration.findMany({
      where: {
        isVerified: true
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

    // Initialize empty mock platoons data if not exists
    if (!global.mockPlatoons) {
      global.mockPlatoons = []
    }
    const platoons = global.mockPlatoons

    // Get all allocated participant IDs from mock platoons
    const allocatedParticipantIds = new Set()
    if (global.mockPlatoons) {
      global.mockPlatoons.forEach(platoon => {
        if (platoon.participants) {
          platoon.participants.forEach(participant => {
            allocatedParticipantIds.add(participant.registration.id)
          })
        }
      })
    }

    // Filter out already allocated participants
    const unallocatedParticipants = allVerifiedParticipants.filter(
      participant => !allocatedParticipantIds.has(participant.id)
    )

    // Calculate overall statistics
    const totalVerified = await prisma.registration.count({
      where: { isVerified: true }
    })
    const totalAllocated = totalVerified - unallocatedParticipants.length

    const stats = {
      totalVerified,
      totalAllocated,
      totalUnallocated: unallocatedParticipants.length,
      allocationRate: totalVerified > 0 ? (totalAllocated / totalVerified) * 100 : 0,
      totalPlatoons: platoons.length,
      activePlatoons: platoons.length
    }

    return NextResponse.json({
      success: true,
      stats,
      platoons,
      unallocatedParticipants,
      message: 'Platoon system is being set up. Database schema update required.'
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
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user details from database
    const user = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to create platoons
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📥 Received platoon data:', body)
    const { name, leaderName, leaderPhone, capacity } = body

    // Validate required fields with specific messages
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Platoon name is required' }, { status: 400 })
    }
    if (!leaderName?.trim()) {
      return NextResponse.json({ error: 'Leader name is required' }, { status: 400 })
    }

    if (!leaderPhone?.trim()) {
      return NextResponse.json({ error: 'Leader phone number is required' }, { status: 400 })
    }
    if (!capacity || isNaN(capacity)) {
      return NextResponse.json({ error: 'Valid capacity is required' }, { status: 400 })
    }

    // Validate capacity range
    if (capacity < 1 || capacity > 200) {
      return NextResponse.json({ error: 'Platoon capacity must be between 1 and 200 participants' }, { status: 400 })
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json({ error: 'Platoon name must be at least 2 characters long' }, { status: 400 })
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: 'Platoon name must be less than 50 characters' }, { status: 400 })
    }



    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(leaderPhone.replace(/[\s\-\(\)]/g, ''))) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 })
    }

    // Check for duplicate platoon names in mock data
    if (!global.mockPlatoons) {
      global.mockPlatoons = []
    }

    // Check for duplicate platoon names
    const existingPlatoon = global.mockPlatoons.find(p => p.name.toLowerCase() === name.trim().toLowerCase())
    if (existingPlatoon) {
      return NextResponse.json({ error: `A platoon with the name "${name.trim()}" already exists. Please choose a different name.` }, { status: 400 })
    }



    // For now, create a mock platoon response until database is properly set up
    console.log('⚠️ Creating mock platoon until database schema is updated')

    const mockPlatoon = {
      id: `mock-${Date.now()}`,
      name: name.trim(),
      leaderName: leaderName.trim(),
      leaderPhone: leaderPhone.trim(),
      capacity: parseInt(capacity),
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: [] // Add empty participants array
    }

    // Add to mock data store (in memory for now)
    if (!global.mockPlatoons) {
      global.mockPlatoons = []
    }
    global.mockPlatoons.push(mockPlatoon)

    console.log(`✅ Successfully created platoon "${mockPlatoon.name}"`)

    return NextResponse.json({
      ...mockPlatoon,
      message: `Platoon "${mockPlatoon.name}" created successfully`
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating platoon:', error)
    return NextResponse.json(
      { error: 'Failed to create platoon' },
      { status: 500 }
    )
  }
}



import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// GET - Fetch all platoon allocation data
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to view platoon allocations
    if (!['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
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

    // TODO: Replace with actual platoon database queries when Prisma schema is updated
    const platoons = []
    const allocatedParticipantIds = new Set()

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
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to create platoons
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
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

    // TODO: Implement actual platoon creation when Prisma schema is updated
    // For now, return a proper error message
    return NextResponse.json({
      error: 'Platoon creation is not yet available. The database schema is being updated to support platoon management. Please contact your system administrator for more information.'
    }, { status: 501 })

  } catch (error) {
    console.error('Error creating platoon:', error)
    return NextResponse.json(
      { error: 'Failed to create platoon' },
      { status: 500 }
    )
  }
}



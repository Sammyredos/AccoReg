import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { PlatoonLeaderEmailService } from '@/lib/services/platoon-leader-email'

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
        createdAt: 'desc'
      }
    })

    // Get allocated participant IDs
    const allocatedParticipantIds = new Set(
      platoons.flatMap(platoon =>
        platoon.participants.map(p => p.registrationId)
      )
    )

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
    const { name, leaderName, leaderEmail, leaderPhone, capacity } = body

    // Validate required fields with specific messages
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Platoon name is required' }, { status: 400 })
    }
    if (!leaderName?.trim()) {
      return NextResponse.json({ error: 'Leader name is required' }, { status: 400 })
    }
    if (!leaderEmail?.trim()) {
      return NextResponse.json({ error: 'Leader email is required' }, { status: 400 })
    }
    if (!leaderPhone?.trim()) {
      return NextResponse.json({ error: 'Leader phone number is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(leaderEmail.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
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

    // Check for duplicate platoon names (case-insensitive for PostgreSQL, case-sensitive for SQLite)
    const existingPlatoon = await prisma.platoonAllocation.findFirst({
      where: {
        name: {
          equals: name.trim(),
          // Only use mode: 'insensitive' for PostgreSQL
          ...(process.env.DATABASE_URL?.includes('postgresql') && { mode: 'insensitive' })
        }
      }
    })

    if (existingPlatoon) {
      return NextResponse.json({
        error: `A platoon with the name "${name.trim()}" already exists. Please choose a different name.`
      }, { status: 400 })
    }

    // Check for duplicate leader email
    const existingEmail = await prisma.platoonAllocation.findFirst({
      where: {
        leaderEmail: leaderEmail.trim().toLowerCase()
      }
    })

    if (existingEmail) {
      return NextResponse.json({
        error: 'This email address is already assigned to another platoon leader. Please use a different email address.'
      }, { status: 400 })
    }

    // Generate a unique label (A, B, C, etc.)
    const existingPlatoons = await prisma.platoonAllocation.findMany({
      select: { label: true },
      orderBy: { label: 'asc' }
    })

    let label = 'A'
    const usedLabels = new Set(existingPlatoons.map(p => p.label))
    for (let i = 0; i < 26; i++) {
      const currentLabel = String.fromCharCode(65 + i) // A, B, C, ...
      if (!usedLabels.has(currentLabel)) {
        label = currentLabel
        break
      }
    }

    // Create the platoon
    const newPlatoon = await prisma.platoonAllocation.create({
      data: {
        name: name.trim(),
        leaderName: leaderName.trim(),
        leaderEmail: leaderEmail.trim().toLowerCase(),
        leaderPhone: leaderPhone.trim(),
        capacity: parseInt(capacity.toString()),
        label,
        createdBy: currentUser.id
      },
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
      }
    })

    console.log(`✅ Platoon "${newPlatoon.name}" created successfully by ${currentUser.email}`)

    // Send confirmation email to platoon leader in background
    setImmediate(async () => {
      try {
        const emailResult = await PlatoonLeaderEmailService.sendPlatoonCreationConfirmation(newPlatoon.id)
        if (emailResult.success) {
          console.log(`📧 Platoon creation confirmation sent to ${newPlatoon.leaderEmail}`)
        } else {
          console.error(`❌ Failed to send confirmation email to ${newPlatoon.leaderEmail}:`, emailResult.error)
        }
      } catch (error) {
        console.error('Error sending platoon creation confirmation:', error)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Platoon "${newPlatoon.name}" created successfully. Confirmation email sent to platoon leader.`,
      platoon: newPlatoon
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating platoon:', error)
    return NextResponse.json(
      { error: 'Failed to create platoon' },
      { status: 500 }
    )
  }
}



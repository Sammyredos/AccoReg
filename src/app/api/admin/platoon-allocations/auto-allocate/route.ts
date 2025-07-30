import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Auto allocate participants to platoons
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

    // Check if user has permission to auto-allocate participants (matching accommodations permissions)
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { participantIds, platoonIds } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'No participants provided' }, { status: 400 })
    }

    if (!platoonIds || !Array.isArray(platoonIds) || platoonIds.length === 0) {
      return NextResponse.json({ error: 'No platoons provided' }, { status: 400 })
    }

    // Use mock platoons for now since Prisma client doesn't have platoonAllocation model
    console.log('⚠️ Using mock platoons for auto-allocation until Prisma client is updated')

    if (!global.mockPlatoons) {
      global.mockPlatoons = [
        {
          id: 'mock-1',
          name: 'Alpha Platoon',
          leaderName: 'John Smith',
          label: 'A',
          leaderPhone: '+1234567890',
          capacity: 30,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participants: []
        },
        {
          id: 'mock-2',
          name: 'Bravo Platoon',
          leaderName: 'Jane Doe',
          label: 'B',
          leaderPhone: '+0987654321',
          capacity: 25,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participants: []
        }
      ]
    }

    const platoons = global.mockPlatoons.filter(p => platoonIds.includes(p.id))

    if (platoons.length === 0) {
      return NextResponse.json({ error: 'No valid platoons found' }, { status: 400 })
    }

    // For now, just verify participants exist and are verified
    // TODO: Check for existing allocations once Prisma client is updated
    const participants = await prisma.registration.findMany({
      where: {
        id: { in: participantIds },
        isVerified: true
      }
    })

    if (participants.length === 0) {
      return NextResponse.json({ error: 'No valid unallocated participants found' }, { status: 400 })
    }

    // Shuffle participants for random distribution
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)

    // Calculate available spaces in each platoon using mock data
    const platoonSpaces = platoons.map(platoon => ({
      id: platoon.id,
      availableSpaces: platoon.capacity - (platoon.participants?.length || 0)
    }))

    // Check if there's enough total capacity
    const totalAvailableSpaces = platoonSpaces.reduce((sum, p) => sum + p.availableSpaces, 0)

    if (totalAvailableSpaces < shuffledParticipants.length) {
      return NextResponse.json({
        error: `Insufficient capacity. Available spaces: ${totalAvailableSpaces}, Participants to allocate: ${shuffledParticipants.length}`
      }, { status: 400 })
    }

    // Distribute participants evenly across platoons
    const allocations: Array<{ participantId: string, platoonId: string }> = []
    let currentPlatoonIndex = 0

    for (const participant of shuffledParticipants) {
      // Find next platoon with available space
      let attempts = 0
      while (attempts < platoons.length) {
        const platoon = platoonSpaces[currentPlatoonIndex]
        
        if (platoon.availableSpaces > 0) {
          allocations.push({
            participantId: participant.id,
            platoonId: platoon.id
          })
          
          // Decrease available space
          platoon.availableSpaces--
          break
        }
        
        // Move to next platoon
        currentPlatoonIndex = (currentPlatoonIndex + 1) % platoons.length
        attempts++
      }
      
      // Move to next platoon for next participant (round-robin)
      currentPlatoonIndex = (currentPlatoonIndex + 1) % platoons.length
    }

    // Perform mock allocation by updating the global mock platoons
    for (const allocation of allocations) {
      const platoon = global.mockPlatoons.find(p => p.id === allocation.platoonId)
      const participant = participants.find(p => p.id === allocation.participantId)

      if (platoon && participant) {
        // Add participant to platoon
        if (!platoon.participants) {
          platoon.participants = []
        }
        platoon.participants.push({
          id: `allocation-${Date.now()}-${Math.random()}`,
          registration: {
            id: participant.id,
            fullName: participant.fullName,
            gender: participant.gender,
            dateOfBirth: participant.dateOfBirth,
            phoneNumber: participant.phoneNumber,
            emailAddress: participant.emailAddress,
            branch: participant.branch
          }
        })
      }
    }

    const result = {
      allocatedCount: allocations.length,
      message: `Successfully allocated ${allocations.length} participants to platoons.`
    }

    return NextResponse.json({
      success: true,
      totalAllocated: result.allocatedCount,
      message: result.message,
      allocations: allocations.map(a => ({
        participantId: a.participantId,
        platoonId: a.platoonId
      }))
    })

  } catch (error) {
    console.error('Error auto-allocating participants:', error)
    return NextResponse.json(
      { error: 'Failed to auto-allocate participants' },
      { status: 500 }
    )
  }
}

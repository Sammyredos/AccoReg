import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

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

    // For mock data, skip database user validation
    console.log('⚠️ Using mock authentication for manual platoon allocation')

    const body = await request.json()
    const { participantId, platoonId } = body

    // Validate required fields
    if (!participantId || !platoonId) {
      return NextResponse.json(
        { error: 'Participant ID and Platoon ID are required' },
        { status: 400 }
      )
    }

    // For now, work with mock data until Prisma client is updated
    console.log('⚠️ Using mock data for manual platoon allocation')
    
    if (!global.mockPlatoons) {
      return NextResponse.json({ error: 'No platoons found' }, { status: 404 })
    }

    if (!global.mockUnallocatedParticipants) {
      return NextResponse.json({ error: 'No unallocated participants found' }, { status: 404 })
    }

    // Find the participant in unallocated list
    const participantIndex = global.mockUnallocatedParticipants.findIndex(p => p.id === participantId)
    if (participantIndex === -1) {
      return NextResponse.json({ error: 'Participant not found or already allocated' }, { status: 404 })
    }

    // Find the target platoon
    const platoonIndex = global.mockPlatoons.findIndex(p => p.id === platoonId)
    if (platoonIndex === -1) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    const participant = global.mockUnallocatedParticipants[participantIndex]
    const platoon = global.mockPlatoons[platoonIndex]

    // Check if platoon has capacity
    const currentCount = platoon.participants?.length || 0
    if (currentCount >= platoon.capacity) {
      return NextResponse.json({ 
        error: `Platoon "${platoon.name}" is at full capacity (${platoon.capacity}/${platoon.capacity})` 
      }, { status: 400 })
    }

    // Create allocation record
    const allocationRecord = {
      id: `allocation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      registration: {
        id: participant.id,
        fullName: participant.fullName,
        gender: participant.gender,
        dateOfBirth: participant.dateOfBirth,
        phoneNumber: participant.phoneNumber,
        emailAddress: participant.emailAddress,
        branch: participant.branch
      }
    }

    // Add participant to platoon
    if (!global.mockPlatoons[platoonIndex].participants) {
      global.mockPlatoons[platoonIndex].participants = []
    }
    global.mockPlatoons[platoonIndex].participants.push(allocationRecord)

    // Remove participant from unallocated list
    global.mockUnallocatedParticipants.splice(participantIndex, 1)

    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${participant.fullName} to platoon "${platoon.name}"`,
      allocation: {
        participantName: participant.fullName,
        platoonName: platoon.name,
        platoonCapacity: `${currentCount + 1}/${platoon.capacity}`
      }
    })

  } catch (error) {
    console.error('Error in manual platoon allocation:', error)
    return NextResponse.json(
      { error: 'Failed to allocate participant to platoon' },
      { status: 500 }
    )
  }
}

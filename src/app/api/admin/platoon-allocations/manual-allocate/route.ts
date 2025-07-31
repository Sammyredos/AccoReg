import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to manually allocate participants (matching accommodations permissions)
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { participantId, platoonId } = body

    // Validate required fields
    if (!participantId || !platoonId) {
      return NextResponse.json(
        { error: 'Participant ID and Platoon ID are required' },
        { status: 400 }
      )
    }

    // Check if participant exists and is verified
    const participant = await prisma.registration.findUnique({
      where: { id: participantId },
      include: {
        platoonParticipant: true
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    if (!participant.isVerified) {
      return NextResponse.json({ error: 'Participant must be verified before allocation' }, { status: 400 })
    }

    if (participant.platoonParticipant) {
      return NextResponse.json({ error: 'Participant is already allocated to a platoon' }, { status: 400 })
    }

    // Check if platoon exists and has capacity
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      include: {
        participants: true
      }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    if (platoon.participants.length >= platoon.capacity) {
      return NextResponse.json({
        error: `Platoon "${platoon.name}" is at full capacity (${platoon.capacity}/${platoon.capacity})`
      }, { status: 400 })
    }

    // Create the allocation
    const allocation = await prisma.platoonParticipant.create({
      data: {
        registrationId: participantId,
        platoonId: platoonId,
        allocatedBy: currentUser.id
      },
      include: {
        registration: {
          select: {
            fullName: true
          }
        },
        platoon: {
          select: {
            name: true,
            capacity: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${allocation.registration.fullName} to platoon "${allocation.platoon.name}"`,
      allocation: {
        participantId: participantId,
        participantName: allocation.registration.fullName,
        platoonId: platoonId,
        platoonName: allocation.platoon.name,
        platoonCapacity: `${platoon.participants.length + 1}/${platoon.capacity}`
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

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Auto allocate participants to platoons
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to allocate participants
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff']
    if (!allowedRoles.includes(session.user.role?.name || '')) {
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

    // Fetch platoons with current occupancy
    const platoons = await prisma.platoonAllocation.findMany({
      where: {
        id: { in: platoonIds }
      },
      include: {
        participants: true
      }
    })

    if (platoons.length === 0) {
      return NextResponse.json({ error: 'No valid platoons found' }, { status: 400 })
    }

    // Verify participants exist and are verified but not allocated
    const participants = await prisma.registration.findMany({
      where: {
        id: { in: participantIds },
        isVerified: true,
        platoonAllocation: null
      }
    })

    if (participants.length === 0) {
      return NextResponse.json({ error: 'No valid unallocated participants found' }, { status: 400 })
    }

    // Shuffle participants for random distribution
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)

    // Calculate available spaces in each platoon
    const platoonSpaces = platoons.map(platoon => ({
      id: platoon.id,
      availableSpaces: Math.max(0, platoon.capacity - platoon.participants.length)
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

    // Perform the allocations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdAllocations = []

      for (const allocation of allocations) {
        // Create platoon participant record
        const platoonParticipant = await tx.platoonParticipant.create({
          data: {
            registrationId: allocation.participantId,
            platoonId: allocation.platoonId,
            allocatedBy: session.user.id,
            allocatedAt: new Date()
          }
        })

        // Update registration to mark as allocated
        await tx.registration.update({
          where: { id: allocation.participantId },
          data: { platoonAllocation: allocation.platoonId }
        })

        createdAllocations.push(platoonParticipant)
      }

      return createdAllocations
    })

    return NextResponse.json({
      success: true,
      totalAllocated: result.length,
      allocations: result.map(a => ({
        participantId: a.registrationId,
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

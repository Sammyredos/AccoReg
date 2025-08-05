import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { sendPlatoonAllocationEmail } from '@/lib/email'
import { PlatoonLeaderEmailService } from '@/lib/services/platoon-leader-email'

// POST - Auto allocate participants to platoons
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to auto-allocate participants (matching accommodations permissions)
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
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

    // Get platoons with current participant counts
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

    // Get unallocated participants
    const participants = await prisma.registration.findMany({
      where: {
        id: { in: participantIds },
        isVerified: true,
        platoonParticipant: null // Not already allocated
      }
    })

    if (participants.length === 0) {
      return NextResponse.json({ error: 'No valid unallocated participants found' }, { status: 400 })
    }

    // Calculate available spaces
    const platoonSpaces = platoons.map(platoon => ({
      id: platoon.id,
      name: platoon.name,
      availableSpaces: platoon.capacity - platoon.participants.length
    }))

    const totalAvailableSpaces = platoonSpaces.reduce((sum, p) => sum + p.availableSpaces, 0)

    if (totalAvailableSpaces < participants.length) {
      return NextResponse.json({
        error: `Insufficient capacity. Available spaces: ${totalAvailableSpaces}, Participants to allocate: ${participants.length}`
      }, { status: 400 })
    }

    // Shuffle participants for random distribution
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)

    // Distribute participants evenly across platoons
    const allocations = []
    let currentPlatoonIndex = 0

    for (const participant of shuffledParticipants) {
      // Find next platoon with available space
      let attempts = 0
      while (attempts < platoons.length) {
        const platoonSpace = platoonSpaces[currentPlatoonIndex]

        if (platoonSpace.availableSpaces > 0) {
          allocations.push({
            registrationId: participant.id,
            platoonId: platoonSpace.id,
            allocatedBy: currentUser.id
          })

          // Decrease available space
          platoonSpace.availableSpaces--
          break
        }

        // Move to next platoon
        currentPlatoonIndex = (currentPlatoonIndex + 1) % platoons.length
        attempts++
      }

      // Move to next platoon for next participant (round-robin)
      currentPlatoonIndex = (currentPlatoonIndex + 1) % platoons.length
    }

    // Create all allocations in a single batch operation (much faster)
    console.log(`🚀 Creating ${allocations.length} platoon allocations in batch...`)
    await prisma.platoonParticipant.createMany({
      data: allocations
    })

    // Send platoon allocation emails asynchronously (don't wait for completion)
    console.log('📧 Starting platoon allocation emails in background...')
    let emailResults = {
      summary: {
        total: allocations.length,
        successful: 0,
        failed: 0,
        status: 'sending'
      }
    }

    if (allocations.length > 0) {
      // Get all registration and platoon data in batch queries (much faster)
      const registrationIds = allocations.map(a => a.registrationId)
      const platoonIds = [...new Set(allocations.map(a => a.platoonId))]

      // Fire and forget - don't await this (immediate response to user)
      Promise.all([
        prisma.registration.findMany({
          where: { id: { in: registrationIds } }
        }),
        prisma.platoonAllocation.findMany({
          where: { id: { in: platoonIds } }
        })
      ]).then(async ([registrations, platoonsData]) => {
        console.log('📧 Sending platoon allocation emails in background...')
        const emailPromises = []

        for (const allocation of allocations) {
          const registration = registrations.find(r => r.id === allocation.registrationId)
          const platoon = platoonsData.find(p => p.id === allocation.platoonId)

          if (registration && platoon) {
            emailPromises.push(
              sendPlatoonAllocationEmail(registration, platoon).catch(error => ({
                success: false,
                error: error.message
              }))
            )
          }
        }

        // Send all emails in parallel (much faster)
        const results = await Promise.allSettled(emailPromises)
        const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length
        console.log(`📧 Platoon allocation emails completed: ${successful}/${allocations.length} sent successfully`)
      }).catch((emailError) => {
        console.error('Error sending bulk platoon allocation emails:', emailError)
      })

      console.log(`Started sending platoon allocation emails to ${allocations.length} participants in background...`)
    }

    const successfulEmails = 0 // Will be updated in background

    // Check for full platoons and send notifications to leaders
    if (allocations.length > 0) {
      // Get updated platoon data to check which ones are now full
      const updatedPlatoons = await prisma.platoonAllocation.findMany({
        where: {
          id: { in: [...new Set(allocations.map(a => a.platoonId))] }
        },
        include: {
          participants: true
        }
      })

      // Send notifications to leaders of full platoons in background
      setImmediate(async () => {
        for (const platoon of updatedPlatoons) {
          if (platoon.participants.length >= platoon.capacity) {
            try {
              await PlatoonLeaderEmailService.sendPlatoonFullNotification({
                platoonId: platoon.id,
                allocatedBy: currentUser.email
              })
              console.log(`📧 Sent full platoon notification to leader of ${platoon.name}`)
            } catch (error) {
              console.error(`❌ Failed to send full platoon notification for ${platoon.name}:`, error)
            }
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      totalAllocated: allocations.length,
      message: `Successfully allocated ${allocations.length} participants to platoons. Notification emails are being sent in background.`,
      emailResults,
      allocations: allocations.map(a => ({
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

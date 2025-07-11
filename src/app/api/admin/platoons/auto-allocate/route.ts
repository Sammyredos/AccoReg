import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('platoons-auto-allocate-api')

// POST /api/admin/platoons/auto-allocate - Auto-allocate unallocated participants to platoons
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin and Admin can auto-allocate platoons
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin and Admin can auto-allocate platoons.' 
      }, { status: 403 })
    }

    const data = await request.json()
    const { platoonIds } = data

    // Validate required fields
    if (!platoonIds || !Array.isArray(platoonIds) || platoonIds.length === 0) {
      return NextResponse.json({
        error: 'platoonIds must be a non-empty array'
      }, { status: 400 })
    }

    // Check if all platoons exist
    const platoons = await prisma.platoon.findMany({
      where: {
        id: { in: platoonIds },
        isActive: true
      }
    })

    if (platoons.length !== platoonIds.length) {
      return NextResponse.json({
        error: 'Some platoons not found or inactive'
      }, { status: 400 })
    }

    // Get all verified participants who are not allocated to any platoon
    const unallocatedParticipants = await prisma.registration.findMany({
      where: {
        isVerified: true,
        platoonAllocation: null
      },
      select: {
        id: true,
        fullName: true,
        gender: true,
        dateOfBirth: true
      }
    })

    if (unallocatedParticipants.length === 0) {
      return NextResponse.json({
        message: 'No unallocated verified participants found',
        allocatedCount: 0
      })
    }

    // Shuffle participants for random distribution
    const shuffledParticipants = [...unallocatedParticipants].sort(() => Math.random() - 0.5)

    // Distribute participants evenly across platoons
    const allocationsToCreate: Array<{
      registrationId: string
      platoonId: string
      allocatedBy: string
    }> = []

    shuffledParticipants.forEach((participant, index) => {
      const platoonIndex = index % platoons.length
      const selectedPlatoon = platoons[platoonIndex]
      
      allocationsToCreate.push({
        registrationId: participant.id,
        platoonId: selectedPlatoon.id,
        allocatedBy: currentUser.email
      })
    })

    // Create all allocations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdAllocations = await tx.platoonAllocation.createMany({
        data: allocationsToCreate
      })

      // Get allocation summary
      const allocationSummary = await tx.platoon.findMany({
        where: {
          id: { in: platoonIds }
        },
        include: {
          _count: {
            select: {
              allocations: true
            }
          }
        }
      })

      return {
        allocatedCount: createdAllocations.count,
        summary: allocationSummary.map(platoon => ({
          platoonId: platoon.id,
          platoonName: platoon.name,
          participantCount: platoon._count.allocations
        }))
      }
    })

    logger.info('Auto-allocation completed successfully', {
      totalParticipants: unallocatedParticipants.length,
      allocatedCount: result.allocatedCount,
      platoonCount: platoons.length,
      allocatedBy: currentUser.email,
      summary: result.summary
    })

    return NextResponse.json({
      message: `Successfully auto-allocated ${result.allocatedCount} participants across ${platoons.length} platoons`,
      allocatedCount: result.allocatedCount,
      summary: result.summary
    })

  } catch (error) {
    logger.error('Error during auto-allocation:', error)
    return NextResponse.json({
      error: 'Failed to auto-allocate participants'
    }, { status: 500 })
  }
}

// GET /api/admin/platoons/auto-allocate - Get auto-allocation preview
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin and Admin can view auto-allocation preview
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin and Admin can view auto-allocation preview.' 
      }, { status: 403 })
    }

    // Get all active platoons
    const platoons = await prisma.platoon.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            allocations: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Get all verified participants who are not allocated to any platoon
    const unallocatedParticipants = await prisma.registration.findMany({
      where: {
        isVerified: true,
        platoonAllocation: null
      },
      select: {
        id: true,
        fullName: true,
        gender: true,
        dateOfBirth: true
      }
    })

    // Calculate distribution preview
    const distributionPreview = platoons.map((platoon, index) => {
      const participantsPerPlatoon = Math.floor(unallocatedParticipants.length / platoons.length)
      const remainder = unallocatedParticipants.length % platoons.length
      const additionalParticipant = index < remainder ? 1 : 0
      
      return {
        platoonId: platoon.id,
        platoonName: platoon.name,
        currentCount: platoon._count.allocations,
        newParticipants: participantsPerPlatoon + additionalParticipant,
        totalAfterAllocation: platoon._count.allocations + participantsPerPlatoon + additionalParticipant
      }
    })

    return NextResponse.json({
      unallocatedCount: unallocatedParticipants.length,
      availablePlatoons: platoons.length,
      distributionPreview
    })

  } catch (error) {
    logger.error('Error getting auto-allocation preview:', error)
    return NextResponse.json({
      error: 'Failed to get auto-allocation preview'
    }, { status: 500 })
  }
}

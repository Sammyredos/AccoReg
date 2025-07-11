import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { Logger } from '@/lib/logger'

const logger = Logger('PlatoonAllocations')

// POST /api/admin/platoons/allocations - Allocate participants to platoons
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin and Admin can allocate platoons
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin and Admin can allocate platoons.' 
      }, { status: 403 })
    }

    const data = await request.json()
    const { registrationIds, platoonId } = data

    // Validate required fields
    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return NextResponse.json({
        error: 'registrationIds must be a non-empty array'
      }, { status: 400 })
    }

    if (!platoonId) {
      return NextResponse.json({
        error: 'platoonId is required'
      }, { status: 400 })
    }

    // Check if platoon exists
    const platoon = await prisma.platoon.findUnique({
      where: { id: platoonId }
    })

    if (!platoon) {
      return NextResponse.json({
        error: 'Platoon not found'
      }, { status: 404 })
    }

    // Check if all registrations exist and are verified
    const registrations = await prisma.registration.findMany({
      where: {
        id: { in: registrationIds },
        isVerified: true
      }
    })

    if (registrations.length !== registrationIds.length) {
      return NextResponse.json({
        error: 'Some registrations not found or not verified'
      }, { status: 400 })
    }

    // Check if any registrations are already allocated to platoons
    const existingAllocations = await prisma.platoonAllocation.findMany({
      where: {
        registrationId: { in: registrationIds }
      }
    })

    if (existingAllocations.length > 0) {
      return NextResponse.json({
        error: 'Some participants are already allocated to platoons'
      }, { status: 409 })
    }

    // Create allocations
    const allocations = await prisma.platoonAllocation.createMany({
      data: registrationIds.map((registrationId: string) => ({
        registrationId,
        platoonId,
        allocatedBy: currentUser.email
      }))
    })

    logger.info('Platoon allocations created successfully', {
      platoonId,
      platoonName: platoon.name,
      participantCount: registrationIds.length,
      allocatedBy: currentUser.email
    })

    return NextResponse.json({
      message: `Successfully allocated ${registrationIds.length} participants to ${platoon.name}`,
      allocatedCount: allocations.count
    })

  } catch (error) {
    logger.error('Error creating platoon allocations:', error)
    return NextResponse.json({
      error: 'Failed to create platoon allocations'
    }, { status: 500 })
  }
}

// DELETE /api/admin/platoons/allocations - Remove participants from platoons
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin and Admin can remove platoon allocations
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin and Admin can remove platoon allocations.' 
      }, { status: 403 })
    }

    const data = await request.json()
    const { registrationIds } = data

    // Validate required fields
    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return NextResponse.json({
        error: 'registrationIds must be a non-empty array'
      }, { status: 400 })
    }

    // Remove allocations
    const result = await prisma.platoonAllocation.deleteMany({
      where: {
        registrationId: { in: registrationIds }
      }
    })

    logger.info('Platoon allocations removed successfully', {
      participantCount: result.count,
      removedBy: currentUser.email
    })

    return NextResponse.json({
      message: `Successfully removed ${result.count} participants from platoons`,
      removedCount: result.count
    })

  } catch (error) {
    logger.error('Error removing platoon allocations:', error)
    return NextResponse.json({
      error: 'Failed to remove platoon allocations'
    }, { status: 500 })
  }
}

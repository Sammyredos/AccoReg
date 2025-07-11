import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { Logger } from '@/lib/logger'

const logger = Logger('PlatoonAPI')

// GET /api/admin/platoons/[id] - Get a specific platoon
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin and Admin can view platoons
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin and Admin can view platoons.' 
      }, { status: 403 })
    }

    const platoonId = params.id

    const platoon = await prisma.platoon.findUnique({
      where: { id: platoonId },
      include: {
        allocations: {
          include: {
            registration: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                emailAddress: true,
                phoneNumber: true,
                verifiedAt: true
              }
            }
          }
        },
        _count: {
          select: {
            allocations: true
          }
        }
      }
    })

    if (!platoon) {
      return NextResponse.json({
        error: 'Platoon not found'
      }, { status: 404 })
    }

    return NextResponse.json({ platoon })

  } catch (error) {
    logger.error('Error retrieving platoon:', error)
    return NextResponse.json({
      error: 'Failed to retrieve platoon'
    }, { status: 500 })
  }
}

// PUT /api/admin/platoons/[id] - Update a platoon
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin and Admin can update platoons
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin and Admin can update platoons.' 
      }, { status: 403 })
    }

    const platoonId = params.id
    const data = await request.json()
    const { name, leaderName, leaderPhone, label, isActive } = data

    // Check if platoon exists
    const existingPlatoon = await prisma.platoon.findUnique({
      where: { id: platoonId }
    })

    if (!existingPlatoon) {
      return NextResponse.json({
        error: 'Platoon not found'
      }, { status: 404 })
    }

    // If name is being changed, check for duplicates
    if (name && name !== existingPlatoon.name) {
      const duplicatePlatoon = await prisma.platoon.findUnique({
        where: { name }
      })

      if (duplicatePlatoon) {
        return NextResponse.json({
          error: 'A platoon with this name already exists'
        }, { status: 409 })
      }
    }

    // Update the platoon
    const updatedPlatoon = await prisma.platoon.update({
      where: { id: platoonId },
      data: {
        ...(name && { name }),
        ...(leaderName && { leaderName }),
        ...(leaderPhone && { leaderPhone }),
        ...(label !== undefined && { label }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        _count: {
          select: {
            allocations: true
          }
        }
      }
    })

    logger.info('Platoon updated successfully', {
      platoonId: updatedPlatoon.id,
      platoonName: updatedPlatoon.name,
      updatedBy: currentUser.email
    })

    return NextResponse.json({
      message: 'Platoon updated successfully',
      platoon: updatedPlatoon
    })

  } catch (error) {
    logger.error('Error updating platoon:', error)
    return NextResponse.json({
      error: 'Failed to update platoon'
    }, { status: 500 })
  }
}

// DELETE /api/admin/platoons/[id] - Delete a platoon
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin can delete platoons
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Super Admin can delete platoons.' 
      }, { status: 403 })
    }

    const platoonId = params.id

    // Check if platoon exists
    const existingPlatoon = await prisma.platoon.findUnique({
      where: { id: platoonId },
      include: {
        _count: {
          select: {
            allocations: true
          }
        }
      }
    })

    if (!existingPlatoon) {
      return NextResponse.json({
        error: 'Platoon not found'
      }, { status: 404 })
    }

    // Check if platoon has allocations
    if (existingPlatoon._count.allocations > 0) {
      return NextResponse.json({
        error: 'Cannot delete platoon with existing allocations. Remove all participants first.'
      }, { status: 409 })
    }

    // Delete the platoon
    await prisma.platoon.delete({
      where: { id: platoonId }
    })

    logger.info('Platoon deleted successfully', {
      platoonId,
      platoonName: existingPlatoon.name,
      deletedBy: currentUser.email
    })

    return NextResponse.json({
      message: 'Platoon deleted successfully'
    })

  } catch (error) {
    logger.error('Error deleting platoon:', error)
    return NextResponse.json({
      error: 'Failed to delete platoon'
    }, { status: 500 })
  }
}

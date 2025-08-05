import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// DELETE - Delete a platoon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: platoonId } = await params

    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to delete platoons
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if platoon exists
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      include: {
        participants: {
          include: {
            registration: {
              select: { fullName: true }
            }
          }
        }
      }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Check if platoon has participants
    if (platoon.participants.length > 0) {
      return NextResponse.json({
        error: `Cannot delete platoon "${platoon.name}" because it has ${platoon.participants.length} allocated participants. Please remove all participants first.`
      }, { status: 400 })
    }

    // Delete the platoon (participants will be automatically deleted due to CASCADE)
    await prisma.platoonAllocation.delete({
      where: { id: platoonId }
    })

    return NextResponse.json({
      success: true,
      message: `Platoon "${platoon.name}" deleted successfully`,
      deletedPlatoon: {
        id: platoon.id,
        name: platoon.name,
        participantsUnallocated: 0
      }
    })

  } catch (error) {
    console.error('Error deleting platoon:', error)
    return NextResponse.json(
      { error: 'Failed to delete platoon' },
      { status: 500 }
    )
  }
}

// PUT - Update a platoon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: platoonId } = await params

    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to edit platoons
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
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

    // Validate phone number format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(leaderPhone.replace(/[\s\-\(\)]/g, ''))) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 })
    }

    // Check if platoon exists
    const existingPlatoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      include: {
        participants: true
      }
    })

    if (!existingPlatoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Check for duplicate platoon names (excluding current platoon)
    const duplicatePlatoon = await prisma.platoonAllocation.findFirst({
      where: {
        name: {
          equals: name.trim(),
          // Only use mode: 'insensitive' for PostgreSQL
          ...(process.env.DATABASE_URL?.includes('postgresql') && { mode: 'insensitive' })
        },
        id: {
          not: platoonId
        }
      }
    })

    if (duplicatePlatoon) {
      return NextResponse.json({
        error: `A platoon with the name "${name.trim()}" already exists. Please choose a different name.`
      }, { status: 400 })
    }

    // Check if new capacity is less than current participants
    const currentParticipantCount = existingPlatoon.participants.length
    if (capacity < currentParticipantCount) {
      return NextResponse.json({
        error: `Cannot reduce capacity to ${capacity}. Platoon currently has ${currentParticipantCount} allocated participants. Please remove participants first or increase capacity.`
      }, { status: 400 })
    }

    // Update the platoon
    const updatedPlatoon = await prisma.platoonAllocation.update({
      where: { id: platoonId },
      data: {
        name: name.trim(),
        leaderName: leaderName.trim(),
        leaderPhone: leaderPhone.trim(),
        capacity: parseInt(capacity.toString())
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

    return NextResponse.json({
      success: true,
      message: `Platoon "${updatedPlatoon.name}" updated successfully`,
      platoon: updatedPlatoon
    })

  } catch (error) {
    console.error('Error updating platoon:', error)
    return NextResponse.json(
      { error: 'Failed to update platoon' },
      { status: 500 }
    )
  }
}

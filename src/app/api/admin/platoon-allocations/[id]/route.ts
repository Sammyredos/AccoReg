import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

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
    const { name, leaderName, leaderEmail, leaderPhone, capacity } = body

    // Validate required fields
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

    // Check if platoon exists
    const existingPlatoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId }
    })

    if (!existingPlatoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Check for duplicate platoon name (excluding current platoon)
    const duplicateName = await prisma.platoonAllocation.findFirst({
      where: {
        name: name.trim(),
        id: { not: platoonId }
      }
    })

    if (duplicateName) {
      return NextResponse.json({ error: 'A platoon with this name already exists' }, { status: 400 })
    }

    // Check for duplicate leader email (excluding current platoon)
    const duplicateEmail = await prisma.platoonAllocation.findFirst({
      where: {
        leaderEmail: leaderEmail.trim().toLowerCase(),
        id: { not: platoonId }
      }
    })

    if (duplicateEmail) {
      return NextResponse.json({
        error: 'This email address is already assigned to another platoon leader'
      }, { status: 400 })
    }

    // Validate capacity
    const capacityNum = parseInt(capacity.toString())
    if (isNaN(capacityNum) || capacityNum < 1 || capacityNum > 100) {
      return NextResponse.json({ error: 'Capacity must be between 1 and 100' }, { status: 400 })
    }

    // Check if new capacity is less than current participants
    const currentParticipants = await prisma.platoonParticipant.count({
      where: { platoonId }
    })

    if (capacityNum < currentParticipants) {
      return NextResponse.json({
        error: `Cannot reduce capacity to ${capacityNum}. Platoon currently has ${currentParticipants} participants.`
      }, { status: 400 })
    }

    // Generate label if name changed
    let label = existingPlatoon.label
    if (name.trim() !== existingPlatoon.name) {
      label = name.trim().charAt(0).toUpperCase()

      // Check for duplicate label (excluding current platoon)
      const duplicateLabel = await prisma.platoonAllocation.findFirst({
        where: {
          label,
          id: { not: platoonId }
        }
      })

      if (duplicateLabel) {
        // Find next available label
        for (let i = 1; i <= 26; i++) {
          const testLabel = String.fromCharCode(65 + (label.charCodeAt(0) - 65 + i) % 26)
          const labelExists = await prisma.platoonAllocation.findFirst({
            where: {
              label: testLabel,
              id: { not: platoonId }
            }
          })
          if (!labelExists) {
            label = testLabel
            break
          }
        }
      }
    }

    // Update the platoon
    const updatedPlatoon = await prisma.platoonAllocation.update({
      where: { id: platoonId },
      data: {
        name: name.trim(),
        leaderName: leaderName.trim(),
        leaderEmail: leaderEmail.trim().toLowerCase(),
        leaderPhone: leaderPhone.trim(),
        capacity: capacityNum,
        label
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

    console.log(`✅ Platoon "${updatedPlatoon.name}" updated successfully by ${currentUser.email}`)

    return NextResponse.json({
      success: true,
      message: 'Platoon updated successfully',
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



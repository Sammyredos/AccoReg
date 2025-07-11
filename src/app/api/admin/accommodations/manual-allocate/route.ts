import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { RoomAllocationEmailService } from '@/lib/services/room-allocation-email'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to allocate rooms
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { registrationId, roomId } = data

    // Validate required fields
    if (!registrationId || !roomId) {
      return NextResponse.json(
        { error: 'Registration ID and Room ID are required' },
        { status: 400 }
      )
    }

    // Check if registration exists and is not already allocated
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { roomAllocation: true }
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Check if registration is verified
    if (!registration.isVerified) {
      return NextResponse.json(
        { error: 'Registration must be verified before room allocation. Please verify attendance first.' },
        { status: 400 }
      )
    }

    if (registration.roomAllocation) {
      return NextResponse.json(
        { error: 'Registration is already allocated to a room' },
        { status: 400 }
      )
    }

    // Check if room exists and has available space
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { allocations: true }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    if (!room.isActive) {
      return NextResponse.json(
        { error: 'Room is not active' },
        { status: 400 }
      )
    }

    if (room.allocations.length >= room.capacity) {
      return NextResponse.json(
        { error: 'Room is at full capacity' },
        { status: 400 }
      )
    }

    // Check gender compatibility
    if (room.gender !== registration.gender) {
      return NextResponse.json(
        { error: `Cannot allocate ${registration.gender.toLowerCase()} registration to ${room.gender.toLowerCase()} room` },
        { status: 400 }
      )
    }

    // Calculate age of the person being allocated
    const calculateAge = (dateOfBirth: string): number => {
      const today = new Date()
      const birthDate = new Date(dateOfBirth)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    }

    const personAge = calculateAge(registration.dateOfBirth)

    // Check age compatibility with existing room occupants
    if (room.allocations.length > 0) {
      // Get all existing registrations in this room
      const existingAllocations = await prisma.roomAllocation.findMany({
        where: { roomId },
        include: {
          registration: true
        }
      })

      if (existingAllocations.length > 0) {
        // Calculate ages of existing occupants
        const existingAges = existingAllocations.map(allocation =>
          calculateAge(allocation.registration.dateOfBirth)
        )

        // Find the age range of existing occupants
        const minExistingAge = Math.min(...existingAges)
        const maxExistingAge = Math.max(...existingAges)

        // Get maximum allowed age gap from configuration
        const ageGapConfig = await prisma.systemConfig.findUnique({
          where: { key: 'accommodation_max_age_gap' }
        })
        const maxAgeGap = ageGapConfig ? parseInt(ageGapConfig.value) : 5

        // Check if the new person's age would create too large an age gap
        const newMinAge = Math.min(minExistingAge, personAge)
        const newMaxAge = Math.max(maxExistingAge, personAge)
        const newAgeRange = newMaxAge - newMinAge

        if (newAgeRange > maxAgeGap) {
          return NextResponse.json(
            {
              error: `Age compatibility issue: Adding person aged ${personAge} would create an age range of ${newAgeRange} years (${newMinAge}-${newMaxAge}). Maximum allowed age range is ${maxAgeGap} years. Current room occupants are aged ${minExistingAge}-${maxExistingAge}.`
            },
            { status: 400 }
          )
        }
      }
    }

    // Create the allocation
    const allocation = await prisma.roomAllocation.create({
      data: {
        registrationId,
        roomId,
        allocatedBy: currentUser.email
      }
    })

    // Send room allocation email to the registrant
    try {
      const emailResult = await RoomAllocationEmailService.sendRoomAllocationEmailWithDefaults(
        registrationId,
        currentUser.email
      )

      if (!emailResult.success) {
        console.warn('Failed to send room allocation email:', emailResult.error)
        // Don't fail the allocation if email fails
      } else {
        console.log('Room allocation email sent successfully to registrant')
      }
    } catch (emailError) {
      console.error('Error sending room allocation email:', emailError)
      // Don't fail the allocation if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Registration allocated successfully',
      allocation,
      emailSent: true // Indicate that email was attempted
    })

  } catch (error) {
    console.error('Error in manual allocation:', error)
    return NextResponse.json(
      { error: 'Failed to allocate registration' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to remove allocations
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const registrationId = searchParams.get('registrationId')

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    // Find and delete the allocation
    const allocation = await prisma.roomAllocation.findUnique({
      where: { registrationId }
    })

    if (!allocation) {
      return NextResponse.json(
        { error: 'Allocation not found' },
        { status: 404 }
      )
    }

    await prisma.roomAllocation.delete({
      where: { registrationId }
    })

    return NextResponse.json({
      success: true,
      message: 'Allocation removed successfully'
    })

  } catch (error) {
    console.error('Error removing allocation:', error)
    return NextResponse.json(
      { error: 'Failed to remove allocation' },
      { status: 500 }
    )
  }
}

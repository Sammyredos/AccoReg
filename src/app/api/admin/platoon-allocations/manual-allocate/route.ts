import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { sendPlatoonAllocationEmail } from '@/lib/email'

// POST - Manually allocate a participant to a platoon
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to allocate participants to platoons
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { registrationId, platoonId } = data

    // Validate required fields
    if (!registrationId || !platoonId) {
      return NextResponse.json(
        { error: 'Registration ID and Platoon ID are required' },
        { status: 400 }
      )
    }

    // Check if registration exists and is verified
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        platoonParticipant: {
          include: {
            platoon: true
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (!registration.isVerified) {
      return NextResponse.json(
        { error: 'Registration must be verified before platoon allocation' },
        { status: 400 }
      )
    }

    // Check if participant is already allocated to a platoon
    if (registration.platoonParticipant) {
      return NextResponse.json({
        error: `Participant is already allocated to platoon "${registration.platoonParticipant.platoon.name}"`
      }, { status: 400 })
    }

    // Check if platoon exists
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      include: {
        participants: true
      }
    })

    if (!platoon) {
      return NextResponse.json(
        { error: 'Platoon not found' },
        { status: 404 }
      )
    }

    // Check if platoon has available capacity
    if (platoon.participants.length >= platoon.capacity) {
      return NextResponse.json({
        error: `Platoon "${platoon.name}" is at full capacity (${platoon.capacity}/${platoon.capacity})`
      }, { status: 400 })
    }

    // Check gender compatibility (if platoon has gender restriction)
    if (platoon.gender && platoon.gender !== 'Mixed' && registration.gender !== platoon.gender) {
      return NextResponse.json({
        error: `Gender mismatch. Platoon "${platoon.name}" is for ${platoon.gender} participants only`
      }, { status: 400 })
    }

    console.log('⚔️ Manual platoon allocation:', {
      participantName: registration.fullName,
      participantId: registration.id,
      platoonName: platoon.name,
      platoonId: platoon.id,
      allocatedBy: currentUser.email
    })

    // Create the allocation
    const allocation = await prisma.platoonParticipant.create({
      data: {
        registrationId,
        platoonId,
        allocatedBy: currentUser.id
      }
    })

    console.log('✅ Manual platoon allocation successful:', {
      allocationId: allocation.id,
      participantName: registration.fullName,
      platoonName: platoon.name
    })

    // Send platoon allocation email to participant
    try {
      const emailResult = await sendPlatoonAllocationEmail(registration, platoon)
      
      if (emailResult.success) {
        console.log('✅ Platoon allocation email sent to:', registration.emailAddress)
      } else {
        console.warn('❌ Failed to send platoon allocation email:', emailResult.error)
        // Don't fail the allocation if email fails
      }
    } catch (emailError) {
      console.error('Error sending platoon allocation email:', emailError)
      // Don't fail the allocation if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Participant allocated to platoon successfully',
      allocation: {
        id: allocation.id,
        participantName: registration.fullName,
        platoonName: platoon.name,
        allocatedAt: allocation.allocatedAt,
        allocatedBy: currentUser.email
      },
      emailSent: true // Indicate that email was attempted
    })

  } catch (error) {
    console.error('Error in manual platoon allocation:', error)
    return NextResponse.json(
      { error: 'Failed to allocate participant to platoon' },
      { status: 500 }
    )
  }
}

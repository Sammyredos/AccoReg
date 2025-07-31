import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

export async function POST(
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

    // Check if user has permission to remove participants
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { participantId } = body

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 })
    }

    // Check if platoon exists
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Check if participant is allocated to this platoon
    const allocation = await prisma.platoonParticipant.findFirst({
      where: {
        platoonId: platoonId,
        registrationId: participantId
      },
      include: {
        registration: {
          select: {
            fullName: true
          }
        }
      }
    })

    if (!allocation) {
      return NextResponse.json({ 
        error: 'Participant is not allocated to this platoon' 
      }, { status: 404 })
    }

    // Remove the participant from the platoon
    await prisma.platoonParticipant.delete({
      where: {
        id: allocation.id
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${allocation.registration.fullName} from platoon "${platoon.name}"`,
      removedParticipant: {
        id: participantId,
        name: allocation.registration.fullName,
        platoonName: platoon.name
      }
    })

  } catch (error) {
    console.error('Error removing participant from platoon:', error)
    return NextResponse.json(
      { error: 'Failed to remove participant from platoon' },
      { status: 500 }
    )
  }
}

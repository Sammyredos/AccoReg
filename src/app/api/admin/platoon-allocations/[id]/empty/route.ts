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

    // Check if user has permission to empty platoons
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if platoon exists and get participant count
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      include: {
        participants: true
      }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    const participantCount = platoon.participants.length

    if (participantCount === 0) {
      return NextResponse.json({
        success: true,
        message: `Platoon "${platoon.name}" is already empty`,
        unallocatedCount: 0,
        platoonName: platoon.name
      })
    }

    // Remove all participants from this platoon
    const deleteResult = await prisma.platoonParticipant.deleteMany({
      where: {
        platoonId: platoonId
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully emptied platoon "${platoon.name}"`,
      unallocatedCount: deleteResult.count,
      platoonName: platoon.name
    })

  } catch (error) {
    console.error('Error emptying platoon:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

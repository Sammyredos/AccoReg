import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
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

    // Count current allocations before emptying
    const currentAllocations = await prisma.platoonParticipant.count()

    if (currentAllocations === 0) {
      return NextResponse.json({
        success: true,
        message: 'All platoons are already empty',
        unallocatedCount: 0,
        platoonsEmptied: 0
      })
    }

    // Get platoon count for response
    const platoonCount = await prisma.platoonAllocation.count()

    // Remove all platoon allocations
    const deleteResult = await prisma.platoonParticipant.deleteMany({})

    return NextResponse.json({
      success: true,
      message: `Successfully emptied all platoons`,
      unallocatedCount: deleteResult.count,
      platoonsEmptied: platoonCount
    })

  } catch (error) {
    console.error('Error emptying platoons:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

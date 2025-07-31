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

    // Check if user has permission to manually allocate participants (matching accommodations permissions)
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { participantId, platoonId } = body

    // Validate required fields
    if (!participantId || !platoonId) {
      return NextResponse.json(
        { error: 'Participant ID and Platoon ID are required' },
        { status: 400 }
      )
    }

    // TODO: Implement actual manual allocation when database schema is updated
    return NextResponse.json({
      success: false,
      message: 'Manual allocation not yet implemented - database schema pending'
    }, { status: 501 })

  } catch (error) {
    console.error('Error in manual platoon allocation:', error)
    return NextResponse.json(
      { error: 'Failed to allocate participant to platoon' },
      { status: 500 }
    )
  }
}

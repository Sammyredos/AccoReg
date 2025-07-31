import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// POST - Auto allocate participants to platoons
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to auto-allocate participants (matching accommodations permissions)
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { participantIds, platoonIds } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'No participants provided' }, { status: 400 })
    }

    if (!platoonIds || !Array.isArray(platoonIds) || platoonIds.length === 0) {
      return NextResponse.json({ error: 'No platoons provided' }, { status: 400 })
    }

    // TODO: Replace with actual platoon queries when database schema is updated
    // For now, return not implemented until proper database schema is available
    return NextResponse.json({
      success: false,
      message: 'Auto-allocation not yet implemented - database schema pending'
    }, { status: 501 })

  } catch (error) {
    console.error('Error auto-allocating participants:', error)
    return NextResponse.json(
      { error: 'Failed to auto-allocate participants' },
      { status: 500 }
    )
  }
}

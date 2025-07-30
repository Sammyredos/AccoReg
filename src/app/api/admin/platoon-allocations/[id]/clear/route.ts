import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Clear all participants from a platoon
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: platoonId } = await params

    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user details from database
    const user = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to remove allocations
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if platoon exists
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      include: {
        participants: true
      }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Remove all participants from the platoon
    const deletedCount = await prisma.platoonParticipant.deleteMany({
      where: { platoonId }
    })

    return NextResponse.json({
      success: true,
      message: `All ${deletedCount.count} participants removed from ${platoon.name}`,
      removedCount: deletedCount.count
    })

  } catch (error) {
    console.error('Error clearing platoon:', error)
    return NextResponse.json(
      { error: 'Failed to clear platoon' },
      { status: 500 }
    )
  }
}

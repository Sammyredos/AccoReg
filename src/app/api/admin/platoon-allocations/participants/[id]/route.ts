import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE - Remove participant from platoon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params

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

    // Check if participant allocation exists
    const participant = await prisma.platoonParticipant.findUnique({
      where: { id: participantId },
      include: {
        registration: {
          select: {
            fullName: true
          }
        },
        platoon: {
          select: {
            name: true
          }
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant allocation not found' }, { status: 404 })
    }

    // Remove the participant from the platoon
    await prisma.platoonParticipant.delete({
      where: { id: participantId }
    })

    return NextResponse.json({
      success: true,
      message: `${participant.registration.fullName} removed from ${participant.platoon.name} successfully`
    })

  } catch (error) {
    console.error('Error removing participant from platoon:', error)
    return NextResponse.json(
      { error: 'Failed to remove participant from platoon' },
      { status: 500 }
    )
  }
}

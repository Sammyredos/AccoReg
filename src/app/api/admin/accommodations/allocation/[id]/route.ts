import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!
    const { id: registrationId } = await params

    // Check if user has permission to view allocations
    if (!['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get allocation details
    const allocation = await prisma.roomAllocation.findUnique({
      where: { registrationId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            gender: true,
            capacity: true,
            description: true
          }
        },
        registration: {
          select: {
            id: true,
            fullName: true,
            gender: true,
            dateOfBirth: true
          }
        }
      }
    })

    if (!allocation) {
      return NextResponse.json(
        { error: 'Allocation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      allocation,
      message: 'Allocation retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching allocation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch allocation' },
      { status: 500 }
    )
  }
}

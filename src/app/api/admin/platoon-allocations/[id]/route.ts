import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE - Delete a platoon
export async function DELETE(
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

    // Check if user has permission to delete platoons
    const allowedRoles = ['Super Admin', 'Admin']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // For now, delete from mock data until Prisma client is updated
    console.log('⚠️ Deleting from mock platoons until Prisma client is updated')

    if (!global.mockPlatoons) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    const platoonIndex = global.mockPlatoons.findIndex(p => p.id === platoonId)
    if (platoonIndex === -1) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Remove the platoon from mock data
    const deletedPlatoon = global.mockPlatoons.splice(platoonIndex, 1)[0]

    return NextResponse.json({
      success: true,
      message: `Platoon "${deletedPlatoon.name}" deleted successfully`,
      deletedPlatoon: {
        id: deletedPlatoon.id,
        name: deletedPlatoon.name,
        participantsUnallocated: deletedPlatoon.participants?.length || 0
      }
    })

  } catch (error) {
    console.error('Error deleting platoon:', error)
    return NextResponse.json(
      { error: 'Failed to delete platoon' },
      { status: 500 }
    )
  }
}

// PUT - Update a platoon
export async function PUT(
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

    // Check if user has permission to edit platoons
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, leaderName, leaderPhone, capacity } = body

    // Validate required fields
    if (!name || !leaderName || !leaderPhone || !capacity) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Validate capacity
    if (capacity < 1 || capacity > 200) {
      return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
    }

    // For now, update mock data until Prisma client is updated
    console.log('⚠️ Updating mock platoons until Prisma client is updated')

    if (!global.mockPlatoons) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    const platoonIndex = global.mockPlatoons.findIndex(p => p.id === platoonId)
    if (platoonIndex === -1) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Check if platoon name already exists (excluding current platoon)
    const duplicateName = global.mockPlatoons.find(p => p.name === name && p.id !== platoonId)
    if (duplicateName) {
      return NextResponse.json({ error: 'Platoon name already exists' }, { status: 400 })
    }

    // Update the platoon in mock data
    const existingPlatoon = global.mockPlatoons[platoonIndex]
    const updatedPlatoon = {
      ...existingPlatoon,
      name,
      leaderName,
      leaderPhone,
      capacity,
      updatedAt: new Date().toISOString()
    }

    global.mockPlatoons[platoonIndex] = updatedPlatoon

    return NextResponse.json({
      success: true,
      message: `Platoon "${updatedPlatoon.name}" updated successfully`,
      platoon: updatedPlatoon
    })

  } catch (error) {
    console.error('Error updating platoon:', error)
    return NextResponse.json(
      { error: 'Failed to update platoon' },
      { status: 500 }
    )
  }
}

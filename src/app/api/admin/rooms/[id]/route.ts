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

    // Check if user has permission to view rooms
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: roomId } = await params

    // Get room with allocations
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        allocations: {
          include: {
            registration: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                phoneNumber: true,
                emailAddress: true
              }
            }
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      room,
      message: 'Room retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Check if user has permission to edit rooms
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: roomId } = await params
    const data = await request.json()

    // Check if room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: { allocations: true }
    })

    if (!existingRoom) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Validate capacity if provided
    if (data.capacity !== undefined) {
      if (typeof data.capacity !== 'number' || data.capacity < 1) {
        return NextResponse.json(
          { error: 'Capacity must be a positive number' },
          { status: 400 }
        )
      }

      // Check if new capacity is less than current allocations
      if (data.capacity < existingRoom.allocations.length) {
        return NextResponse.json(
          { error: `Cannot reduce capacity below current occupancy (${existingRoom.allocations.length})` },
          { status: 400 }
        )
      }
    }

    // Validate gender if provided
    if (data.gender && !['Male', 'Female'].includes(data.gender)) {
      return NextResponse.json(
        { error: 'Gender must be either Male or Female' },
        { status: 400 }
      )
    }

    // Check if room name already exists (if name is being changed)
    if (data.name && data.name !== existingRoom.name) {
      const nameExists = await prisma.room.findUnique({
        where: { name: data.name }
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'A room with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.gender && { gender: data.gender }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: {
        allocations: {
          include: {
            registration: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      message: 'Room updated successfully'
    })

  } catch (error) {
    console.error('Error updating room:', error)
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if user has permission to delete rooms
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: roomId } = await params

    // Check if room exists and has allocations
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { allocations: true }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    if (room.allocations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete room with existing allocations' },
        { status: 400 }
      )
    }

    // Delete room
    await prisma.room.delete({
      where: { id: roomId }
    })

    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting room:', error)
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { broadcastAttendanceEvent } from '../attendance/events/route'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
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

    // Get all rooms with allocation counts
    const rooms = await prisma.room.findMany({
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
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calculate room statistics
    const roomStats = rooms.map(room => ({
      ...room,
      occupancy: room.allocations.length,
      availableSpaces: room.capacity - room.allocations.length,
      occupancyRate: room.capacity > 0 ? Math.round((room.allocations.length / room.capacity) * 100) : 0
    }))

    return NextResponse.json({
      success: true,
      rooms: roomStats,
      message: 'Rooms retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to create rooms
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'gender', 'capacity']
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Validate gender
    if (!['Male', 'Female'].includes(data.gender)) {
      return NextResponse.json(
        { error: 'Gender must be either Male or Female' },
        { status: 400 }
      )
    }

    // Validate capacity
    if (typeof data.capacity !== 'number' || data.capacity < 1) {
      return NextResponse.json(
        { error: 'Capacity must be a positive number' },
        { status: 400 }
      )
    }

    // Check if room name already exists
    const existingRoom = await prisma.room.findUnique({
      where: { name: data.name }
    })

    if (existingRoom) {
      return NextResponse.json(
        { error: 'A room with this name already exists' },
        { status: 400 }
      )
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        name: data.name,
        gender: data.gender,
        capacity: data.capacity,
        description: data.description || null
      }
    })

    // Broadcast real-time room creation event for stats update
    broadcastAttendanceEvent({
      type: 'status_change',
      data: {
        registrationId: 'room_stats_update',
        fullName: `Room Created: ${room.name}`,
        status: 'present',
        timestamp: new Date().toISOString(),
        roomName: room.name
      }
    })

    console.log('🏠 Real-time room creation event broadcasted:', {
      roomName: room.name,
      capacity: room.capacity,
      gender: room.gender,
      createdBy: currentUser.email
    })

    return NextResponse.json({
      success: true,
      room,
      message: 'Room created successfully'
    })

  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}

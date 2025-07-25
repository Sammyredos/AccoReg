import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to search accommodations
    if (!['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // 'all', 'allocated', 'unallocated'

    // Build search conditions - ONLY include verified participants who have been moved to accommodation list
    const searchConditions: any[] = [
      {
        isVerified: true // Only verified participants can be in accommodation list
      },
      {
        gender: {
          in: ['Male', 'Female'] // Only Male and Female participants can be allocated to rooms
        }
      }
    ]

    if (search.trim()) {
      const searchTerm = search.trim()
      searchConditions.push({
        OR: [
          { fullName: { contains: searchTerm } },
          { emailAddress: { contains: searchTerm } },
          { phoneNumber: { contains: searchTerm } },
          {
            roomAllocation: {
              room: {
                name: { contains: searchTerm }
              }
            }
          }
        ]
      })
    }

    // Add allocation filter conditions (within verified participants)
    if (filter === 'allocated') {
      searchConditions.push({
        roomAllocation: {
          isNot: null
        }
      })
    } else if (filter === 'unallocated') {
      searchConditions.push({
        roomAllocation: null
      })
    }

    // Build where clause - always include verification and gender filters
    const whereClause = { AND: searchConditions }

    // Search registrations
    const registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        roomAllocation: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                gender: true,
                capacity: true
              }
            }
          }
        }
      },
      orderBy: [
        { fullName: 'asc' }
      ],
      take: 50 // Limit results to prevent performance issues
    })

    // Format results
    const results = registrations.map(reg => ({
      id: reg.id,
      fullName: reg.fullName,
      gender: reg.gender,
      dateOfBirth: reg.dateOfBirth,
      phoneNumber: reg.phoneNumber,
      emailAddress: reg.emailAddress,
      roomAllocation: reg.roomAllocation ? {
        id: reg.roomAllocation.id,
        room: reg.roomAllocation.room
      } : undefined
    }))

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      searchTerm: search,
      filter,
      message: `Found ${results.length} verified participant(s) in accommodation list${filter !== 'all' ? ` (${filter})` : ''}`
    })

  } catch (error) {
    console.error('Error searching accommodations:', error)
    return NextResponse.json(
      { error: 'Failed to search accommodations' },
      { status: 500 }
    )
  }
}

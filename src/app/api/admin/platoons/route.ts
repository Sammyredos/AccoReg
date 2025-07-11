import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('platoons-api')

// GET /api/admin/platoons - Get all platoons
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const tokenUser = authResult.user!

    // The user is already loaded with role information from authenticateRequest
    const currentUser = tokenUser

    if (!currentUser || !currentUser.role) {
      return NextResponse.json({ error: 'User not found or missing role' }, { status: 404 })
    }

    // Check permissions - only Super Admin and Admin can view platoons
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      logger.warn('Insufficient permissions for platoons access', {
        userId: currentUser.id,
        userEmail: currentUser.email,
        roleName: currentUser.role?.name || 'No role'
      })
      return NextResponse.json({
        error: 'Insufficient permissions. Only Super Admin and Admin can view platoons.'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const includeAllocations = searchParams.get('includeAllocations') === 'true'

    const skip = (page - 1) * limit

    // Build where clause for search
    const whereClause: any = {
      isActive: true
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { leaderName: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get platoons with optional allocations
    const [platoons, totalCount] = await Promise.all([
      prisma.platoon.findMany({
        where: whereClause,
        include: {
          allocations: includeAllocations ? {
            include: {
              registration: {
                select: {
                  id: true,
                  fullName: true,
                  gender: true,
                  dateOfBirth: true,
                  emailAddress: true,
                  phoneNumber: true
                }
              }
            }
          } : false,
          _count: {
            select: {
              allocations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.platoon.count({ where: whereClause })
    ])

    logger.info('Platoons retrieved', {
      requestedBy: currentUser.email,
      page,
      limit,
      total: totalCount,
      search,
      includeAllocations
    })

    return NextResponse.json({
      platoons,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    logger.error('Error retrieving platoons:', error)
    return NextResponse.json({
      error: 'Failed to retrieve platoons'
    }, { status: 500 })
  }
}

// POST /api/admin/platoons - Create a new platoon
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const tokenUser = authResult.user!

    // The user is already loaded with role information from authenticateRequest
    const currentUser = tokenUser

    if (!currentUser || !currentUser.role) {
      return NextResponse.json({ error: 'User not found or missing role' }, { status: 404 })
    }

    // Check permissions - only Super Admin and Admin can create platoons
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      logger.warn('Insufficient permissions for platoon creation', {
        userId: currentUser.id,
        userEmail: currentUser.email,
        roleName: currentUser.role?.name || 'No role'
      })
      return NextResponse.json({
        error: 'Insufficient permissions. Only Super Admin and Admin can create platoons.'
      }, { status: 403 })
    }

    const data = await request.json()
    const { name, leaderName, leaderPhone, label } = data

    // Validate required fields
    if (!name || !leaderName || !leaderPhone) {
      return NextResponse.json({
        error: 'Missing required fields: name, leaderName, and leaderPhone are required'
      }, { status: 400 })
    }

    // Check if platoon name already exists
    const existingPlatoon = await prisma.platoon.findUnique({
      where: { name }
    })

    if (existingPlatoon) {
      return NextResponse.json({
        error: 'A platoon with this name already exists'
      }, { status: 409 })
    }

    // Create the platoon
    const platoon = await prisma.platoon.create({
      data: {
        name,
        leaderName,
        leaderPhone,
        label: label || null,
        createdBy: currentUser.email
      },
      include: {
        _count: {
          select: {
            allocations: true
          }
        }
      }
    })

    logger.info('Platoon created successfully', {
      platoonId: platoon.id,
      platoonName: platoon.name,
      leaderName: platoon.leaderName,
      createdBy: currentUser.email
    })

    return NextResponse.json({
      message: 'Platoon created successfully',
      platoon
    })

  } catch (error) {
    logger.error('Error creating platoon:', error)
    return NextResponse.json({
      error: 'Failed to create platoon'
    }, { status: 500 })
  }
}

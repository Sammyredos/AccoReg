import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('platoons-unallocated-api')

// GET /api/admin/platoons/unallocated - Get all unallocated verified participants
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

    // Check permissions - only Super Admin and Admin can view unallocated participants
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      logger.warn('Insufficient permissions for unallocated participants access', {
        userId: currentUser.id,
        userEmail: currentUser.email,
        roleName: currentUser.role?.name || 'No role'
      })
      return NextResponse.json({
        error: 'Insufficient permissions. Only Super Admin and Admin can view unallocated participants.'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build where clause for search
    const whereClause: any = {
      isVerified: true,
      platoonAllocation: null
    }

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { emailAddress: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } }
      ]
    }

    // Get unallocated participants
    const [participants, totalCount] = await Promise.all([
      prisma.registration.findMany({
        where: whereClause,
        select: {
          id: true,
          fullName: true,
          gender: true,
          dateOfBirth: true,
          emailAddress: true,
          phoneNumber: true,
          verifiedAt: true,
          verifiedBy: true,
          createdAt: true
        },
        orderBy: { verifiedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.registration.count({ where: whereClause })
    ])

    // Calculate age for each participant
    const participantsWithAge = participants.map(participant => {
      let age = 'Unknown'
      if (participant.dateOfBirth) {
        try {
          const today = new Date()
          const birthDate = new Date(participant.dateOfBirth)
          if (!isNaN(birthDate.getTime())) {
            let calculatedAge = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--
            }
            age = calculatedAge.toString()
          }
        } catch (error) {
          // Keep age as 'Unknown'
        }
      }

      return {
        ...participant,
        age
      }
    })

    // Get gender distribution
    const genderStats = await prisma.registration.groupBy({
      by: ['gender'],
      where: {
        isVerified: true,
        platoonAllocation: null
      },
      _count: {
        gender: true
      }
    })

    const genderDistribution = genderStats.reduce((acc, stat) => {
      acc[stat.gender] = stat._count.gender
      return acc
    }, {} as Record<string, number>)

    logger.info('Unallocated participants retrieved', {
      requestedBy: currentUser.email,
      page,
      limit,
      total: totalCount,
      search,
      genderDistribution
    })

    return NextResponse.json({
      participants: participantsWithAge,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        total: totalCount,
        genderDistribution
      }
    })

  } catch (error) {
    logger.error('Error retrieving unallocated participants:', error)
    return NextResponse.json({
      error: 'Failed to retrieve unallocated participants'
    }, { status: 500 })
  }
}

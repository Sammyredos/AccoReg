import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'

// Cache registrations for 5 minutes to improve performance
const registrationsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Function to clear cache (useful when data structure changes)
export function clearRegistrationsCache() {
  registrationsCache.clear()
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - Allow all roles including Staff to view registrations
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : null // null means no limit (get all)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Create cache key based on query parameters
    const cacheKey = `registrations_${page}_${limit || 'all'}_${search}_${status}_${currentUser.email}`

    // Check cache first (only for large datasets and not force refresh)
    if (!forceRefresh && (!limit || limit >= 100)) {
      const cached = registrationsCache.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return NextResponse.json(cached.data, {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            'X-Cache': 'HIT'
          }
        })
      }
    }

    const skip = limit ? (page - 1) * limit : 0

    // Build where clause for search and status
    const where: any = {}

    // Add search conditions (PostgreSQL compatible)
    if (search) {
      const searchLower = search.toLowerCase()
      where.OR = [
        { fullName: { contains: searchLower } },
        { emailAddress: { contains: searchLower } },
        { phoneNumber: { contains: search } }
      ]
    }

    // Add status filter
    if (status) {
      if (status === 'completed') {
        where.parentalPermissionGranted = true
      } else if (status === 'pending') {
        where.parentalPermissionGranted = false
      }
    }

    // Get registrations with optional pagination and optimized fields
    const findManyOptions: any = {
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        emailAddress: true,
        phoneNumber: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        branch: true,
        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactPhone: true,
        parentGuardianName: true,
        parentGuardianPhone: true,
        parentGuardianEmail: true,
        isVerified: true,
        attendanceMarked: true,
        verifiedAt: true,
        verifiedBy: true,
        createdAt: true,
        updatedAt: true,
        qrCode: true,
        roomAllocation: {
          select: {
            id: true,
            room: {
              select: {
                id: true,
                name: true,
                capacity: true
              }
            }
          }
        }
      }
    }

    // Only add pagination if limit is specified
    if (limit) {
      findManyOptions.skip = skip
      findManyOptions.take = limit
    }

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany(findManyOptions),
      prisma.registration.count({ where })
    ])

    const responseData = {
      registrations,
      pagination: {
        page,
        limit: limit || total, // If no limit, show total as limit
        total,
        pages: limit ? Math.ceil(total / limit) : 1 // If no limit, only 1 page
      }
    }

    // Cache the result for large datasets
    if (!limit || limit >= 100) {
      registrationsCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      })
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': (!limit || limit >= 100) ? 'public, max-age=300, stale-while-revalidate=600' : 'no-cache',
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    console.error('Get registrations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

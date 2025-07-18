/**
 * Attendance Registrations API
 * GET /api/admin/attendance/registrations
 * 
 * Returns list of registrations based on verification status filter
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { Logger } from '@/lib/logger'

const logger = new Logger('AttendanceRegistrations')

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const gender = searchParams.get('gender')
    const search = searchParams.get('search')
    const verified = searchParams.get('verified') // 'true', 'false', or null for all

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      gender: {
        in: ['Male', 'Female'] // Only Male and Female
      }
    }

    // Add verification filter
    if (verified === 'true') {
      where.isVerified = true
    } else if (verified === 'false') {
      where.isVerified = false
    }
    // If verified is null or 'all', don't filter by verification status (show all)

    if (gender && ['Male', 'Female'].includes(gender)) {
      where.gender = gender
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { emailAddress: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } }
      ]
    }

    // Get total count for pagination
    const total = await prisma.registration.count({ where })

    // Get registrations
    const registrations = await prisma.registration.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        emailAddress: true,
        phoneNumber: true,
        address: true,
        branch: true,
        isVerified: true,
        verifiedAt: true,
        verifiedBy: true,
        qrCode: true,
        attendanceMarked: true,
        attendanceTime: true,
        createdAt: true
      },
      orderBy: verified === 'false' ? [
        { isVerified: 'asc' }, // Unverified first when filtering for unverified
        { createdAt: 'desc' }
      ] : verified === 'true' ? [
        { isVerified: 'desc' }, // Verified first when filtering for verified
        { createdAt: 'desc' }
      ] : [
        { createdAt: 'desc' } // For 'all', just order by creation date
      ],
      skip,
      take: limit
    })

    logger.info('Registrations retrieved', {
      requestedBy: currentUser.email,
      page,
      limit,
      total,
      gender,
      search,
      verified
    })

    return NextResponse.json({
      registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    logger.error('Error retrieving registrations', error)
    return NextResponse.json(
      { error: 'Failed to retrieve registrations' },
      { status: 500 }
    )
  }
}

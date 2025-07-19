/**
 * Unverified Registrations API
 * GET /api/admin/attendance/unverified
 * 
 * Returns list of unverified registrations for verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { Logger } from '@/lib/logger'

const logger = new Logger('UnverifiedRegistrations')

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
      },
      // RESTRICTION: Only show unallocated participants on attendance page
      roomAllocation: null
    }

    // Add verification filter
    if (verified === 'true') {
      where.isVerified = true
    } else if (verified === 'false') {
      where.isVerified = false
    }
    // If verified is null, don't filter by verification status (show all)

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

    // Get unverified registrations
    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          gender: true,
          dateOfBirth: true,
          phoneNumber: true,
          emailAddress: true,
          address: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          parentGuardianName: true,
          parentGuardianPhone: true,
          qrCode: true,
          createdAt: true
        },
        orderBy: [
          { gender: 'asc' },
          { createdAt: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.registration.count({ where })
    ])

    // Calculate age for each registration
    const registrationsWithAge = registrations.map(reg => ({
      ...reg,
      age: Math.floor((Date.now() - new Date(reg.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
      hasQRCode: !!reg.qrCode
    }))

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }

    logger.info('Unverified registrations retrieved', {
      requestedBy: currentUser.email,
      page,
      limit,
      total,
      gender,
      search
    })

    return NextResponse.json({
      success: true,
      registrations: registrationsWithAge,
      pagination
    })

  } catch (error) {
    logger.error('Error getting unverified registrations', error)
    return NextResponse.json(
      { error: 'Failed to get unverified registrations' },
      { status: 500 }
    )
  }
}

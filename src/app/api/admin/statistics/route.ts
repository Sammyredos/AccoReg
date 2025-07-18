/**
 * Admin Statistics API
 * GET /api/admin/statistics
 * 
 * Provides comprehensive statistics for dashboard and other admin pages
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'
import { clearStatisticsCache } from '@/lib/statistics'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to view statistics
    if (!['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get comprehensive statistics
    const [
      totalRegistrations,
      verifiedRegistrations,
      totalRooms,
      activeRooms,
      totalCapacity,
      occupiedSpaces,
      allocatedRegistrations
    ] = await Promise.all([
      // Registration stats
      prisma.registration.count(),
      prisma.registration.count({
        where: { isVerified: true }
      }),
      
      // Room stats
      prisma.room.count(),
      prisma.room.count({
        where: { isActive: true }
      }),
      prisma.room.aggregate({
        _sum: { capacity: true }
      }),
      prisma.roomAllocation.aggregate({
        _count: { id: true }
      }),
      prisma.registration.count({
        where: {
          roomAllocation: {
            isNot: null
          }
        }
      })
    ])

    // Calculate unverified registrations consistently with other APIs
    const unverifiedRegistrations = totalRegistrations - verifiedRegistrations

    const totalCapacityValue = totalCapacity._sum.capacity || 0
    const occupiedSpacesValue = occupiedSpaces._count || 0
    const availableSpaces = totalCapacityValue - occupiedSpacesValue

    // Calculate rates
    const verificationRate = totalRegistrations > 0 
      ? Math.round((verifiedRegistrations / totalRegistrations) * 100) 
      : 0
    
    const allocationRate = verifiedRegistrations > 0 
      ? Math.round((allocatedRegistrations / verifiedRegistrations) * 100) 
      : 0

    const roomUtilizationRate = totalCapacityValue > 0 
      ? Math.round((occupiedSpacesValue / totalCapacityValue) * 100) 
      : 0

    // Get gender breakdown for verified registrations
    const genderBreakdown = await prisma.registration.groupBy({
      by: ['gender'],
      where: { isVerified: true },
      _count: { id: true }
    })

    const maleVerified = genderBreakdown.find(g => g.gender === 'Male')?._count.id || 0
    const femaleVerified = genderBreakdown.find(g => g.gender === 'Female')?._count.id || 0

    // Get recent registrations (today, this week, this month)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [registrationsToday, registrationsThisWeek, registrationsThisMonth] = await Promise.all([
      prisma.registration.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.registration.count({
        where: { createdAt: { gte: thisWeek } }
      }),
      prisma.registration.count({
        where: { createdAt: { gte: thisMonth } }
      })
    ])

    // Calculate actual occupied and available rooms
    const roomsWithAllocations = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        allocations: true
      }
    })

    const occupiedRooms = roomsWithAllocations.filter(room => room.allocations.length > 0).length
    const availableRooms = activeRooms - occupiedRooms

    const statistics = {
      registrations: {
        total: totalRegistrations,
        verified: verifiedRegistrations,
        unverified: unverifiedRegistrations,
        verificationRate,
        allocated: allocatedRegistrations,
        unallocated: verifiedRegistrations - allocatedRegistrations,
        allocationRate,
        byGender: {
          male: maleVerified,
          female: femaleVerified
        },
        recent: {
          today: registrationsToday,
          thisWeek: registrationsThisWeek,
          thisMonth: registrationsThisMonth
        }
      },
      rooms: {
        total: totalRooms,
        active: activeRooms,
        occupied: occupiedRooms,
        available: availableRooms,
        capacity: {
          total: totalCapacityValue,
          occupied: occupiedSpacesValue,
          available: availableSpaces,
          utilizationRate: roomUtilizationRate
        }
      },
      summary: {
        totalRegistrations,
        verifiedRegistrations,
        unverifiedRegistrations,
        totalRooms,
        occupiedRooms,
        availableRooms
      }
    }

    const response = NextResponse.json({
      success: true,
      statistics
    })

    // Add cache control headers for real-time updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Statistics API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch statistics'
    }, { status: 500 })
  }
}

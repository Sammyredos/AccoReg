/**
 * Attendance Statistics API
 * GET /api/admin/attendance/stats
 * 
 * Returns attendance and verification statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { Logger } from '@/lib/logger'

const logger = new Logger('AttendanceStats')

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

    // Get overall statistics
    const totalRegistrations = await prisma.registration.count()
    const verifiedRegistrations = await prisma.registration.count({
      where: {
        isVerified: true
      }
    })
    const unverifiedRegistrations = totalRegistrations - verifiedRegistrations

    // Get statistics by gender
    const genderStats = await prisma.registration.groupBy({
      by: ['gender'],
      _count: { id: true }
    })

    // Get verified count by gender separately
    const genderBreakdown = await Promise.all(
      genderStats.map(async (stat) => {
        const verifiedCount = await prisma.registration.count({
          where: {
            gender: stat.gender,
            isVerified: true
          }
        })

        return {
          gender: stat.gender,
          total: stat._count.id,
          verified: verifiedCount,
          unverified: stat._count.id - verifiedCount
        }
      })
    )

    // Get recent verifications (last 24 hours)
    const recentVerifications = await prisma.registration.findMany({
      where: {
        isVerified: true,
        verifiedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        fullName: true,
        gender: true,
        verifiedAt: true,
        verifiedBy: true
      },
      orderBy: {
        verifiedAt: 'desc'
      },
      take: 10
    })

    // Get allocation statistics
    const allocatedVerified = await prisma.registration.count({
      where: {
        isVerified: true,
        roomAllocation: { isNot: null }
      }
    })

    const unallocatedVerified = verifiedRegistrations - allocatedVerified

    // Get verification rate by hour (last 24 hours)
    const hourlyVerifications = await prisma.registration.findMany({
      where: {
        isVerified: true,
        verifiedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      select: {
        verifiedAt: true
      }
    })

    // Group by hour
    const hourlyStats = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date()
      hour.setHours(hour.getHours() - (23 - i), 0, 0, 0)
      
      const count = hourlyVerifications.filter(v => {
        const verifiedHour = new Date(v.verifiedAt!)
        return verifiedHour.getHours() === hour.getHours() &&
               verifiedHour.getDate() === hour.getDate()
      }).length

      return {
        hour: hour.getHours(),
        count
      }
    })

    // Calculate verification rate
    const verificationRate = totalRegistrations > 0
      ? Math.round((verifiedRegistrations / totalRegistrations) * 100)
      : 0

    // Get verification trends
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const todayVerifications = await prisma.registration.count({
      where: {
        isVerified: true,
        verifiedAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        }
      }
    })

    const yesterdayVerifications = await prisma.registration.count({
      where: {
        isVerified: true,
        verifiedAt: {
          gte: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        }
      }
    })

    const thisWeekVerifications = await prisma.registration.count({
      where: {
        isVerified: true,
        verifiedAt: {
          gte: weekAgo
        }
      }
    })

    // Get top verifiers
    const topVerifiers = await prisma.registration.groupBy({
      by: ['verifiedBy'],
      where: {
        isVerified: true,
        verifiedBy: { not: null }
      },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' }
      },
      take: 10
    })

    const formattedTopVerifiers = topVerifiers.map(verifier => ({
      verifierEmail: verifier.verifiedBy || 'Unknown',
      count: verifier._count.id
    }))

    const stats = {
      overview: {
        totalRegistrations,
        verifiedRegistrations,
        unverifiedRegistrations,
        verificationRate,
        allocatedVerified,
        unallocatedVerified
      },
      genderBreakdown,
      recentVerifications,
      hourlyStats,
      verificationTrends: {
        todayVerifications,
        yesterdayVerifications,
        thisWeekVerifications,
        averageVerificationTime: 0 // Can be calculated if needed
      },
      topVerifiers: formattedTopVerifiers,
      lastUpdated: new Date().toISOString()
    }

    logger.info('Attendance statistics retrieved', {
      requestedBy: currentUser.email,
      totalRegistrations,
      verifiedRegistrations
    })

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    logger.error('Error getting attendance statistics', error)
    return NextResponse.json(
      { error: 'Failed to get attendance statistics' },
      { status: 500 }
    )
  }
}

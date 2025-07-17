import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current date boundaries
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()) // Start of week (Sunday)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get registration statistics
    const [
      totalRegistrations,
      registrationsToday,
      registrationsThisWeek,
      registrationsThisMonth,
      verifiedCount,
      unverifiedCount,
      maleCount,
      femaleCount,
      allRegistrations
    ] = await Promise.all([
      // Total registrations
      prisma.registration.count(),
      
      // Registrations today
      prisma.registration.count({
        where: {
          createdAt: {
            gte: startOfToday
          }
        }
      }),
      
      // Registrations this week
      prisma.registration.count({
        where: {
          createdAt: {
            gte: startOfWeek
          }
        }
      }),
      
      // Registrations this month
      prisma.registration.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      }),
      
      // Verified count
      prisma.registration.count({
        where: {
          isVerified: true
        }
      }),
      
      // Unverified count
      prisma.registration.count({
        where: {
          isVerified: false
        }
      }),
      
      // Male count
      prisma.registration.count({
        where: {
          gender: 'Male'
        }
      }),
      
      // Female count
      prisma.registration.count({
        where: {
          gender: 'Female'
        }
      }),
      
      // All registrations for age calculation
      prisma.registration.findMany({
        select: {
          age: true,
          dateOfBirth: true
        }
      })
    ])

    // Calculate average age
    let averageAge = 0
    if (allRegistrations.length > 0) {
      const totalAge = allRegistrations.reduce((sum, reg) => {
        // Use age field if available, otherwise calculate from dateOfBirth
        if (reg.age && reg.age > 0) {
          return sum + reg.age
        } else if (reg.dateOfBirth) {
          const birthDate = new Date(reg.dateOfBirth)
          const today = new Date()
          let age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
          return sum + age
        }
        return sum
      }, 0)
      averageAge = totalAge / allRegistrations.length
    }

    // Get branch statistics
    const branchStats = await prisma.registration.groupBy({
      by: ['branch'],
      _count: {
        branch: true
      },
      orderBy: {
        _count: {
          branch: 'desc'
        }
      }
    })

    // Get recent registrations (last 7 days) for trend analysis
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    
    const recentRegistrations = await prisma.registration.findMany({
      where: {
        createdAt: {
          gte: last7Days
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Group recent registrations by day
    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const endOfDay = new Date(startOfDay)
      endOfDay.setDate(endOfDay.getDate() + 1)
      
      const count = recentRegistrations.filter(reg => 
        reg.createdAt >= startOfDay && reg.createdAt < endOfDay
      ).length
      
      dailyStats.push({
        date: startOfDay.toISOString().split('T')[0],
        count
      })
    }

    const analytics = {
      totalRegistrations,
      registrationsToday,
      registrationsThisWeek,
      registrationsThisMonth,
      verifiedCount,
      unverifiedCount,
      maleCount,
      femaleCount,
      stats: {
        averageAge: Math.round(averageAge * 10) / 10, // Round to 1 decimal place
        verificationRate: totalRegistrations > 0 ? Math.round((verifiedCount / totalRegistrations) * 100) : 0,
        genderDistribution: {
          male: maleCount,
          female: femaleCount,
          malePercentage: totalRegistrations > 0 ? Math.round((maleCount / totalRegistrations) * 100) : 0,
          femalePercentage: totalRegistrations > 0 ? Math.round((femaleCount / totalRegistrations) * 100) : 0
        },
        branchDistribution: branchStats.map(branch => ({
          branch: branch.branch || 'Not Specified',
          count: branch._count.branch,
          percentage: totalRegistrations > 0 ? Math.round((branch._count.branch / totalRegistrations) * 100) : 0
        })),
        dailyTrend: dailyStats
      }
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

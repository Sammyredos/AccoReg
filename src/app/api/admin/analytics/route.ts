import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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

    // Get user details from database to verify permissions
    const user = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to view analytics
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get current date boundaries
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()) // Start of week (Sunday)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get registration statistics with error handling
    let analyticsData
    try {
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
      
      // All registrations for age calculation (handle missing age column)
      (async () => {
        try {
          return await prisma.registration.findMany({
            select: {
              age: true,
              dateOfBirth: true
            }
          })
        } catch (error: any) {
          // If age column doesn't exist, fall back to dateOfBirth only
          if (error.code === 'P2022' && error.message.includes('age')) {
            console.log('Age column not found, calculating from dateOfBirth only')
            return await prisma.registration.findMany({
              select: {
                dateOfBirth: true
              }
            })
          }
          throw error
        }
      })()
    ])

    // Calculate average age
    let averageAge = 0
    if (allRegistrations.length > 0) {
      const totalAge = allRegistrations.reduce((sum, reg: any) => {
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
      averageAge = allRegistrations.length > 0 ? totalAge / allRegistrations.length : 0
    }

    // Get branch statistics (handle missing branch column)
    let branchStats: any[] = []
    try {
      branchStats = await prisma.registration.groupBy({
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
    } catch (error: any) {
      // If branch column doesn't exist, return empty stats
      if (error.code === 'P2022' && error.message.includes('branch')) {
        console.log('Branch column not found, skipping branch statistics')
        branchStats = []
      } else {
        throw error
      }
    }

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

      analyticsData = analytics
    } catch (dbError: any) {
      console.error('Database query error in analytics:', dbError)

      // Return fallback data if database queries fail
      analyticsData = {
        totalRegistrations: 0,
        registrationsToday: 0,
        registrationsThisWeek: 0,
        registrationsThisMonth: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        maleCount: 0,
        femaleCount: 0,
        stats: {
          averageAge: 0,
          verificationRate: 0,
          genderDistribution: {
            male: 0,
            female: 0,
            malePercentage: 0,
            femalePercentage: 0
          },
          branchDistribution: [],
          dailyTrend: []
        }
      }
    }

    return NextResponse.json(analyticsData)

  } catch (error: any) {
    console.error('Analytics API error:', error)

    // If it's a missing column error, provide fallback data
    if (error.code === 'P2022') {
      console.log('Database schema incomplete, providing fallback analytics')
      return NextResponse.json({
        totalRegistrations: 0,
        registrationsToday: 0,
        registrationsThisWeek: 0,
        registrationsThisMonth: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        maleCount: 0,
        femaleCount: 0,
        stats: {
          averageAge: 0,
          verificationRate: 0,
          genderDistribution: {
            male: 0,
            female: 0,
            malePercentage: 0,
            femalePercentage: 0
          },
          branchDistribution: [],
          dailyTrend: []
        }
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

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

    // Get current user
    const userType = payload.type || 'admin'
    let currentUser

    if (userType === 'admin') {
      currentUser = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    } else {
      currentUser = await prisma.user.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    }

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check permissions - Allow Staff to view analytics
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get analytics data
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Total registrations
    const totalRegistrations = await prisma.registration.count()

    // Registrations today
    const registrationsToday = await prisma.registration.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    })

    // Registrations this week
    const registrationsThisWeek = await prisma.registration.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    })

    // Registrations this month
    const registrationsThisMonth = await prisma.registration.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    // Age demographics
    const allRegistrations = await prisma.registration.findMany({
      select: {
        dateOfBirth: true,
        gender: true,
        createdAt: true
      }
    })

    // Calculate age groups
    const ageGroups = {
      '10-12': 0,
      '13-15': 0,
      '16-18': 0,
      '19+': 0
    }

    const genderDistribution = {
      male: 0,
      female: 0
    }

    allRegistrations.forEach(reg => {
      const age = calculateAge(reg.dateOfBirth)

      // Age groups
      if (age >= 10 && age <= 12) ageGroups['10-12']++
      else if (age >= 13 && age <= 15) ageGroups['13-15']++
      else if (age >= 16 && age <= 18) ageGroups['16-18']++
      else if (age >= 19) ageGroups['19+']++

      // Gender distribution
      const gender = reg.gender.toLowerCase()
      if (gender === 'male') genderDistribution.male++
      else if (gender === 'female') genderDistribution.female++
      // Only Male and Female are supported
    })

    // Daily registrations for the last 30 days
    const dailyRegistrations: Array<{ date: string; count: number }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

      const count = await prisma.registration.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      })

      dailyRegistrations.push({
        date: startOfDay.toISOString().split('T')[0],
        count
      })
    }

    // Average age
    const averageAge = allRegistrations.length > 0
      ? allRegistrations.reduce((sum, reg) => sum + calculateAge(reg.dateOfBirth), 0) / allRegistrations.length
      : 0

    // Calculate growth rate (compare this month vs last month)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const lastMonthCount = await prisma.registration.count({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lt: thisMonthStart
        }
      }
    })

    const thisMonthCount = await prisma.registration.count({
      where: {
        createdAt: {
          gte: thisMonthStart
        }
      }
    })

    const growthRate = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : thisMonthCount > 0 ? 100 : 0 // If no last month data but current month has data, show 100% growth

    // Find peak month
    const monthCounts = await prisma.registration.groupBy({
      by: ['createdAt'],
      _count: {
        id: true
      }
    })

    const monthlyData: Record<string, number> = {}
    monthCounts.forEach(item => {
      const month = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short' })
      monthlyData[month] = (monthlyData[month] || 0) + item._count.id
    })

    const peakMonth = Object.keys(monthlyData).reduce((a, b) =>
      monthlyData[a] > monthlyData[b] ? a : b, Object.keys(monthlyData)[0] || 'N/A'
    )

    // Calculate completion rate based on registrations with parental permission
    const completedRegistrations = await prisma.registration.count({
      where: {
        parentalPermissionGranted: true
      }
    })

    const completionRate = totalRegistrations > 0
      ? Math.round((completedRegistrations / totalRegistrations) * 100)
      : 0

    return NextResponse.json({
      totalRegistrations,
      registrationsToday,
      registrationsThisWeek,
      registrationsThisMonth,
      demographics: {
        ageGroups,
        genderDistribution
      },
      trends: {
        daily: dailyRegistrations,
        monthly: Object.entries(monthlyData).map(([month, count]) => ({ month, count }))
      },
      stats: {
        averageAge,
        growthRate,
        peakMonth,
        completionRate,
        completedRegistrations
      }
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

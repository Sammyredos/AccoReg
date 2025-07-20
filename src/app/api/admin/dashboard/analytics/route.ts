import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get date ranges for analytics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // 1. USER ROLES ANALYTICS
    const userRoleStats = await prisma.user.groupBy({
      by: ['roleId'],
      _count: {
        id: true
      },
      where: {
        isActive: true
      }
    })

    const adminRoleStats = await prisma.admin.groupBy({
      by: ['roleId'],
      _count: {
        id: true
      },
      where: {
        isActive: true
      }
    })

    // Get role details
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            users: { where: { isActive: true } },
            admins: { where: { isActive: true } }
          }
        }
      }
    })

    // 2. REGISTRATION ANALYTICS
    const totalRegistrations = await prisma.registration.count()
    const verifiedRegistrations = await prisma.registration.count({
      where: { isVerified: true }
    })
    const unverifiedRegistrations = totalRegistrations - verifiedRegistrations

    // Registration trends (last 30 days)
    const registrationTrends = await prisma.registration.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Gender distribution
    const genderStats = await prisma.registration.groupBy({
      by: ['gender'],
      _count: { id: true }
    })

    // Branch distribution
    const branchStats = await prisma.registration.groupBy({
      by: ['branch'],
      _count: { id: true }
    })

    // 3. CHILDREN REGISTRATIONS
    let childrenStats = { total: 0, byGender: [], byAge: [] }
    try {
      const totalChildren = await prisma.childrenRegistration.count()
      const childrenByGender = await prisma.childrenRegistration.groupBy({
        by: ['gender'],
        _count: { id: true }
      })
      
      childrenStats = {
        total: totalChildren,
        byGender: childrenByGender,
        byAge: [] // Will be calculated from dateOfBirth if needed
      }
    } catch (error) {
      console.log('Children registration table not available')
    }

    // 4. ACCOMMODATION ANALYTICS
    const totalRooms = await prisma.room.count()
    const activeRooms = await prisma.room.count({
      where: { isActive: true }
    })
    const roomAllocations = await prisma.roomAllocation.count()
    const occupancyRate = totalRooms > 0 ? (roomAllocations / totalRooms) * 100 : 0

    // Room capacity vs occupancy
    const roomStats = await prisma.room.findMany({
      select: {
        id: true,
        name: true,
        capacity: true,
        gender: true,
        isActive: true,
        _count: {
          select: {
            allocations: true
          }
        }
      }
    })

    // 5. ACTIVITY ANALYTICS
    const recentActivity = {
      registrationsToday: await prisma.registration.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      registrationsThisWeek: await prisma.registration.count({
        where: {
          createdAt: {
            gte: startOfWeek
          }
        }
      }),
      registrationsThisMonth: await prisma.registration.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      })
    }

    // 6. SYSTEM HEALTH METRICS
    const systemMetrics = {
      totalUsers: await prisma.user.count({ where: { isActive: true } }),
      totalAdmins: await prisma.admin.count({ where: { isActive: true } }),
      totalRoles: await prisma.role.count(),
      totalPermissions: await prisma.permission.count(),
      databaseHealth: 'healthy' // Could be enhanced with actual health checks
    }

    return NextResponse.json({
      success: true,
      analytics: {
        roles: {
          distribution: roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            userCount: role._count.users + role._count.admins,
            permissionCount: role.permissions.length,
            permissions: role.permissions.map(p => p.name)
          })),
          totalRoles: roles.length,
          totalActiveUsers: systemMetrics.totalUsers + systemMetrics.totalAdmins
        },
        registrations: {
          total: totalRegistrations,
          verified: verifiedRegistrations,
          unverified: unverifiedRegistrations,
          verificationRate: totalRegistrations > 0 ? (verifiedRegistrations / totalRegistrations) * 100 : 0,
          trends: registrationTrends,
          genderDistribution: genderStats,
          branchDistribution: branchStats,
          children: childrenStats
        },
        accommodations: {
          totalRooms,
          activeRooms,
          allocatedRooms: roomAllocations,
          occupancyRate,
          roomDetails: roomStats.map(room => ({
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            occupied: room._count.allocations,
            occupancyRate: room.capacity > 0 ? (room._count.allocations / room.capacity) * 100 : 0,
            gender: room.gender,
            isActive: room.isActive
          }))
        },
        activity: recentActivity,
        system: systemMetrics
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    )
  }
}

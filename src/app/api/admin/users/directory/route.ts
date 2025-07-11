import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Get all active users from both admin and user tables
    const [adminUsers, regularUsers] = await Promise.all([
      prisma.admin.findMany({
        where: { isActive: true },
        include: {
          role: true
        },
        orderBy: [
          { role: { name: 'asc' } },
          { name: 'asc' }
        ]
      }),
      prisma.user.findMany({
        where: { isActive: true },
        include: {
          role: true
        },
        orderBy: [
          { role: { name: 'asc' } },
          { name: 'asc' }
        ]
      })
    ])

    // Combine and format users
    const allUsers = [
      ...adminUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        type: 'admin' as const,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      })),
      ...regularUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        type: 'user' as const,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    ]

    // Sort by role hierarchy and then by name
    const roleOrder = {
      'Super Admin': 1,
      'Admin': 2,
      'Manager': 3,
      'Staff': 4,
      'Viewer': 5
    }

    allUsers.sort((a, b) => {
      const aOrder = roleOrder[a.role?.name as keyof typeof roleOrder] || 999
      const bOrder = roleOrder[b.role?.name as keyof typeof roleOrder] || 999
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }
      
      return a.name.localeCompare(b.name)
    })

    // Get role statistics
    const roleStats = allUsers.reduce((acc, user) => {
      const roleName = user.role?.name || 'Unknown'
      acc[roleName] = (acc[roleName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      users: allUsers,
      stats: {
        total: allUsers.length,
        adminUsers: adminUsers.length,
        regularUsers: regularUsers.length,
        roleBreakdown: roleStats
      },
      message: 'User directory retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching user directory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user directory' },
      { status: 500 }
    )
  }
}

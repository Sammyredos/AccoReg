import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
// import { hashPassword } from '@/lib/auth' // Commented out as unused
import { NotificationService } from '@/lib/notifications'
import { authenticateRequest, hasPermission } from '@/lib/auth-helpers'
import { getDefaultUserRole, getMaxUsers, getPasswordRequirements } from '@/lib/settings'
import { validatePassword } from '@/lib/password-validation'
import { filterManageableUsers, getAssignableRoles } from '@/lib/role-hierarchy'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to read users (Super Admin, Admin, Manager, Staff)
    if (!hasPermission(currentUser, 'users:read') && !['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }



    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const roleId = searchParams.get('roleId') || ''

    // Build where clause for search and filtering
    const whereClause: any = {}
    if (search) {
      // SQLite doesn't support mode: 'insensitive', so we'll use contains without it
      // The search will be case-sensitive, but we can handle this in the frontend
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ]
    }
    if (roleId) {
      whereClause.roleId = roleId
    }



    // First, get all users and admins that match the search criteria (without pagination)
    // We need to do this to properly apply role-based filtering before pagination
    let allUsersFromDB = []
    let allAdminsFromDB = []

    try {
      allUsersFromDB = await prisma.user.findMany({
        where: whereClause,
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } catch (userError) {
      console.error('Error fetching users from user table:', userError)
    }

    try {
      allAdminsFromDB = await prisma.admin.findMany({
        where: whereClause,
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } catch (adminError) {
      console.error('Error fetching users from admin table:', adminError)
    }

    // Filter users based on role hierarchy BEFORE pagination
    const filteredUsers = filterManageableUsers(allUsersFromDB, currentUser.role?.name || '')
    const filteredAdmins = filterManageableUsers(allAdminsFromDB, currentUser.role?.name || '')

    // Combine and format the data BEFORE pagination
    const allCombinedUsers = [
      ...filteredAdmins.map(admin => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
        type: 'admin',
        role: admin.role || {
          id: 'no-role',
          name: 'No Role',
          description: 'No role assigned',
          isSystem: false
        }
      })),
      ...filteredUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        type: 'user',
        role: user.role
      }))
    ]

    // Sort combined users by creation date (newest first)
    allCombinedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Apply pagination AFTER filtering and combining
    const totalCount = allCombinedUsers.length
    const paginatedUsers = allCombinedUsers.slice(offset, offset + limit)
    const totalPages = Math.ceil(totalCount / limit)
    const currentPage = Math.floor(offset / limit) + 1

    console.log('API Pagination result:', {
      totalCount,
      paginatedUsersCount: paginatedUsers.length,
      totalPages,
      currentPage,
      offset,
      limit
    })

    return NextResponse.json({
      users: paginatedUsers,
      total: totalCount,
      pagination: {
        total: totalCount,
        totalPages,
        currentPage,
        limit,
        offset,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
        // Legacy support
        page: currentPage,
        pages: totalPages
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to create users (Super Admin, Admin, Manager, Staff)
    if (!hasPermission(currentUser, 'users:write') && !['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check maximum users limit
    const maxUsers = await getMaxUsers()
    const currentUserCount = await prisma.user.count()

    if (currentUserCount >= maxUsers) {
      return NextResponse.json({
        error: `Maximum number of users (${maxUsers}) has been reached. Please contact your administrator to increase the limit.`
      }, { status: 400 })
    }

    const body = await request.json()
    const { email, name, password, roleId } = body
    // type removed as it's not used

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      )
    }

    // Validate password requirements
    const passwordRequirement = await getPasswordRequirements()
    const passwordValidation = validatePassword(password, passwordRequirement)

    if (!passwordValidation.isValid) {
      return NextResponse.json({
        error: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`
      }, { status: 400 })
    }

    // If no roleId provided, use default role from settings
    if (!roleId) {
      const defaultRoleName = await getDefaultUserRole()
      const defaultRole = await prisma.role.findUnique({
        where: { name: defaultRoleName }
      })

      if (defaultRole) {
        roleId = defaultRole.id
      } else {
        // Fallback to Viewer role if default role not found
        const viewerRole = await prisma.role.findUnique({
          where: { name: 'Viewer' }
        })
        roleId = viewerRole?.id
      }

      if (!roleId) {
        return NextResponse.json(
          { error: 'No valid role found. Please specify a role.' },
          { status: 400 }
        )
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    })

    if (existingUser || existingAdmin) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Prevent assignment of Super Admin role through user management
    if (role.name === 'Super Admin') {
      return NextResponse.json(
        { error: 'Super Admin role cannot be assigned through user management. This is a system role.' },
        { status: 403 }
      )
    }

    // Check if current user can assign this role based on role hierarchy
    const assignableRoles = getAssignableRoles(currentUser.role?.name || '')
    if (!assignableRoles.includes(role.name)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to assign this role' },
        { status: 403 }
      )
    }

    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        roleId,
        createdBy: currentUser.id
      },
      include: {
        role: true
      }
    })

    // Create notification for user creation
    try {
      await NotificationService.create({
        type: 'user_created',
        title: 'New User Account Created',
        message: `A new user account has been created for ${newUser.name} (${newUser.email}).`,
        priority: 'medium',
        authorizedBy: currentUser.name || currentUser.email,
        authorizedByEmail: currentUser.email,
        metadata: {
          userId: newUser.id,
          userEmail: newUser.email,
          userName: newUser.name,
          createdBy: currentUser.id,
          createdByName: currentUser.name,
          createdByEmail: currentUser.email
        }
      })
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // Don't fail the user creation if notification fails
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isActive: newUser.isActive,
        role: newUser.role
      }
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

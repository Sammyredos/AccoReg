import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { authenticateRequest, hasPermission } from '@/lib/auth-helpers'
import { filterAssignableRoles } from '@/lib/role-hierarchy'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to read roles (Super Admin, Admin, Manager)
    if (!hasPermission(currentUser, 'users:read') && !['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch all roles with their permissions
    const allRoles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
            admins: true
          }
        }
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ]
    })

    // Filter roles based on what the current user can assign
    const roles = filterAssignableRoles(allRoles, currentUser.role?.name || '')

    // Format the response
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users + role._count.admins,
      permissions: role.permissions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        resource: p.resource,
        action: p.action
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }))

    return NextResponse.json({
      roles: formattedRoles,
      total: formattedRoles.length
    })

  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current admin with permissions
    const currentAdmin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!currentAdmin || !currentAdmin.isActive) {
      return NextResponse.json({ error: 'Admin not found or inactive' }, { status: 401 })
    }

    // Check if admin has permission to manage users/roles
    const hasPermission = currentAdmin.role?.permissions.some(
      p => p.name === 'users.manage' || p.name === 'system.manage'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, permissionIds } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      )
    }

    // Prevent creation of system roles
    const systemRoleNames = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
    if (systemRoleNames.includes(name)) {
      return NextResponse.json(
        { error: `Cannot create system role "${name}". System roles are managed automatically.` },
        { status: 400 }
      )
    }

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      )
    }

    // Verify permissions exist
    if (permissionIds && permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: { id: { in: permissionIds } }
      })

      if (permissions.length !== permissionIds.length) {
        return NextResponse.json(
          { error: 'Some permissions are invalid' },
          { status: 400 }
        )
      }
    }

    // Create role
    const newRole = await prisma.role.create({
      data: {
        name,
        description,
        isSystem: false,
        permissions: permissionIds ? {
          connect: permissionIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        permissions: true
      }
    })

    return NextResponse.json({
      message: 'Role created successfully',
      role: {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        isSystem: newRole.isSystem,
        permissions: newRole.permissions
      }
    })

  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken, hashPassword } from '@/lib/auth'
import { getPasswordRequirements } from '@/lib/settings'
import { validatePassword } from '@/lib/password-validation'
import { canManageUser, getAssignableRoles } from '@/lib/role-hierarchy'
import { NotificationService } from '@/lib/notifications'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if admin has permission to update users
    const hasPermission = ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentAdmin.role?.name || '') ||
      currentAdmin.role?.permissions.some(
        p => p.name === 'users.write' || p.name === 'users.manage' || p.name === 'system.manage'
      )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: userId } = await params
    const body = await request.json()
    const { name, email, password, roleId, isActive } = body

    // Validate required fields
    if (!name || !email || !roleId) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      )
    }

    // Check if user exists in user table first, then admin table
    let existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    })

    let existingAdmin = null
    let isAdminUser = false

    if (!existingUser) {
      // Check admin table
      existingAdmin = await prisma.admin.findUnique({
        where: { id: userId },
        include: {
          role: true
        }
      })

      if (!existingAdmin) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      isAdminUser = true
    }

    const targetUser = existingUser || existingAdmin
    const targetUserRole = targetUser?.role?.name || ''

    // Check if current user can manage this user based on role hierarchy
    if (!canManageUser(currentAdmin.role?.name || '', targetUserRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage this user' },
        { status: 403 }
      )
    }

    // Check if email is already taken by another user
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        id: { not: userId }
      }
    })

    const emailTakenByAdmin = await prisma.admin.findFirst({
      where: {
        email: email.toLowerCase(),
        id: { not: userId }
      }
    })

    if (emailTaken || emailTakenByAdmin) {
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

    // Check if current user can assign this role based on role hierarchy
    const assignableRoles = getAssignableRoles(currentAdmin.role?.name || '')
    if (!assignableRoles.includes(role.name)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to assign this role' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      roleId,
      isActive: isActive !== undefined ? isActive : true
    }

    // Hash password if provided
    if (password && password.trim()) {
      // Validate password requirements
      const passwordRequirement = await getPasswordRequirements()
      const passwordValidation = validatePassword(password, passwordRequirement)

      if (!passwordValidation.isValid) {
        return NextResponse.json({
          error: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`
        }, { status: 400 })
      }

      updateData.password = hashPassword(password)
    }

    // Update user in appropriate table
    let updatedUser
    if (isAdminUser) {
      updatedUser = await prisma.admin.update({
        where: { id: userId },
        data: updateData,
        include: {
          role: true
        }
      })
    } else {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          role: true
        }
      })
    }

    // If the name was updated, update it in existing notifications
    if (updateData.name && updateData.name !== targetUser?.name) {
      try {
        await prisma.notification.updateMany({
          where: {
            authorizedByEmail: targetUser?.email
          },
          data: {
            authorizedBy: updateData.name
          }
        })
      } catch (notificationError) {
        console.error('Failed to update user name in notifications:', notificationError)
        // Don't fail the user update if notification update fails
      }
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isActive: updatedUser.isActive,
        role: updatedUser.role,
        type: isAdminUser ? 'admin' : 'user'
      }
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if admin has permission to delete users
    const hasPermission = ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentAdmin.role?.name || '') ||
      currentAdmin.role?.permissions.some(
        p => p.name === 'users.delete' || p.name === 'users.manage' || p.name === 'system.manage'
      )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: userId } = await params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if current user can manage this user based on role hierarchy
    if (!canManageUser(currentAdmin.role?.name || '', existingUser.role?.name || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this user' },
        { status: 403 }
      )
    }

    // Prevent deletion of the last Super Admin
    if (existingUser.role.name === 'Super Admin') {
      const superAdminCount = await prisma.user.count({
        where: {
          role: {
            name: 'Super Admin'
          }
        }
      })

      const adminSuperAdminCount = await prisma.admin.count({
        where: {
          role: {
            name: 'Super Admin'
          }
        }
      })

      if (superAdminCount + adminSuperAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last Super Admin user' },
          { status: 400 }
        )
      }
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    })

    // Create notification for user deletion
    try {
      await NotificationService.create({
        type: 'user_deleted',
        title: 'User Account Deleted',
        message: `User account for ${existingUser.name} (${existingUser.email}) has been deleted.`,
        priority: 'medium',
        authorizedBy: currentAdmin.name || currentAdmin.email,
        authorizedByEmail: currentAdmin.email,
        metadata: {
          userEmail: existingUser.email,
          userName: existingUser.name,
          deletedBy: currentAdmin.id,
          deletedByName: currentAdmin.name,
          deletedByEmail: currentAdmin.email
        }
      })
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // Don't fail the user deletion if notification fails
    }

    return NextResponse.json({
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if admin has permission to read users
    const hasPermission = ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentAdmin.role?.name || '') ||
      currentAdmin.role?.permissions.some(
        p => p.name === 'users.read' || p.name === 'users.manage' || p.name === 'system.manage'
      )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: userId } = await params

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if current user can view this user based on role hierarchy
    if (!canManageUser(currentAdmin.role?.name || '', user.role?.name || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view this user' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest, hasPermission } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to edit roles (Admin or Super Admin)
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Only Admin and Super Admin can edit roles' }, { status: 403 })
    }

    const { id: roleId } = await params
    const { name, description, permissionIds } = await request.json()

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent editing system roles unless Super Admin
    if (existingRole.isSystem && currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Only Super Admin can edit system roles' }, { status: 403 })
    }

    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    // Check if role name already exists (excluding current role)
    const nameConflict = await prisma.role.findFirst({
      where: { 
        name: name.trim(),
        id: { not: roleId }
      }
    })

    if (nameConflict) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
    }

    // Update the role
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        permissions: {
          set: [], // Clear existing permissions
          connect: permissionIds?.map((id: string) => ({ id })) || []
        }
      },
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            description: true,
            resource: true,
            action: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      role: updatedRole,
      message: 'Role updated successfully'
    })

  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to delete roles (Super Admin only)
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Only Super Admin can delete roles' }, { status: 403 })
    }

    const { id: roleId } = await params

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent deleting system roles
    if (existingRole.isSystem) {
      return NextResponse.json({ 
        error: 'System roles cannot be deleted',
        message: 'System roles are essential for the application to function properly and cannot be deleted.'
      }, { status: 400 })
    }

    // Check if role is assigned to any users
    const usersWithRole = await prisma.user.count({
      where: { roleId: roleId }
    })

    if (usersWithRole > 0) {
      return NextResponse.json({ 
        error: 'Role is in use',
        message: `Cannot delete role as it is assigned to ${usersWithRole} user(s). Please reassign these users to a different role first.`
      }, { status: 400 })
    }

    // Delete the role
    await prisma.role.delete({
      where: { id: roleId }
    })

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

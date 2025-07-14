#!/usr/bin/env tsx

/**
 * Update Permissions Script
 * Updates roles and permissions to include new pages and proper access levels
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updatePermissions() {
  try {
    console.log('🔄 Updating permissions and roles...')

    // Define comprehensive permissions for all resources
    const permissions = [
      // Dashboard
      { name: 'dashboard.read', resource: 'dashboard', action: 'read', description: 'View dashboard and analytics' },
      
      // Registrations
      { name: 'registrations.read', resource: 'registrations', action: 'read', description: 'View registrations' },
      { name: 'registrations.write', resource: 'registrations', action: 'write', description: 'Create and update registrations' },
      { name: 'registrations.delete', resource: 'registrations', action: 'delete', description: 'Delete registrations' },
      { name: 'registrations.manage', resource: 'registrations', action: 'manage', description: 'Full registration management' },
      
      // Attendance
      { name: 'attendance.read', resource: 'attendance', action: 'read', description: 'View attendance records' },
      { name: 'attendance.write', resource: 'attendance', action: 'write', description: 'Mark attendance and verify participants' },
      { name: 'attendance.manage', resource: 'attendance', action: 'manage', description: 'Full attendance management' },
      
      // Accommodations
      { name: 'accommodations.read', resource: 'accommodations', action: 'read', description: 'View room allocations' },
      { name: 'accommodations.write', resource: 'accommodations', action: 'write', description: 'Allocate and manage rooms' },
      { name: 'accommodations.delete', resource: 'accommodations', action: 'delete', description: 'Remove room allocations' },
      { name: 'accommodations.manage', resource: 'accommodations', action: 'manage', description: 'Full accommodation management' },

      
      // Communications
      { name: 'communications.read', resource: 'communications', action: 'read', description: 'View communication settings' },
      { name: 'communications.write', resource: 'communications', action: 'write', description: 'Send emails and SMS' },
      { name: 'communications.manage', resource: 'communications', action: 'manage', description: 'Full communication management' },
      
      // Users
      { name: 'users.read', resource: 'users', action: 'read', description: 'View user accounts' },
      { name: 'users.write', resource: 'users', action: 'write', description: 'Create and update users' },
      { name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete user accounts' },
      { name: 'users.manage', resource: 'users', action: 'manage', description: 'Full user management' },
      
      // Settings
      { name: 'settings.read', resource: 'settings', action: 'read', description: 'View system settings' },
      { name: 'settings.write', resource: 'settings', action: 'write', description: 'Update system settings' },
      { name: 'settings.manage', resource: 'settings', action: 'manage', description: 'Full settings management' },
      
      // Analytics
      { name: 'analytics.read', resource: 'analytics', action: 'read', description: 'View analytics and reports' },
      { name: 'analytics.export', resource: 'analytics', action: 'export', description: 'Export reports and data' },
      
      // System
      { name: 'system.manage', resource: 'system', action: 'manage', description: 'Full system administration' },
      
      // QR Scanner
      { name: 'qr.scan', resource: 'qr', action: 'scan', description: 'Use QR scanner for verification' },
      
      // Exports
      { name: 'exports.create', resource: 'exports', action: 'create', description: 'Create and download exports' }
    ]

    // Create or update permissions
    const createdPermissions = []
    for (const permission of permissions) {
      const created = await prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          resource: permission.resource,
          action: permission.action
        },
        create: permission
      })
      createdPermissions.push(created)
    }

    console.log(`✅ Created/updated ${createdPermissions.length} permissions`)

    // Update role permissions based on new requirements
    
    // Super Admin - All permissions
    await prisma.role.upsert({
      where: { name: 'Super Admin' },
      update: {
        description: 'Full system access with all permissions',
        isSystem: true,
        permissions: {
          set: createdPermissions.map(p => ({ id: p.id }))
        }
      },
      create: {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        isSystem: true,
        permissions: {
          connect: createdPermissions.map(p => ({ id: p.id }))
        }
      }
    })

    // Admin - All permissions except system management
    const adminPermissions = createdPermissions.filter(p => 
      p.resource !== 'system' || p.action !== 'manage'
    )
    
    await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {
        description: 'Administrative access with most permissions',
        isSystem: true,
        permissions: {
          set: adminPermissions.map(p => ({ id: p.id }))
        }
      },
      create: {
        name: 'Admin',
        description: 'Administrative access with most permissions',
        isSystem: true,
        permissions: {
          connect: adminPermissions.map(p => ({ id: p.id }))
        }
      }
    })

    // Manager - Read/write but limited delete permissions
    const managerPermissions = createdPermissions.filter(p =>
      p.action === 'read' || 
      p.action === 'write' || 
      p.action === 'export' ||
      p.action === 'scan' ||
      (p.action === 'manage' && ['communications', 'accommodations', 'platoons'].includes(p.resource)) ||
      (p.action === 'delete' && ['accommodations'].includes(p.resource)) // Can remove room allocations
    )

    await prisma.role.upsert({
      where: { name: 'Manager' },
      update: {
        description: 'Management access with read/write permissions and limited delete',
        isSystem: true,
        permissions: {
          set: managerPermissions.map(p => ({ id: p.id }))
        }
      },
      create: {
        name: 'Manager',
        description: 'Management access with read/write permissions and limited delete',
        isSystem: true,
        permissions: {
          connect: managerPermissions.map(p => ({ id: p.id }))
        }
      }
    })

    // Staff - Read/write but NO delete permissions, can verify/unverify
    const staffPermissions = createdPermissions.filter(p =>
      p.action === 'read' ||
      p.action === 'scan' ||
      (p.action === 'write' && [
        'registrations', 
        'accommodations', 
        'communications', 
        'attendance',
        'platoons'
      ].includes(p.resource))
    )

    await prisma.role.upsert({
      where: { name: 'Staff' },
      update: {
        description: 'Staff access with read/write permissions but no delete access',
        isSystem: true,
        permissions: {
          set: staffPermissions.map(p => ({ id: p.id }))
        }
      },
      create: {
        name: 'Staff',
        description: 'Staff access with read/write permissions but no delete access',
        isSystem: true,
        permissions: {
          connect: staffPermissions.map(p => ({ id: p.id }))
        }
      }
    })

    // Viewer - Read-only access
    const viewerPermissions = createdPermissions.filter(p => 
      p.action === 'read'
    )

    await prisma.role.upsert({
      where: { name: 'Viewer' },
      update: {
        description: 'Read-only access to most features',
        isSystem: true,
        permissions: {
          set: viewerPermissions.map(p => ({ id: p.id }))
        }
      },
      create: {
        name: 'Viewer',
        description: 'Read-only access to most features',
        isSystem: true,
        permissions: {
          connect: viewerPermissions.map(p => ({ id: p.id }))
        }
      }
    })

    console.log('✅ Updated all roles with new permissions')

    // Display role summary
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            permissions: true,
            users: true,
            admins: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    console.log('\n📊 Role Summary:')
    console.log('================')
    for (const role of roles) {
      console.log(`${role.name}: ${role._count.permissions} permissions, ${role._count.users + role._count.admins} users`)
    }

    console.log('\n🎉 Permissions update completed successfully!')

  } catch (error) {
    console.error('❌ Error updating permissions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  updatePermissions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { updatePermissions }

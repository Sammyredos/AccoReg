import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createStaffRole() {
  try {
    console.log('👥 CREATING STAFF ROLE AND PERMISSIONS')
    console.log('=' .repeat(50))

    // Check existing roles
    const existingRoles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            admins: true
          }
        }
      }
    })

    console.log('\n📋 EXISTING ROLES:')
    existingRoles.forEach(role => {
      console.log(`  👑 ${role.name} - ${role.description || 'No description'}`)
      console.log(`     👤 Admins: ${role._count.admins}`)
      console.log(`     🔑 Permissions: ${role.permissions.length}`)
      console.log('')
    })

    // Create Staff role if it doesn't exist
    let staffRole = await prisma.role.findFirst({
      where: { name: 'Staff' }
    })

    if (!staffRole) {
      console.log('🔧 Creating Staff role...')
      staffRole = await prisma.role.create({
        data: {
          name: 'Staff',
          description: 'Staff members with limited administrative access',
          isSystem: false
        }
      })
      console.log('✅ Staff role created')
    } else {
      console.log('✅ Staff role already exists')
    }

    // Create Manager role if it doesn't exist
    let managerRole = await prisma.role.findFirst({
      where: { name: 'Manager' }
    })

    if (!managerRole) {
      console.log('🔧 Creating Manager role...')
      managerRole = await prisma.role.create({
        data: {
          name: 'Manager',
          description: 'Managers with extended administrative access',
          isSystem: false
        }
      })
      console.log('✅ Manager role created')
    } else {
      console.log('✅ Manager role already exists')
    }

    // Create Admin role if it doesn't exist
    let adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' }
    })

    if (!adminRole) {
      console.log('🔧 Creating Admin role...')
      adminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Administrators with full system access',
          isSystem: false
        }
      })
      console.log('✅ Admin role created')
    } else {
      console.log('✅ Admin role already exists')
    }

    // Create permissions if they don't exist
    const permissions = [
      {
        name: 'view_registrations',
        description: 'View registration data',
        resource: 'registrations',
        action: 'read'
      },
      {
        name: 'edit_registrations',
        description: 'Edit registration data',
        resource: 'registrations',
        action: 'write'
      },
      {
        name: 'delete_registrations',
        description: 'Delete registration data',
        resource: 'registrations',
        action: 'delete'
      },
      {
        name: 'view_children',
        description: 'View children registration data',
        resource: 'children',
        action: 'read'
      },
      {
        name: 'edit_children',
        description: 'Edit children registration data',
        resource: 'children',
        action: 'write'
      },
      {
        name: 'delete_children',
        description: 'Delete children registration data',
        resource: 'children',
        action: 'delete'
      },
      {
        name: 'view_settings',
        description: 'View system settings',
        resource: 'settings',
        action: 'read'
      },
      {
        name: 'edit_settings',
        description: 'Edit system settings',
        resource: 'settings',
        action: 'write'
      },
      {
        name: 'manage_users',
        description: 'Manage user accounts',
        resource: 'users',
        action: 'manage'
      }
    ]

    console.log('\n🔑 Creating permissions...')
    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: perm,
        create: perm
      })
      console.log(`✅ ${perm.name}`)
    }

    // Assign permissions to roles
    console.log('\n🔗 Assigning permissions to roles...')

    // Staff permissions (limited)
    const staffPermissions = [
      'view_registrations',
      'edit_registrations',
      'view_children',
      'edit_children'
    ]

    // Manager permissions (extended)
    const managerPermissions = [
      'view_registrations',
      'edit_registrations',
      'view_children',
      'edit_children',
      'delete_children',
      'view_settings'
    ]

    // Admin permissions (full except user management)
    const adminPermissions = [
      'view_registrations',
      'edit_registrations',
      'delete_registrations',
      'view_children',
      'edit_children',
      'delete_children',
      'view_settings',
      'edit_settings'
    ]

    // Update Staff role permissions
    const staffPerms = await prisma.permission.findMany({
      where: { name: { in: staffPermissions } }
    })
    await prisma.role.update({
      where: { id: staffRole.id },
      data: {
        permissions: {
          set: staffPerms.map(p => ({ id: p.id }))
        }
      }
    })
    console.log(`✅ Staff role: ${staffPermissions.length} permissions assigned`)

    // Update Manager role permissions
    const managerPerms = await prisma.permission.findMany({
      where: { name: { in: managerPermissions } }
    })
    await prisma.role.update({
      where: { id: managerRole.id },
      data: {
        permissions: {
          set: managerPerms.map(p => ({ id: p.id }))
        }
      }
    })
    console.log(`✅ Manager role: ${managerPermissions.length} permissions assigned`)

    // Update Admin role permissions
    const adminPerms = await prisma.permission.findMany({
      where: { name: { in: adminPermissions } }
    })
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          set: adminPerms.map(p => ({ id: p.id }))
        }
      }
    })
    console.log(`✅ Admin role: ${adminPermissions.length} permissions assigned`)

    console.log('\n🎉 Role and permission setup completed!')
    console.log('\n📋 ROLE SUMMARY:')
    console.log('👤 Staff: Can view and edit registrations and children')
    console.log('👥 Manager: Staff permissions + delete children + view settings')
    console.log('👑 Admin: Manager permissions + delete registrations + edit settings')
    console.log('🔱 Super Admin: Full system access (unchanged)')

  } catch (error) {
    console.error('\n❌ Role creation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the role creation
createStaffRole()
  .then(() => {
    console.log('\n👥 Role creation completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Role creation failed:', error)
    process.exit(1)
  })

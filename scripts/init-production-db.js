#!/usr/bin/env node

/**
 * Production Database Initialization Script
 * This script initializes the production database with required settings and data
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initializeDatabase() {
  try {
    console.log('🚀 Starting production database initialization...')

    // 1. Run database migration
    console.log('📊 Pushing database schema...')
    const { execSync } = require('child_process')
    execSync('npx prisma db push', { stdio: 'inherit' })

    // 2. Create default system settings
    console.log('⚙️ Creating default system settings...')
    
    const defaultSettings = [
      // System branding
      {
        category: 'branding',
        key: 'systemName',
        value: JSON.stringify('Mopgomglobal'),
        type: 'string',
        description: 'System name displayed in the application'
      },
      {
        category: 'branding',
        key: 'logoUrl',
        value: JSON.stringify(null),
        type: 'string',
        description: 'URL to the system logo'
      },
      
      // Registration settings
      {
        category: 'registration',
        key: 'minimumAge',
        value: JSON.stringify(18),
        type: 'number',
        description: 'Minimum age for main registration'
      },
      {
        category: 'registration',
        key: 'isOpen',
        value: JSON.stringify(true),
        type: 'boolean',
        description: 'Whether registration is currently open'
      },
      {
        category: 'registration',
        key: 'closureDate',
        value: JSON.stringify(null),
        type: 'string',
        description: 'Registration closure date'
      },
      
      // Email settings (will be configured later)
      {
        category: 'email',
        key: 'smtp_host',
        value: JSON.stringify(''),
        type: 'string',
        description: 'SMTP server host'
      },
      {
        category: 'email',
        key: 'smtp_port',
        value: JSON.stringify(587),
        type: 'number',
        description: 'SMTP server port'
      },
      {
        category: 'email',
        key: 'smtp_secure',
        value: JSON.stringify(false),
        type: 'boolean',
        description: 'Use secure SMTP connection'
      },
      {
        category: 'email',
        key: 'smtp_user',
        value: JSON.stringify(''),
        type: 'string',
        description: 'SMTP username'
      },
      {
        category: 'email',
        key: 'smtp_pass',
        value: JSON.stringify(''),
        type: 'string',
        description: 'SMTP password'
      },
      
      // System settings
      {
        category: 'system',
        key: 'session_timeout',
        value: JSON.stringify(3600),
        type: 'number',
        description: 'Session timeout in seconds'
      },
      {
        category: 'system',
        key: 'max_login_attempts',
        value: JSON.stringify(5),
        type: 'number',
        description: 'Maximum login attempts before lockout'
      }
    ]

    // Insert settings with upsert to avoid duplicates
    for (const setting of defaultSettings) {
      await prisma.setting.upsert({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key
          }
        },
        update: {
          value: setting.value,
          type: setting.type,
          description: setting.description
        },
        create: setting
      })
      console.log(`✅ Setting: ${setting.category}.${setting.key}`)
    }

    // 3. Create default roles and permissions
    console.log('👥 Creating default roles and permissions...')
    
    // Create permissions
    const permissions = [
      { name: 'system:admin', description: 'Full system administration', resource: 'system', action: 'admin' },
      { name: 'users:read', description: 'View users', resource: 'users', action: 'read' },
      { name: 'users:write', description: 'Create and edit users', resource: 'users', action: 'write' },
      { name: 'registrations:read', description: 'View registrations', resource: 'registrations', action: 'read' },
      { name: 'registrations:write', description: 'Edit registrations', resource: 'registrations', action: 'write' },
      { name: 'accommodations:read', description: 'View accommodations', resource: 'accommodations', action: 'read' },
      { name: 'accommodations:write', description: 'Manage accommodations', resource: 'accommodations', action: 'write' }
    ]

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: perm,
        create: perm
      })
    }

    // Create roles
    const roles = [
      { name: 'Super Admin', description: 'Full system access', isSystem: true },
      { name: 'Admin', description: 'Administrative access', isSystem: true },
      { name: 'Manager', description: 'Management access', isSystem: true },
      { name: 'Staff', description: 'Staff access', isSystem: true },
      { name: 'Viewer', description: 'Read-only access', isSystem: true }
    ]

    for (const role of roles) {
      const createdRole = await prisma.role.upsert({
        where: { name: role.name },
        update: role,
        create: role
      })

      // Assign permissions to roles
      if (role.name === 'Super Admin') {
        // Super Admin gets all permissions
        await prisma.role.update({
          where: { id: createdRole.id },
          data: {
            permissions: {
              connect: permissions.map(p => ({ name: p.name }))
            }
          }
        })
      }
    }

    // 4. Create default super admin user (if not exists)
    console.log('👤 Creating default super admin user...')
    
    const bcrypt = require('bcryptjs')
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123'
    const hashedPassword = await bcrypt.hash(superAdminPassword, 12)
    
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'Super Admin' }
    })

    if (superAdminRole) {
      await prisma.admin.upsert({
        where: { email: 'admin@mopgomglobal.com' },
        update: {
          password: hashedPassword,
          roleId: superAdminRole.id
        },
        create: {
          email: 'admin@mopgomglobal.com',
          password: hashedPassword,
          name: 'Super Administrator',
          roleId: superAdminRole.id,
          isActive: true
        }
      })
      console.log('✅ Super admin user created/updated')
      console.log('📧 Email: admin@mopgomglobal.com')
      console.log('🔑 Password:', superAdminPassword)
    }

    console.log('🎉 Database initialization completed successfully!')
    console.log('')
    console.log('🔗 You can now access your application at:')
    console.log('   https://youth-registration-system.onrender.com/admin/login')
    console.log('')
    console.log('📋 Next steps:')
    console.log('   1. Login with the super admin credentials')
    console.log('   2. Configure email settings in Admin > Settings')
    console.log('   3. Upload a logo in Admin > Settings > Branding')
    console.log('   4. Create additional admin users as needed')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the initialization
initializeDatabase()

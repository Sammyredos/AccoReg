/**
 * Database Initialization for Production
 * This runs automatically when the application starts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

let isInitialized = false
let initializationPromise: Promise<void> | null = null

export async function initializeDatabase(): Promise<void> {
  // Prevent multiple simultaneous initializations
  if (isInitialized) return
  if (initializationPromise) return initializationPromise

  initializationPromise = performInitialization()
  await initializationPromise
}

async function performInitialization(): Promise<void> {
  try {
    console.log('🚀 Checking database initialization...')

    // Check if database is already initialized by looking for settings
    const existingSettings = await prisma.setting.findFirst({
      where: { category: 'system' }
    }).catch(() => null)

    if (existingSettings) {
      console.log('✅ Database already initialized')
      isInitialized = true
      return
    }

    console.log('📊 Initializing database with default settings...')

    // Create default system settings
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
        value: JSON.stringify(process.env.SMTP_HOST || ''),
        type: 'string',
        description: 'SMTP server host'
      },
      {
        category: 'email',
        key: 'smtp_port',
        value: JSON.stringify(parseInt(process.env.SMTP_PORT || '587')),
        type: 'number',
        description: 'SMTP server port'
      },
      {
        category: 'email',
        key: 'smtp_secure',
        value: JSON.stringify(process.env.SMTP_SECURE === 'true'),
        type: 'boolean',
        description: 'Use secure SMTP connection'
      },
      {
        category: 'email',
        key: 'smtp_user',
        value: JSON.stringify(process.env.SMTP_USER || ''),
        type: 'string',
        description: 'SMTP username'
      },
      {
        category: 'email',
        key: 'smtp_pass',
        value: JSON.stringify(process.env.SMTP_PASS || ''),
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

    // Insert settings
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
    }

    // Create default permissions
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

    // Create default roles
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

      // Assign all permissions to Super Admin
      if (role.name === 'Super Admin') {
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

    // Create default super admin user
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
    }

    console.log('✅ Database initialization completed successfully!')
    console.log('📧 Super Admin Email: admin@mopgomglobal.com')
    console.log('🔑 Super Admin Password:', superAdminPassword)
    
    isInitialized = true

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    // Don't throw error to prevent app from crashing
    // The app should still work with fallback values
  } finally {
    await prisma.$disconnect()
  }
}

// Auto-initialize when this module is imported
if (process.env.NODE_ENV === 'production') {
  initializeDatabase().catch(console.error)
}

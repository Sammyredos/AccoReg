#!/usr/bin/env tsx

/**
 * Production Deployment Script
 * 
 * This script prepares the application for production deployment
 * by setting up the database, creating admin users, and validating configuration.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting production deployment setup...')

  try {
    // 1. Test database connection
    console.log('📊 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful')

    // 2. Run database migrations
    console.log('🔄 Database schema is managed by Prisma migrations')

    // 3. Create default roles if they don't exist
    console.log('👥 Setting up default roles...')
    
    const superAdminRole = await prisma.role.upsert({
      where: { name: 'Super Admin' },
      update: {},
      create: {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        isSystem: true,
      },
    })

    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        description: 'Administrative access with most permissions',
        isSystem: true,
      },
    })

    const userRole = await prisma.role.upsert({
      where: { name: 'User' },
      update: {},
      create: {
        name: 'User',
        description: 'Standard user access',
        isSystem: true,
      },
    })

    console.log('✅ Default roles created/updated')

    // 4. Create super admin user if it doesn't exist
    console.log('👤 Setting up super admin user...')
    
    const superAdminEmail = 'admin@youthreg.com'
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!'
    
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: superAdminEmail },
    })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(superAdminPassword, 12)
      
      await prisma.admin.create({
        data: {
          email: superAdminEmail,
          password: hashedPassword,
          name: 'Super Administrator',
          roleId: superAdminRole.id,
          isActive: true,
        },
      })
      
      console.log('✅ Super admin user created')
      console.log(`📧 Email: ${superAdminEmail}`)
      console.log(`🔑 Password: ${superAdminPassword}`)
      console.log('⚠️  IMPORTANT: Change the password after first login!')
    } else {
      console.log('✅ Super admin user already exists')
    }

    // 5. Create default system settings
    console.log('⚙️  Setting up default system settings...')
    
    const defaultSettings = [
      {
        category: 'branding',
        key: 'systemName',
        value: JSON.stringify('Youth Registration System'),
        type: 'text',
        name: 'System Name',
        description: 'The name of the system displayed in the UI',
        isSystem: true,
      },
      {
        category: 'branding',
        key: 'logoUrl',
        value: JSON.stringify(''),
        type: 'text',
        name: 'Logo URL',
        description: 'URL to the system logo',
        isSystem: false,
      },
      {
        category: 'security',
        key: 'sessionTimeout',
        value: JSON.stringify(3600),
        type: 'number',
        name: 'Session Timeout (seconds)',
        description: 'How long user sessions last before expiring',
        isSystem: true,
      },
      {
        category: 'notifications',
        key: 'emailNotifications',
        value: JSON.stringify(true),
        type: 'toggle',
        name: 'Email Notifications',
        description: 'Enable email notifications for new registrations',
        isSystem: false,
      },
    ]

    for (const setting of defaultSettings) {
      await prisma.setting.upsert({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key,
          },
        },
        update: {},
        create: setting,
      })
    }

    console.log('✅ Default system settings created/updated')

    // 6. Validate environment variables
    console.log('🔍 Validating environment configuration...')
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'JWT_SECRET',
      'NEXTAUTH_URL',
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      console.log('❌ Missing required environment variables:')
      missingEnvVars.forEach(envVar => console.log(`   - ${envVar}`))
      process.exit(1)
    }

    console.log('✅ Environment configuration validated')

    // 7. Test critical functionality
    console.log('🧪 Testing critical functionality...')
    
    // Test registration count
    const registrationCount = await prisma.registration.count()
    console.log(`📊 Current registrations: ${registrationCount}`)
    
    // Test admin count
    const adminCount = await prisma.admin.count()
    console.log(`👥 Current admins: ${adminCount}`)

    console.log('✅ Critical functionality tests passed')

    console.log('\n🎉 Production deployment setup completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Update environment variables with production values')
    console.log('2. Configure email SMTP settings')
    console.log('3. Set up SSL certificate')
    console.log('4. Configure monitoring and logging')
    console.log('5. Test the application thoroughly')
    console.log('\n⚠️  Security reminders:')
    console.log('- Change default admin password immediately')
    console.log('- Update JWT_SECRET and NEXTAUTH_SECRET with secure values')
    console.log('- Enable rate limiting and security headers')
    console.log('- Set up regular database backups')

  } catch (error) {
    console.error('❌ Production deployment setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })

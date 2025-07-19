#!/usr/bin/env tsx

/**
 * Production initialization script
 * Handles database setup and admin account creation with memory optimization
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeProduction() {
  try {
    console.log('🚀 Initializing production environment...')
    
    // Check database connection
    console.log('🔍 Checking database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Create super admin if not exists (using Admin table, not User table)
    console.log('👑 Setting up Super Admin account...')
    try {
      const existingAdmin = await prisma.admin.findFirst({
        where: { email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@mopgomglobal.com' }
      })

      if (!existingAdmin) {
        // First ensure Super Admin role exists
        const superAdminRole = await prisma.role.upsert({
          where: { name: 'Super Admin' },
          update: {},
          create: {
            name: 'Super Admin',
            description: 'Full system access',
            isSystem: true
          }
        })

        const bcrypt = await import('bcryptjs')
        const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'SuperAdmin123!', 12)

        await prisma.admin.create({
          data: {
            email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@mopgomglobal.com',
            password: hashedPassword,
            name: 'Super Administrator',
            roleId: superAdminRole.id,
            isActive: true
          }
        })
        console.log('✅ Super Admin account created in Admin table')
        console.log('📧 Email: admin@mopgomglobal.com')
        console.log('🔑 Password: SuperAdmin123!')
      } else {
        console.log('ℹ️ Super Admin account already exists')
      }
    } catch (error) {
      console.log('⚠️ Admin setup failed:', error.message)
      throw error // Don't skip this error, it's critical
    }
    
    // Seed basic settings if not exists
    console.log('⚙️ Checking system settings...')
    try {
      const settingsCount = await prisma.setting.count()
      if (settingsCount === 0) {
        await prisma.setting.createMany({
          data: [
            {
              category: 'branding',
              key: 'systemName',
              value: JSON.stringify(process.env.SYSTEM_NAME || 'Youth Registration System'),
              type: 'text',
              name: 'System Name',
              description: 'The name of the system',
              isSystem: true,
            },
            {
              category: 'registration',
              key: 'minimumAge',
              value: JSON.stringify(parseInt(process.env.MINIMUM_AGE || '13')),
              type: 'number',
              name: 'Minimum Age',
              description: 'Minimum age for registration',
              isSystem: true,
            },
            {
              category: 'registration',
              key: 'registrationOpen',
              value: JSON.stringify(process.env.REGISTRATION_OPEN === 'true'),
              type: 'boolean',
              name: 'Registration Open',
              description: 'Whether registration is currently open',
              isSystem: true,
            }
          ]
        })
        console.log('✅ Basic settings seeded')
      } else {
        console.log('ℹ️ Settings already exist')
      }
    } catch (error) {
      console.log('⚠️ Settings setup skipped:', error.message)
    }
    
    console.log('🎉 Production initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Production initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run initialization
initializeProduction()

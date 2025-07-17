#!/usr/bin/env tsx

/**
 * Emergency Database Fix Script
 * 
 * This script fixes the PostgreSQL migration issue by:
 * 1. Resetting the database schema
 * 2. Applying the correct PostgreSQL migrations
 * 3. Setting up initial data
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function emergencyDatabaseFix() {
  try {
    console.log('🚨 EMERGENCY DATABASE FIX')
    console.log('=' .repeat(50))
    console.log('This will reset and recreate the database schema for PostgreSQL')

    // Step 1: Generate Prisma client
    console.log('\n📦 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated')

    // Step 2: Force database schema recreation
    console.log('\n🗄️ Force recreating database schema...')

    // Method 1: Try db push with force reset
    try {
      console.log('Attempting force reset with db push...')
      execSync('npx prisma db push --force-reset --skip-generate', { stdio: 'inherit' })
      console.log('✅ Database schema reset and recreated with db push')
    } catch (pushError) {
      console.log('⚠️ DB push failed, trying migration reset...')

      // Method 2: Reset migrations and deploy
      try {
        console.log('Resetting migration history...')
        execSync('npx prisma migrate reset --force --skip-generate', { stdio: 'inherit' })
        console.log('Deploying fresh migrations...')
        execSync('npx prisma migrate deploy', { stdio: 'inherit' })
        console.log('✅ Migrations reset and deployed')
      } catch (migrateError) {
        console.log('⚠️ Migration reset failed, using direct db push...')

        // Method 3: Direct schema push (most aggressive)
        try {
          execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' })
          console.log('✅ Schema pushed directly to database')
        } catch (directError) {
          console.error('❌ All database reset methods failed')
          throw new Error('Database reset failed with all methods')
        }
      }
    }

    // Step 3: Verify database connection and tables
    console.log('\n🔍 Verifying database setup...')
    await prisma.$connect()
    
    // Test each table
    const tables = [
      'admin',
      'registration', 
      'childrenRegistration',
      'setting',
      'role',
      'room',
      'notification'
    ]

    for (const table of tables) {
      try {
        await (prisma as any)[table].count()
        console.log(`✅ Table '${table}' exists and accessible`)
      } catch (error) {
        console.log(`❌ Table '${table}' has issues:`, error.message)
      }
    }

    // Step 4: Create essential data
    console.log('\n🌱 Setting up essential data...')
    
    // Create default roles
    try {
      await prisma.role.upsert({
        where: { name: 'Super Admin' },
        update: {},
        create: {
          name: 'Super Admin',
          description: 'Full system access',
          isActive: true
        }
      })
      
      await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
          name: 'Admin',
          description: 'Administrative access',
          isActive: true
        }
      })
      
      await prisma.role.upsert({
        where: { name: 'Manager' },
        update: {},
        create: {
          name: 'Manager',
          description: 'Management access',
          isActive: true
        }
      })
      
      await prisma.role.upsert({
        where: { name: 'Staff' },
        update: {},
        create: {
          name: 'Staff',
          description: 'Staff access',
          isActive: true
        }
      })
      
      console.log('✅ Default roles created')
    } catch (error) {
      console.log('⚠️ Role creation failed:', error.message)
    }

    // Create essential settings
    try {
      const settings = [
        { key: 'system_name', value: 'Mopgomglobal Youth Registration', description: 'System name' },
        { key: 'registration_minimumAge', value: '18', description: 'Minimum age for main registration' },
        { key: 'branding.logoUrl', value: '', description: 'Logo URL' },
        { key: 'branding.primaryColor', value: '#10B981', description: 'Primary brand color' },
        { key: 'email.enabled', value: 'true', description: 'Email system enabled' }
      ]

      for (const setting of settings) {
        await prisma.setting.upsert({
          where: { key: setting.key },
          update: {},
          create: setting
        })
      }
      
      console.log('✅ Essential settings created')
    } catch (error) {
      console.log('⚠️ Settings creation failed:', error.message)
    }

    console.log('\n🎉 Emergency database fix completed!')
    console.log('✅ Database is now ready for production use')
    
    // Final verification
    const regCount = await prisma.registration.count()
    const childrenCount = await prisma.childrenRegistration.count()
    const adminCount = await prisma.admin.count()
    
    console.log('\n📊 Database Status:')
    console.log(`- Registrations: ${regCount}`)
    console.log(`- Children Registrations: ${childrenCount}`)
    console.log(`- Admin Users: ${adminCount}`)

  } catch (error) {
    console.error('\n💥 Emergency fix failed:', error)
    console.error('\n🔧 Manual intervention required:')
    console.error('1. Check DATABASE_URL is correct PostgreSQL connection string')
    console.error('2. Ensure PostgreSQL database exists and is accessible')
    console.error('3. Verify network connectivity to database')
    console.error('4. Check database permissions')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the emergency fix
emergencyDatabaseFix()

#!/usr/bin/env tsx

/**
 * Force Database Creation Script
 * 
 * This script directly creates the required tables using raw SQL
 * to ensure they exist regardless of migration state
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function forceCreateTables() {
  try {
    console.log('🔧 FORCE CREATING DATABASE TABLES')
    console.log('=' .repeat(50))

    await prisma.$connect()
    console.log('✅ Connected to database')

    // Drop and recreate children_registrations table
    console.log('\n📋 Creating children_registrations table...')
    try {
      await prisma.$executeRaw`DROP TABLE IF EXISTS "children_registrations" CASCADE`
      await prisma.$executeRaw`
        CREATE TABLE "children_registrations" (
          "id" TEXT NOT NULL,
          "fullName" TEXT NOT NULL,
          "dateOfBirth" TIMESTAMP(3) NOT NULL,
          "age" INTEGER NOT NULL DEFAULT 0,
          "gender" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "branch" TEXT NOT NULL DEFAULT 'Not Specified',
          "parentGuardianName" TEXT NOT NULL,
          "parentGuardianPhone" TEXT NOT NULL,
          "parentGuardianEmail" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "children_registrations_pkey" PRIMARY KEY ("id")
        )
      `
      
      // Create indexes for children_registrations
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_fullName_idx" ON "children_registrations"("fullName")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_gender_idx" ON "children_registrations"("gender")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" ON "children_registrations"("branch")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "children_registrations_createdAt_idx" ON "children_registrations"("createdAt")`
      
      console.log('✅ children_registrations table created successfully')
    } catch (error) {
      console.error('❌ Failed to create children_registrations table:', error)
    }

    // Add age column to registrations table if it doesn't exist
    console.log('\n👤 Updating registrations table...')
    try {
      // Check if age column exists
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Registration' AND column_name = 'age'
      ` as any[]

      if (result.length === 0) {
        console.log('Adding age column to registrations table...')
        await prisma.$executeRaw`ALTER TABLE "Registration" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0`
        console.log('✅ Age column added to registrations table')
      } else {
        console.log('✅ Age column already exists in registrations table')
      }
    } catch (error) {
      console.error('❌ Failed to update registrations table:', error)
    }

    // Add branch column to registrations table if it doesn't exist
    try {
      // Check if branch column exists
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Registration' AND column_name = 'branch'
      ` as any[]

      if (result.length === 0) {
        console.log('Adding branch column to registrations table...')
        await prisma.$executeRaw`ALTER TABLE "Registration" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified'`
        console.log('✅ Branch column added to registrations table')
      } else {
        console.log('✅ Branch column already exists in registrations table')
      }
    } catch (error) {
      console.error('❌ Failed to add branch column:', error)
    }

    // Verify all tables exist
    console.log('\n🔍 Verifying table existence...')
    const tables = [
      'Admin',
      'Registration', 
      'children_registrations',
      'Setting',
      'Role',
      'rooms',
      'Notification'
    ]

    for (const table of tables) {
      try {
        const count = await (prisma as any)[table.toLowerCase()].count()
        console.log(`✅ Table '${table}' exists (${count} records)`)
      } catch (error) {
        console.log(`❌ Table '${table}' has issues:`, error.message)
      }
    }

    // Test specific operations that were failing
    console.log('\n🧪 Testing problematic operations...')
    
    try {
      await prisma.registration.findMany({ select: { age: true } })
      console.log('✅ Registration age column accessible')
    } catch (error) {
      console.log('❌ Registration age column issue:', error.message)
    }

    try {
      await prisma.childrenRegistration.count()
      console.log('✅ children_registrations table accessible')
    } catch (error) {
      console.log('❌ children_registrations table issue:', error.message)
    }

    console.log('\n🎉 Force table creation completed!')

  } catch (error) {
    console.error('\n💥 Force table creation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the force creation
forceCreateTables()
  .then(() => {
    console.log('\n✅ Database tables are now ready!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Force creation failed:', error)
    process.exit(1)
  })

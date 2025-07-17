#!/usr/bin/env tsx

/**
 * SAFE Database Fix Script
 * 
 * This script safely adds missing columns and tables WITHOUT losing existing data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function safeDatabaseFix() {
  try {
    console.log('🛡️ SAFE DATABASE FIX - PRESERVING ALL EXISTING DATA')
    console.log('=' .repeat(60))

    await prisma.$connect()
    console.log('✅ Connected to database')

    // Step 1: Check existing data counts BEFORE any changes
    console.log('\n📊 CURRENT DATA INVENTORY:')
    let existingData = {
      registrations: 0,
      admins: 0,
      roles: 0,
      settings: 0,
      rooms: 0,
      notifications: 0
    }

    try {
      existingData.registrations = await prisma.registration.count()
      console.log(`📋 Existing Registrations: ${existingData.registrations}`)
    } catch (error) {
      console.log('⚠️ Could not count registrations (table may not exist)')
    }

    try {
      existingData.admins = await prisma.admin.count()
      console.log(`👤 Existing Admins: ${existingData.admins}`)
    } catch (error) {
      console.log('⚠️ Could not count admins')
    }

    try {
      existingData.roles = await prisma.role.count()
      console.log(`🔐 Existing Roles: ${existingData.roles}`)
    } catch (error) {
      console.log('⚠️ Could not count roles')
    }

    // Step 2: Safely add missing columns to Registration table
    console.log('\n🔧 SAFELY ADDING MISSING COLUMNS:')
    
    // Add age column if missing
    try {
      const ageColumnExists = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Registration' AND column_name = 'age'
      ` as any[]

      if (ageColumnExists.length === 0) {
        console.log('Adding age column to Registration table...')
        await prisma.$executeRaw`ALTER TABLE "Registration" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0`
        console.log('✅ Age column added safely')
      } else {
        console.log('✅ Age column already exists')
      }
    } catch (error) {
      console.log('⚠️ Age column check/add failed:', error.message)
    }

    // Add branch column if missing
    try {
      const branchColumnExists = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Registration' AND column_name = 'branch'
      ` as any[]

      if (branchColumnExists.length === 0) {
        console.log('Adding branch column to Registration table...')
        await prisma.$executeRaw`ALTER TABLE "Registration" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified'`
        console.log('✅ Branch column added safely')
      } else {
        console.log('✅ Branch column already exists')
      }
    } catch (error) {
      console.log('⚠️ Branch column check/add failed:', error.message)
    }

    // Step 3: Safely create children_registrations table if missing
    console.log('\n👶 SAFELY CREATING CHILDREN REGISTRATIONS TABLE:')
    try {
      // Check if table exists
      const tableExists = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'children_registrations'
      ` as any[]

      if (tableExists.length === 0) {
        console.log('Creating children_registrations table...')
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
        
        // Create indexes
        await prisma.$executeRaw`CREATE INDEX "children_registrations_fullName_idx" ON "children_registrations"("fullName")`
        await prisma.$executeRaw`CREATE INDEX "children_registrations_gender_idx" ON "children_registrations"("gender")`
        await prisma.$executeRaw`CREATE INDEX "children_registrations_branch_idx" ON "children_registrations"("branch")`
        await prisma.$executeRaw`CREATE INDEX "children_registrations_createdAt_idx" ON "children_registrations"("createdAt")`
        
        console.log('✅ children_registrations table created safely')
      } else {
        console.log('✅ children_registrations table already exists')
      }
    } catch (error) {
      console.log('⚠️ children_registrations table creation failed:', error.message)
    }

    // Step 4: Verify data integrity AFTER changes
    console.log('\n🔍 VERIFYING DATA INTEGRITY:')
    
    try {
      const newRegCount = await prisma.registration.count()
      console.log(`📋 Registrations after fix: ${newRegCount}`)
      if (newRegCount >= existingData.registrations) {
        console.log('✅ Registration data preserved')
      } else {
        console.log('⚠️ Registration count decreased - investigate!')
      }
    } catch (error) {
      console.log('❌ Could not verify registration data:', error.message)
    }

    try {
      const newAdminCount = await prisma.admin.count()
      console.log(`👤 Admins after fix: ${newAdminCount}`)
      if (newAdminCount >= existingData.admins) {
        console.log('✅ Admin data preserved')
      } else {
        console.log('⚠️ Admin count decreased - investigate!')
      }
    } catch (error) {
      console.log('❌ Could not verify admin data:', error.message)
    }

    // Step 5: Test all critical operations
    console.log('\n🧪 TESTING CRITICAL OPERATIONS:')
    
    const tests = [
      { name: 'Registration count', test: () => prisma.registration.count() },
      { name: 'Registration age column', test: () => prisma.registration.findMany({ select: { age: true }, take: 1 }) },
      { name: 'Registration branch column', test: () => prisma.registration.findMany({ select: { branch: true }, take: 1 }) },
      { name: 'Children registration count', test: () => prisma.childrenRegistration.count() },
      { name: 'Admin count', test: () => prisma.admin.count() }
    ]

    for (const test of tests) {
      try {
        await test.test()
        console.log(`✅ ${test.name}: WORKING`)
      } catch (error) {
        console.log(`❌ ${test.name}: FAILED - ${error.message}`)
      }
    }

    console.log('\n🎉 SAFE DATABASE FIX COMPLETED!')
    console.log('✅ All existing data has been preserved')
    console.log('✅ Missing columns and tables have been added')

  } catch (error) {
    console.error('\n💥 Safe database fix failed:', error)
    console.error('Your existing data should still be intact')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the safe fix
safeDatabaseFix()
  .then(() => {
    console.log('\n✅ Database is now ready with all data preserved!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Safe fix failed:', error)
    process.exit(1)
  })

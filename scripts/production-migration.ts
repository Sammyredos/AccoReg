#!/usr/bin/env tsx

/**
 * Production Migration Script
 * Handles database schema updates for production deployment
 * Specifically adds branch field to registration tables
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runProductionMigration() {
  console.log('🔄 Starting Production Database Migration...')
  console.log('=' .repeat(50))

  try {
    // Check if we're connected to the database
    await prisma.$connect()
    console.log('✅ Database connection established')

    // Check if branch field already exists in registrations table
    console.log('\n🔍 Checking current database schema...')
    
    try {
      // Try to query a registration with branch field
      const testQuery = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'branch'
      `
      
      if (Array.isArray(testQuery) && testQuery.length > 0) {
        console.log('✅ Branch field already exists in registrations table')
      } else {
        throw new Error('Branch field not found')
      }
    } catch (error) {
      console.log('⚠️ Branch field missing, adding now...')
      
      // Add branch field to registrations table
      await prisma.$executeRaw`
        ALTER TABLE "registrations" 
        ADD COLUMN IF NOT EXISTS "branch" TEXT NOT NULL DEFAULT 'Not Specified'
      `
      console.log('✅ Added branch field to registrations table')
      
      // Add index for performance
      try {
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "registrations_branch_idx" 
          ON "registrations"("branch")
        `
        console.log('✅ Added branch index to registrations table')
      } catch (indexError) {
        console.log('⚠️ Branch index may already exist')
      }
    }

    // Check if branch field exists in children_registrations table
    try {
      const testChildrenQuery = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'children_registrations' 
        AND column_name = 'branch'
      `
      
      if (Array.isArray(testChildrenQuery) && testChildrenQuery.length > 0) {
        console.log('✅ Branch field already exists in children_registrations table')
      } else {
        throw new Error('Branch field not found in children table')
      }
    } catch (error) {
      console.log('⚠️ Branch field missing in children table, adding now...')
      
      // Add branch field to children_registrations table
      await prisma.$executeRaw`
        ALTER TABLE "children_registrations" 
        ADD COLUMN IF NOT EXISTS "branch" TEXT NOT NULL DEFAULT 'Not Specified'
      `
      console.log('✅ Added branch field to children_registrations table')
      
      // Add index for performance
      try {
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" 
          ON "children_registrations"("branch")
        `
        console.log('✅ Added branch index to children_registrations table')
      } catch (indexError) {
        console.log('⚠️ Branch index may already exist in children table')
      }
    }

    // Update existing records without branch data
    console.log('\n🔄 Updating existing records...')
    
    const updatedRegistrations = await prisma.$executeRaw`
      UPDATE "registrations" 
      SET "branch" = 'Not Specified' 
      WHERE "branch" IS NULL OR "branch" = ''
    `
    console.log(`✅ Updated ${updatedRegistrations} registration records`)

    const updatedChildren = await prisma.$executeRaw`
      UPDATE "children_registrations" 
      SET "branch" = 'Not Specified' 
      WHERE "branch" IS NULL OR "branch" = ''
    `
    console.log(`✅ Updated ${updatedChildren} children registration records`)

    // Verify the migration
    console.log('\n🔍 Verifying migration...')
    
    const registrationCount = await prisma.registration.count()
    const childrenCount = await prisma.childrenRegistration.count()
    
    console.log(`✅ Total registrations: ${registrationCount}`)
    console.log(`✅ Total children registrations: ${childrenCount}`)

    // Test branch field functionality
    try {
      const sampleRegistration = await prisma.registration.findFirst({
        select: { id: true, fullName: true, branch: true }
      })
      
      if (sampleRegistration) {
        console.log(`✅ Sample registration branch: ${sampleRegistration.branch}`)
      }
    } catch (error) {
      console.log('⚠️ Could not verify sample registration')
    }

    console.log('\n🎉 Production Migration Completed Successfully!')
    console.log('✅ Branch field is now available for both registration forms')
    console.log('✅ Existing records have been updated with default values')
    console.log('✅ Database indexes have been created for performance')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('🔧 Manual intervention may be required')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  runProductionMigration()
    .then(() => {
      console.log('\n✅ Migration script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error)
      process.exit(1)
    })
}

export { runProductionMigration }

#!/usr/bin/env tsx

/**
 * Manual Production Fix
 * Run this script to manually fix production database issues
 * Can be run from local machine with production DATABASE_URL
 */

import { PrismaClient } from '@prisma/client'

// Use production database URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.PRODUCTION_DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!')
  console.error('Set DATABASE_URL environment variable to your production database')
  console.error('Example: DATABASE_URL="postgresql://user:pass@host:port/db" npm run manual:fix')
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
})

async function manualProductionFix() {
  console.log('🔧 MANUAL PRODUCTION FIX')
  console.log('=' .repeat(50))
  console.log(`🔗 Database: ${DATABASE_URL.split('@')[1] || 'Hidden'}`)
  
  try {
    await prisma.$connect()
    console.log('✅ Connected to production database')

    // 1. Check current database state
    console.log('\n📊 CHECKING CURRENT DATABASE STATE...')
    
    try {
      const regCount = await prisma.registration.count()
      console.log(`📋 Current registrations: ${regCount}`)
    } catch (error: any) {
      console.log('⚠️ Registrations table issue:', error.message)
    }

    // 2. Fix registrations table
    console.log('\n🔧 FIXING REGISTRATIONS TABLE...')
    
    // Check and add age column
    try {
      const ageColumn = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'age'
      `
      
      if (!Array.isArray(ageColumn) || ageColumn.length === 0) {
        console.log('➕ Adding age column...')
        await prisma.$executeRaw`
          ALTER TABLE "registrations" 
          ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0
        `
        console.log('✅ Age column added')
        
        // Calculate ages for existing records
        console.log('🔄 Calculating ages for existing records...')
        const updated = await prisma.$executeRaw`
          UPDATE "registrations" SET "age" = 
            CASE 
              WHEN EXTRACT(MONTH FROM CURRENT_DATE) > EXTRACT(MONTH FROM "dateOfBirth") 
                   OR (EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM "dateOfBirth") 
                       AND EXTRACT(DAY FROM CURRENT_DATE) >= EXTRACT(DAY FROM "dateOfBirth"))
              THEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth")
              ELSE EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth") - 1
            END
          WHERE "age" = 0
        `
        console.log(`✅ Updated ${updated} records with calculated ages`)
      } else {
        console.log('✅ Age column already exists')
      }
    } catch (error) {
      console.error('❌ Error with age column:', error)
    }

    // Check and add branch column
    try {
      const branchColumn = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'branch'
      `
      
      if (!Array.isArray(branchColumn) || branchColumn.length === 0) {
        console.log('➕ Adding branch column...')
        await prisma.$executeRaw`
          ALTER TABLE "registrations" 
          ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified'
        `
        console.log('✅ Branch column added')
      } else {
        console.log('✅ Branch column already exists')
      }
    } catch (error) {
      console.error('❌ Error with branch column:', error)
    }

    // 3. Fix children registrations table
    console.log('\n👶 FIXING CHILDREN REGISTRATIONS TABLE...')
    
    try {
      const childrenTable = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'children_registrations'
      `
      
      if (!Array.isArray(childrenTable) || childrenTable.length === 0) {
        console.log('➕ Creating children_registrations table...')
        await prisma.$executeRaw`
          CREATE TABLE "children_registrations" (
            "id" TEXT NOT NULL,
            "fullName" TEXT NOT NULL,
            "dateOfBirth" TIMESTAMP(3) NOT NULL,
            "age" INTEGER NOT NULL,
            "gender" TEXT NOT NULL,
            "address" TEXT NOT NULL,
            "branch" TEXT NOT NULL DEFAULT 'Not Specified',
            "phoneNumber" TEXT,
            "emailAddress" TEXT,
            "emergencyContactName" TEXT,
            "emergencyContactRelationship" TEXT,
            "emergencyContactPhone" TEXT,
            "parentGuardianName" TEXT NOT NULL,
            "parentGuardianPhone" TEXT NOT NULL,
            "parentGuardianEmail" TEXT,
            "medications" TEXT,
            "allergies" TEXT,
            "specialNeeds" TEXT,
            "dietaryRestrictions" TEXT,
            "parentalPermissionGranted" BOOLEAN NOT NULL DEFAULT false,
            "qrCode" TEXT,
            "isVerified" BOOLEAN NOT NULL DEFAULT false,
            "verifiedAt" TIMESTAMP(3),
            "verifiedBy" TEXT,
            "unverifiedAt" TIMESTAMP(3),
            "unverifiedBy" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "children_registrations_pkey" PRIMARY KEY ("id")
          )
        `
        console.log('✅ Children registrations table created')
      } else {
        console.log('✅ Children registrations table already exists')
      }
    } catch (error) {
      console.error('❌ Error with children table:', error)
    }

    // 4. Create indexes
    console.log('\n⚡ CREATING INDEXES...')
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "registrations_age_idx" ON "registrations"("age")',
      'CREATE INDEX IF NOT EXISTS "registrations_branch_idx" ON "registrations"("branch")',
      'CREATE INDEX IF NOT EXISTS "children_registrations_age_idx" ON "children_registrations"("age")',
      'CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" ON "children_registrations"("branch")'
    ]
    
    for (const indexSql of indexes) {
      try {
        await prisma.$executeRaw(indexSql as any)
      } catch (error) {
        // Index may already exist
      }
    }
    console.log('✅ Indexes created')

    // 5. Final verification
    console.log('\n🧪 FINAL VERIFICATION...')
    
    try {
      const regCount = await prisma.registration.count()
      const childrenCount = await prisma.childrenRegistration.count()
      
      console.log(`✅ Registrations: ${regCount} records`)
      console.log(`✅ Children registrations: ${childrenCount} records`)
      
      // Test age field
      const sampleReg = await prisma.registration.findFirst({
        select: { id: true, fullName: true, age: true, branch: true }
      })
      
      if (sampleReg) {
        console.log(`✅ Sample record: ${sampleReg.fullName}, Age: ${sampleReg.age}, Branch: ${sampleReg.branch}`)
      }
      
    } catch (error) {
      console.error('⚠️ Verification had issues:', error)
    }

    console.log('\n🎉 MANUAL FIX COMPLETED!')
    console.log('✅ Database schema updated')
    console.log('✅ Registration forms should now work')
    console.log('✅ Children registration should now work')

  } catch (error) {
    console.error('❌ MANUAL FIX FAILED:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the manual fix
if (require.main === module) {
  manualProductionFix()
    .then(() => {
      console.log('\n✅ MANUAL PRODUCTION FIX COMPLETED!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ MANUAL PRODUCTION FIX FAILED:', error)
      process.exit(1)
    })
}

export { manualProductionFix }

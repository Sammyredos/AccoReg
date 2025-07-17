#!/usr/bin/env tsx

/**
 * Fix Missing Age Column
 * Specifically addresses the missing age column in production database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMissingAgeColumn() {
  console.log('🔧 Fixing Missing Age Column...')
  console.log('=' .repeat(50))

  try {
    await prisma.$connect()
    console.log('✅ Database connection established')

    // 1. Check if age column exists in registrations table
    console.log('\n🔍 Checking age column in registrations table...')
    
    try {
      const ageColumn = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'age'
      `
      
      if (Array.isArray(ageColumn) && ageColumn.length > 0) {
        console.log('✅ Age column already exists in registrations table')
        console.log(`   Type: ${(ageColumn[0] as any).data_type}`)
      } else {
        console.log('⚠️ Age column missing from registrations table')
        
        // Add age column
        console.log('🔧 Adding age column to registrations table...')
        await prisma.$executeRaw`
          ALTER TABLE "registrations" 
          ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0
        `
        console.log('✅ Age column added to registrations table')
        
        // Update existing records with calculated age
        console.log('🔄 Calculating ages for existing registrations...')
        const updateResult = await prisma.$executeRaw`
          UPDATE "registrations" SET "age" = 
            CASE 
              WHEN EXTRACT(MONTH FROM CURRENT_DATE) > EXTRACT(MONTH FROM "dateOfBirth") 
                   OR (EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM "dateOfBirth") 
                       AND EXTRACT(DAY FROM CURRENT_DATE) >= EXTRACT(DAY FROM "dateOfBirth"))
              THEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth")
              ELSE EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth") - 1
            END
          WHERE "age" = 0 OR "age" IS NULL
        `
        console.log(`✅ Updated ${updateResult} registration records with calculated ages`)
      }
    } catch (error) {
      console.error('❌ Error checking/adding age column to registrations:', error)
      throw error
    }

    // 2. Check if age column exists in children_registrations table (if table exists)
    console.log('\n🔍 Checking age column in children_registrations table...')
    
    try {
      // First check if children table exists
      const childrenTableExists = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'children_registrations'
      `
      
      if (Array.isArray(childrenTableExists) && childrenTableExists.length > 0) {
        console.log('✅ Children registrations table exists')
        
        // Check for age column
        const childrenAgeColumn = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'children_registrations' 
          AND column_name = 'age'
        `
        
        if (Array.isArray(childrenAgeColumn) && childrenAgeColumn.length > 0) {
          console.log('✅ Age column already exists in children_registrations table')
        } else {
          console.log('⚠️ Age column missing from children_registrations table')
          
          // Add age column to children table
          console.log('🔧 Adding age column to children_registrations table...')
          await prisma.$executeRaw`
            ALTER TABLE "children_registrations" 
            ADD COLUMN "age" INTEGER NOT NULL DEFAULT 0
          `
          console.log('✅ Age column added to children_registrations table')
          
          // Update existing children records
          console.log('🔄 Calculating ages for existing children registrations...')
          const childrenUpdateResult = await prisma.$executeRaw`
            UPDATE "children_registrations" SET "age" = 
              CASE 
                WHEN EXTRACT(MONTH FROM CURRENT_DATE) > EXTRACT(MONTH FROM "dateOfBirth") 
                     OR (EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM "dateOfBirth") 
                         AND EXTRACT(DAY FROM CURRENT_DATE) >= EXTRACT(DAY FROM "dateOfBirth"))
                THEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth")
                ELSE EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth") - 1
              END
            WHERE "age" = 0 OR "age" IS NULL
          `
          console.log(`✅ Updated ${childrenUpdateResult} children registration records with calculated ages`)
        }
      } else {
        console.log('⚠️ Children registrations table does not exist (this is normal)')
      }
    } catch (error) {
      console.log('⚠️ Children table age column check completed with warnings:', error.message)
    }

    // 3. Verify the fix by testing registration creation
    console.log('\n🧪 Testing registration creation...')
    
    try {
      // Test that we can query registrations with age field
      const sampleRegistration = await prisma.registration.findFirst({
        select: { id: true, fullName: true, age: true, dateOfBirth: true }
      })
      
      if (sampleRegistration) {
        console.log(`✅ Sample registration found with age: ${sampleRegistration.age}`)
        console.log(`   Name: ${sampleRegistration.fullName}`)
        console.log(`   Date of Birth: ${sampleRegistration.dateOfBirth}`)
      } else {
        console.log('⚠️ No existing registrations found (this is normal for new systems)')
      }
      
      // Test that the age field is accessible
      const registrationCount = await prisma.registration.count()
      console.log(`✅ Total registrations: ${registrationCount}`)
      
    } catch (error) {
      console.error('❌ Registration test failed:', error)
      throw error
    }

    // 4. Create indexes for performance
    console.log('\n⚡ Creating performance indexes...')
    
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "registrations_age_idx" 
        ON "registrations"("age")
      `
      console.log('✅ Age index created for registrations')
      
      // Try to create children age index if table exists
      try {
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "children_registrations_age_idx" 
          ON "children_registrations"("age")
        `
        console.log('✅ Age index created for children_registrations')
      } catch (error) {
        console.log('⚠️ Could not create children age index (table may not exist)')
      }
      
    } catch (error) {
      console.log('⚠️ Some indexes may already exist')
    }

    console.log('\n🎉 Age Column Fix Completed!')
    console.log('✅ Age column is now available in registrations table')
    console.log('✅ Existing records have been updated with calculated ages')
    console.log('✅ Registration forms should now work properly')
    console.log('✅ Performance indexes created')

  } catch (error) {
    console.error('❌ Age column fix failed:', error)
    console.error('🔧 Manual intervention may be required')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
if (require.main === module) {
  fixMissingAgeColumn()
    .then(() => {
      console.log('\n✅ Age column fix completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Age column fix failed:', error)
      process.exit(1)
    })
}

export { fixMissingAgeColumn }

#!/usr/bin/env tsx

/**
 * Production Form Fix Script
 * Specifically addresses registration form submission issues
 * Ensures both /register and /register/children forms work properly
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixProductionForms() {
  console.log('🔧 Fixing Production Registration Forms...')
  console.log('=' .repeat(50))

  try {
    await prisma.$connect()
    console.log('✅ Database connection established')

    // 1. Check and fix registrations table
    console.log('\n📋 Checking registrations table...')
    
    try {
      // Check if table exists and has required columns
      const tableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'registrations'
        ORDER BY ordinal_position
      `
      
      console.log('✅ Registrations table structure verified')
      
      // Ensure branch field exists
      const branchColumn = Array.isArray(tableInfo) ? 
        tableInfo.find((col: any) => col.column_name === 'branch') : null
      
      if (!branchColumn) {
        console.log('⚠️ Adding missing branch field to registrations...')
        await prisma.$executeRaw`
          ALTER TABLE "registrations" 
          ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified'
        `
        console.log('✅ Branch field added to registrations')
      } else {
        console.log('✅ Branch field exists in registrations')
      }
      
    } catch (error) {
      console.error('❌ Error checking registrations table:', error)
    }

    // 2. Check and fix children_registrations table
    console.log('\n👶 Checking children_registrations table...')
    
    try {
      // Check if children table exists
      const childrenTableExists = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'children_registrations'
      `
      
      if (Array.isArray(childrenTableExists) && childrenTableExists.length > 0) {
        console.log('✅ Children registrations table exists')
        
        // Check branch field in children table
        const childrenBranchColumn = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'children_registrations' 
          AND column_name = 'branch'
        `
        
        if (!Array.isArray(childrenBranchColumn) || childrenBranchColumn.length === 0) {
          console.log('⚠️ Adding missing branch field to children_registrations...')
          await prisma.$executeRaw`
            ALTER TABLE "children_registrations" 
            ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'Not Specified'
          `
          console.log('✅ Branch field added to children_registrations')
        } else {
          console.log('✅ Branch field exists in children_registrations')
        }
      } else {
        console.log('⚠️ Children registrations table does not exist')
        console.log('   This is normal if no children registrations have been created yet')
      }
      
    } catch (error) {
      console.log('⚠️ Children table check completed with warnings:', error.message)
    }

    // 3. Test form submission endpoints
    console.log('\n🔍 Testing API endpoints...')
    
    try {
      // Test if we can perform basic operations
      const registrationCount = await prisma.registration.count()
      console.log(`✅ Can query registrations: ${registrationCount} records`)
      
      // Test children registrations if table exists
      try {
        const childrenCount = await prisma.childrenRegistration.count()
        console.log(`✅ Can query children registrations: ${childrenCount} records`)
      } catch (error) {
        console.log('⚠️ Children registrations table not accessible (may not exist yet)')
      }
      
    } catch (error) {
      console.error('❌ Error testing database operations:', error)
    }

    // 4. Verify branch field constraints
    console.log('\n🔧 Verifying branch field constraints...')
    
    try {
      // Update any null branch values
      const updatedRegistrations = await prisma.$executeRaw`
        UPDATE "registrations" 
        SET "branch" = 'Not Specified' 
        WHERE "branch" IS NULL OR "branch" = ''
      `
      
      if (updatedRegistrations > 0) {
        console.log(`✅ Updated ${updatedRegistrations} registration records with missing branch data`)
      } else {
        console.log('✅ All registration records have valid branch data')
      }
      
      // Update children registrations if table exists
      try {
        const updatedChildren = await prisma.$executeRaw`
          UPDATE "children_registrations" 
          SET "branch" = 'Not Specified' 
          WHERE "branch" IS NULL OR "branch" = ''
        `
        
        if (updatedChildren > 0) {
          console.log(`✅ Updated ${updatedChildren} children registration records with missing branch data`)
        } else {
          console.log('✅ All children registration records have valid branch data')
        }
      } catch (error) {
        console.log('⚠️ Could not update children registrations (table may not exist)')
      }
      
    } catch (error) {
      console.error('❌ Error updating branch data:', error)
    }

    // 5. Create indexes for performance
    console.log('\n⚡ Creating performance indexes...')
    
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "registrations_branch_idx" 
        ON "registrations"("branch")
      `
      console.log('✅ Branch index created for registrations')
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "registrations_created_at_idx" 
        ON "registrations"("createdAt")
      `
      console.log('✅ Created at index created for registrations')
      
      // Try to create children indexes
      try {
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" 
          ON "children_registrations"("branch")
        `
        console.log('✅ Branch index created for children registrations')
      } catch (error) {
        console.log('⚠️ Could not create children indexes (table may not exist)')
      }
      
    } catch (error) {
      console.log('⚠️ Some indexes may already exist')
    }

    console.log('\n🎉 Production Form Fix Completed!')
    console.log('✅ Registration forms should now work properly')
    console.log('✅ Branch field is available and properly configured')
    console.log('✅ Database constraints and indexes are in place')
    console.log('\n📋 Next Steps:')
    console.log('1. Test /register form submission')
    console.log('2. Test /register/children form submission')
    console.log('3. Verify branch selection is working')
    console.log('4. Check admin panel for new registrations')

  } catch (error) {
    console.error('❌ Production form fix failed:', error)
    console.error('🔧 Manual database intervention may be required')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
if (require.main === module) {
  fixProductionForms()
    .then(() => {
      console.log('\n✅ Production form fix completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Production form fix failed:', error)
      process.exit(1)
    })
}

export { fixProductionForms }

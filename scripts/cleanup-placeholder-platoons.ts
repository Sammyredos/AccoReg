#!/usr/bin/env tsx

/**
 * Cleanup Placeholder Platoons Script
 * Removes platoon records that were created with placeholder data
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

async function cleanupPlaceholderPlatoons() {
  console.log('🧹 Starting cleanup of placeholder platoon data...')

  try {
    // Generate Prisma client first
    console.log('🔧 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated!')

    // Step 1: Check for placeholder platoons
    console.log('🔍 Checking for placeholder platoon data...')
    const checkSqlFile = join(process.cwd(), 'check-placeholder-platoons.sql')
    writeFileSync(checkSqlFile, `
      SELECT id, name, "leaderEmail", "leaderName" 
      FROM platoon_allocations 
      WHERE "leaderEmail" = 'leader@example.com';
    `)
    
    try {
      execSync(`npx prisma db execute --file ${checkSqlFile}`, { stdio: 'inherit' })
      console.log('✅ Placeholder platoons found (see output above)')
    } catch (error) {
      console.log('ℹ️ No placeholder platoons found or query failed')
    }
    unlinkSync(checkSqlFile)

    // Step 2: Delete placeholder platoons and related data
    console.log('🗑️ Removing placeholder platoon data...')
    const cleanupSqlFile = join(process.cwd(), 'cleanup-placeholder-platoons.sql')
    writeFileSync(cleanupSqlFile, `
      -- First, delete related platoon participants
      DELETE FROM platoon_participants 
      WHERE "platoonId" IN (
        SELECT id FROM platoon_allocations 
        WHERE "leaderEmail" = 'leader@example.com'
      );

      -- Delete related email history
      DELETE FROM platoon_email_history 
      WHERE "platoonId" IN (
        SELECT id FROM platoon_allocations 
        WHERE "leaderEmail" = 'leader@example.com'
      );

      -- Finally, delete the placeholder platoons themselves
      DELETE FROM platoon_allocations 
      WHERE "leaderEmail" = 'leader@example.com';
    `)
    
    execSync(`npx prisma db execute --file ${cleanupSqlFile}`, { stdio: 'inherit' })
    unlinkSync(cleanupSqlFile)
    console.log('✅ Placeholder platoon data removed!')

    // Step 3: Verify cleanup
    console.log('🔍 Verifying cleanup...')
    const verifySqlFile = join(process.cwd(), 'verify-cleanup.sql')
    writeFileSync(verifySqlFile, `
      SELECT COUNT(*) as remaining_placeholders 
      FROM platoon_allocations 
      WHERE "leaderEmail" = 'leader@example.com';
    `)
    
    execSync(`npx prisma db execute --file ${verifySqlFile}`, { stdio: 'inherit' })
    unlinkSync(verifySqlFile)
    console.log('✅ Cleanup verification completed!')

    // Step 4: Show remaining platoons
    console.log('📋 Showing remaining platoons...')
    const listSqlFile = join(process.cwd(), 'list-remaining-platoons.sql')
    writeFileSync(listSqlFile, `
      SELECT id, name, "leaderEmail", "leaderName", "capacity", "createdAt"
      FROM platoon_allocations 
      ORDER BY "createdAt" DESC;
    `)
    
    try {
      execSync(`npx prisma db execute --file ${listSqlFile}`, { stdio: 'inherit' })
      console.log('✅ Remaining platoons listed above')
    } catch (error) {
      console.log('ℹ️ No platoons remaining or query failed')
    }
    unlinkSync(listSqlFile)

    console.log('🎉 Placeholder platoon cleanup completed successfully!')
    return true

  } catch (error) {
    console.error('❌ Placeholder platoon cleanup failed:', error)
    
    // Log environment info for debugging
    console.log('🔍 Environment debugging info:')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
    console.log('NODE_ENV:', process.env.NODE_ENV || 'not set')
    
    return false
  }
}

if (require.main === module) {
  cleanupPlaceholderPlatoons()
    .then((success) => {
      if (success) {
        console.log('✅ Placeholder platoon cleanup completed successfully!')
        process.exit(0)
      } else {
        console.error('❌ Placeholder platoon cleanup failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Placeholder platoon cleanup error:', error)
      process.exit(1)
    })
}

export { cleanupPlaceholderPlatoons }

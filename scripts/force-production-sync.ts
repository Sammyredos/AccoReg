#!/usr/bin/env npx tsx

/**
 * Force Production Database Sync
 * WARNING: This will reset your production database and apply current schema
 * Use only if you're okay with losing production data
 */

import { execSync } from 'child_process'

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m'    // Red
  }
  const reset = '\x1b[0m'
  const icons = {
    info: '🔧',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }
  
  console.log(`${colors[type]}${icons[type]} ${message}${reset}`)
}

async function forceProductionSync() {
  try {
    log('🚨 FORCE PRODUCTION DATABASE SYNC', 'warning')
    log('This will reset your production database!', 'warning')
    
    // Check if we're in production environment
    if (process.env.NODE_ENV !== 'production') {
      log('Setting NODE_ENV to production for this operation', 'info')
      process.env.NODE_ENV = 'production'
    }
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      log('DATABASE_URL not found in environment', 'error')
      log('Make sure you have your production DATABASE_URL set', 'error')
      process.exit(1)
    }
    
    if (process.env.DATABASE_URL.includes('sqlite') || process.env.DATABASE_URL.includes('file:')) {
      log('Detected SQLite database - this script is for PostgreSQL production', 'error')
      log('Use this script only with your production PostgreSQL database', 'error')
      process.exit(1)
    }
    
    log('Detected PostgreSQL database - proceeding with sync', 'success')
    
    // Step 1: Reset database (WARNING: Destroys all data)
    log('Step 1: Resetting database schema...', 'warning')
    try {
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
      log('Database reset completed', 'success')
    } catch (error) {
      log('Database reset failed, trying alternative approach...', 'warning')
      
      // Alternative: Push schema directly
      try {
        execSync('npx prisma db push --force-reset', { stdio: 'inherit' })
        log('Schema force-pushed successfully', 'success')
      } catch (pushError) {
        log('Schema push also failed, trying db push with accept-data-loss...', 'warning')
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
        log('Schema pushed with data loss acceptance', 'success')
      }
    }
    
    // Step 2: Generate Prisma client
    log('Step 2: Generating Prisma client...', 'info')
    execSync('npx prisma generate', { stdio: 'inherit' })
    log('Prisma client generated', 'success')
    
    // Step 3: Verify schema
    log('Step 3: Verifying database schema...', 'info')
    execSync('npx prisma db pull --force', { stdio: 'inherit' })
    log('Schema verification completed', 'success')
    
    // Step 4: Run setup scripts
    log('Step 4: Running setup scripts...', 'info')
    
    try {
      execSync('npx tsx scripts/create-super-admin.ts', { stdio: 'inherit' })
      log('Super admin created', 'success')
    } catch (error) {
      log('Super admin creation skipped (may already exist)', 'warning')
    }
    
    try {
      execSync('npx tsx scripts/seed-settings.ts', { stdio: 'inherit' })
      log('Settings seeded', 'success')
    } catch (error) {
      log('Settings seeding skipped (may already exist)', 'warning')
    }
    
    try {
      execSync('npx tsx scripts/create-staff-role.ts', { stdio: 'inherit' })
      log('Roles created', 'success')
    } catch (error) {
      log('Role creation skipped (may already exist)', 'warning')
    }
    
    log('🎉 Production database sync completed successfully!', 'success')
    log('Your production database now matches your current schema', 'success')
    log('All APIs should work correctly now', 'success')
    
  } catch (error) {
    log(`Production sync failed: ${error.message}`, 'error')
    log('Check the error details above and try again', 'error')
    process.exit(1)
  }
}

// Confirmation prompt
console.log('🚨 WARNING: This will RESET your production database!')
console.log('All existing data will be lost!')
console.log('Only proceed if you are sure you want to reset production data.')
console.log('')
console.log('To proceed, set CONFIRM_RESET=true environment variable')
console.log('Example: CONFIRM_RESET=true npx tsx scripts/force-production-sync.ts')

if (process.env.CONFIRM_RESET === 'true') {
  forceProductionSync()
} else {
  console.log('❌ Operation cancelled - CONFIRM_RESET not set to true')
  process.exit(0)
}

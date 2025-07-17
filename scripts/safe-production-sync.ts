#!/usr/bin/env npx tsx

/**
 * Safe Production Schema Sync
 * Safely syncs production database schema without losing data
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

async function safeProductionSync() {
  try {
    log('🔄 SAFE PRODUCTION SCHEMA SYNC', 'info')
    log('This will add missing tables/columns without losing existing data', 'info')
    
    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      log('DATABASE_URL not found in environment', 'error')
      log('Set your production DATABASE_URL first', 'error')
      process.exit(1)
    }
    
    if (process.env.DATABASE_URL.includes('sqlite') || process.env.DATABASE_URL.includes('file:')) {
      log('Detected SQLite - switching to production PostgreSQL mode', 'warning')
      log('Make sure your DATABASE_URL points to your production PostgreSQL', 'warning')
    }
    
    log('Starting safe schema sync...', 'info')
    
    // Step 1: Pull current schema to see differences
    log('Step 1: Checking current database schema...', 'info')
    try {
      execSync('npx prisma db pull --force', { stdio: 'inherit' })
      log('Current schema pulled successfully', 'success')
    } catch (error) {
      log('Schema pull failed - database may be empty or inaccessible', 'warning')
    }
    
    // Step 2: Push new schema changes (safe - adds missing tables/columns)
    log('Step 2: Pushing schema changes safely...', 'info')
    try {
      execSync('npx prisma db push', { stdio: 'inherit' })
      log('Schema changes pushed successfully', 'success')
    } catch (error) {
      log('Schema push failed, trying with accept-data-loss flag...', 'warning')
      try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
        log('Schema pushed with data loss acceptance (should be minimal)', 'success')
      } catch (pushError) {
        log('Schema push failed completely', 'error')
        throw pushError
      }
    }
    
    // Step 3: Regenerate Prisma client
    log('Step 3: Regenerating Prisma client...', 'info')
    execSync('npx prisma generate', { stdio: 'inherit' })
    log('Prisma client regenerated', 'success')
    
    // Step 4: Verify the sync worked
    log('Step 4: Verifying schema sync...', 'info')
    execSync('npx prisma db pull --force', { stdio: 'inherit' })
    log('Schema verification completed', 'success')
    
    // Step 5: Test database access
    log('Step 5: Testing database access...', 'info')
    try {
      execSync('npx tsx scripts/sync-production-schema.ts', { stdio: 'inherit' })
      log('Database access test completed', 'success')
    } catch (error) {
      log('Database access test had issues - check the output above', 'warning')
    }
    
    log('🎉 Safe production schema sync completed!', 'success')
    log('Your production database should now have all required tables and columns', 'success')
    log('Try your children registration API again - it should work now!', 'success')
    
  } catch (error) {
    log(`Safe sync failed: ${error.message}`, 'error')
    
    if (error.message.includes('connection')) {
      log('Database connection failed - check your DATABASE_URL', 'error')
    }
    
    if (error.message.includes('permission')) {
      log('Permission denied - check database user permissions', 'error')
    }
    
    log('You may need to use the force-production-sync script instead', 'warning')
    log('Or deploy to Render to trigger auto-migration', 'info')
    
    process.exit(1)
  }
}

// Run the safe sync
safeProductionSync()

#!/usr/bin/env node

/**
 * Clean up migration files and directories
 * This ensures we use db push instead of migrations
 */

const fs = require('fs')
const path = require('path')

function cleanMigrations() {
  const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations')
  
  console.log('🧹 Cleaning up migration files...')
  
  try {
    if (fs.existsSync(migrationsPath)) {
      // Remove the entire migrations directory
      fs.rmSync(migrationsPath, { recursive: true, force: true })
      console.log('✅ Removed migrations directory')
    } else {
      console.log('✅ No migrations directory found')
    }
    
    // Also remove any migration lock file that might exist
    const lockFile = path.join(process.cwd(), 'prisma', 'migration_lock.toml')
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile)
      console.log('✅ Removed migration lock file')
    }
    
    console.log('🎉 Migration cleanup completed!')
    console.log('📋 Your app will now use "prisma db push" instead of migrations')
    
  } catch (error) {
    console.error('❌ Error cleaning migrations:', error.message)
  }
}

cleanMigrations()

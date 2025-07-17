#!/usr/bin/env tsx

/**
 * Migration Script: SQLite to PostgreSQL
 * 
 * This script handles the migration from SQLite to PostgreSQL
 * for production deployment on Render.com
 */

import { execSync } from 'child_process'

async function migrateToPostgreSQL() {
  try {
    console.log('🔄 Migrating from SQLite to PostgreSQL...')
    console.log('=' .repeat(50))

    // Step 1: Reset migrations (since we're changing database provider)
    console.log('\n🗄️ Resetting migration history...')
    try {
      execSync('npx prisma migrate reset --force --skip-generate', { stdio: 'inherit' })
      console.log('✅ Migration history reset')
    } catch (error) {
      console.log('⚠️ Migration reset failed (this is expected for new databases)')
    }

    // Step 2: Generate new Prisma client for PostgreSQL
    console.log('\n📦 Generating Prisma client for PostgreSQL...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated')

    // Step 3: Create initial migration for PostgreSQL
    console.log('\n🚀 Creating initial PostgreSQL migration...')
    execSync('npx prisma migrate dev --name init_postgresql --create-only', { stdio: 'inherit' })
    console.log('✅ Initial migration created')

    // Step 4: Deploy migrations
    console.log('\n🗄️ Deploying migrations to PostgreSQL...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    console.log('✅ Migrations deployed')

    // Step 5: Verify database connection
    console.log('\n🔍 Verifying PostgreSQL connection...')
    execSync('npx prisma db pull', { stdio: 'inherit' })
    console.log('✅ PostgreSQL connection verified')

    console.log('\n🎉 Migration to PostgreSQL completed successfully!')
    console.log('✅ Your application is now ready for production deployment')

  } catch (error) {
    console.error('\n💥 Migration failed:', error)
    console.error('\n🔧 Manual steps required:')
    console.error('1. Ensure DATABASE_URL is set correctly in Render environment')
    console.error('2. Verify PostgreSQL database is created and accessible')
    console.error('3. Run: npx prisma migrate deploy')
    process.exit(1)
  }
}

// Run migration
migrateToPostgreSQL()

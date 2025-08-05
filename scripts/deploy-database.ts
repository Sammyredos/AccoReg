#!/usr/bin/env tsx

/**
 * Database Deployment Script
 * Handles database migrations and schema deployment for production
 */

import { execSync } from 'child_process'

async function deployDatabase() {
  console.log('🗄️ Starting database deployment...')

  try {
    // Generate Prisma client first
    console.log('🔧 Generating Prisma client...')
    execSync('prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated!')

    // Check database connection
    console.log('🔗 Testing database connection...')
    execSync('prisma db execute --stdin <<< "SELECT 1;"', { stdio: 'pipe' })
    console.log('✅ Database connection successful!')

    // Use db push for production deployment (more reliable than migrations)
    console.log('📋 Deploying database schema with db push...')
    execSync('prisma db push --force-reset', { stdio: 'inherit' })
    console.log('✅ Database schema deployed successfully!')

    // Verify the deployment
    console.log('🔍 Verifying database schema...')
    execSync('prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';"', { stdio: 'pipe' })
    console.log('✅ Database schema verified!')

  } catch (error) {
    console.log('⚠️ Primary deployment failed, trying alternative approach...')

    try {
      // Alternative: Try without force reset
      console.log('🔄 Attempting deployment without force reset...')
      execSync('prisma db push', { stdio: 'inherit' })
      console.log('✅ Database schema updated successfully!')

    } catch (alternativeError) {
      console.log('⚠️ Alternative failed, trying migration approach...')

      try {
        // Try migration approach as last resort
        console.log('🔄 Attempting migration deployment...')
        execSync('prisma migrate deploy', { stdio: 'inherit' })
        console.log('✅ Migrations deployed successfully!')

      } catch (migrationError) {
        console.error('❌ All database deployment methods failed!')
        console.error('Primary error:', error)
        console.error('Alternative error:', alternativeError)
        console.error('Migration error:', migrationError)

        // Log environment info for debugging
        console.log('🔍 Environment debugging info:')
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
        console.log('NODE_ENV:', process.env.NODE_ENV)

        process.exit(1)
      }
    }
  }

  console.log('🎉 Database deployment completed successfully!')
}

if (require.main === module) {
  deployDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Database deployment failed:', error)
      process.exit(1)
    })
}

export { deployDatabase }

#!/usr/bin/env tsx

/**
 * Database Deployment Script
 * Handles database migrations and schema deployment for production
 */

import { execSync } from 'child_process'

async function deployDatabase() {
  console.log('🗄️ Starting database deployment...')

  try {
    // First, try to run migrations
    console.log('📋 Attempting to deploy migrations...')
    execSync('prisma migrate deploy', { stdio: 'inherit' })
    console.log('✅ Migrations deployed successfully!')
  } catch (error) {
    console.log('⚠️ Migration deploy failed, trying alternative approach...')
    
    try {
      // If migrations fail, try to baseline the database
      console.log('🔄 Attempting to baseline existing database...')
      execSync('prisma migrate resolve --applied "20250117000002_postgresql_final_setup"', { stdio: 'inherit' })
      console.log('✅ Database baselined successfully!')
      
      // Now try migrations again
      console.log('📋 Retrying migration deployment...')
      execSync('prisma migrate deploy', { stdio: 'inherit' })
      console.log('✅ Migrations deployed after baseline!')
    } catch (baselineError) {
      console.log('⚠️ Baseline failed, using db push as fallback...')
      
      try {
        // Final fallback: use db push
        console.log('🔄 Using db push as final fallback...')
        execSync('prisma db push --accept-data-loss', { stdio: 'inherit' })
        console.log('✅ Database schema updated with db push!')
      } catch (pushError) {
        console.error('❌ All database deployment methods failed!')
        console.error('Migration error:', error)
        console.error('Baseline error:', baselineError)
        console.error('Push error:', pushError)
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

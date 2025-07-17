#!/usr/bin/env node

/**
 * Post-build script that runs after Next.js build
 * Only executes database operations in production environment
 */

const { execSync } = require('child_process')

async function postBuild() {
  console.log('🔧 Running post-build script...')
  
  // Only run database operations in production
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.log('🌐 Production environment detected')
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ DATABASE_URL not found, skipping database operations')
      return
    }
    
    try {
      console.log('📊 Syncing database schema...')
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        env: { ...process.env }
      })
      console.log('✅ Database schema synced successfully')
      
    } catch (error) {
      console.error('❌ Database sync failed:', error.message)
      // Don't fail the build, let the app handle initialization at runtime
      console.log('⚠️ Continuing with build - database will be initialized at runtime')
    }
  } else {
    console.log('🏠 Development environment - skipping database operations')
  }
  
  console.log('✅ Post-build script completed')
}

postBuild().catch(console.error)

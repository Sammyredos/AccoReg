#!/usr/bin/env tsx

/**
 * Production Setup Script
 * Sets up the application for production deployment on Render with PostgreSQL
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupProduction() {
  try {
    console.log('🚀 PRODUCTION SETUP STARTING...')
    console.log('=' .repeat(60))

    // 1. Verify Database Connection
    console.log('\n🗄️  VERIFYING DATABASE CONNECTION:')
    console.log('-' .repeat(40))
    
    try {
      await prisma.$connect()
      console.log('✅ PostgreSQL database connection successful')
      
      // Test a simple query
      const result = await prisma.$queryRaw`SELECT version()`
      console.log('✅ Database query test successful')
    } catch (error) {
      console.log('❌ Database connection failed:', error)
      throw error
    }

    // 2. Check if tables exist
    console.log('\n📋 CHECKING DATABASE SCHEMA:')
    console.log('-' .repeat(40))
    
    try {
      const adminCount = await prisma.admin.count()
      console.log(`✅ Admin table exists (${adminCount} records)`)
      
      const registrationCount = await prisma.registration.count()
      console.log(`✅ Registration table exists (${registrationCount} records)`)
      
      const roomCount = await prisma.room.count()
      console.log(`✅ Room table exists (${roomCount} records)`)
    } catch (error) {
      console.log('⚠️  Some tables may not exist yet - this is normal for first deployment')
    }

    // 3. Environment Variables Check
    console.log('\n🌍 ENVIRONMENT VARIABLES CHECK:')
    console.log('-' .repeat(40))
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'JWT_SECRET',
      'NODE_ENV'
    ]

    let allEnvVarsSet = true
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: SET`)
      } else {
        console.log(`❌ ${envVar}: MISSING`)
        allEnvVarsSet = false
      }
    })

    if (!allEnvVarsSet) {
      console.log('\n⚠️  Some required environment variables are missing!')
      console.log('Please set them in your Render dashboard before deployment.')
    }

    // 4. Production Configuration Check
    console.log('\n⚙️  PRODUCTION CONFIGURATION:')
    console.log('-' .repeat(40))
    
    const nodeEnv = process.env.NODE_ENV
    console.log(`Environment: ${nodeEnv}`)
    
    if (nodeEnv === 'production') {
      console.log('✅ Running in production mode')
    } else {
      console.log('⚠️  Not running in production mode')
    }

    // Check database URL format
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl?.startsWith('postgresql://') || dbUrl?.startsWith('postgres://')) {
      console.log('✅ PostgreSQL database URL format correct')
    } else {
      console.log('⚠️  Database URL should start with postgresql:// or postgres://')
    }

    // 5. Real-time Features Check
    console.log('\n📡 REAL-TIME FEATURES:')
    console.log('-' .repeat(40))
    
    const realtimeEnvVars = [
      'SSE_HEARTBEAT_INTERVAL',
      'SSE_RECONNECT_INTERVAL',
      'SSE_CONNECTION_TIMEOUT',
      'STAFF_REALTIME_ACCESS',
      'REAL_TIME_STATS'
    ]

    realtimeEnvVars.forEach(envVar => {
      const value = process.env[envVar]
      if (value) {
        console.log(`✅ ${envVar}: ${value}`)
      } else {
        console.log(`⚠️  ${envVar}: Not set (will use defaults)`)
      }
    })

    // 6. Security Settings Check
    console.log('\n🔒 SECURITY SETTINGS:')
    console.log('-' .repeat(40))
    
    const securityEnvVars = [
      'SECURITY_HEADERS_ENABLED',
      'CSP_ENABLED',
      'HSTS_ENABLED',
      'RATE_LIMIT_ENABLED'
    ]

    securityEnvVars.forEach(envVar => {
      const value = process.env[envVar]
      if (value === 'true') {
        console.log(`✅ ${envVar}: Enabled`)
      } else {
        console.log(`⚠️  ${envVar}: ${value || 'Not set'} (should be 'true' for production)`)
      }
    })

    console.log('\n🎉 PRODUCTION SETUP CHECK COMPLETED!')
    console.log('\n📋 NEXT STEPS:')
    console.log('1. Ensure all environment variables are set in Render dashboard')
    console.log('2. Add PostgreSQL database service in Render')
    console.log('3. Deploy the application')
    console.log('4. Run database migrations during first deployment')
    console.log('5. Verify super admin account creation')

  } catch (error) {
    console.error('❌ Production setup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  setupProduction()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { setupProduction }

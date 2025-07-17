#!/usr/bin/env tsx

/**
 * Production Environment Check
 * Verifies all environment variables and configurations are correct
 */

async function checkProductionEnvironment() {
  console.log('🔍 Production Environment Check...')
  console.log('=' .repeat(50))

  let allChecks = true

  // 1. Database Configuration
  console.log('\n🗄️ Database Configuration:')
  const databaseUrl = process.env.DATABASE_URL
  
  if (databaseUrl) {
    if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
      console.log('✅ DATABASE_URL: PostgreSQL configured correctly')
    } else if (databaseUrl.startsWith('file:')) {
      console.log('❌ DATABASE_URL: SQLite detected - should be PostgreSQL for production')
      allChecks = false
    } else {
      console.log('⚠️ DATABASE_URL: Unknown format')
      allChecks = false
    }
  } else {
    console.log('❌ DATABASE_URL: Not set')
    allChecks = false
  }

  // 2. Authentication
  console.log('\n🔐 Authentication Configuration:')
  const jwtSecret = process.env.JWT_SECRET
  const nextAuthSecret = process.env.NEXTAUTH_SECRET
  
  if (jwtSecret) {
    console.log('✅ JWT_SECRET: Set')
  } else {
    console.log('❌ JWT_SECRET: Missing')
    allChecks = false
  }
  
  if (nextAuthSecret) {
    console.log('✅ NEXTAUTH_SECRET: Set')
  } else {
    console.log('❌ NEXTAUTH_SECRET: Missing')
    allChecks = false
  }

  // 3. Email Configuration
  console.log('\n📧 Email Configuration:')
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  
  if (smtpHost) {
    console.log('✅ SMTP_HOST: Set')
  } else {
    console.log('❌ SMTP_HOST: Missing')
    allChecks = false
  }
  
  if (smtpUser) {
    console.log('✅ SMTP_USER: Set')
  } else {
    console.log('❌ SMTP_USER: Missing')
    allChecks = false
  }
  
  if (smtpPass) {
    console.log('✅ SMTP_PASS: Set')
  } else {
    console.log('❌ SMTP_PASS: Missing')
    allChecks = false
  }

  // 4. Environment Type
  console.log('\n🌍 Environment Type:')
  const nodeEnv = process.env.NODE_ENV
  const isRender = process.env.RENDER
  
  console.log(`NODE_ENV: ${nodeEnv || 'not set'}`)
  console.log(`RENDER: ${isRender || 'not set'}`)
  
  if (nodeEnv === 'production') {
    console.log('✅ Production environment detected')
  } else {
    console.log('⚠️ Not production environment')
  }

  // 5. New Feature Environment Variables
  console.log('\n🆕 New Features Configuration:')
  const newFeatures = [
    'STAFF_REALTIME_ACCESS',
    'BRANCH_SELECTION_REQUIRED',
    'ANALYTICS_ENABLED',
    'REAL_TIME_STATS'
  ]
  
  newFeatures.forEach(envVar => {
    const value = process.env[envVar]
    if (value) {
      console.log(`✅ ${envVar}: ${value}`)
    } else {
      console.log(`⚠️ ${envVar}: Not set (using defaults)`)
    }
  })

  // 6. Prisma Configuration Check
  console.log('\n🔧 Prisma Configuration:')
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const lockPath = path.join(process.cwd(), 'prisma', 'migrations', 'migration_lock.toml')
    
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8')
      if (schemaContent.includes('provider = "postgresql"')) {
        console.log('✅ Schema: PostgreSQL configured')
      } else {
        console.log('❌ Schema: Not configured for PostgreSQL')
        allChecks = false
      }
    }
    
    if (fs.existsSync(lockPath)) {
      const lockContent = fs.readFileSync(lockPath, 'utf8')
      if (lockContent.includes('provider = "postgresql"')) {
        console.log('✅ Migration lock: PostgreSQL configured')
      } else {
        console.log('❌ Migration lock: Not configured for PostgreSQL')
        allChecks = false
      }
    }
  } catch (error) {
    console.log('⚠️ Could not check Prisma configuration files')
  }

  // Final Summary
  console.log('\n' + '=' .repeat(50))
  if (allChecks) {
    console.log('🎉 ALL ENVIRONMENT CHECKS PASSED!')
    console.log('✅ Production deployment is properly configured')
  } else {
    console.log('⚠️ SOME ENVIRONMENT CHECKS FAILED')
    console.log('❌ Please fix the issues above before deploying')
  }

  console.log('\n📋 Deployment Readiness:')
  console.log('[ ] Environment variables configured')
  console.log('[ ] Database URL points to PostgreSQL')
  console.log('[ ] Prisma schema and migrations use PostgreSQL')
  console.log('[ ] Email configuration complete')
  console.log('[ ] Authentication secrets set')

  return allChecks
}

// Run the check
if (require.main === module) {
  checkProductionEnvironment()
    .then((success) => {
      if (success) {
        console.log('\n✅ Environment check completed successfully!')
        process.exit(0)
      } else {
        console.log('\n❌ Environment check failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('\n❌ Environment check error:', error)
      process.exit(1)
    })
}

export { checkProductionEnvironment }

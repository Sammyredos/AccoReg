#!/usr/bin/env tsx

/**
 * Production Setup Test Script
 * 
 * This script tests the production configuration without requiring
 * a database connection.
 */

console.log('🧪 Testing production setup...')

// Test environment variables
console.log('\n📋 Environment Configuration:')
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`)
console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Not set'}`)
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`)
console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`)

// Test required modules
console.log('\n📦 Module Dependencies:')
try {
  require('@prisma/client')
  console.log('✅ Prisma Client')
} catch (error) {
  console.log('❌ Prisma Client')
}

try {
  require('bcryptjs')
  console.log('✅ bcryptjs')
} catch (error) {
  console.log('❌ bcryptjs')
}

try {
  require('jsonwebtoken')
  console.log('✅ jsonwebtoken')
} catch (error) {
  console.log('❌ jsonwebtoken')
}

try {
  require('next')
  console.log('✅ Next.js')
} catch (error) {
  console.log('❌ Next.js')
}

// Test build output
console.log('\n🏗️  Build Output:')
const fs = require('fs')
const path = require('path')

const buildDir = path.join(process.cwd(), '.next')
if (fs.existsSync(buildDir)) {
  console.log('✅ .next directory exists')
  
  const staticDir = path.join(buildDir, 'static')
  if (fs.existsSync(staticDir)) {
    console.log('✅ Static assets built')
  } else {
    console.log('❌ Static assets missing')
  }
  
  const serverDir = path.join(buildDir, 'server')
  if (fs.existsSync(serverDir)) {
    console.log('✅ Server files built')
  } else {
    console.log('❌ Server files missing')
  }
} else {
  console.log('❌ .next directory missing - run npm run build first')
}

// Test configuration files
console.log('\n⚙️  Configuration Files:')
const configFiles = [
  'package.json',
  'next.config.js',
  'prisma/schema.prisma',
  '.env.local',
  '.env.production'
]

configFiles.forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file}`)
  }
})

// Test production readiness
console.log('\n🚀 Production Readiness:')

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'NEXTAUTH_URL'
]

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length === 0) {
  console.log('✅ All required environment variables are set')
} else {
  console.log('❌ Missing required environment variables:')
  missingEnvVars.forEach(envVar => console.log(`   - ${envVar}`))
}

// Security checks
console.log('\n🔒 Security Configuration:')
if (process.env.NODE_ENV === 'production') {
  console.log('✅ NODE_ENV set to production')
} else {
  console.log('⚠️  NODE_ENV not set to production')
}

if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32) {
  console.log('✅ NEXTAUTH_SECRET is sufficiently long')
} else {
  console.log('❌ NEXTAUTH_SECRET should be at least 32 characters')
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
  console.log('✅ JWT_SECRET is sufficiently long')
} else {
  console.log('❌ JWT_SECRET should be at least 32 characters')
}

// Performance checks
console.log('\n⚡ Performance Configuration:')
if (process.env.SKIP_TYPE_CHECK === 'true') {
  console.log('✅ Type checking skipped for faster builds')
} else {
  console.log('⚠️  Type checking enabled (slower builds)')
}

// Summary
console.log('\n📊 Summary:')
const allGood = missingEnvVars.length === 0 && 
               fs.existsSync(buildDir) &&
               process.env.NEXTAUTH_SECRET?.length >= 32 &&
               process.env.JWT_SECRET?.length >= 32

if (allGood) {
  console.log('🎉 Production setup looks good!')
  console.log('\n📋 Next steps:')
  console.log('1. Set up your production database')
  console.log('2. Update environment variables with production values')
  console.log('3. Configure email SMTP settings')
  console.log('4. Deploy to your hosting platform')
  console.log('5. Run database migrations')
  console.log('6. Create admin users')
} else {
  console.log('⚠️  Production setup needs attention')
  console.log('\n🔧 Fix the issues above before deploying')
}

console.log('\n✅ Production setup test completed')

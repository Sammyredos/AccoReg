#!/usr/bin/env tsx

/**
 * Production Deployment Checklist
 * Verifies all requirements for production deployment
 */

import { readFileSync } from 'fs'
import { join } from 'path'

function checkProductionReadiness() {
  console.log('🚀 PRODUCTION DEPLOYMENT CHECKLIST')
  console.log('=' .repeat(60))

  let allChecksPass = true

  // 1. Check Prisma Schema
  console.log('\n📋 PRISMA SCHEMA CHECK:')
  console.log('-' .repeat(40))
  
  try {
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')
    const schema = readFileSync(schemaPath, 'utf-8')
    
    if (schema.includes('provider = "postgresql"')) {
      console.log('✅ Database provider set to PostgreSQL')
    } else if (schema.includes('provider = "sqlite"')) {
      console.log('⚠️  Database provider is SQLite (should be PostgreSQL for production)')
      console.log('   Run: npm run db:switch postgresql')
      allChecksPass = false
    } else {
      console.log('❌ Database provider not found or invalid')
      allChecksPass = false
    }
  } catch (error) {
    console.log('❌ Could not read Prisma schema')
    allChecksPass = false
  }

  // 2. Check Environment Files
  console.log('\n🌍 ENVIRONMENT FILES CHECK:')
  console.log('-' .repeat(40))
  
  const envFiles = [
    '.env.production',
    '.env.production.example',
    'render.yaml'
  ]

  envFiles.forEach(file => {
    try {
      const filePath = join(process.cwd(), file)
      readFileSync(filePath, 'utf-8')
      console.log(`✅ ${file} exists`)
    } catch (error) {
      console.log(`❌ ${file} missing`)
      allChecksPass = false
    }
  })

  // 3. Check Package.json Scripts
  console.log('\n📦 PACKAGE.JSON SCRIPTS CHECK:')
  console.log('-' .repeat(40))
  
  try {
    const packagePath = join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
    
    const requiredScripts = [
      'build',
      'start',
      'db:migrate:deploy',
      'setup:production'
    ]

    requiredScripts.forEach(script => {
      if (packageJson.scripts[script]) {
        console.log(`✅ Script "${script}" exists`)
      } else {
        console.log(`❌ Script "${script}" missing`)
        allChecksPass = false
      }
    })
  } catch (error) {
    console.log('❌ Could not read package.json')
    allChecksPass = false
  }

  // 4. Check Production Scripts
  console.log('\n🔧 PRODUCTION SCRIPTS CHECK:')
  console.log('-' .repeat(40))
  
  const requiredScripts = [
    'scripts/create-super-admin.ts',
    'scripts/seed-settings.ts',
    'scripts/update-branding.ts',
    'scripts/create-staff-role.ts',
    'scripts/production-setup.ts'
  ]

  requiredScripts.forEach(script => {
    try {
      const scriptPath = join(process.cwd(), script)
      readFileSync(scriptPath, 'utf-8')
      console.log(`✅ ${script} exists`)
    } catch (error) {
      console.log(`❌ ${script} missing`)
      allChecksPass = false
    }
  })

  // 5. Check Render Configuration
  console.log('\n🌐 RENDER CONFIGURATION CHECK:')
  console.log('-' .repeat(40))
  
  try {
    const renderPath = join(process.cwd(), 'render.yaml')
    const renderConfig = readFileSync(renderPath, 'utf-8')
    
    if (renderConfig.includes('npx prisma generate')) {
      console.log('✅ Prisma generate in build command')
    } else {
      console.log('❌ Prisma generate missing from build command')
      allChecksPass = false
    }

    if (renderConfig.includes('npx prisma migrate deploy')) {
      console.log('✅ Database migration in build command')
    } else {
      console.log('❌ Database migration missing from build command')
      allChecksPass = false
    }

    if (renderConfig.includes('npx tsx scripts/create-super-admin.ts')) {
      console.log('✅ Super admin creation in build command')
    } else {
      console.log('❌ Super admin creation missing from build command')
      allChecksPass = false
    }
  } catch (error) {
    console.log('❌ Could not read render.yaml')
    allChecksPass = false
  }

  // 6. Security Check
  console.log('\n🔒 SECURITY CONFIGURATION CHECK:')
  console.log('-' .repeat(40))
  
  try {
    const envProdPath = join(process.cwd(), '.env.production')
    const envProd = readFileSync(envProdPath, 'utf-8')
    
    const securitySettings = [
      'SECURITY_HEADERS_ENABLED=true',
      'CSP_ENABLED=true',
      'HSTS_ENABLED=true',
      'NODE_ENV=production'
    ]

    securitySettings.forEach(setting => {
      if (envProd.includes(setting)) {
        console.log(`✅ ${setting}`)
      } else {
        console.log(`⚠️  ${setting} not found`)
      }
    })
  } catch (error) {
    console.log('⚠️  Could not verify security settings')
  }

  // 7. Final Summary
  console.log('\n📊 CHECKLIST SUMMARY:')
  console.log('-' .repeat(40))
  
  if (allChecksPass) {
    console.log('🎉 ALL CHECKS PASSED!')
    console.log('✅ Your application is ready for production deployment')
    console.log('\n🚀 NEXT STEPS:')
    console.log('1. Switch to PostgreSQL: npm run db:switch postgresql')
    console.log('2. Commit and push your changes')
    console.log('3. Deploy to Render')
    console.log('4. Add PostgreSQL database service')
    console.log('5. Configure environment variables')
    console.log('6. Monitor deployment logs')
  } else {
    console.log('❌ SOME CHECKS FAILED!')
    console.log('Please fix the issues above before deploying to production')
  }

  console.log('\n📖 For detailed deployment instructions, see:')
  console.log('   RENDER_PRODUCTION_DEPLOYMENT.md')

  return allChecksPass
}

if (require.main === module) {
  const success = checkProductionReadiness()
  process.exit(success ? 0 : 1)
}

export { checkProductionReadiness }

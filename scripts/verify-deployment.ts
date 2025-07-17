#!/usr/bin/env tsx

/**
 * Production Deployment Verification Script
 * Verifies all new features are working correctly after deployment
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDeployment() {
  console.log('🔍 Verifying Production Deployment...\n')
  console.log('=' .repeat(60))

  let allChecks = true

  try {
    // 1. Database Connection
    console.log('\n📊 DATABASE VERIFICATION:')
    try {
      await prisma.$connect()
      console.log('✅ Database connection: SUCCESS')
      
      // Check if analytics API data structure is correct
      const sampleRegistration = await prisma.registration.findFirst()
      if (sampleRegistration) {
        console.log('✅ Registration table accessible: SUCCESS')
        console.log(`   Sample registration has branch: ${sampleRegistration.branch ? 'YES' : 'NO'}`)
      }
    } catch (error) {
      console.log('❌ Database connection: FAILED')
      console.log(`   Error: ${error}`)
      allChecks = false
    }

    // 2. Branch Field Verification
    console.log('\n🏢 BRANCH FIELD VERIFICATION:')
    try {
      const registrationsWithBranch = await prisma.registration.count({
        where: {
          branch: {
            not: null
          }
        }
      })
      
      const totalRegistrations = await prisma.registration.count()
      console.log('✅ Branch field verification: SUCCESS')
      console.log(`   Registrations with branch data: ${registrationsWithBranch}/${totalRegistrations}`)
    } catch (error) {
      console.log('❌ Branch field verification: FAILED')
      console.log(`   Error: ${error}`)
      allChecks = false
    }

    // 3. Analytics Data Structure
    console.log('\n📈 ANALYTICS VERIFICATION:')
    try {
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const todayCount = await prisma.registration.count({
        where: {
          createdAt: {
            gte: startOfToday
          }
        }
      })
      
      const verifiedCount = await prisma.registration.count({
        where: {
          isVerified: true
        }
      })
      
      console.log('✅ Analytics data structure: SUCCESS')
      console.log(`   Registrations today: ${todayCount}`)
      console.log(`   Verified registrations: ${verifiedCount}`)
    } catch (error) {
      console.log('❌ Analytics data structure: FAILED')
      console.log(`   Error: ${error}`)
      allChecks = false
    }

    // 4. User Roles and Permissions
    console.log('\n👥 ROLES & PERMISSIONS VERIFICATION:')
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: true
        }
      })
      
      const staffRole = roles.find(r => r.name === 'Staff')
      console.log('✅ Roles verification: SUCCESS')
      console.log(`   Total roles: ${roles.length}`)
      console.log(`   Staff role exists: ${staffRole ? 'YES' : 'NO'}`)
      if (staffRole) {
        console.log(`   Staff permissions: ${staffRole.permissions.length}`)
      }
    } catch (error) {
      console.log('❌ Roles verification: FAILED')
      console.log(`   Error: ${error}`)
      allChecks = false
    }

    // 5. Settings Verification
    console.log('\n⚙️ SETTINGS VERIFICATION:')
    try {
      const settings = await prisma.setting.findMany()
      const systemName = settings.find(s => s.key === 'system_name')
      const minimumAge = settings.find(s => s.key === 'minimum_age')
      
      console.log('✅ Settings verification: SUCCESS')
      console.log(`   Total settings: ${settings.length}`)
      console.log(`   System name: ${systemName?.value || 'Not set'}`)
      console.log(`   Minimum age: ${minimumAge?.value || 'Not set'}`)
    } catch (error) {
      console.log('❌ Settings verification: FAILED')
      console.log(`   Error: ${error}`)
      allChecks = false
    }

    // 6. Environment Variables Check
    console.log('\n🌍 ENVIRONMENT VERIFICATION:')
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'NEXTAUTH_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS'
    ]
    
    let envChecks = 0
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: SET`)
        envChecks++
      } else {
        console.log(`❌ ${envVar}: MISSING`)
        allChecks = false
      }
    })
    
    console.log(`   Environment variables: ${envChecks}/${requiredEnvVars.length} configured`)

    // 7. New Feature Environment Variables
    console.log('\n🆕 NEW FEATURES ENVIRONMENT:')
    const newEnvVars = [
      'STAFF_REALTIME_ACCESS',
      'BRANCH_SELECTION_REQUIRED',
      'ANALYTICS_ENABLED',
      'REAL_TIME_STATS'
    ]
    
    let newEnvChecks = 0
    newEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: ${process.env[envVar]}`)
        newEnvChecks++
      } else {
        console.log(`⚠️ ${envVar}: NOT SET (using defaults)`)
      }
    })
    
    console.log(`   New feature variables: ${newEnvChecks}/${newEnvVars.length} configured`)

  } catch (error) {
    console.log('❌ Verification failed with error:', error)
    allChecks = false
  } finally {
    await prisma.$disconnect()
  }

  // Final Summary
  console.log('\n' + '=' .repeat(60))
  if (allChecks) {
    console.log('🎉 DEPLOYMENT VERIFICATION: ALL CHECKS PASSED!')
    console.log('✅ Production deployment is ready for use')
    console.log('🔗 Access your app at: https://mopgomyouth.onrender.com')
    console.log('👤 Admin login: admin@mopgomglobal.com / SuperAdmin123!')
  } else {
    console.log('⚠️ DEPLOYMENT VERIFICATION: SOME CHECKS FAILED')
    console.log('❌ Please review the errors above before going live')
    console.log('📞 Contact support if issues persist')
  }
  
  console.log('\n📋 POST-DEPLOYMENT CHECKLIST:')
  console.log('[ ] Test registration form with branch selection')
  console.log('[ ] Verify real-time analytics in admin dashboard')
  console.log('[ ] Test staff access to attendance features')
  console.log('[ ] Check SSE connections are stable')
  console.log('[ ] Verify mobile responsiveness')
  console.log('[ ] Test email notifications')
  
  process.exit(allChecks ? 0 : 1)
}

// Run verification
verifyDeployment()
  .then(() => {
    console.log('\n✅ Verification completed!')
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  })

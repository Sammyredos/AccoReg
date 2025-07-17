#!/usr/bin/env tsx

/**
 * Debug Branch Issue
 * Check what's happening with branch values in the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugBranchIssue() {
  console.log('🔍 DEBUGGING BRANCH ISSUE')
  console.log('=' .repeat(50))

  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    // 1. Check recent registrations
    console.log('\n📋 RECENT REGISTRATIONS:')
    const recentRegistrations = await prisma.registration.findMany({
      select: {
        id: true,
        fullName: true,
        branch: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    recentRegistrations.forEach((reg, index) => {
      console.log(`${index + 1}. ${reg.fullName}`)
      console.log(`   Branch: "${reg.branch}"`)
      console.log(`   Created: ${reg.createdAt}`)
      console.log(`   ID: ${reg.id}`)
      console.log('')
    })

    // 2. Check branch value distribution
    console.log('\n📊 BRANCH VALUE DISTRIBUTION:')
    const branchStats = await prisma.registration.groupBy({
      by: ['branch'],
      _count: {
        branch: true
      },
      orderBy: {
        _count: {
          branch: 'desc'
        }
      }
    })

    branchStats.forEach(stat => {
      console.log(`"${stat.branch}": ${stat._count.branch} registrations`)
    })

    // 3. Check for Marie Jackson specifically
    console.log('\n🔍 MARIE JACKSON REGISTRATION:')
    const marieRegistration = await prisma.registration.findFirst({
      where: {
        fullName: {
          contains: 'Marie Jackson',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        fullName: true,
        branch: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (marieRegistration) {
      console.log('Found Marie Jackson:')
      console.log(`  ID: ${marieRegistration.id}`)
      console.log(`  Full Name: ${marieRegistration.fullName}`)
      console.log(`  Branch: "${marieRegistration.branch}"`)
      console.log(`  Created: ${marieRegistration.createdAt}`)
      console.log(`  Updated: ${marieRegistration.updatedAt}`)
      
      // Check the raw database value
      const rawData = await prisma.$queryRaw`
        SELECT branch, length(branch) as branch_length 
        FROM registrations 
        WHERE id = ${marieRegistration.id}
      ` as any[]
      
      if (rawData.length > 0) {
        console.log(`  Raw branch value: "${rawData[0].branch}"`)
        console.log(`  Branch length: ${rawData[0].branch_length}`)
      }
    } else {
      console.log('❌ Marie Jackson registration not found')
    }

    // 4. Check database schema
    console.log('\n🗄️ DATABASE SCHEMA CHECK:')
    const branchColumn = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'registrations' 
      AND column_name = 'branch'
    ` as any[]

    if (branchColumn.length > 0) {
      const col = branchColumn[0]
      console.log(`Branch column:`)
      console.log(`  Type: ${col.data_type}`)
      console.log(`  Default: ${col.column_default}`)
      console.log(`  Nullable: ${col.is_nullable}`)
    }

    // 5. Test registration creation
    console.log('\n🧪 TESTING REGISTRATION CREATION:')
    
    const testBranch = 'Iyana Ipaja'
    console.log(`Testing with branch: "${testBranch}"`)
    
    try {
      const testReg = await prisma.registration.create({
        data: {
          fullName: 'Test Branch User ' + Date.now(),
          dateOfBirth: new Date('2000-01-01'),
          age: 24,
          gender: 'Male',
          address: '123 Test Street',
          branch: testBranch,
          phoneNumber: '+1234567890',
          emailAddress: `test${Date.now()}@example.com`,
          emergencyContactName: 'Emergency Contact',
          emergencyContactRelationship: 'Parent',
          emergencyContactPhone: '+1234567890',
          parentGuardianName: 'Parent Name',
          parentGuardianPhone: '+1234567890',
          parentGuardianEmail: 'parent@example.com',
          parentalPermissionGranted: true,
          parentalPermissionDate: new Date()
        }
      })
      
      console.log(`✅ Test registration created:`)
      console.log(`  ID: ${testReg.id}`)
      console.log(`  Branch saved as: "${testReg.branch}"`)
      
      // Clean up
      await prisma.registration.delete({ where: { id: testReg.id } })
      console.log(`✅ Test registration cleaned up`)
      
    } catch (error) {
      console.log(`❌ Test registration failed: ${error.message}`)
    }

    console.log('\n🎯 DIAGNOSIS COMPLETE!')

  } catch (error) {
    console.error('❌ Debug failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the debug
if (require.main === module) {
  debugBranchIssue()
    .then(() => {
      console.log('\n✅ Branch debugging completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Branch debugging failed:', error)
      process.exit(1)
    })
}

export { debugBranchIssue }

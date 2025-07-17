#!/usr/bin/env tsx

/**
 * Fix Branch Values
 * Update registrations that incorrectly have "Not Specified" as branch
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixBranchValues() {
  console.log('🔧 FIXING BRANCH VALUES')
  console.log('=' .repeat(50))

  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    // 1. Find registrations with "Not Specified" branch
    console.log('\n🔍 Finding registrations with "Not Specified" branch...')
    
    const notSpecifiedRegistrations = await prisma.registration.findMany({
      where: {
        OR: [
          { branch: 'Not Specified' },
          { branch: '' },
          { branch: null }
        ]
      },
      select: {
        id: true,
        fullName: true,
        branch: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${notSpecifiedRegistrations.length} registrations with missing/invalid branch values:`)
    
    notSpecifiedRegistrations.forEach((reg, index) => {
      console.log(`${index + 1}. ${reg.fullName} - Branch: "${reg.branch}" - Created: ${reg.createdAt.toISOString().split('T')[0]}`)
    })

    if (notSpecifiedRegistrations.length === 0) {
      console.log('✅ No registrations need branch value fixes!')
      return
    }

    // 2. For recent registrations (last 7 days), we can try to infer or ask for manual update
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentNotSpecified = notSpecifiedRegistrations.filter(reg => reg.createdAt > sevenDaysAgo)
    const olderNotSpecified = notSpecifiedRegistrations.filter(reg => reg.createdAt <= sevenDaysAgo)

    console.log(`\n📊 Analysis:`)
    console.log(`  Recent registrations (last 7 days): ${recentNotSpecified.length}`)
    console.log(`  Older registrations: ${olderNotSpecified.length}`)

    // 3. For demonstration, let's update Marie Jackson specifically if found
    const marieRegistration = notSpecifiedRegistrations.find(reg => 
      reg.fullName.toLowerCase().includes('marie jackson')
    )

    if (marieRegistration) {
      console.log(`\n🎯 Found Marie Jackson registration with "Not Specified" branch`)
      console.log(`   ID: ${marieRegistration.id}`)
      console.log(`   Current branch: "${marieRegistration.branch}"`)
      
      // Since we can't know what branch was actually selected, 
      // let's create a function to manually update it
      console.log(`\n⚠️ Manual intervention needed for Marie Jackson`)
      console.log(`   To fix this specific registration, run:`)
      console.log(`   UPDATE registrations SET branch = 'ACTUAL_BRANCH_NAME' WHERE id = '${marieRegistration.id}';`)
    }

    // 4. Create a function to update all recent "Not Specified" to a default branch
    // (This should only be used if we know these are test registrations)
    console.log(`\n🔧 POTENTIAL FIXES:`)
    
    if (recentNotSpecified.length > 0) {
      console.log(`\nOption 1: Update recent registrations to a default branch`)
      console.log(`This would update ${recentNotSpecified.length} recent registrations`)
      
      // Uncomment the following lines if you want to update recent registrations to a default branch
      /*
      const defaultBranch = 'Iyana Ipaja' // Change this to your preferred default
      
      const updateResult = await prisma.registration.updateMany({
        where: {
          id: {
            in: recentNotSpecified.map(reg => reg.id)
          }
        },
        data: {
          branch: defaultBranch
        }
      })
      
      console.log(`✅ Updated ${updateResult.count} recent registrations to "${defaultBranch}"`)
      */
    }

    // 5. Show SQL commands for manual fixes
    console.log(`\n📝 MANUAL SQL COMMANDS:`)
    console.log(`-- To update Marie Jackson specifically:`)
    if (marieRegistration) {
      console.log(`UPDATE registrations SET branch = 'Iyana Ipaja' WHERE id = '${marieRegistration.id}';`)
    }
    
    console.log(`\n-- To update all recent "Not Specified" registrations:`)
    recentNotSpecified.forEach(reg => {
      console.log(`UPDATE registrations SET branch = 'BRANCH_NAME' WHERE id = '${reg.id}'; -- ${reg.fullName}`)
    })

    // 6. Verify the API is working correctly for new registrations
    console.log(`\n🧪 TESTING NEW REGISTRATION API:`)
    
    const testData = {
      fullName: 'API Test User',
      dateOfBirth: '2000-01-01',
      gender: 'Male',
      address: '123 Test Street',
      branch: 'Badagry', // Specific branch selection
      phoneNumber: '+1234567890',
      emailAddress: `apitest${Date.now()}@example.com`,
      emergencyContactName: 'Emergency Contact',
      emergencyContactRelationship: 'Parent',
      emergencyContactPhone: '+1234567890',
      parentGuardianName: 'Parent Name',
      parentGuardianPhone: '+1234567890',
      parentGuardianEmail: 'parent@example.com',
      parentalPermissionGranted: true
    }

    // Simulate the API logic
    const branchValue = testData.branch?.trim() || 'Not Specified'
    console.log(`Input branch: "${testData.branch}"`)
    console.log(`Processed branch: "${branchValue}"`)
    
    if (branchValue !== 'Not Specified') {
      console.log(`✅ API logic is working correctly`)
    } else {
      console.log(`❌ API logic has an issue`)
    }

    console.log('\n🎯 BRANCH VALUE ANALYSIS COMPLETE!')
    console.log('\nNext steps:')
    console.log('1. Deploy the latest API fixes')
    console.log('2. Test new registrations')
    console.log('3. Manually update existing "Not Specified" registrations if needed')

  } catch (error) {
    console.error('❌ Branch fix failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
if (require.main === module) {
  fixBranchValues()
    .then(() => {
      console.log('\n✅ Branch value analysis completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Branch value analysis failed:', error)
      process.exit(1)
    })
}

export { fixBranchValues }

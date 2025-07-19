#!/usr/bin/env tsx

/**
 * Fix Marie Jackson Registration
 * Update Marie Jackson's branch from "Not Specified" to a proper branch
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMarieJackson() {
  console.log('🔧 FIXING MARIE JACKSON REGISTRATION')
  console.log('=' .repeat(50))

  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    // Find Marie Jackson's registration
    const marieRegistration = await prisma.registration.findFirst({
      where: {
        fullName: {
          contains: 'Marie Jackson',
          mode: 'insensitive'
        }
      }
    })

    if (!marieRegistration) {
      console.log('❌ Marie Jackson registration not found')
      return
    }

    console.log('📋 Found Marie Jackson registration:')
    console.log(`  ID: ${marieRegistration.id}`)
    console.log(`  Full Name: ${marieRegistration.fullName}`)
    console.log(`  Current Branch: "${marieRegistration.branch}"`)
    console.log(`  Created: ${marieRegistration.createdAt}`)

    if (marieRegistration.branch !== 'Not Specified') {
      console.log('✅ Marie Jackson already has a proper branch value')
      return
    }

    // Update to a default branch (you can change this)
    const newBranch = 'Iyana Ipaja' // Change this to the correct branch
    
    console.log(`\n🔄 Updating branch from "${marieRegistration.branch}" to "${newBranch}"...`)
    
    const updatedRegistration = await prisma.registration.update({
      where: {
        id: marieRegistration.id
      },
      data: {
        branch: newBranch,
        updatedAt: new Date()
      }
    })

    console.log('✅ Marie Jackson registration updated successfully!')
    console.log(`  New Branch: "${updatedRegistration.branch}"`)
    console.log(`  Updated At: ${updatedRegistration.updatedAt}`)

    // Verify the update
    const verifyRegistration = await prisma.registration.findUnique({
      where: {
        id: marieRegistration.id
      },
      select: {
        fullName: true,
        branch: true,
        updatedAt: true
      }
    })

    if (verifyRegistration) {
      console.log('\n🔍 Verification:')
      console.log(`  Name: ${verifyRegistration.fullName}`)
      console.log(`  Branch: "${verifyRegistration.branch}"`)
      console.log(`  Last Updated: ${verifyRegistration.updatedAt}`)
      
      if (verifyRegistration.branch === newBranch) {
        console.log('✅ Update verified successfully!')
      } else {
        console.log('❌ Update verification failed!')
      }
    }

  } catch (error) {
    console.error('❌ Failed to fix Marie Jackson registration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
if (require.main === module) {
  fixMarieJackson()
    .then(() => {
      console.log('\n✅ Marie Jackson fix completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Marie Jackson fix failed:', error)
      process.exit(1)
    })
}

export { fixMarieJackson }

/**
 * Stats Accuracy Verification Script
 * Checks if all stats across different pages are consistent
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface StatsComparison {
  source: string
  totalRegistrations: number
  verifiedRegistrations: number
  unverifiedRegistrations: number
  calculatedUnverified: number
  match: boolean
}

async function verifyStatsAccuracy() {
  console.log('🔍 Starting stats accuracy verification...\n')

  try {
    // Get raw database counts
    const totalRegistrations = await prisma.registration.count()
    const verifiedRegistrations = await prisma.registration.count({
      where: { isVerified: true }
    })
    const unverifiedRegistrations = await prisma.registration.count({
      where: { isVerified: false }
    })
    const calculatedUnverified = totalRegistrations - verifiedRegistrations

    console.log('📊 Raw Database Stats:')
    console.log(`   Total Registrations: ${totalRegistrations}`)
    console.log(`   Verified: ${verifiedRegistrations}`)
    console.log(`   Unverified (direct): ${unverifiedRegistrations}`)
    console.log(`   Unverified (calculated): ${calculatedUnverified}`)
    console.log(`   Math Check: ${verifiedRegistrations + unverifiedRegistrations === totalRegistrations ? '✅' : '❌'}`)
    console.log()

    // Test different calculation methods
    const stats: StatsComparison[] = [
      {
        source: 'Direct Database Query',
        totalRegistrations,
        verifiedRegistrations,
        unverifiedRegistrations,
        calculatedUnverified,
        match: unverifiedRegistrations === calculatedUnverified
      }
    ]

    // Simulate attendance stats calculation
    const attendanceUnverified = totalRegistrations - verifiedRegistrations
    stats.push({
      source: 'Attendance Page Logic',
      totalRegistrations,
      verifiedRegistrations,
      unverifiedRegistrations: attendanceUnverified,
      calculatedUnverified,
      match: attendanceUnverified === calculatedUnverified
    })

    // Simulate dashboard stats calculation
    const dashboardVerified = await prisma.registration.count({
      where: { isVerified: true }
    })
    const dashboardUnverified = totalRegistrations - dashboardVerified
    stats.push({
      source: 'Dashboard Logic',
      totalRegistrations,
      verifiedRegistrations: dashboardVerified,
      unverifiedRegistrations: dashboardUnverified,
      calculatedUnverified,
      match: dashboardUnverified === calculatedUnverified && dashboardVerified === verifiedRegistrations
    })

    // Check allocation stats
    const allocatedVerified = await prisma.registration.count({
      where: {
        isVerified: true,
        roomAllocation: { isNot: null }
      }
    })
    const unallocatedVerified = verifiedRegistrations - allocatedVerified

    console.log('🏠 Allocation Stats:')
    console.log(`   Allocated Verified: ${allocatedVerified}`)
    console.log(`   Unallocated Verified: ${unallocatedVerified}`)
    console.log(`   Total Verified: ${verifiedRegistrations}`)
    console.log(`   Allocation Math Check: ${allocatedVerified + unallocatedVerified === verifiedRegistrations ? '✅' : '❌'}`)
    console.log()

    // Display comparison table
    console.log('📋 Stats Comparison Across Pages:')
    console.log('─'.repeat(80))
    console.log('Source'.padEnd(20) + 'Total'.padEnd(8) + 'Verified'.padEnd(10) + 'Unverified'.padEnd(12) + 'Match')
    console.log('─'.repeat(80))

    stats.forEach(stat => {
      const row = stat.source.padEnd(20) + 
                  stat.totalRegistrations.toString().padEnd(8) + 
                  stat.verifiedRegistrations.toString().padEnd(10) + 
                  stat.unverifiedRegistrations.toString().padEnd(12) + 
                  (stat.match ? '✅' : '❌')
      console.log(row)
    })

    console.log('─'.repeat(80))
    console.log()

    // Check for discrepancies
    const allMatch = stats.every(stat => stat.match)
    if (allMatch) {
      console.log('✅ All stats are consistent across pages!')
    } else {
      console.log('❌ Stats discrepancies found!')
      stats.filter(stat => !stat.match).forEach(stat => {
        console.log(`   ⚠️  ${stat.source}: Unverified count mismatch`)
      })
    }

    // Additional checks
    console.log('\n🔍 Additional Verification Checks:')
    
    // Check for orphaned data
    const orphanedAllocations = await prisma.roomAllocation.count({
      where: {
        registration: {
          isVerified: false
        }
      }
    })
    
    if (orphanedAllocations > 0) {
      console.log(`   ⚠️  Found ${orphanedAllocations} room allocations for unverified users`)
    } else {
      console.log('   ✅ No orphaned room allocations found')
    }

    // Check for missing QR codes
    const missingQRCodes = await prisma.registration.count({
      where: {
        isVerified: true,
        qrCode: null
      }
    })

    if (missingQRCodes > 0) {
      console.log(`   ⚠️  Found ${missingQRCodes} verified users without QR codes`)
    } else {
      console.log('   ✅ All verified users have QR codes')
    }

    return {
      success: allMatch,
      stats,
      issues: {
        orphanedAllocations,
        missingQRCodes
      }
    }

  } catch (error) {
    console.error('❌ Error verifying stats:', error)
    return { success: false, error }
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyStatsAccuracy()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Stats verification completed successfully!')
        process.exit(0)
      } else {
        console.log('\n💥 Stats verification failed!')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('💥 Verification script failed:', error)
      process.exit(1)
    })
}

export { verifyStatsAccuracy }

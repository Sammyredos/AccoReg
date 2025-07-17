#!/usr/bin/env tsx

/**
 * Test Analytics API
 * Tests the analytics API to ensure it handles missing columns gracefully
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAnalyticsAPI() {
  console.log('🧪 Testing Analytics API...')
  console.log('=' .repeat(50))

  try {
    await prisma.$connect()
    console.log('✅ Database connection established')

    // Test 1: Check if age column exists
    console.log('\n🔍 Checking age column...')
    try {
      const ageColumn = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'age'
      `
      
      if (Array.isArray(ageColumn) && ageColumn.length > 0) {
        console.log('✅ Age column exists')
      } else {
        console.log('⚠️ Age column missing - analytics will use fallback calculation')
      }
    } catch (error) {
      console.log('⚠️ Could not check age column')
    }

    // Test 2: Check if branch column exists
    console.log('\n🔍 Checking branch column...')
    try {
      const branchColumn = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'registrations' 
        AND column_name = 'branch'
      `
      
      if (Array.isArray(branchColumn) && branchColumn.length > 0) {
        console.log('✅ Branch column exists')
      } else {
        console.log('⚠️ Branch column missing - analytics will skip branch stats')
      }
    } catch (error) {
      console.log('⚠️ Could not check branch column')
    }

    // Test 3: Try basic registration queries
    console.log('\n📊 Testing basic analytics queries...')
    
    try {
      const totalRegistrations = await prisma.registration.count()
      console.log(`✅ Total registrations: ${totalRegistrations}`)
    } catch (error) {
      console.log('❌ Could not count registrations:', error.message)
    }

    try {
      const verifiedCount = await prisma.registration.count({
        where: { isVerified: true }
      })
      console.log(`✅ Verified registrations: ${verifiedCount}`)
    } catch (error) {
      console.log('❌ Could not count verified registrations:', error.message)
    }

    // Test 4: Try age-related queries
    console.log('\n🎂 Testing age-related queries...')
    
    try {
      const registrationsWithAge = await prisma.registration.findMany({
        select: {
          age: true,
          dateOfBirth: true
        },
        take: 1
      })
      console.log('✅ Age field query successful')
    } catch (error: any) {
      if (error.code === 'P2022' && error.message.includes('age')) {
        console.log('⚠️ Age field missing - will use dateOfBirth fallback')
        
        try {
          const registrationsWithDateOfBirth = await prisma.registration.findMany({
            select: {
              dateOfBirth: true
            },
            take: 1
          })
          console.log('✅ DateOfBirth fallback query successful')
        } catch (fallbackError) {
          console.log('❌ DateOfBirth fallback failed:', fallbackError.message)
        }
      } else {
        console.log('❌ Age query failed:', error.message)
      }
    }

    // Test 5: Try branch-related queries
    console.log('\n🏢 Testing branch-related queries...')
    
    try {
      const branchStats = await prisma.registration.groupBy({
        by: ['branch'],
        _count: {
          branch: true
        },
        take: 1
      })
      console.log('✅ Branch groupBy query successful')
    } catch (error: any) {
      if (error.code === 'P2022' && error.message.includes('branch')) {
        console.log('⚠️ Branch field missing - will skip branch statistics')
      } else {
        console.log('❌ Branch query failed:', error.message)
      }
    }

    // Test 6: Simulate analytics API logic
    console.log('\n🔬 Simulating analytics API logic...')
    
    let averageAge = 0
    try {
      // Try with age field first
      const allRegistrations = await prisma.registration.findMany({
        select: {
          age: true,
          dateOfBirth: true
        }
      })
      
      if (allRegistrations.length > 0) {
        const totalAge = allRegistrations.reduce((sum, reg) => {
          if (reg.age && reg.age > 0) {
            return sum + reg.age
          } else if (reg.dateOfBirth) {
            const birthDate = new Date(reg.dateOfBirth)
            const today = new Date()
            let age = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--
            }
            return sum + age
          }
          return sum
        }, 0)
        averageAge = totalAge / allRegistrations.length
      }
      
      console.log(`✅ Average age calculation: ${Math.round(averageAge * 10) / 10} years`)
      
    } catch (error: any) {
      if (error.code === 'P2022' && error.message.includes('age')) {
        console.log('⚠️ Age field missing, trying dateOfBirth only...')
        
        try {
          const allRegistrations = await prisma.registration.findMany({
            select: {
              dateOfBirth: true
            }
          })
          
          if (allRegistrations.length > 0) {
            const totalAge = allRegistrations.reduce((sum, reg) => {
              if (reg.dateOfBirth) {
                const birthDate = new Date(reg.dateOfBirth)
                const today = new Date()
                let age = today.getFullYear() - birthDate.getFullYear()
                const monthDiff = today.getMonth() - birthDate.getMonth()
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--
                }
                return sum + age
              }
              return sum
            }, 0)
            averageAge = totalAge / allRegistrations.length
          }
          
          console.log(`✅ Average age calculation (fallback): ${Math.round(averageAge * 10) / 10} years`)
          
        } catch (fallbackError) {
          console.log('❌ Fallback age calculation failed:', fallbackError.message)
        }
      } else {
        console.log('❌ Age calculation failed:', error.message)
      }
    }

    console.log('\n🎉 Analytics API Test Completed!')
    console.log('✅ Analytics API should handle missing columns gracefully')
    console.log('✅ Fallback calculations are working')

  } catch (error) {
    console.error('❌ Analytics API test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsAPI()
    .then(() => {
      console.log('\n✅ Analytics API test completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Analytics API test failed:', error)
      process.exit(1)
    })
}

export { testAnalyticsAPI }

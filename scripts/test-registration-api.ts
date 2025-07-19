import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRegistrationAPI() {
  try {
    console.log('🧪 TESTING REGISTRATION API')
    console.log('=' .repeat(40))

    // Test data that matches the form structure
    const testRegistrationData = {
      fullName: 'Test User Registration',
      dateOfBirth: '2000-01-01',
      gender: 'Male',
      address: '123 Test Street, Test City',
      branch: 'Iyana Ipaja',
      phoneNumber: '08012345678',
      emailAddress: 'test@example.com',
      parentGuardianName: 'Test Parent',
      parentGuardianPhone: '08087654321',
      parentGuardianEmail: 'parent@example.com',
      emergencyContactName: 'Test Emergency Contact',
      emergencyContactRelationship: 'Uncle',
      emergencyContactPhone: '08011111111'
    }

    console.log('📝 Test registration data:')
    console.log(JSON.stringify(testRegistrationData, null, 2))

    // Test creating registration directly with Prisma
    console.log('\n🔧 Testing direct Prisma creation...')
    
    try {
      // Calculate age
      const birthDate = new Date(testRegistrationData.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      const newRegistration = await prisma.registration.create({
        data: {
          fullName: testRegistrationData.fullName,
          dateOfBirth: birthDate,
          age,
          gender: testRegistrationData.gender,
          address: testRegistrationData.address,
          branch: testRegistrationData.branch,
          phoneNumber: testRegistrationData.phoneNumber,
          emailAddress: testRegistrationData.emailAddress,
          emergencyContactName: testRegistrationData.emergencyContactName,
          emergencyContactRelationship: testRegistrationData.emergencyContactRelationship,
          emergencyContactPhone: testRegistrationData.emergencyContactPhone,
          parentGuardianName: testRegistrationData.parentGuardianName,
          parentGuardianPhone: testRegistrationData.parentGuardianPhone,
          parentGuardianEmail: testRegistrationData.parentGuardianEmail,
          roommateRequestConfirmationNumber: null,
          medications: null,
          allergies: null,
          specialNeeds: null,
          dietaryRestrictions: null,
          parentalPermissionGranted: true,
          isVerified: false,
          attendanceMarked: false,
          qrCode: null
        }
      })

      console.log('✅ Direct Prisma creation successful!')
      console.log(`📋 Created registration ID: ${newRegistration.id}`)
      console.log(`👤 Name: ${newRegistration.fullName}`)
      console.log(`🌿 Branch: ${newRegistration.branch}`)
      console.log(`📧 Email: ${newRegistration.emailAddress}`)

      // Clean up - delete the test registration
      await prisma.registration.delete({
        where: { id: newRegistration.id }
      })
      console.log('🧹 Test registration cleaned up')

    } catch (error) {
      console.log('❌ Direct Prisma creation failed:', error)
      
      // Check if it's a schema issue
      if (error instanceof Error && error.message.includes('branch')) {
        console.log('🔧 Branch field issue detected')
        console.log('💡 Suggestion: Run database migration to add branch field')
      }
    }

    // Test children registration as well
    console.log('\n👶 Testing children registration...')
    
    const testChildData = {
      fullName: 'Test Child Registration',
      dateOfBirth: '2015-01-01',
      gender: 'Female',
      address: '123 Test Street, Test City',
      branch: 'Badagry',
      parentGuardianName: 'Test Parent',
      parentGuardianPhone: '08087654321',
      parentGuardianEmail: 'parent@example.com'
    }

    try {
      // Calculate age
      const birthDate = new Date(testChildData.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      const newChildRegistration = await prisma.childrenRegistration.create({
        data: {
          fullName: testChildData.fullName,
          dateOfBirth: birthDate,
          age,
          gender: testChildData.gender,
          address: testChildData.address,
          branch: testChildData.branch,
          parentGuardianName: testChildData.parentGuardianName,
          parentGuardianPhone: testChildData.parentGuardianPhone,
          parentGuardianEmail: testChildData.parentGuardianEmail
        }
      })

      console.log('✅ Children registration creation successful!')
      console.log(`📋 Created children registration ID: ${newChildRegistration.id}`)
      console.log(`👶 Name: ${newChildRegistration.fullName}`)
      console.log(`🌿 Branch: ${newChildRegistration.branch}`)

      // Clean up
      await prisma.childrenRegistration.delete({
        where: { id: newChildRegistration.id }
      })
      console.log('🧹 Test children registration cleaned up')

    } catch (error) {
      console.log('❌ Children registration creation failed:', error)
    }

    console.log('\n📊 CURRENT DATABASE STATE:')
    const regCount = await prisma.registration.count()
    const childCount = await prisma.childrenRegistration.count()
    console.log(`📋 Total registrations: ${regCount}`)
    console.log(`👶 Total children registrations: ${childCount}`)

    console.log('\n✅ API testing completed!')

  } catch (error) {
    console.error('\n❌ API test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the API test
testRegistrationAPI()
  .then(() => {
    console.log('\n🧪 API testing completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 API testing failed:', error)
    process.exit(1)
  })

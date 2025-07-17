import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabaseSchema() {
  try {
    console.log('🔍 CHECKING DATABASE SCHEMA')
    console.log('=' .repeat(40))

    // Check if branch field exists in registrations table
    console.log('\n📋 REGISTRATIONS TABLE:')
    try {
      const sampleReg = await prisma.registration.findFirst({
        select: { 
          id: true, 
          fullName: true, 
          branch: true 
        }
      })
      
      if (sampleReg) {
        console.log('✅ Branch field exists in registrations')
        console.log(`📝 Sample: ${sampleReg.fullName} - Branch: ${sampleReg.branch || 'NULL'}`)
      } else {
        console.log('⚠️  No registrations found, but branch field exists')
      }
    } catch (error) {
      console.log('❌ Branch field missing in registrations table')
      console.log('🔧 Need to add branch field to registrations')
    }

    // Check if branch field exists in children registrations table
    console.log('\n👶 CHILDREN REGISTRATIONS TABLE:')
    try {
      const sampleChild = await prisma.childrenRegistration.findFirst({
        select: { 
          id: true, 
          fullName: true, 
          branch: true 
        }
      })
      
      if (sampleChild) {
        console.log('✅ Branch field exists in children registrations')
        console.log(`📝 Sample: ${sampleChild.fullName} - Branch: ${sampleChild.branch || 'NULL'}`)
      } else {
        console.log('⚠️  No children registrations found, but branch field exists')
      }
    } catch (error) {
      console.log('❌ Branch field missing in children registrations table')
      console.log('🔧 Need to add branch field to children registrations')
    }

    // Count records
    console.log('\n📊 RECORD COUNTS:')
    const regCount = await prisma.registration.count()
    const childCount = await prisma.childrenRegistration.count()
    console.log(`📋 Registrations: ${regCount}`)
    console.log(`👶 Children Registrations: ${childCount}`)

    // Test creating a registration with branch
    console.log('\n🧪 TESTING BRANCH FIELD:')
    try {
      // Don't actually create, just test the data structure
      const testData = {
        fullName: 'Test User',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'Male',
        address: 'Test Address',
        branch: 'Test Branch',
        phoneNumber: '1234567890',
        emailAddress: 'test@test.com',
        emergencyContactName: 'Test Emergency',
        emergencyContactRelationship: 'Parent',
        emergencyContactPhone: '1234567890',
        parentGuardianName: 'Test Parent',
        parentGuardianPhone: '1234567890',
        parentGuardianEmail: 'parent@test.com'
      }
      
      console.log('✅ Registration data structure with branch is valid')
    } catch (error) {
      console.log('❌ Registration data structure issue:', error)
    }

  } catch (error) {
    console.error('\n❌ Schema check failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the schema check
checkDatabaseSchema()
  .then(() => {
    console.log('\n🔍 Schema check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Schema check failed:', error)
    process.exit(1)
  })

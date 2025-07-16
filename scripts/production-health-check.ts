import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProductionHealth() {
  try {
    console.log('🔍 Production Health Check\n')
    console.log('=' .repeat(50))

    // 1. Database Connection
    console.log('\n🗄️  DATABASE CONNECTION:')
    try {
      await prisma.$connect()
      console.log('✅ Database connection successful')
      
      // Check if tables exist
      const registrationCount = await prisma.registration.count()
      const childrenCount = await prisma.childrenRegistration.count()
      const adminCount = await prisma.admin.count()
      
      console.log(`📊 Registrations: ${registrationCount}`)
      console.log(`👶 Children Registrations: ${childrenCount}`)
      console.log(`👤 Admin Users: ${adminCount}`)
      
    } catch (error) {
      console.log('❌ Database connection failed')
      console.error('Error:', error)
      return
    }

    // 2. Check if branch field exists
    console.log('\n🌿 BRANCH FIELD CHECK:')
    try {
      const sampleReg = await prisma.registration.findFirst({
        select: { id: true, fullName: true, branch: true }
      })
      
      if (sampleReg) {
        console.log('✅ Branch field exists in registrations table')
        console.log(`📝 Sample: ${sampleReg.fullName} - Branch: ${sampleReg.branch || 'NULL'}`)
      } else {
        console.log('⚠️  No registrations found')
      }
    } catch (error) {
      console.log('❌ Branch field does not exist yet')
      console.log('🔧 Migration needed')
    }

    // 3. Check Admin Users
    console.log('\n👤 ADMIN USERS:')
    try {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          role: {
            select: { name: true }
          }
        }
      })
      
      console.log(`Total admins: ${admins.length}`)
      admins.forEach(admin => {
        console.log(`  📧 ${admin.email} - ${admin.name} (${admin.role?.name || 'No role'}) - ${admin.isActive ? '✅ Active' : '❌ Inactive'}`)
      })
      
    } catch (error) {
      console.log('❌ Failed to fetch admin users')
      console.error('Error:', error)
    }

    // 4. Check System Settings
    console.log('\n⚙️  SYSTEM SETTINGS:')
    try {
      const settings = await prisma.setting.findMany({
        where: {
          key: {
            in: ['system_name', 'logo_url', 'registration_minimumAge']
          }
        }
      })
      
      settings.forEach(setting => {
        console.log(`  ${setting.key}: ${setting.value}`)
      })
      
    } catch (error) {
      console.log('❌ Failed to fetch settings')
      console.error('Error:', error)
    }

  } catch (error) {
    console.error('❌ Health check failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the health check
checkProductionHealth()
  .then(() => {
    console.log('\n✅ Health check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Health check failed:', error)
    process.exit(1)
  })

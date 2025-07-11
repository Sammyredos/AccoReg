import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugProduction() {
  try {
    console.log('🔍 Production Debug Information\n')
    console.log('=' .repeat(50))

    // Environment Check
    console.log('\n🌍 ENVIRONMENT VARIABLES:')
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌'}`)
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'Set ✅' : 'Missing ❌'}`)
    console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'Set ✅' : 'Missing ❌'}`)
    console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'Missing ❌'}`)
    console.log(`SUPER_ADMIN_PASSWORD: ${process.env.SUPER_ADMIN_PASSWORD ? 'Set ✅' : 'Missing ❌'}`)

    // Database Connection Test
    console.log('\n🗄️  DATABASE CONNECTION:')
    try {
      await prisma.$connect()
      console.log('Database connection: ✅ Success')
      
      // Check tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      ` as any[]
      
      console.log(`Tables found: ${tables.length}`)
      tables.forEach((table: any) => {
        console.log(`  - ${table.table_name}`)
      })
      
    } catch (error) {
      console.log('Database connection: ❌ Failed')
      console.error('Error:', error)
    }

    // Check Admin Users
    console.log('\n👤 ADMIN USERS:')
    try {
      const admins = await prisma.admin.findMany({
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })
      
      console.log(`Total admins: ${admins.length}`)
      admins.forEach(admin => {
        console.log(`  📧 ${admin.email}`)
        console.log(`     Name: ${admin.name}`)
        console.log(`     Active: ${admin.isActive ? '✅' : '❌'}`)
        console.log(`     Role: ${admin.role?.name || 'No role'}`)
        console.log(`     Permissions: ${admin.role?.permissions.length || 0}`)
        console.log(`     Last Login: ${admin.lastLogin || 'Never'}`)
        console.log('')
      })
      
    } catch (error) {
      console.log('Admin check: ❌ Failed')
      console.error('Error:', error)
    }

    // Check Roles and Permissions
    console.log('\n🛡️  ROLES & PERMISSIONS:')
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: true,
          _count: {
            select: {
              admins: true
            }
          }
        }
      })
      
      console.log(`Total roles: ${roles.length}`)
      roles.forEach(role => {
        console.log(`  👑 ${role.name}`)
        console.log(`     Description: ${role.description}`)
        console.log(`     Permissions: ${role.permissions.length}`)
        console.log(`     Admins: ${role._count.admins}`)
        console.log('')
      })
      
    } catch (error) {
      console.log('Roles check: ❌ Failed')
      console.error('Error:', error)
    }

    // Check Settings
    console.log('\n⚙️  SYSTEM SETTINGS:')
    try {
      const settings = await prisma.setting.findMany()
      console.log(`Total settings: ${settings.length}`)
      
      const importantSettings = ['session_timeout', 'system_name', 'smtp_host']
      importantSettings.forEach(key => {
        const setting = settings.find(s => s.key === key)
        console.log(`  ${key}: ${setting?.value || 'Not set'}`)
      })
      
    } catch (error) {
      console.log('Settings check: ❌ Failed')
      console.error('Error:', error)
    }

  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
debugProduction()
  .then(() => {
    console.log('\n✅ Debug completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error)
    process.exit(1)
  })

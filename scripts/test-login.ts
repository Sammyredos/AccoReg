import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testLogin() {
  try {
    console.log('🔍 Testing login functionality...\n')

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { email: 'admin@mopgomglobal.com' },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!admin) {
      console.log('❌ Admin user not found!')
      console.log('🔧 Run: npx tsx scripts/create-super-admin.ts')
      return
    }

    console.log('✅ Admin user found:')
    console.log(`   📧 Email: ${admin.email}`)
    console.log(`   👤 Name: ${admin.name}`)
    console.log(`   🔄 Active: ${admin.isActive}`)
    console.log(`   👑 Role: ${admin.role?.name || 'No role'}`)
    console.log(`   🛡️  Permissions: ${admin.role?.permissions.length || 0}`)

    // Test password verification
    const testPasswords = ['SuperAdmin123!', 'admin123', process.env.SUPER_ADMIN_PASSWORD]
    
    console.log('\n🔑 Testing password verification...')
    for (const password of testPasswords) {
      if (password) {
        const isValid = bcrypt.compareSync(password, admin.password)
        console.log(`   Password "${password}": ${isValid ? '✅ Valid' : '❌ Invalid'}`)
        if (isValid) {
          console.log(`\n🎉 LOGIN CREDENTIALS FOUND:`)
          console.log(`📧 Email: admin@mopgomglobal.com`)
          console.log(`🔑 Password: ${password}`)
          break
        }
      }
    }

    // Check environment variables
    console.log('\n🌍 Environment Variables:')
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`)
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`)
    console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}`)
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ Missing'}`)

    // Test database connection
    console.log('\n🗄️  Testing database connection...')
    const userCount = await prisma.admin.count()
    console.log(`   Total admins: ${userCount}`)

    const roleCount = await prisma.role.count()
    console.log(`   Total roles: ${roleCount}`)

    const permissionCount = await prisma.permission.count()
    console.log(`   Total permissions: ${permissionCount}`)

  } catch (error) {
    console.error('❌ Error testing login:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Database connection failed. Check DATABASE_URL.')
      } else if (error.message.includes('does not exist')) {
        console.log('\n💡 Database tables missing. Run migrations first.')
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
testLogin()
  .then(() => {
    console.log('\n✅ Login test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Login test failed:', error)
    process.exit(1)
  })

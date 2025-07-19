import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createTestUsers() {
  try {
    console.log('👤 CREATING TEST USERS')
    console.log('=' .repeat(40))

    // Get roles
    const roles = await prisma.role.findMany()
    const staffRole = roles.find(r => r.name === 'Staff')
    const managerRole = roles.find(r => r.name === 'Manager')
    const adminRole = roles.find(r => r.name === 'Admin')

    if (!staffRole || !managerRole || !adminRole) {
      console.log('❌ Required roles not found. Please run create-staff-role.ts first.')
      return
    }

    // Test users to create
    const testUsers = [
      {
        email: 'staff@mopgomglobal.com',
        name: 'Staff User',
        password: 'Staff123!',
        roleId: staffRole.id,
        roleName: 'Staff'
      },
      {
        email: 'manager@mopgomglobal.com',
        name: 'Manager User',
        password: 'Manager123!',
        roleId: managerRole.id,
        roleName: 'Manager'
      },
      {
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'Admin123!',
        roleId: adminRole.id,
        roleName: 'Admin'
      }
    ]

    console.log('🔧 Creating test users...')

    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.admin.findUnique({
        where: { email: user.email }
      })

      if (existingUser) {
        console.log(`⚠️  User ${user.email} already exists, updating...`)
        
        // Update existing user
        const hashedPassword = await bcrypt.hash(user.password, 12)
        await prisma.admin.update({
          where: { email: user.email },
          data: {
            name: user.name,
            password: hashedPassword,
            roleId: user.roleId,
            isActive: true
          }
        })
        console.log(`✅ Updated ${user.email} (${user.roleName})`)
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(user.password, 12)
        await prisma.admin.create({
          data: {
            email: user.email,
            name: user.name,
            password: hashedPassword,
            roleId: user.roleId,
            isActive: true
          }
        })
        console.log(`✅ Created ${user.email} (${user.roleName})`)
      }
    }

    // Display all users
    console.log('\n👥 ALL ADMIN USERS:')
    const allUsers = await prisma.admin.findMany({
      include: {
        role: true
      }
    })

    allUsers.forEach(user => {
      console.log(`📧 ${user.email}`)
      console.log(`   👤 Name: ${user.name}`)
      console.log(`   👑 Role: ${user.role?.name || 'No role'}`)
      console.log(`   🔑 Active: ${user.isActive ? '✅ Yes' : '❌ No'}`)
      console.log('')
    })

    console.log('🔑 LOGIN CREDENTIALS:')
    console.log('=' .repeat(40))
    testUsers.forEach(user => {
      console.log(`${user.roleName}:`)
      console.log(`  📧 Email: ${user.email}`)
      console.log(`  🔑 Password: ${user.password}`)
      console.log('')
    })

    console.log('🌐 Login URL: http://localhost:3000/admin/login')
    console.log('')
    console.log('🎯 TESTING INSTRUCTIONS:')
    console.log('1. Login with staff@mopgomglobal.com / Staff123!')
    console.log('2. Go to Children Registration page')
    console.log('3. Try editing a registration (should work now)')
    console.log('4. Try deleting a registration (should be restricted)')

  } catch (error) {
    console.error('\n❌ User creation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the user creation
createTestUsers()
  .then(() => {
    console.log('\n👤 Test user creation completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test user creation failed:', error)
    process.exit(1)
  })

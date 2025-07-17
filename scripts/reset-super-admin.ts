import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetSuperAdmin() {
  try {
    console.log('🔧 Resetting Super Admin Account...')
    
    // Find or create Super Admin role
    let superAdminRole = await prisma.role.findFirst({
      where: { name: 'Super Admin' }
    })
    
    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          name: 'Super Admin',
          permissions: ['all']
        }
      })
      console.log('✅ Created Super Admin role')
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)
    
    // Update or create super admin
    const superAdmin = await prisma.admin.upsert({
      where: { email: 'admin@mopgomglobal.com' },
      update: {
        password: hashedPassword,
        isActive: true,
        roleId: superAdminRole.id
      },
      create: {
        email: 'admin@mopgomglobal.com',
        name: 'Super Administrator',
        password: hashedPassword,
        isActive: true,
        roleId: superAdminRole.id
      }
    })
    
    console.log('✅ Super Admin account ready!')
    console.log('📧 Email: admin@mopgomglobal.com')
    console.log('🔑 Password: SuperAdmin123!')
    console.log('🌐 Login at: https://mopgomyouth.onrender.com/admin/login')
    
  } catch (error) {
    console.error('❌ Failed to reset super admin:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetSuperAdmin()
  .then(() => {
    console.log('🎉 Super Admin reset completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Super Admin reset failed:', error)
    process.exit(1)
  })

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetting admin password...\n')

    // Update the admin password
    const updatedAdmin = await prisma.admin.update({
      where: {
        email: 'admin@mopgomglobal.com'
      },
      data: {
        password: hashPassword('admin123'),
        isActive: true
      }
    })

    console.log('✅ Admin password reset successfully!')
    console.log('\n🔑 UPDATED LOGIN CREDENTIALS:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email: admin@mopgomglobal.com')
    console.log('🔒 Password: admin123')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🌐 Login URL: http://localhost:3000/admin/login')
    console.log('\n💡 You can now login with these credentials!')

  } catch (error) {
    console.error('❌ Error resetting password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()

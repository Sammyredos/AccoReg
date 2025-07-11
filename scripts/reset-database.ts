/**
 * Database Reset Script
 * Safely resets the database and reseeds with fresh data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...')

    // Clear existing data in correct order (respecting foreign key constraints)
    console.log('🗑️  Clearing existing data...')
    
    await prisma.roomAllocation.deleteMany()
    console.log('   ✅ Room allocations cleared')
    
    await prisma.registration.deleteMany()
    console.log('   ✅ Registrations cleared')
    
    await prisma.room.deleteMany()
    console.log('   ✅ Rooms cleared')
    
    await prisma.admin.deleteMany()
    console.log('   ✅ Admin users cleared')

    // Clear roles (this will also clear the role-permission relationships)
    await prisma.role.deleteMany()
    console.log('   ✅ Roles cleared')

    await prisma.permission.deleteMany()
    console.log('   ✅ Permissions cleared')
    
    await prisma.setting.deleteMany()
    console.log('   ✅ Settings cleared')

    console.log('✅ Database reset completed successfully!')
    console.log('🔄 You can now run the seeding scripts to set up fresh data.')

  } catch (error) {
    console.error('❌ Error resetting database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
resetDatabase()
  .then(() => {
    console.log('\n✅ Database reset completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Database reset failed:', error)
    process.exit(1)
  })

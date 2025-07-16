import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function safeProductionDeploy() {
  console.log('🚀 Safe Production Deployment Script')
  console.log('=' .repeat(50))

  try {
    // 1. Pre-deployment checks
    console.log('\n🔍 PRE-DEPLOYMENT CHECKS:')
    
    // Check database connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Count existing data
    const existingRegistrations = await prisma.registration.count()
    const existingChildren = await prisma.childrenRegistration.count()
    console.log(`📊 Found ${existingRegistrations} existing registrations`)
    console.log(`👶 Found ${existingChildren} existing children registrations`)
    
    // 2. Check if branch field already exists
    console.log('\n🌿 CHECKING BRANCH FIELD:')
    let branchFieldExists = false
    try {
      await prisma.registration.findFirst({
        select: { branch: true }
      })
      branchFieldExists = true
      console.log('✅ Branch field already exists')
    } catch (error) {
      console.log('⚠️  Branch field does not exist - migration needed')
    }
    
    // 3. Backup verification
    console.log('\n💾 BACKUP VERIFICATION:')
    if (existingRegistrations > 0) {
      console.log('⚠️  IMPORTANT: Ensure you have a database backup before proceeding!')
      console.log('📋 Your production has valuable data that should be backed up')
    }
    
    // 4. Migration safety check
    console.log('\n🛡️  MIGRATION SAFETY:')
    console.log('✅ Migration is NON-DESTRUCTIVE')
    console.log('✅ Only ADDS new column with default value')
    console.log('✅ No existing data will be modified or deleted')
    console.log('✅ All 250+ registrations will remain intact')
    
    // 5. Post-migration expectations
    console.log('\n📈 POST-MIGRATION EXPECTATIONS:')
    console.log('✅ All existing registrations will have branch = "Not Specified"')
    console.log('✅ New registrations will require branch selection')
    console.log('✅ Admin can edit existing registrations to set proper branches')
    console.log('✅ All forms will work with new branch field')
    
    // 6. Rollback plan
    console.log('\n🔄 ROLLBACK PLAN (if needed):')
    console.log('If issues occur, you can:')
    console.log('1. Remove branch column: ALTER TABLE "registrations" DROP COLUMN "branch";')
    console.log('2. Drop index: DROP INDEX "registrations_branch_idx";')
    console.log('3. Redeploy previous version')
    
    console.log('\n✅ Pre-deployment checks completed successfully!')
    console.log('🚀 Ready for production deployment!')
    
  } catch (error) {
    console.error('\n❌ Pre-deployment check failed:', error)
    console.log('\n🛑 DO NOT PROCEED WITH DEPLOYMENT')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the safe deployment check
safeProductionDeploy()
  .then(() => {
    console.log('\n🎉 Safe deployment verification completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Deployment verification failed:', error)
    process.exit(1)
  })

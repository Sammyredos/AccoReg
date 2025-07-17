/**
 * Simple test script to verify backup functionality
 * Run with: node test-backup.js
 */

const { DatabaseBackup } = require('./src/lib/backup.ts')
const { existsSync } = require('fs')
const { unlink } = require('fs/promises')

async function testBackup() {
  console.log('🧪 Testing backup functionality...')
  
  try {
    // Create backup instance with test configuration
    const backup = new DatabaseBackup({
      databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
      backupDir: './test-backups',
      retentionDays: 7,
      compressionEnabled: true,
      encryptionEnabled: false
    })

    console.log('📦 Creating backup...')
    const createResult = await backup.createBackup()
    
    if (createResult.success) {
      console.log('✅ Backup created successfully!')
      console.log(`   Filename: ${createResult.filename}`)
      console.log(`   Size: ${createResult.size} bytes`)
      console.log(`   Duration: ${createResult.duration}ms`)
      
      // List backups
      console.log('\n📋 Listing backups...')
      const backups = await backup.listBackups()
      console.log(`   Found ${backups.length} backup(s)`)
      
      backups.forEach((b, i) => {
        console.log(`   ${i + 1}. ${b.filename} (${b.size} bytes, ${b.created})`)
      })
      
      // Test restore (commented out to avoid overwriting data)
      // console.log('\n🔄 Testing restore...')
      // const restoreResult = await backup.restoreBackup(createResult.filename)
      // if (restoreResult.success) {
      //   console.log('✅ Restore completed successfully!')
      // } else {
      //   console.log('❌ Restore failed:', restoreResult.error)
      // }
      
      console.log('\n🧹 Cleaning up test backup...')
      if (createResult.filename) {
        const backupPath = `./test-backups/${createResult.filename}`
        if (existsSync(backupPath)) {
          await unlink(backupPath)
          console.log('✅ Test backup cleaned up')
        }
      }
      
    } else {
      console.log('❌ Backup creation failed:', createResult.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testBackup().then(() => {
  console.log('\n🎉 Test completed!')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Test crashed:', error)
  process.exit(1)
})

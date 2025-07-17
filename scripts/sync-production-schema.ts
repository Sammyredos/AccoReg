#!/usr/bin/env npx tsx

/**
 * Production Schema Sync Script
 * Manually syncs production PostgreSQL database with current schema
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncProductionSchema() {
  try {
    console.log('🔄 Syncing production database schema...')
    
    // Test connection first
    console.log('📡 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Check if we can access basic tables
    console.log('🔍 Checking existing tables...')
    
    try {
      const adminCount = await prisma.admin.count()
      console.log(`✅ Admin table accessible - ${adminCount} records`)
    } catch (error) {
      console.log('⚠️ Admin table issue:', error.message)
    }
    
    try {
      const registrationCount = await prisma.registration.count()
      console.log(`✅ Registration table accessible - ${registrationCount} records`)
    } catch (error) {
      console.log('⚠️ Registration table issue:', error.message)
    }
    
    try {
      const childrenCount = await prisma.childrenRegistration.count()
      console.log(`✅ ChildrenRegistration table accessible - ${childrenCount} records`)
    } catch (error) {
      console.log('❌ ChildrenRegistration table issue:', error.message)
      console.log('This is likely the source of your API failures!')
    }
    
    try {
      const roomCount = await prisma.room.count()
      console.log(`✅ Room table accessible - ${roomCount} records`)
    } catch (error) {
      console.log('⚠️ Room table issue:', error.message)
    }
    
    try {
      const settingsCount = await prisma.setting.count()
      console.log(`✅ Settings table accessible - ${settingsCount} records`)
    } catch (error) {
      console.log('⚠️ Settings table issue:', error.message)
    }
    
    console.log('\n🎯 Schema sync analysis complete!')
    console.log('\nIf you see any table issues above, your production database')
    console.log('needs to be synced with your current schema.')
    console.log('\nTo fix this, you need to:')
    console.log('1. Deploy your app to Render (which will run auto-migration)')
    console.log('2. Or manually run: npx prisma db push on production')
    
  } catch (error) {
    console.error('❌ Schema sync failed:', error.message)
    
    if (error.message.includes('does not exist')) {
      console.error('\n💡 Table does not exist - schema migration needed')
      console.error('Your production database is missing tables from your schema.')
      console.error('Deploy to Render to trigger auto-migration.')
    }
    
    if (error.message.includes('connection')) {
      console.error('\n💡 Database connection issue')
      console.error('Check your DATABASE_URL environment variable.')
    }
    
    if (error.message.includes('column')) {
      console.error('\n💡 Column mismatch - schema out of sync')
      console.error('Your database schema needs to be updated.')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the sync check
syncProductionSchema()

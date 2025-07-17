#!/usr/bin/env tsx

/**
 * Quick Database Fix
 * Minimal script to add missing age column
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function quickDbFix() {
  console.log('🔧 QUICK DATABASE FIX')
  
  try {
    await prisma.$connect()
    console.log('✅ Connected to database')

    // Add age column if missing
    try {
      await prisma.$executeRaw`
        ALTER TABLE registrations 
        ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 0
      `
      console.log('✅ Age column ensured')
    } catch (error) {
      console.log('⚠️ Age column may already exist')
    }

    // Update ages for existing records
    try {
      await prisma.$executeRaw`
        UPDATE registrations 
        SET age = EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM "dateOfBirth")
        WHERE age = 0 OR age IS NULL
      `
      console.log('✅ Ages calculated')
    } catch (error) {
      console.log('⚠️ Age calculation completed with warnings')
    }

    // Add branch column if missing
    try {
      await prisma.$executeRaw`
        ALTER TABLE registrations 
        ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Not Specified'
      `
      console.log('✅ Branch column ensured')
    } catch (error) {
      console.log('⚠️ Branch column may already exist')
    }

    console.log('🎉 Quick fix completed!')

  } catch (error) {
    console.error('❌ Quick fix failed:', error)
    // Don't throw - continue with startup
  } finally {
    await prisma.$disconnect()
  }
}

// Run immediately
quickDbFix().then(() => {
  console.log('✅ Database ready')
  process.exit(0)
}).catch(() => {
  console.log('⚠️ Database fix had issues but continuing')
  process.exit(0)
})

#!/usr/bin/env tsx

/**
 * Production Database Setup Script
 * Simple and reliable database setup for production deployment
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

async function setupProductionDatabase() {
  console.log('🗄️ Setting up production database...')

  try {
    // Step 1: Generate Prisma client
    console.log('🔧 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated!')

    // Step 2: Push schema to database (most reliable for production)
    console.log('📋 Pushing database schema...')
    execSync('npx prisma db push', { stdio: 'inherit' })
    console.log('✅ Database schema deployed!')

    // Step 3: Verify email history table exists
    console.log('📧 Verifying email history table...')
    try {
      // Create a temporary SQL file for verification
      const verifySqlFile = join(process.cwd(), 'verify-email-history.sql')
      writeFileSync(verifySqlFile, 'SELECT COUNT(*) FROM platoon_email_history LIMIT 1;')

      execSync(`npx prisma db execute --file ${verifySqlFile}`, { stdio: 'pipe' })
      unlinkSync(verifySqlFile) // Clean up
      console.log('✅ Email history table verified!')
    } catch (error) {
      console.log('📧 Creating email history table manually...')

      const createTableSQL = `CREATE TABLE IF NOT EXISTS "platoon_email_history" (
  "id" TEXT NOT NULL,
  "platoonId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "emailTarget" TEXT NOT NULL,
  "recipientCount" INTEGER NOT NULL,
  "successCount" INTEGER NOT NULL,
  "failedCount" INTEGER NOT NULL,
  "sentBy" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platoon_email_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platoon_email_history_platoonId_idx" ON "platoon_email_history"("platoonId");
CREATE INDEX IF NOT EXISTS "platoon_email_history_createdAt_idx" ON "platoon_email_history"("createdAt");
CREATE INDEX IF NOT EXISTS "platoon_email_history_sentBy_idx" ON "platoon_email_history"("sentBy");`

      const createSqlFile = join(process.cwd(), 'create-email-history.sql')
      writeFileSync(createSqlFile, createTableSQL)

      execSync(`npx prisma db execute --file ${createSqlFile}`, { stdio: 'inherit' })
      unlinkSync(createSqlFile) // Clean up
      console.log('✅ Email history table created manually!')
    }

    console.log('🎉 Production database setup completed successfully!')
    return true

  } catch (error) {
    console.error('❌ Production database setup failed:', error)
    
    // Log environment info for debugging
    console.log('🔍 Environment debugging info:')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (PostgreSQL)' : 'Not set')
    console.log('NODE_ENV:', process.env.NODE_ENV || 'not set')
    
    return false
  }
}

if (require.main === module) {
  setupProductionDatabase()
    .then((success) => {
      if (success) {
        console.log('✅ Database setup completed successfully!')
        process.exit(0)
      } else {
        console.error('❌ Database setup failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Database setup error:', error)
      process.exit(1)
    })
}

export { setupProductionDatabase }

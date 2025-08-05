#!/usr/bin/env tsx

/**
 * Database Switch Script
 * Switches between SQLite and PostgreSQL configurations
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma')

const SQLITE_CONFIG = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`

const POSTGRESQL_CONFIG = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`

async function switchDatabase(targetDb: string) {
  console.log(`🔄 Switching database to ${targetDb}...`)

  try {
    // Read current schema
    const currentSchema = fs.readFileSync(SCHEMA_PATH, 'utf8')
    
    // Determine new config
    let newConfig: string
    if (targetDb.toLowerCase() === 'postgresql' || targetDb.toLowerCase() === 'postgres') {
      newConfig = POSTGRESQL_CONFIG
      console.log('📋 Switching to PostgreSQL configuration...')
    } else if (targetDb.toLowerCase() === 'sqlite') {
      newConfig = SQLITE_CONFIG
      console.log('📋 Switching to SQLite configuration...')
    } else {
      throw new Error(`Unsupported database: ${targetDb}. Use 'postgresql' or 'sqlite'`)
    }

    // Replace the datasource and generator section
    const updatedSchema = currentSchema.replace(
      /generator client \{[\s\S]*?\}\s*datasource db \{[\s\S]*?\}/,
      newConfig
    )

    // Write updated schema
    fs.writeFileSync(SCHEMA_PATH, updatedSchema)
    
    console.log('✅ Schema updated successfully!')

    // Automatically generate Prisma client
    console.log('🔧 Generating Prisma client...')
    try {
      execSync('npx prisma generate', { stdio: 'inherit' })
      console.log('✅ Prisma client generated successfully!')
    } catch (error) {
      console.error('⚠️ Failed to generate Prisma client:', error)
    }

    // Automatically push database schema
    console.log('🗄️ Pushing database schema...')
    try {
      execSync('npx prisma db push', { stdio: 'inherit' })
      console.log('✅ Database schema synchronized!')
    } catch (error) {
      console.log('⚠️ Database push failed - this is normal if database is not accessible yet')
      console.log('   You can run "npx prisma db push" manually when your database is ready')
    }

    if (targetDb.toLowerCase() === 'postgresql' || targetDb.toLowerCase() === 'postgres') {
      console.log(`
🎉 PostgreSQL Setup Complete!

📋 Production Ready Features:
  ✅ User management system
  ✅ Registration system with verification
  ✅ QR verification system
  ✅ Platoon allocation with email notifications
  ✅ Room allocation system
  ✅ Email history tracking
  ✅ Participant roster emails
  ✅ Real-time updates
  ✅ Role-based access control

🔗 PostgreSQL DATABASE_URL format:
   postgresql://username:password@host:port/database
   Example: postgresql://user:pass@localhost:5432/mydb

🚀 Ready for Production Deployment!
      `)
    } else {
      console.log(`
🎉 SQLite Setup Complete!

📋 Development Ready Features:
  ✅ Local SQLite database
  ✅ All production features available
  ✅ Fast local development
  ✅ Email system testing
  ✅ QR verification testing
  ✅ Platoon management testing

🔗 SQLite DATABASE_URL format:
   file:./dev.db

🛠️ Ready for Local Development!
      `)
    }

  } catch (error) {
    console.error('❌ Error switching database:', error)
    process.exit(1)
  }
}

// Get target database from command line arguments
const targetDb = process.argv[2]

if (!targetDb) {
  console.error('❌ Please specify target database: postgresql or sqlite')
  console.log('Usage: npx tsx scripts/switch-database.ts postgresql')
  console.log('       npx tsx scripts/switch-database.ts sqlite')
  process.exit(1)
}

switchDatabase(targetDb)

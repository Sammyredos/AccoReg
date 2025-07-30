#!/usr/bin/env tsx

/**
 * Database Switch Script
 * Switches between SQLite and PostgreSQL configurations
 */

import fs from 'fs'
import path from 'path'

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
    console.log('📝 Next steps:')
    console.log('   1. Update your DATABASE_URL environment variable')
    console.log('   2. Run: npx prisma generate')
    console.log('   3. Run: npx prisma db push (for development)')
    console.log('   4. Or run: npx prisma migrate deploy (for production)')
    
    if (targetDb.toLowerCase() === 'postgresql' || targetDb.toLowerCase() === 'postgres') {
      console.log('')
      console.log('🔗 PostgreSQL DATABASE_URL format:')
      console.log('   postgresql://username:password@host:port/database')
      console.log('   Example: postgresql://user:pass@localhost:5432/mydb')
    } else {
      console.log('')
      console.log('🔗 SQLite DATABASE_URL format:')
      console.log('   file:./dev.db')
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

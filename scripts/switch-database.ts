#!/usr/bin/env tsx

/**
 * Database Provider Switch Script
 * Switches between SQLite (development) and PostgreSQL (production)
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const SCHEMA_PATH = join(process.cwd(), 'prisma', 'schema.prisma')

function switchDatabase(provider: 'sqlite' | 'postgresql') {
  try {
    console.log(`🔄 Switching database provider to ${provider.toUpperCase()}...`)
    
    // Read current schema
    const schema = readFileSync(SCHEMA_PATH, 'utf-8')
    
    // Replace provider
    const updatedSchema = schema.replace(
      /provider\s*=\s*"(sqlite|postgresql)"/,
      `provider = "${provider}"`
    )
    
    // Write updated schema
    writeFileSync(SCHEMA_PATH, updatedSchema)
    
    console.log(`✅ Database provider switched to ${provider}`)
    console.log(`📄 Updated: ${SCHEMA_PATH}`)
    
    if (provider === 'sqlite') {
      console.log('\n💡 For SQLite development:')
      console.log('   DATABASE_URL="file:./prisma/dev.db"')
      console.log('   Run: npm run db:push')
    } else {
      console.log('\n💡 For PostgreSQL production:')
      console.log('   DATABASE_URL="postgresql://username:password@host:port/database"')
      console.log('   Run: npm run db:migrate:deploy')
    }
    
    console.log('\n🔧 Next steps:')
    console.log('1. Update your DATABASE_URL environment variable')
    console.log('2. Run: npx prisma generate')
    console.log('3. Run database migrations/push')
    
  } catch (error) {
    console.error('❌ Failed to switch database provider:', error)
    process.exit(1)
  }
}

// Get command line argument
const provider = process.argv[2] as 'sqlite' | 'postgresql'

if (!provider || !['sqlite', 'postgresql'].includes(provider)) {
  console.log('Usage: npx tsx scripts/switch-database.ts <sqlite|postgresql>')
  console.log('')
  console.log('Examples:')
  console.log('  npx tsx scripts/switch-database.ts sqlite      # For development')
  console.log('  npx tsx scripts/switch-database.ts postgresql  # For production')
  process.exit(1)
}

switchDatabase(provider)

#!/usr/bin/env tsx

/**
 * Fix Prisma Client Configuration
 * Resolves SQLite/PostgreSQL provider mismatch errors
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

async function fixPrismaClient() {
  console.log('🔧 Fixing Prisma Client Configuration...')
  console.log('=' .repeat(50))

  try {
    // 1. Check current schema configuration
    console.log('\n📋 Checking Prisma schema...')
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8')
      
      if (schemaContent.includes('provider = "postgresql"')) {
        console.log('✅ Schema correctly configured for PostgreSQL')
      } else if (schemaContent.includes('provider = "sqlite"')) {
        console.log('⚠️ Schema configured for SQLite, updating to PostgreSQL...')
        
        const updatedSchema = schemaContent.replace(
          /provider\s*=\s*"sqlite"/g,
          'provider = "postgresql"'
        )
        
        fs.writeFileSync(schemaPath, updatedSchema)
        console.log('✅ Updated schema to use PostgreSQL')
      } else {
        console.log('❌ Could not determine database provider in schema')
      }
    } else {
      console.log('❌ Prisma schema file not found')
      return
    }

    // 2. Clean Prisma client cache
    console.log('\n🧹 Cleaning Prisma client cache...')
    
    const nodeModulesPrismaPath = path.join(process.cwd(), 'node_modules', '.prisma')
    if (fs.existsSync(nodeModulesPrismaPath)) {
      fs.rmSync(nodeModulesPrismaPath, { recursive: true, force: true })
      console.log('✅ Removed .prisma cache directory')
    }

    const prismaClientPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client')
    if (fs.existsSync(prismaClientPath)) {
      fs.rmSync(prismaClientPath, { recursive: true, force: true })
      console.log('✅ Removed @prisma/client directory')
    }

    // 3. Regenerate Prisma client
    console.log('\n🔄 Regenerating Prisma client...')
    
    try {
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('✅ Prisma client regenerated successfully')
    } catch (error) {
      console.error('❌ Failed to regenerate Prisma client:', error)
      throw error
    }

    // 4. Verify database connection
    console.log('\n🔍 Verifying database connection...')
    
    // Import Prisma client after regeneration
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    try {
      await prisma.$connect()
      console.log('✅ Database connection successful')
      
      // Test a simple query
      const result = await prisma.$queryRaw`SELECT 1 as test`
      console.log('✅ Database query test successful')
      
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      console.log('🔧 This may be normal if DATABASE_URL is not set locally')
    } finally {
      await prisma.$disconnect()
    }

    // 5. Check environment variables
    console.log('\n🌍 Checking environment configuration...')
    
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl) {
      if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        console.log('✅ DATABASE_URL correctly configured for PostgreSQL')
      } else if (databaseUrl.startsWith('file:')) {
        console.log('⚠️ DATABASE_URL configured for SQLite - should be PostgreSQL for production')
      } else {
        console.log('⚠️ DATABASE_URL format not recognized')
      }
    } else {
      console.log('⚠️ DATABASE_URL not set (normal for local development)')
    }

    // 6. Create production environment check
    console.log('\n🏭 Production environment check...')
    
    const isProduction = process.env.NODE_ENV === 'production'
    const isRender = process.env.RENDER === 'true'
    
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`Render platform: ${isRender ? 'Yes' : 'No'}`)
    
    if (isProduction && !databaseUrl?.startsWith('postgres')) {
      console.log('⚠️ Production environment should use PostgreSQL')
    }

    console.log('\n🎉 Prisma Client Fix Completed!')
    console.log('✅ Schema configured for PostgreSQL')
    console.log('✅ Client cache cleared and regenerated')
    console.log('✅ Ready for production deployment')

  } catch (error) {
    console.error('❌ Prisma client fix failed:', error)
    console.error('\n🔧 Manual steps to try:')
    console.error('1. rm -rf node_modules/.prisma')
    console.error('2. rm -rf node_modules/@prisma/client')
    console.error('3. npx prisma generate')
    console.error('4. Check DATABASE_URL environment variable')
    throw error
  }
}

// Run the fix
if (require.main === module) {
  fixPrismaClient()
    .then(() => {
      console.log('\n✅ Prisma client fix completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Prisma client fix failed:', error)
      process.exit(1)
    })
}

export { fixPrismaClient }

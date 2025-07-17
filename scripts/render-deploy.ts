#!/usr/bin/env tsx

/**
 * Render Deployment Script
 * 
 * Comprehensive deployment script for Render.com
 * Handles automatic database updates, health checks, and deployment
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

class RenderDeployer {
  private isProduction = process.env.NODE_ENV === 'production'
  private autoUpdateEnabled = process.env.AUTO_DB_UPDATE_ENABLED !== 'false'

  async deploy() {
    try {
      console.log('🚀 Starting Render deployment process...')
      console.log('=' .repeat(60))
      
      // Step 1: Environment Check
      await this.checkEnvironment()
      
      // Step 2: Install Dependencies
      await this.installDependencies()
      
      // Step 3: Database Setup
      await this.setupDatabase()
      
      // Step 4: Build Application
      await this.buildApplication()
      
      // Step 5: Final Health Check
      await this.finalHealthCheck()
      
      console.log('\n🎉 Render deployment completed successfully!')
      console.log('✅ Application is ready to start')
      
    } catch (error) {
      console.error('\n💥 Deployment failed:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }

  private async checkEnvironment() {
    console.log('\n🌍 Checking environment...')
    
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'JWT_SECRET',
      'SUPER_ADMIN_PASSWORD'
    ]
    
    const missing = requiredVars.filter(varName => !process.env[varName])
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
    
    console.log('✅ Environment variables validated')
    console.log(`📍 Environment: ${this.isProduction ? 'Production' : 'Development'}`)
    console.log(`🔄 Auto-update: ${this.autoUpdateEnabled ? 'Enabled' : 'Disabled'}`)
  }

  private async installDependencies() {
    console.log('\n📦 Installing dependencies...')
    
    try {
      // Install production dependencies
      execSync('npm ci --only=production', { stdio: 'inherit' })
      
      // Install dev dependencies needed for build
      execSync('npm install --save-dev @types/node typescript tsx', { stdio: 'inherit' })
      
      console.log('✅ Dependencies installed successfully')
      
    } catch (error) {
      throw new Error(`Dependency installation failed: ${error}`)
    }
  }

  private async setupDatabase() {
    console.log('\n🗄️ Setting up database...')
    
    try {
      // Step 1: Generate Prisma client
      console.log('📦 Generating Prisma client...')
      execSync('npx prisma generate', { stdio: 'inherit' })
      
      // Step 2: Check database connection
      console.log('🔌 Testing database connection...')
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ Database connection successful')
      
      // Step 3: Auto-update database schema if enabled
      if (this.autoUpdateEnabled) {
        console.log('🔄 Checking for database schema updates...')
        await this.autoUpdateSchema()
      }
      
      // Step 4: Deploy migrations
      console.log('🚀 Deploying database migrations...')
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      
      // Step 5: Verify database state
      await this.verifyDatabase()
      
      console.log('✅ Database setup completed')
      
    } catch (error) {
      throw new Error(`Database setup failed: ${error}`)
    }
  }

  private async autoUpdateSchema() {
    try {
      // Check if schema needs updates
      const result = execSync('npx prisma db push --dry-run --skip-generate', { 
        encoding: 'utf8',
        stdio: 'pipe'
      })

      const isUpToDate = result.includes('already in sync') || result.includes('No changes')
      
      if (isUpToDate) {
        console.log('✅ Database schema is up to date')
        return
      }

      console.log('🔄 Schema changes detected, applying updates...')
      
      // Create backup if possible
      await this.createBackup()
      
      // Apply schema changes
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
      
      console.log('✅ Schema updates applied successfully')
      
    } catch (error) {
      // If dry-run fails, assume changes are needed and apply them
      console.log('🔄 Applying potential schema changes...')
      try {
        execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
        console.log('✅ Schema updates applied')
      } catch (pushError) {
        console.warn('⚠️ Schema update failed, continuing with migration deploy')
      }
    }
  }

  private async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fs = require('fs')
      const path = require('path')

      const backupDir = path.join(process.cwd(), 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      // For PostgreSQL, use pg_dump
      if (process.env.DATABASE_URL?.includes('postgresql://')) {
        try {
          const backupFile = path.join(backupDir, `backup-${timestamp}.sql`)
          execSync(`pg_dump "${process.env.DATABASE_URL}" > "${backupFile}"`, { stdio: 'inherit' })
          console.log(`📦 PostgreSQL backup created: backup-${timestamp}.sql`)
        } catch (pgError) {
          console.warn('⚠️ PostgreSQL backup failed, continuing without backup')
        }
      }

      // For SQLite, copy the database file
      if (process.env.DATABASE_URL?.includes('file:')) {
        const dbPath = process.env.DATABASE_URL.replace('file:', '')
        const backupFile = path.join(backupDir, `backup-${timestamp}.db`)

        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, backupFile)
          console.log(`📦 SQLite backup created: backup-${timestamp}.db`)
        }
      }
    } catch (error) {
      console.warn('⚠️ Backup creation failed, continuing without backup')
    }
  }

  private async verifyDatabase() {
    try {
      // Test basic operations
      await prisma.setting.findFirst()
      await prisma.admin.findFirst()
      
      // Check if branch field exists
      try {
        await prisma.registration.findFirst({ select: { branch: true } })
        console.log('✅ Branch field verified')
      } catch (error) {
        console.warn('⚠️ Branch field not found - may need manual migration')
      }
      
      // Get basic stats
      const regCount = await prisma.registration.count()
      const adminCount = await prisma.admin.count()
      
      console.log(`📊 Database stats: ${regCount} registrations, ${adminCount} admins`)
      
    } catch (error) {
      throw new Error(`Database verification failed: ${error}`)
    }
  }

  private async buildApplication() {
    console.log('\n🏗️ Building application...')
    
    try {
      // Set production environment
      process.env.NODE_ENV = 'production'
      
      // Build the application
      execSync('npm run build', { stdio: 'inherit' })
      
      console.log('✅ Application built successfully')
      
    } catch (error) {
      throw new Error(`Build failed: ${error}`)
    }
  }

  private async finalHealthCheck() {
    console.log('\n🏥 Performing final health check...')
    
    try {
      // Database connectivity
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1`
      
      // File system check
      const fs = require('fs')
      const criticalFiles = ['.next/BUILD_ID', 'package.json', 'prisma/schema.prisma']
      const missing = criticalFiles.filter(file => !fs.existsSync(file))
      
      if (missing.length > 0) {
        throw new Error(`Missing critical files: ${missing.join(', ')}`)
      }
      
      console.log('✅ Final health check passed')
      
    } catch (error) {
      throw new Error(`Final health check failed: ${error}`)
    }
  }
}

// Main execution
async function main() {
  const deployer = new RenderDeployer()
  await deployer.deploy()
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Deployment script failed:', error)
    process.exit(1)
  })
}

export { RenderDeployer }

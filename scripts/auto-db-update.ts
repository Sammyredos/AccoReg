#!/usr/bin/env tsx

/**
 * Automatic Database Update Script
 * 
 * This script automatically checks for database schema changes and applies updates
 * without requiring manual migration scripts. It's designed for production deployments
 * where you want seamless database updates.
 * 
 * Features:
 * - Automatic schema detection and updates
 * - Backup creation before updates
 * - Safe rollback capabilities
 * - Production-ready error handling
 * - Comprehensive logging
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface UpdateResult {
  success: boolean
  message: string
  changes?: string[]
  backupCreated?: boolean
  rollbackAvailable?: boolean
}

class AutoDatabaseUpdater {
  private backupDir = path.join(process.cwd(), 'backups')
  private isProduction = process.env.NODE_ENV === 'production'
  private autoUpdateEnabled = process.env.AUTO_DB_UPDATE_ENABLED === 'true'
  private backupEnabled = process.env.BACKUP_BEFORE_UPDATE === 'true'

  constructor() {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  async run(): Promise<UpdateResult> {
    try {
      console.log('🔍 Starting automatic database update check...')
      
      if (!this.autoUpdateEnabled) {
        console.log('⚠️ Auto-update disabled, skipping...')
        return { success: true, message: 'Auto-update disabled' }
      }

      // Step 1: Check current database state
      const currentState = await this.getCurrentDatabaseState()
      console.log('📊 Current database state analyzed')

      // Step 2: Generate Prisma client to ensure schema is up to date
      console.log('🔧 Regenerating Prisma client...')
      execSync('npx prisma generate', { stdio: 'inherit' })

      // Step 3: Check for schema differences
      const schemaDiff = await this.checkSchemaDifferences()
      
      if (!schemaDiff.hasChanges) {
        console.log('✅ Database schema is up to date')
        return { success: true, message: 'No updates needed' }
      }

      console.log('🔄 Schema changes detected:', schemaDiff.changes)

      // Step 4: Create backup if enabled
      let backupCreated = false
      if (this.backupEnabled) {
        backupCreated = await this.createBackup()
        if (!backupCreated) {
          console.warn('⚠️ Backup creation failed, proceeding without backup')
        }
      }

      // Step 5: Apply database updates
      const updateResult = await this.applyDatabaseUpdates()
      
      if (!updateResult.success) {
        console.error('❌ Database update failed:', updateResult.message)
        
        // Attempt rollback if backup exists
        if (backupCreated) {
          console.log('🔄 Attempting rollback...')
          await this.rollbackDatabase()
        }
        
        return updateResult
      }

      // Step 6: Verify update success
      const verificationResult = await this.verifyDatabaseState()
      
      if (!verificationResult.success) {
        console.error('❌ Database verification failed:', verificationResult.message)
        return verificationResult
      }

      console.log('✅ Database update completed successfully')
      return {
        success: true,
        message: 'Database updated successfully',
        changes: schemaDiff.changes,
        backupCreated,
        rollbackAvailable: backupCreated
      }

    } catch (error) {
      console.error('💥 Auto-update process failed:', error)
      return {
        success: false,
        message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    } finally {
      await prisma.$disconnect()
    }
  }

  private async getCurrentDatabaseState(): Promise<any> {
    try {
      // Get basic database info
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ` as any[]

      return {
        tableCount: tables.length,
        tables: tables.map(t => t.name),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.warn('⚠️ Could not analyze current database state:', error)
      return { error: 'Analysis failed' }
    }
  }

  private async checkSchemaDifferences(): Promise<{ hasChanges: boolean; changes: string[] }> {
    try {
      // Check migration status first
      try {
        const migrationResult = execSync('npx prisma migrate status', {
          encoding: 'utf8',
          stdio: 'pipe'
        })

        if (migrationResult.includes('Database is up to date') ||
            migrationResult.includes('No pending migrations')) {
          return { hasChanges: false, changes: [] }
        }

        if (migrationResult.includes('pending migration')) {
          return { hasChanges: true, changes: ['Pending migrations detected'] }
        }
      } catch (migrationError) {
        // Migration status failed, continue with other checks
        console.log('⚠️ Migration status check failed, using alternative method')
      }

      // Fallback: Try to generate client and check for schema issues
      try {
        execSync('npx prisma generate', {
          encoding: 'utf8',
          stdio: 'pipe'
        })

        // If generation succeeds, assume schema is mostly in sync
        // but still apply db push to be safe
        return { hasChanges: true, changes: ['Applying schema sync to ensure consistency'] }

      } catch (generateError) {
        // Generation failed, definitely need updates
        return { hasChanges: true, changes: ['Schema generation failed - updates needed'] }
      }

    } catch (error) {
      // If all checks fail, assume changes are needed for safety
      console.log('🔄 Schema check inconclusive, applying updates for safety')
      return { hasChanges: true, changes: ['Schema update required (safety check)'] }
    }
  }

  private parseSchemaChanges(output: string): string[] {
    const changes: string[] = []
    const lines = output.split('\n')
    
    for (const line of lines) {
      if (line.includes('CREATE TABLE') || 
          line.includes('ALTER TABLE') || 
          line.includes('DROP TABLE') ||
          line.includes('ADD COLUMN') ||
          line.includes('DROP COLUMN')) {
        changes.push(line.trim())
      }
    }
    
    return changes
  }

  private async createBackup(): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

      // For PostgreSQL, use pg_dump (if available)
      if (process.env.DATABASE_URL?.includes('postgresql://')) {
        try {
          const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`)
          execSync(`pg_dump "${process.env.DATABASE_URL}" > "${backupFile}"`, { stdio: 'inherit' })
          console.log(`📦 PostgreSQL backup created: backup-${timestamp}.sql`)
          return true
        } catch (pgError) {
          console.warn('⚠️ PostgreSQL backup failed, continuing without backup:', pgError)
          return false
        }
      }

      // For SQLite, copy the database file
      if (process.env.DATABASE_URL?.includes('file:')) {
        const dbPath = process.env.DATABASE_URL.replace('file:', '')
        const backupFile = path.join(this.backupDir, `backup-${timestamp}.db`)
        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, backupFile)
          console.log(`📦 SQLite backup created: backup-${timestamp}.db`)
          return true
        }
      }

      console.warn('⚠️ Backup not supported for this database type')
      return false

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      return false
    }
  }

  private async applyDatabaseUpdates(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Applying database updates...')
      
      // Use Prisma db push to apply schema changes
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
      
      console.log('✅ Database schema updated successfully')
      return { success: true, message: 'Schema updated' }
      
    } catch (error) {
      return {
        success: false,
        message: `Schema update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async verifyDatabaseState(): Promise<{ success: boolean; message: string }> {
    try {
      // Test basic database connectivity and operations
      await prisma.setting.findFirst()
      await prisma.admin.findFirst()
      
      console.log('✅ Database verification passed')
      return { success: true, message: 'Database verified' }
      
    } catch (error) {
      return {
        success: false,
        message: `Database verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async rollbackDatabase(): Promise<boolean> {
    try {
      // Find the most recent backup
      const backups = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
        .sort()
        .reverse()
      
      if (backups.length === 0) {
        console.error('❌ No backups available for rollback')
        return false
      }
      
      const latestBackup = path.join(this.backupDir, backups[0])
      
      // Restore from backup (SQLite)
      if (process.env.DATABASE_URL?.includes('file:')) {
        const dbPath = process.env.DATABASE_URL.replace('file:', '')
        fs.copyFileSync(latestBackup, dbPath)
        console.log(`🔄 Database rolled back from: ${latestBackup}`)
        return true
      }
      
      console.warn('⚠️ Rollback not implemented for this database type')
      return false
      
    } catch (error) {
      console.error('❌ Rollback failed:', error)
      return false
    }
  }
}

// Main execution
async function main() {
  const updater = new AutoDatabaseUpdater()
  const result = await updater.run()
  
  if (!result.success) {
    console.error('💥 Auto-update failed:', result.message)
    process.exit(1)
  }
  
  console.log('🎉 Auto-update completed:', result.message)
  
  if (result.changes && result.changes.length > 0) {
    console.log('📝 Changes applied:')
    result.changes.forEach(change => console.log(`  - ${change}`))
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script execution failed:', error)
    process.exit(1)
  })
}

export { AutoDatabaseUpdater }

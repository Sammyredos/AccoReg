import { exec } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, createReadStream } from 'fs'
import { mkdir, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { createLogger } from './logger'

const execAsync = promisify(exec)
const logger = createLogger('BackupSystem')

interface BackupConfig {
  databaseUrl: string
  backupDir: string
  retentionDays: number
  compressionEnabled: boolean
  encryptionEnabled: boolean
  encryptionKey?: string
}

interface BackupResult {
  success: boolean
  filename?: string
  size?: number
  duration?: number
  error?: string
}

export class DatabaseBackup {
  private config: BackupConfig

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      databaseUrl: process.env.DATABASE_URL || '',
      backupDir: process.env.BACKUP_DIR || './backups',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionEnabled: process.env.BACKUP_COMPRESSION === 'true',
      encryptionEnabled: process.env.BACKUP_ENCRYPTION === 'true',
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
      ...config
    }

    // Don't validate DATABASE_URL during construction to allow builds
    // Validation will happen when backup operations are actually called
  }

  private validateConfig(): void {
    if (!this.config.databaseUrl) {
      throw new Error('Database URL is required for backups')
    }
  }

  async createBackup(): Promise<BackupResult> {
    const startTime = Date.now()

    try {
      // Validate configuration before proceeding
      this.validateConfig()

      logger.info('Starting database backup')

      // Ensure backup directory exists
      await mkdir(this.config.backupDir, { recursive: true })

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const baseFilename = `backup-${timestamp}.sql`
      const filename = this.config.compressionEnabled ? `${baseFilename}.gz` : baseFilename
      const filepath = join(this.config.backupDir, filename)

      // Create the backup
      await this.performBackup(filepath)

      // Get file size
      const stats = await stat(filepath)
      const duration = Date.now() - startTime

      logger.info('Database backup completed successfully', {
        filename,
        size: stats.size,
        duration,
        compressed: this.config.compressionEnabled
      })

      // Clean up old backups
      await this.cleanupOldBackups()

      return {
        success: true,
        filename,
        size: stats.size,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Database backup failed', error, { duration })

      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async performBackup(filepath: string): Promise<void> {
    const url = new URL(this.config.databaseUrl)
    
    // Build pg_dump command
    const pgDumpCmd = [
      'pg_dump',
      `--host=${url.hostname}`,
      `--port=${url.port || 5432}`,
      `--username=${url.username}`,
      `--dbname=${url.pathname.slice(1)}`,
      '--verbose',
      '--clean',
      '--no-owner',
      '--no-privileges',
      '--format=plain'
    ].join(' ')

    // Set password environment variable
    const env = {
      ...process.env,
      PGPASSWORD: url.password
    }

    if (this.config.compressionEnabled) {
      // Pipe through gzip
      const command = `${pgDumpCmd} | gzip > "${filepath}"`
      await execAsync(command, { env, maxBuffer: 1024 * 1024 * 100 }) // 100MB buffer
    } else {
      // Direct output
      const command = `${pgDumpCmd} > "${filepath}"`
      await execAsync(command, { env, maxBuffer: 1024 * 1024 * 100 }) // 100MB buffer
    }

    // Encrypt if enabled
    if (this.config.encryptionEnabled && this.config.encryptionKey) {
      await this.encryptFile(filepath)
    }
  }

  private async encryptFile(filepath: string): Promise<void> {
    // Simple encryption using OpenSSL (in production, use proper encryption libraries)
    const encryptedPath = `${filepath}.enc`
    const command = `openssl enc -aes-256-cbc -salt -in "${filepath}" -out "${encryptedPath}" -k "${this.config.encryptionKey}"`
    
    try {
      await execAsync(command)
      await unlink(filepath) // Remove unencrypted file
      
      // Rename encrypted file to original name
      const { rename } = require('fs/promises')
      await rename(encryptedPath, filepath)
      
      logger.info('Backup file encrypted successfully')
    } catch (error) {
      logger.error('Failed to encrypt backup file', error)
      throw error
    }
  }

  async restoreBackup(filename: string): Promise<BackupResult> {
    const startTime = Date.now()

    try {
      // Validate configuration before proceeding
      this.validateConfig()

      logger.info('Starting database restore', { filename })

      const filepath = join(this.config.backupDir, filename)
      
      // Check if file exists
      await stat(filepath)

      // Decrypt if needed
      let workingFile = filepath
      if (this.config.encryptionEnabled && this.config.encryptionKey) {
        workingFile = await this.decryptFile(filepath)
      }

      // Perform restore
      await this.performRestore(workingFile)

      const duration = Date.now() - startTime
      logger.info('Database restore completed successfully', { filename, duration })

      return {
        success: true,
        filename,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Database restore failed', error, { filename, duration })

      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async decryptFile(filepath: string): Promise<string> {
    const decryptedPath = `${filepath}.dec`
    const command = `openssl enc -aes-256-cbc -d -in "${filepath}" -out "${decryptedPath}" -k "${this.config.encryptionKey}"`
    
    await execAsync(command)
    return decryptedPath
  }

  private async performRestore(filepath: string): Promise<void> {
    const url = new URL(this.config.databaseUrl)
    
    // Build psql command
    const psqlCmd = [
      'psql',
      `--host=${url.hostname}`,
      `--port=${url.port || 5432}`,
      `--username=${url.username}`,
      `--dbname=${url.pathname.slice(1)}`,
      '--verbose'
    ].join(' ')

    // Set password environment variable
    const env = {
      ...process.env,
      PGPASSWORD: url.password
    }

    let command: string
    if (filepath.endsWith('.gz')) {
      // Decompress and restore
      command = `gunzip -c "${filepath}" | ${psqlCmd}`
    } else {
      // Direct restore
      command = `${psqlCmd} < "${filepath}"`
    }

    await execAsync(command, { env, maxBuffer: 1024 * 1024 * 100 }) // 100MB buffer
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await readdir(this.config.backupDir)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

      let deletedCount = 0

      for (const file of files) {
        if (file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.sql.gz'))) {
          const filepath = join(this.config.backupDir, file)
          const stats = await stat(filepath)
          
          if (stats.mtime < cutoffDate) {
            await unlink(filepath)
            deletedCount++
            logger.info('Deleted old backup file', { filename: file, age: stats.mtime })
          }
        }
      }

      if (deletedCount > 0) {
        logger.info('Cleanup completed', { deletedFiles: deletedCount })
      }

    } catch (error) {
      logger.error('Failed to cleanup old backups', error)
    }
  }

  async listBackups(): Promise<Array<{ filename: string; size: number; created: Date }>> {
    try {
      const files = await readdir(this.config.backupDir)
      const backups: Array<{ filename: string; size: number; created: Date }> = []

      for (const file of files) {
        if (file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.sql.gz'))) {
          const filepath = join(this.config.backupDir, file)
          const stats = await stat(filepath)
          
          backups.push({
            filename: file,
            size: stats.size,
            created: stats.mtime
          })
        }
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime())

    } catch (error) {
      logger.error('Failed to list backups', error)
      return []
    }
  }

  async scheduleBackups(cronExpression: string = '0 2 * * *'): Promise<void> {
    // This would typically use a job scheduler like node-cron
    // For now, we'll just log the intention
    logger.info('Backup scheduling configured', { 
      cronExpression,
      retentionDays: this.config.retentionDays,
      compressionEnabled: this.config.compressionEnabled
    })
  }
}

// Default backup instance - lazy initialization
let _defaultBackup: DatabaseBackup | null = null

export function getDefaultBackup(): DatabaseBackup {
  if (!_defaultBackup) {
    _defaultBackup = new DatabaseBackup()
  }
  return _defaultBackup
}

// For backward compatibility
export const defaultBackup = {
  createBackup: () => getDefaultBackup().createBackup(),
  restoreBackup: (filename: string) => getDefaultBackup().restoreBackup(filename),
  cleanupOldBackups: () => getDefaultBackup().cleanupOldBackups(),
  listBackups: () => getDefaultBackup().listBackups(),
  scheduleBackups: (cronExpression?: string) => getDefaultBackup().scheduleBackups(cronExpression)
}

// Helper function to create automated backups
export async function createAutomatedBackup(): Promise<BackupResult> {
  return await getDefaultBackup().createBackup()
}

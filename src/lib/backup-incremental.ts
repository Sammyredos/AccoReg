import { prisma } from '@/lib/db'
import { createLogger } from './logger'
import { promises as fs } from 'fs'
import path from 'path'
import { createGunzip } from 'zlib'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'

// Ensure Node.js globals are available
declare const process: any
declare const Buffer: any

const logger = createLogger('IncrementalBackup')

export interface DatabaseRecord {
  id: string
  [key: string]: any
}

export interface TableData {
  tableName: string
  records: DatabaseRecord[]
  primaryKey: string
}

export interface BackupData {
  tables: TableData[]
  metadata: {
    exportedAt: string
    version: string
    recordCounts: Record<string, number>
  }
}

export interface ConflictRecord {
  table: string
  id: string
  current: DatabaseRecord
  backup: DatabaseRecord
  conflictFields: string[]
  action: 'update' | 'skip' | 'merge'
}

export interface MergeResult {
  success: boolean
  summary: {
    tablesProcessed: number
    recordsAdded: number
    recordsUpdated: number
    recordsSkipped: number
    conflictsDetected: number
  }
  conflicts: ConflictRecord[]
  errors: string[]
}

export interface MergeOptions {
  conflictResolution: 'backup_wins' | 'current_wins' | 'merge_fields' | 'manual'
  preserveNewer: boolean
  skipTables?: string[]
  onlyTables?: string[]
  dryRun?: boolean
}

export class IncrementalBackupManager {
  private readonly tableConfigs = {
    Admin: { primaryKey: 'id', timestampField: 'updatedAt' },
    User: { primaryKey: 'id', timestampField: 'updatedAt' },
    Registration: { primaryKey: 'id', timestampField: 'updatedAt' },
    Message: { primaryKey: 'id', timestampField: 'updatedAt' },
    Room: { primaryKey: 'id', timestampField: 'updatedAt' },
    RoomAllocation: { primaryKey: 'id', timestampField: 'updatedAt' },
    Role: { primaryKey: 'id', timestampField: 'updatedAt' },
    Permission: { primaryKey: 'id', timestampField: 'updatedAt' },
    SystemConfig: { primaryKey: 'id', timestampField: 'updatedAt' },
    SMSVerification: { primaryKey: 'id', timestampField: 'updatedAt' }
  }

  async extractCurrentDatabaseData(): Promise<BackupData> {
    logger.info('Extracting current database data for comparison')
    
    const tables: TableData[] = []
    const recordCounts: Record<string, number> = {}

    try {
      // Extract data from each table
      for (const [tableName, config] of Object.entries(this.tableConfigs)) {
        const modelName = tableName.toLowerCase()
        
        // Get the Prisma model dynamically
        const model = (prisma as any)[modelName]
        if (!model) {
          logger.warn(`Model ${modelName} not found in Prisma client`)
          continue
        }

        const records = await model.findMany({
          orderBy: { [config.primaryKey]: 'asc' }
        })

        // Convert dates to ISO strings for comparison
        const serializedRecords = records.map((record: any) => ({
          ...record,
          createdAt: record.createdAt?.toISOString(),
          updatedAt: record.updatedAt?.toISOString(),
          lastLogin: record.lastLogin?.toISOString(),
          phoneVerifiedAt: record.phoneVerifiedAt?.toISOString(),
          parentalPermissionDate: record.parentalPermissionDate?.toISOString(),
          verifiedAt: record.verifiedAt?.toISOString(),
          unverifiedAt: record.unverifiedAt?.toISOString(),
          attendanceTime: record.attendanceTime?.toISOString(),
          sentAt: record.sentAt?.toISOString(),
          deliveredAt: record.deliveredAt?.toISOString(),
          readAt: record.readAt?.toISOString(),
          dateOfBirth: record.dateOfBirth?.toISOString(),
          expiresAt: record.expiresAt?.toISOString()
        }))

        tables.push({
          tableName,
          records: serializedRecords,
          primaryKey: config.primaryKey
        })

        recordCounts[tableName] = records.length
        logger.info(`Extracted ${records.length} records from ${tableName}`)
      }

      return {
        tables,
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          recordCounts
        }
      }

    } catch (error) {
      logger.error('Failed to extract current database data', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async extractBackupData(backupFilePath: string): Promise<BackupData> {
    logger.info('Extracting data from backup file', { backupFilePath })

    try {
      // For now, we'll create a simplified backup data structure
      // In a real implementation, you'd parse the SQL dump file
      // For this demo, we'll assume the backup is in JSON format or create a converter

      // Check if file is compressed
      let fileContent: string
      if (backupFilePath.endsWith('.gz')) {
        fileContent = await this.readCompressedFile(backupFilePath)
      } else {
        fileContent = await fs.readFile(backupFilePath, 'utf-8')
      }

      // For SQL files, we need to parse the SQL and extract data
      // This is a simplified implementation - in production you'd use a proper SQL parser
      if (backupFilePath.endsWith('.sql') || backupFilePath.endsWith('.sql.gz')) {
        return await this.parseSQLBackup(fileContent)
      }

      // If it's already JSON format
      try {
        return JSON.parse(fileContent)
      } catch {
        throw new Error('Unsupported backup format. Expected SQL dump or JSON.')
      }

    } catch (error) {
      logger.error('Failed to extract backup data', {
        error: error instanceof Error ? error.message : String(error),
        backupFilePath
      })
      throw error
    }
  }

  private async readCompressedFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const readStream = createReadStream(filePath)
      const gunzipStream = createGunzip()

      readStream.pipe(gunzipStream)

      gunzipStream.on('data', (chunk) => {
        chunks.push(chunk)
      })

      gunzipStream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'))
      })

      gunzipStream.on('error', reject)
      readStream.on('error', reject)
    })
  }

  private async parseSQLBackup(sqlContent: string): Promise<BackupData> {
    // This is a simplified SQL parser for demonstration
    // In production, you'd use a proper SQL parser library
    
    const tables: TableData[] = []
    const recordCounts: Record<string, number> = {}

    // Extract INSERT statements for each table
    for (const [tableName, config] of Object.entries(this.tableConfigs)) {
      const tableNameLower = tableName.toLowerCase()
      const insertRegex = new RegExp(`INSERT INTO ["']?${tableNameLower}s?["']?\\s*\\([^)]+\\)\\s*VALUES\\s*\\(([^;]+)\\);`, 'gi')
      
      const records: DatabaseRecord[] = []
      let match

      while ((match = insertRegex.exec(sqlContent)) !== null) {
        try {
          // This is a very basic parser - in production use a proper SQL parser
          const valuesString = match[1]
          // Parse the values (this is simplified and may not handle all SQL formats)
          const record = this.parseInsertValues(valuesString, config.primaryKey)
          if (record) {
            records.push(record)
          }
        } catch (error) {
          logger.warn(`Failed to parse record from ${tableName}`, { error })
        }
      }

      if (records.length > 0) {
        tables.push({
          tableName,
          records,
          primaryKey: config.primaryKey
        })
        recordCounts[tableName] = records.length
      }
    }

    return {
      tables,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        recordCounts
      }
    }
  }

  private parseInsertValues(valuesString: string, primaryKey: string): DatabaseRecord | null {
    // This is a very simplified parser - in production you'd use a proper SQL parser
    // For now, we'll return a mock record structure
    try {
      // Extract values between parentheses and quotes
      const values = valuesString.split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''))
      
      // Create a basic record structure (this would need to match your actual schema)
      return {
        id: values[0] || 'unknown',
        // Add other fields as needed based on your schema
      }
    } catch {
      return null
    }
  }

  async createIncrementalBackup(): Promise<BackupData> {
    logger.info('Creating incremental backup data')
    return await this.extractCurrentDatabaseData()
  }

  async saveIncrementalBackup(data: BackupData, filename?: string): Promise<string> {
    const backupDir = process.env.BACKUP_DIR || './backups'
    await fs.mkdir(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFilename = filename || `incremental-backup-${timestamp}.json`
    const filepath = path.join(backupDir, backupFilename)

    await fs.writeFile(filepath, JSON.stringify(data, null, 2))

    logger.info('Incremental backup saved', { filepath, filename: backupFilename })
    return backupFilename
  }

  async compareData(currentData: BackupData, backupData: BackupData, options: MergeOptions): Promise<{
    conflicts: ConflictRecord[]
    newRecords: { table: string; records: DatabaseRecord[] }[]
    updatedRecords: { table: string; records: DatabaseRecord[] }[]
    unchangedRecords: { table: string; count: number }[]
  }> {
    logger.info('Comparing current data with backup data')

    const conflicts: ConflictRecord[] = []
    const newRecords: { table: string; records: DatabaseRecord[] }[] = []
    const updatedRecords: { table: string; records: DatabaseRecord[] }[] = []
    const unchangedRecords: { table: string; count: number }[] = []

    // Create lookup maps for current data
    const currentDataMap = new Map<string, Map<string, DatabaseRecord>>()
    for (const table of currentData.tables) {
      const recordMap = new Map<string, DatabaseRecord>()
      for (const record of table.records) {
        recordMap.set(record[table.primaryKey], record)
      }
      currentDataMap.set(table.tableName, recordMap)
    }

    // Compare each table in backup data
    for (const backupTable of backupData.tables) {
      if (options.skipTables?.includes(backupTable.tableName)) {
        continue
      }

      if (options.onlyTables && !options.onlyTables.includes(backupTable.tableName)) {
        continue
      }

      const currentTable = currentDataMap.get(backupTable.tableName)
      if (!currentTable) {
        // Table doesn't exist in current data - all records are new
        newRecords.push({
          table: backupTable.tableName,
          records: backupTable.records
        })
        continue
      }

      const tableNewRecords: DatabaseRecord[] = []
      const tableUpdatedRecords: DatabaseRecord[] = []
      let unchangedCount = 0

      for (const backupRecord of backupTable.records) {
        const recordId = backupRecord[backupTable.primaryKey]
        const currentRecord = currentTable.get(recordId)

        if (!currentRecord) {
          // Record doesn't exist in current data - it's new
          tableNewRecords.push(backupRecord)
        } else {
          // Record exists - check for differences
          const comparison = this.compareRecords(currentRecord, backupRecord, backupTable.tableName)

          if (comparison.hasChanges) {
            if (comparison.hasConflicts && options.conflictResolution === 'manual') {
              conflicts.push({
                table: backupTable.tableName,
                id: recordId,
                current: currentRecord,
                backup: backupRecord,
                conflictFields: comparison.conflictFields,
                action: 'update'
              })
            } else {
              // Determine action based on conflict resolution strategy
              const resolvedRecord = this.resolveConflict(
                currentRecord,
                backupRecord,
                options,
                backupTable.tableName
              )

              if (resolvedRecord) {
                tableUpdatedRecords.push(resolvedRecord)
              }
            }
          } else {
            unchangedCount++
          }
        }
      }

      if (tableNewRecords.length > 0) {
        newRecords.push({
          table: backupTable.tableName,
          records: tableNewRecords
        })
      }

      if (tableUpdatedRecords.length > 0) {
        updatedRecords.push({
          table: backupTable.tableName,
          records: tableUpdatedRecords
        })
      }

      if (unchangedCount > 0) {
        unchangedRecords.push({
          table: backupTable.tableName,
          count: unchangedCount
        })
      }
    }

    logger.info('Data comparison completed', {
      conflicts: conflicts.length,
      newRecords: newRecords.reduce((sum, t) => sum + t.records.length, 0),
      updatedRecords: updatedRecords.reduce((sum, t) => sum + t.records.length, 0),
      unchangedRecords: unchangedRecords.reduce((sum, t) => sum + t.count, 0)
    })

    return { conflicts, newRecords, updatedRecords, unchangedRecords }
  }

  private compareRecords(current: DatabaseRecord, backup: DatabaseRecord, tableName: string): {
    hasChanges: boolean
    hasConflicts: boolean
    conflictFields: string[]
  } {
    const conflictFields: string[] = []
    let hasChanges = false
    let hasConflicts = false

    const config = this.tableConfigs[tableName as keyof typeof this.tableConfigs]
    const timestampField = config?.timestampField

    // Compare all fields except timestamps initially
    for (const [key, backupValue] of Object.entries(backup)) {
      if (key === timestampField) continue // Handle timestamps separately

      const currentValue = current[key]

      if (JSON.stringify(currentValue) !== JSON.stringify(backupValue)) {
        hasChanges = true

        // Check if this is a conflict (both values exist but are different)
        if (currentValue !== null && currentValue !== undefined &&
            backupValue !== null && backupValue !== undefined) {
          conflictFields.push(key)
          hasConflicts = true
        }
      }
    }

    // Handle timestamp-based conflicts
    if (timestampField && current[timestampField] && backup[timestampField]) {
      const currentTime = new Date(current[timestampField]).getTime()
      const backupTime = new Date(backup[timestampField]).getTime()

      if (currentTime > backupTime) {
        // Current record is newer - potential conflict
        hasConflicts = true
      }
    }

    return { hasChanges, hasConflicts, conflictFields }
  }

  private resolveConflict(
    current: DatabaseRecord,
    backup: DatabaseRecord,
    options: MergeOptions,
    tableName: string
  ): DatabaseRecord | null {
    const config = this.tableConfigs[tableName as keyof typeof this.tableConfigs]
    const timestampField = config?.timestampField

    switch (options.conflictResolution) {
      case 'backup_wins':
        return backup

      case 'current_wins':
        return null // Don't update

      case 'merge_fields':
        // Merge non-conflicting fields, prefer backup for conflicts
        const merged = { ...current }
        for (const [key, value] of Object.entries(backup)) {
          if (key !== timestampField) {
            merged[key] = value
          }
        }
        return merged

      default:
        // For preserveNewer option
        if (options.preserveNewer && timestampField) {
          const currentTime = new Date(current[timestampField] || 0).getTime()
          const backupTime = new Date(backup[timestampField] || 0).getTime()

          return currentTime > backupTime ? null : backup
        }

        return backup
    }
  }

  async performIncrementalMerge(
    backupData: BackupData,
    options: MergeOptions
  ): Promise<MergeResult> {
    logger.info('Starting incremental merge', { options })

    const result: MergeResult = {
      success: false,
      summary: {
        tablesProcessed: 0,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        conflictsDetected: 0
      },
      conflicts: [],
      errors: []
    }

    try {
      // Get current database state
      const currentData = await this.extractCurrentDatabaseData()

      // Compare data and identify changes
      const comparison = await this.compareData(currentData, backupData, options)

      result.conflicts = comparison.conflicts
      result.summary.conflictsDetected = comparison.conflicts.length

      if (options.dryRun) {
        // For dry run, just return the analysis
        result.success = true
        result.summary.recordsAdded = comparison.newRecords.reduce((sum, t) => sum + t.records.length, 0)
        result.summary.recordsUpdated = comparison.updatedRecords.reduce((sum, t) => sum + t.records.length, 0)
        result.summary.tablesProcessed = backupData.tables.length

        logger.info('Dry run completed', { summary: result.summary })
        return result
      }

      // Perform actual merge operations
      await prisma.$transaction(async (tx) => {
        // Add new records
        for (const tableData of comparison.newRecords) {
          const modelName = tableData.table.toLowerCase()
          const model = (tx as any)[modelName]

          if (!model) {
            result.errors.push(`Model ${modelName} not found`)
            continue
          }

          for (const record of tableData.records) {
            try {
              // Convert string dates back to Date objects
              const processedRecord = this.processRecordForDatabase(record)
              await model.create({ data: processedRecord })
              result.summary.recordsAdded++
            } catch (error) {
              const errorMsg = `Failed to add record ${record.id} to ${tableData.table}: ${error}`
              result.errors.push(errorMsg)
              logger.error('Failed to add record', { error: errorMsg })
            }
          }
        }

        // Update existing records
        for (const tableData of comparison.updatedRecords) {
          const modelName = tableData.table.toLowerCase()
          const model = (tx as any)[modelName]

          if (!model) {
            result.errors.push(`Model ${modelName} not found`)
            continue
          }

          const config = this.tableConfigs[tableData.table as keyof typeof this.tableConfigs]

          for (const record of tableData.records) {
            try {
              const processedRecord = this.processRecordForDatabase(record)
              const { [config.primaryKey]: id, ...updateData } = processedRecord

              await model.update({
                where: { [config.primaryKey]: id },
                data: updateData
              })
              result.summary.recordsUpdated++
            } catch (error) {
              const errorMsg = `Failed to update record ${record.id} in ${tableData.table}: ${error}`
              result.errors.push(errorMsg)
              logger.error('Failed to update record', { error: errorMsg })
            }
          }
        }

        result.summary.tablesProcessed = backupData.tables.length
      })

      result.success = result.errors.length === 0

      logger.info('Incremental merge completed', {
        success: result.success,
        summary: result.summary,
        errorCount: result.errors.length
      })

    } catch (error) {
      const errorMsg = `Incremental merge failed: ${error instanceof Error ? error.message : String(error)}`
      result.errors.push(errorMsg)
      logger.error('Incremental merge failed', { error: errorMsg })
    }

    return result
  }

  private processRecordForDatabase(record: DatabaseRecord): any {
    const processed = { ...record }

    // Convert ISO string dates back to Date objects
    const dateFields = [
      'createdAt', 'updatedAt', 'lastLogin', 'phoneVerifiedAt',
      'parentalPermissionDate', 'verifiedAt', 'unverifiedAt',
      'attendanceTime', 'sentAt', 'deliveredAt', 'readAt',
      'dateOfBirth', 'expiresAt'
    ]

    for (const field of dateFields) {
      if (processed[field] && typeof processed[field] === 'string') {
        try {
          processed[field] = new Date(processed[field])
        } catch {
          // If date parsing fails, keep as string or set to null
          processed[field] = null
        }
      }
    }

    return processed
  }

  async analyzeBackupFile(backupFilePath: string, options: MergeOptions): Promise<{
    summary: {
      totalRecords: number
      tableBreakdown: Record<string, number>
      estimatedChanges: {
        newRecords: number
        updatedRecords: number
        conflicts: number
      }
    }
    conflicts: ConflictRecord[]
  }> {
    logger.info('Analyzing backup file for merge preview', { backupFilePath })

    try {
      const backupData = await this.extractBackupData(backupFilePath)
      const currentData = await this.extractCurrentDatabaseData()

      const comparison = await this.compareData(currentData, backupData, {
        ...options,
        dryRun: true
      })

      const totalRecords = backupData.tables.reduce((sum, table) => sum + table.records.length, 0)
      const tableBreakdown: Record<string, number> = {}

      for (const table of backupData.tables) {
        tableBreakdown[table.tableName] = table.records.length
      }

      return {
        summary: {
          totalRecords,
          tableBreakdown,
          estimatedChanges: {
            newRecords: comparison.newRecords.reduce((sum, t) => sum + t.records.length, 0),
            updatedRecords: comparison.updatedRecords.reduce((sum, t) => sum + t.records.length, 0),
            conflicts: comparison.conflicts.length
          }
        },
        conflicts: comparison.conflicts
      }

    } catch (error) {
      logger.error('Failed to analyze backup file', {
        error: error instanceof Error ? error.message : String(error),
        backupFilePath
      })
      throw error
    }
  }
}

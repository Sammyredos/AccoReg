import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { IncrementalBackupManager, MergeOptions } from '@/lib/backup-incremental'
import { createLogger } from '@/lib/logger'
import { promises as fs } from 'fs'
import path from 'path'

// Ensure Node.js globals are available
declare const process: any
declare const Buffer: any

const logger = createLogger('BackupMergeAPI')

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// POST endpoint for performing incremental merge
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      action, 
      filename, 
      options = {},
      conflictResolutions = {} 
    } = body

    const mergeOptions: MergeOptions = {
      conflictResolution: options.conflictResolution || 'backup_wins',
      preserveNewer: options.preserveNewer || false,
      skipTables: options.skipTables || [],
      onlyTables: options.onlyTables || undefined,
      dryRun: options.dryRun || false
    }

    const backupManager = new IncrementalBackupManager()

    logger.info('Incremental merge action requested', {
      userId: currentUser.id,
      action,
      filename,
      options: mergeOptions
    })

    switch (action) {
      case 'analyze':
        if (!filename) {
          return NextResponse.json({
            error: 'Filename is required for analysis'
          }, { status: 400 })
        }

        const backupDir = process.env.BACKUP_DIR || './backups'
        const filepath = path.join(backupDir, filename)

        // Security check
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
        }

        try {
          const analysis = await backupManager.analyzeBackupFile(filepath, mergeOptions)
          
          logger.info('Backup analysis completed', {
            userId: currentUser.id,
            filename,
            summary: analysis.summary
          })

          return NextResponse.json({
            success: true,
            analysis: {
              ...analysis,
              filename,
              fileSize: (await fs.stat(filepath)).size,
              fileSizeFormatted: formatFileSize((await fs.stat(filepath)).size)
            }
          })

        } catch (error) {
          logger.error('Backup analysis failed', {
            error: error instanceof Error ? error.message : String(error),
            userId: currentUser.id,
            filename
          })

          return NextResponse.json({
            error: 'Failed to analyze backup file',
            details: error instanceof Error ? error.message : String(error)
          }, { status: 500 })
        }

      case 'merge':
        if (!filename) {
          return NextResponse.json({
            error: 'Filename is required for merge operation'
          }, { status: 400 })
        }

        const mergeFilepath = path.join(process.env.BACKUP_DIR || './backups', filename)

        // Security check
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
        }

        try {
          // Extract backup data
          const backupData = await backupManager.extractBackupData(mergeFilepath)
          
          // Apply any manual conflict resolutions
          if (Object.keys(conflictResolutions).length > 0) {
            // Process manual conflict resolutions
            for (const table of backupData.tables) {
              for (let i = 0; i < table.records.length; i++) {
                const recordId = table.records[i][table.primaryKey]
                const resolutionKey = `${table.tableName}_${recordId}`
                
                if (conflictResolutions[resolutionKey]) {
                  const resolution = conflictResolutions[resolutionKey]
                  if (resolution.action === 'skip') {
                    table.records.splice(i, 1)
                    i--
                  } else if (resolution.action === 'use_custom' && resolution.customData) {
                    table.records[i] = { ...table.records[i], ...resolution.customData }
                  }
                }
              }
            }
          }

          // Perform the merge
          const mergeResult = await backupManager.performIncrementalMerge(backupData, mergeOptions)

          if (mergeResult.success) {
            logger.info('Incremental merge completed successfully', {
              userId: currentUser.id,
              filename,
              summary: mergeResult.summary
            })

            return NextResponse.json({
              success: true,
              message: 'Incremental merge completed successfully',
              result: {
                summary: mergeResult.summary,
                conflicts: mergeResult.conflicts,
                errors: mergeResult.errors
              }
            })
          } else {
            logger.error('Incremental merge failed', {
              userId: currentUser.id,
              filename,
              errors: mergeResult.errors
            })

            return NextResponse.json({
              error: 'Incremental merge failed',
              details: mergeResult.errors,
              partialResult: mergeResult.summary
            }, { status: 500 })
          }

        } catch (error) {
          logger.error('Incremental merge operation failed', {
            error: error instanceof Error ? error.message : String(error),
            userId: currentUser.id,
            filename
          })

          return NextResponse.json({
            error: 'Failed to perform incremental merge',
            details: error instanceof Error ? error.message : String(error)
          }, { status: 500 })
        }

      case 'create-incremental-backup':
        try {
          const incrementalData = await backupManager.createIncrementalBackup()
          const savedFilename = await backupManager.saveIncrementalBackup(incrementalData)

          logger.info('Incremental backup created', {
            userId: currentUser.id,
            filename: savedFilename,
            recordCounts: incrementalData.metadata.recordCounts
          })

          return NextResponse.json({
            success: true,
            message: 'Incremental backup created successfully',
            backup: {
              filename: savedFilename,
              metadata: incrementalData.metadata,
              size: (await fs.stat(path.join(process.env.BACKUP_DIR || './backups', savedFilename))).size
            }
          })

        } catch (error) {
          logger.error('Failed to create incremental backup', {
            error: error instanceof Error ? error.message : String(error),
            userId: currentUser.id
          })

          return NextResponse.json({
            error: 'Failed to create incremental backup',
            details: error instanceof Error ? error.message : String(error)
          }, { status: 500 })
        }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: analyze, merge, create-incremental-backup'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Backup merge API operation failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json({
      error: 'Backup merge operation failed'
    }, { status: 500 })
  }
}

// GET endpoint for merge configuration and status
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Return merge configuration and available options
    return NextResponse.json({
      success: true,
      config: {
        conflictResolutionOptions: [
          { value: 'backup_wins', label: 'Backup Data Wins', description: 'Use backup data for all conflicts' },
          { value: 'current_wins', label: 'Current Data Wins', description: 'Keep current data for all conflicts' },
          { value: 'merge_fields', label: 'Merge Fields', description: 'Merge non-conflicting fields, backup wins for conflicts' },
          { value: 'manual', label: 'Manual Resolution', description: 'Review each conflict manually' }
        ],
        supportedTables: [
          'Admin', 'User', 'Registration', 'Message', 'Room', 
          'RoomAllocation', 'Role', 'Permission', 'SystemConfig', 'SMSVerification'
        ],
        features: {
          dryRun: true,
          preserveNewer: true,
          selectiveTables: true,
          conflictPreview: true,
          manualResolution: true
        }
      }
    })

  } catch (error) {
    logger.error('Failed to get merge configuration', {
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json({
      error: 'Failed to get merge configuration'
    }, { status: 500 })
  }
}

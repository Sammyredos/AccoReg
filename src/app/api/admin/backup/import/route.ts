import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { defaultBackup } from '@/lib/backup'
import { createLogger } from '@/lib/logger'
import { promises as fs } from 'fs'
import path from 'path'

// Ensure Node.js globals are available
declare const process: any
declare const Buffer: any

const logger = createLogger('BackupImportAPI')

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function validateBackupFile(filename: string, size: number): { valid: boolean; error?: string } {
  // Check file extension
  if (!filename.endsWith('.sql') && !filename.endsWith('.sql.gz')) {
    return { valid: false, error: 'Invalid file type. Only .sql and .sql.gz files are allowed.' }
  }

  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024 // 500MB
  if (size > maxSize) {
    return { valid: false, error: `File too large. Maximum size is ${formatFileSize(maxSize)}.` }
  }

  // Check filename format (should be backup-* or allow custom names)
  const validPattern = /^[a-zA-Z0-9_-]+\.(sql|sql\.gz)$/
  if (!validPattern.test(filename)) {
    return { valid: false, error: 'Invalid filename format. Use only letters, numbers, hyphens, and underscores.' }
  }

  return { valid: true }
}

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

    const formData = await request.formData()
    const file = formData.get('backup') as File
    const action = formData.get('action') as string || 'upload'
    const restoreImmediately = formData.get('restoreImmediately') === 'true'

    if (!file) {
      return NextResponse.json({
        error: 'No backup file provided'
      }, { status: 400 })
    }

    // Validate the uploaded file
    const validation = validateBackupFile(file.name, file.size)
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error
      }, { status: 400 })
    }

    logger.info('Backup file upload started', {
      userId: currentUser.id,
      filename: file.name,
      size: file.size,
      action,
      restoreImmediately
    })

    // Ensure backup directory exists
    const backupDir = process.env.BACKUP_DIR || './backups'
    await fs.mkdir(backupDir, { recursive: true })

    // Generate unique filename to avoid conflicts
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const originalName = file.name
    const extension = originalName.split('.').slice(-1).join('.')
    const baseName = originalName.replace(/\.(sql|sql\.gz)$/, '')
    const uniqueFilename = `imported-${baseName}-${timestamp}.${extension}`
    const filepath = path.join(backupDir, uniqueFilename)

    try {
      // Save the uploaded file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await fs.writeFile(filepath, buffer)

      logger.info('Backup file saved successfully', {
        userId: currentUser.id,
        originalName,
        savedAs: uniqueFilename,
        size: file.size
      })

      // If restore immediately is requested, perform the restore
      if (restoreImmediately) {
        logger.info('Starting immediate restore', {
          userId: currentUser.id,
          filename: uniqueFilename
        })

        const restoreResult = await defaultBackup.restoreBackup(uniqueFilename)
        
        if (restoreResult.success) {
          logger.info('Database restored successfully from uploaded backup', {
            userId: currentUser.id,
            filename: uniqueFilename,
            duration: restoreResult.duration
          })

          // Optionally clean up the uploaded file after successful restore
          try {
            await fs.unlink(filepath)
            logger.info('Temporary backup file cleaned up', { filename: uniqueFilename })
          } catch (cleanupError) {
            logger.warn('Failed to clean up temporary backup file', cleanupError)
          }

          return NextResponse.json({
            success: true,
            message: 'Backup uploaded and database restored successfully',
            backup: {
              originalName,
              size: file.size,
              sizeFormatted: formatFileSize(file.size),
              restored: true,
              duration: restoreResult.duration
            }
          })
        } else {
          logger.error('Database restore failed after upload', {
            error: restoreResult.error,
            userId: currentUser.id,
            filename: uniqueFilename
          })

          // Clean up the uploaded file since restore failed
          try {
            await fs.unlink(filepath)
          } catch (cleanupError) {
            logger.warn('Failed to clean up backup file after restore failure', cleanupError)
          }

          return NextResponse.json({
            error: 'Backup uploaded but restore failed',
            details: restoreResult.error
          }, { status: 500 })
        }
      } else {
        // Just upload, don't restore
        const fileStats = await fs.stat(filepath)
        
        return NextResponse.json({
          success: true,
          message: 'Backup uploaded successfully',
          backup: {
            filename: uniqueFilename,
            originalName,
            size: fileStats.size,
            sizeFormatted: formatFileSize(fileStats.size),
            uploaded: new Date().toISOString(),
            restored: false
          }
        })
      }

    } catch (fileError) {
      logger.error('Failed to save uploaded backup file', {
        error: fileError instanceof Error ? fileError.message : String(fileError),
        userId: currentUser.id,
        filename: file.name
      })

      return NextResponse.json({
        error: 'Failed to save uploaded backup file'
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Backup import operation failed', error)
    return NextResponse.json({
      error: 'Backup import operation failed'
    }, { status: 500 })
  }
}

// GET endpoint to check import status or list imported backups
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

    // Return import configuration and limits
    return NextResponse.json({
      success: true,
      config: {
        maxFileSize: 500 * 1024 * 1024, // 500MB
        maxFileSizeFormatted: formatFileSize(500 * 1024 * 1024),
        allowedExtensions: ['.sql', '.sql.gz'],
        supportedActions: ['upload', 'upload-and-restore'],
        backupDirectory: process.env.BACKUP_DIR || './backups'
      }
    })

  } catch (error) {
    logger.error('Failed to get import configuration', error)
    return NextResponse.json({
      error: 'Failed to get import configuration'
    }, { status: 500 })
  }
}

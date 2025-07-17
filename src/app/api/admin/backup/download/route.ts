import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { defaultBackup } from '@/lib/backup'
import { createLogger } from '@/lib/logger'
import { promises as fs } from 'fs'
import path from 'path'

// Ensure Node.js globals are available
declare const process: any

const logger = createLogger('BackupDownloadAPI')

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

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

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const action = searchParams.get('action') || 'download'

    // If no filename provided, create a new backup and download it
    if (!filename && action === 'create-and-download') {
      logger.info('Creating new backup for download', { userId: currentUser.id })
      
      const createResult = await defaultBackup.createBackup()
      
      if (!createResult.success || !createResult.filename) {
        logger.error('Failed to create backup for download', {
          error: createResult.error,
          userId: currentUser.id
        })
        return NextResponse.json({
          error: 'Failed to create backup',
          details: createResult.error
        }, { status: 500 })
      }

      // Now download the created backup
      const backupDir = process.env.BACKUP_DIR || './backups'
      const filepath = path.join(backupDir, createResult.filename)

      try {
        const fileBuffer = await fs.readFile(filepath)
        const fileStats = await fs.stat(filepath)
        
        logger.info('Backup created and downloaded successfully', {
          userId: currentUser.id,
          filename: createResult.filename,
          size: fileStats.size
        })

        // Set appropriate headers for file download
        const headers = new Headers()
        headers.set('Content-Type', 'application/octet-stream')
        headers.set('Content-Disposition', `attachment; filename="${createResult.filename}"`)
        headers.set('Content-Length', fileStats.size.toString())
        headers.set('X-Backup-Info', JSON.stringify({
          filename: createResult.filename,
          size: fileStats.size,
          sizeFormatted: formatFileSize(fileStats.size),
          created: fileStats.mtime.toISOString(),
          duration: createResult.duration
        }))

        return new NextResponse(fileBuffer, { headers })
        
      } catch (error) {
        logger.error('Failed to read backup file for download', {
          error: error instanceof Error ? error.message : String(error),
          userId: currentUser.id,
          filename: createResult.filename
        })
        return NextResponse.json({
          error: 'Failed to read backup file'
        }, { status: 500 })
      }
    }

    // Download existing backup file
    if (filename && action === 'download') {
      const backupDir = process.env.BACKUP_DIR || './backups'
      const filepath = path.join(backupDir, filename)
      
      // Security check: ensure filename doesn't contain path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
      }

      // Verify file exists and is a backup file
      if (!filename.startsWith('backup-') || (!filename.endsWith('.sql') && !filename.endsWith('.sql.gz'))) {
        return NextResponse.json({ error: 'Invalid backup file' }, { status: 400 })
      }

      try {
        const fileBuffer = await fs.readFile(filepath)
        const fileStats = await fs.stat(filepath)
        
        logger.info('Backup file downloaded', {
          userId: currentUser.id,
          filename,
          size: fileStats.size
        })

        // Set appropriate headers for file download
        const headers = new Headers()
        headers.set('Content-Type', 'application/octet-stream')
        headers.set('Content-Disposition', `attachment; filename="${filename}"`)
        headers.set('Content-Length', fileStats.size.toString())
        headers.set('X-Backup-Info', JSON.stringify({
          filename,
          size: fileStats.size,
          sizeFormatted: formatFileSize(fileStats.size),
          created: fileStats.mtime.toISOString()
        }))

        return new NextResponse(fileBuffer, { headers })
        
      } catch (error) {
        logger.error('Failed to read backup file', {
          error: error instanceof Error ? error.message : String(error),
          userId: currentUser.id,
          filename
        })
        
        if ((error as any).code === 'ENOENT') {
          return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
        }
        
        return NextResponse.json({
          error: 'Failed to read backup file'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      error: 'Invalid request. Use ?action=create-and-download or ?action=download&filename=backup.sql'
    }, { status: 400 })

  } catch (error) {
    logger.error('Backup download operation failed', error)
    return NextResponse.json({
      error: 'Backup download operation failed'
    }, { status: 500 })
  }
}

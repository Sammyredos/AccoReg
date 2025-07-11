import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { defaultBackup } from '@/lib/backup'
import { createLogger } from '@/lib/logger'

const logger = createLogger('BackupAPI')

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

    // List available backups
    const backups = await defaultBackup.listBackups()

    logger.info('Backup list requested', { 
      userId: currentUser.id,
      backupCount: backups.length 
    })

    return NextResponse.json({
      success: true,
      backups: backups.map(backup => ({
        ...backup,
        sizeFormatted: formatFileSize(backup.size)
      }))
    })

  } catch (error) {
    logger.error('Failed to list backups', error)
    return NextResponse.json({
      error: 'Failed to retrieve backup list'
    }, { status: 500 })
  }
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

    const body = await request.json()
    const { action, filename } = body

    logger.info('Backup action requested', { 
      userId: currentUser.id,
      action,
      filename 
    })

    switch (action) {
      case 'create':
        const createResult = await defaultBackup.createBackup()
        
        if (createResult.success) {
          logger.info('Backup created successfully', {
            userId: currentUser.id,
            filename: createResult.filename,
            size: createResult.size,
            duration: createResult.duration
          })

          return NextResponse.json({
            success: true,
            message: 'Backup created successfully',
            backup: {
              filename: createResult.filename,
              size: createResult.size,
              sizeFormatted: formatFileSize(createResult.size || 0),
              duration: createResult.duration
            }
          })
        } else {
          logger.error('Backup creation failed', new Error(createResult.error), {
            userId: currentUser.id
          })

          return NextResponse.json({
            error: 'Failed to create backup',
            details: createResult.error
          }, { status: 500 })
        }

      case 'restore':
        if (!filename) {
          return NextResponse.json({
            error: 'Filename is required for restore operation'
          }, { status: 400 })
        }

        const restoreResult = await defaultBackup.restoreBackup(filename)
        
        if (restoreResult.success) {
          logger.info('Database restored successfully', {
            userId: currentUser.id,
            filename,
            duration: restoreResult.duration
          })

          return NextResponse.json({
            success: true,
            message: 'Database restored successfully',
            duration: restoreResult.duration
          })
        } else {
          logger.error('Database restore failed', new Error(restoreResult.error), {
            userId: currentUser.id,
            filename
          })

          return NextResponse.json({
            error: 'Failed to restore database',
            details: restoreResult.error
          }, { status: 500 })
        }

      case 'cleanup':
        await defaultBackup.cleanupOldBackups()
        
        logger.info('Backup cleanup completed', {
          userId: currentUser.id
        })

        return NextResponse.json({
          success: true,
          message: 'Old backups cleaned up successfully'
        })

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: create, restore, cleanup'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Backup operation failed', error)
    return NextResponse.json({
      error: 'Backup operation failed'
    }, { status: 500 })
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

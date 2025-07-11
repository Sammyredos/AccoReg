import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest, hasPermission } from '@/lib/auth-helpers'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    const body = await request.json()
    const { ids, action } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Notification IDs are required' },
        { status: 400 }
      )
    }

    let result
    let message

    switch (action) {
      case 'delete':
        result = await prisma.notification.deleteMany({
          where: {
            id: {
              in: ids
            }
          }
        })
        message = `${result.count} notifications deleted successfully`
        break

      case 'mark_read':
        result = await prisma.notification.updateMany({
          where: {
            id: {
              in: ids
            }
          },
          data: {
            isRead: true
          }
        })
        message = `${result.count} notifications marked as read`
        break

      case 'mark_unread':
        result = await prisma.notification.updateMany({
          where: {
            id: {
              in: ids
            }
          },
          data: {
            isRead: false
          }
        })
        message = `${result.count} notifications marked as unread`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: delete, mark_read, or mark_unread' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message,
      affected: result.count
    })

  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}

// Clear old notifications (older than specified days)
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    const body = await request.json()
    const { days = 30, onlyRead = true } = body

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Build where clause
    const where: any = {
      createdAt: {
        lt: cutoffDate
      }
    }

    if (onlyRead) {
      where.isRead = true
    }

    // Delete old notifications
    const result = await prisma.notification.deleteMany({
      where
    })

    return NextResponse.json({
      message: `${result.count} old notifications cleared`,
      affected: result.count,
      cutoffDate: cutoffDate.toISOString()
    })

  } catch (error) {
    console.error('Error clearing old notifications:', error)
    return NextResponse.json(
      { error: 'Failed to clear old notifications' },
      { status: 500 }
    )
  }
}

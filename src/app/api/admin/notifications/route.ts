import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const filter = searchParams.get('filter') || 'all' // all, unread, read
    const priority = searchParams.get('priority') || 'all' // all, high, medium, low

    const skip = (page - 1) * limit

    // Build where clause - filter by current user
    let where: any = {
      OR: [
        { recipientId: currentUser.id }, // Notifications specifically for this user
        { recipientId: null } // Global notifications (for all users)
      ]
    }

    if (filter === 'unread') {
      where.isRead = false
    } else if (filter === 'read') {
      where.isRead = true
    }

    if (priority !== 'all') {
      where.priority = priority
    }

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    // Update notification user names with current user data
    const updatedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.authorizedByEmail) {
          // Try to find current user name from both admin and user tables
          let currentUser = await prisma.admin.findUnique({
            where: { email: notification.authorizedByEmail },
            select: { name: true }
          })

          if (!currentUser) {
            currentUser = await prisma.user.findUnique({
              where: { email: notification.authorizedByEmail },
              select: { name: true }
            })
          }

          // Update the notification with current user name if found and different
          if (currentUser && currentUser.name !== notification.authorizedBy) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { authorizedBy: currentUser.name }
            })
            return { ...notification, authorizedBy: currentUser.name }
          }
        }
        return notification
      })
    )

    // Get total count for pagination
    const totalCount = await prisma.notification.count({ where })

    // Get stats for current user
    const userNotificationWhere = {
      OR: [
        { recipientId: currentUser.id },
        { recipientId: null }
      ]
    }

    const stats = {
      total: await prisma.notification.count({ where: userNotificationWhere }),
      unread: await prisma.notification.count({
        where: {
          ...userNotificationWhere,
          isRead: false
        }
      }),
      high: await prisma.notification.count({
        where: {
          ...userNotificationWhere,
          priority: 'high'
        }
      }),
      thisWeek: await prisma.notification.count({
        where: {
          ...userNotificationWhere,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      recent: await prisma.notification.count({
        where: {
          ...userNotificationWhere,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    }

    return NextResponse.json({
      notifications: updatedNotifications,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to create notifications (only Super Admin and Admin)
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { type, title, message, priority = 'medium', recipientId, metadata } = body

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      )
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        priority,
        recipientId,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })

    return NextResponse.json({
      message: 'Notification created successfully',
      notification
    })

  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// Mark all notifications as read
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Mark all notifications as read for current user only
    await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          { recipientId: currentUser.id },
          { recipientId: null }
        ]
      },
      data: { isRead: true }
    })

    return NextResponse.json({
      message: 'All notifications marked as read'
    })

  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}

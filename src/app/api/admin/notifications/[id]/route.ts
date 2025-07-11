import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest, hasPermission } from '@/lib/auth-helpers'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!
    const { id: notificationId } = await params

    // Get notification - only if it belongs to current user or is global
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { recipientId: currentUser.id },
          { recipientId: null }
        ]
      }
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ notification })

  } catch (error) {
    console.error('Error fetching notification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to read notifications (marking as read is a read operation)
    if (!hasPermission(currentUser, 'notifications:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: notificationId } = await params
    const body = await request.json()
    const { isRead } = body

    // Check if notification exists and belongs to current user
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { recipientId: currentUser.id },
          { recipientId: null }
        ]
      }
    })

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: isRead !== undefined ? isRead : existingNotification.isRead
      }
    })

    return NextResponse.json({
      message: 'Notification updated successfully',
      notification: updatedNotification
    })

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to delete notifications
    if (!hasPermission(currentUser, 'notifications:delete')) {
      return NextResponse.json({ error: 'Insufficient permissions to delete notifications' }, { status: 403 })
    }

    const { id: notificationId } = await params

    // Check if notification exists and belongs to current user
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { recipientId: currentUser.id },
          { recipientId: null }
        ]
      }
    })

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: notificationId }
    })

    return NextResponse.json({
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}

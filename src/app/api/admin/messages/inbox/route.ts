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

    // Get messages where the current user is the recipient
    const messages = await prisma.message.findMany({
      where: {
        recipientEmail: currentUser.email
      },
      orderBy: {
        sentAt: 'desc'
      }
    })

    // Get message statistics
    const stats = {
      total: messages.length,
      unread: messages.filter(msg => !msg.readAt).length,
      read: messages.filter(msg => msg.readAt).length,
      thisWeek: messages.filter(msg => {
        const msgDate = new Date(msg.sentAt)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return msgDate > weekAgo
      }).length
    }

    return NextResponse.json({
      success: true,
      messages,
      stats,
      message: 'Inbox messages retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching inbox messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inbox messages' },
      { status: 500 }
    )
  }
}

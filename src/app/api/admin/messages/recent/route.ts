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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get recent system-wide messages (last 50 messages for dashboard display)
    const messages = await prisma.message.findMany({
      orderBy: {
        sentAt: 'desc'
      },
      take: limit,
      select: {
        id: true,
        subject: true,
        senderName: true,
        recipientName: true,
        senderType: true,
        recipientType: true,
        status: true,
        sentAt: true,
        createdAt: true
      }
    })

    // Get message statistics for dashboard
    const stats = {
      total: await prisma.message.count(),
      sent: await prisma.message.count({
        where: { status: 'sent' }
      }),
      delivered: await prisma.message.count({
        where: { status: 'delivered' }
      }),
      failed: await prisma.message.count({
        where: { status: 'failed' }
      }),
      thisWeek: await prisma.message.count({
        where: {
          sentAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      messages,
      stats,
      message: 'Recent messages retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching recent messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent messages' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

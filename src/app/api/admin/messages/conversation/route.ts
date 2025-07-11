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
    const participantEmail = searchParams.get('participant')

    if (!participantEmail) {
      return NextResponse.json(
        { error: 'Participant email is required' },
        { status: 400 }
      )
    }

    // Get all messages between current user and participant
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            AND: [
              { senderEmail: currentUser.email },
              { recipientEmail: participantEmail }
            ]
          },
          {
            AND: [
              { senderEmail: participantEmail },
              { recipientEmail: currentUser.email }
            ]
          }
        ]
      },
      orderBy: {
        sentAt: 'asc'
      }
    })

    // Mark messages from participant as read (only if current user is recipient)
    await prisma.message.updateMany({
      where: {
        senderEmail: participantEmail,
        recipientEmail: currentUser.email,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

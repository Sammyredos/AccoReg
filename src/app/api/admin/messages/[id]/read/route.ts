import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

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
    const { id: messageId } = await params

    // Verify the message belongs to the current user
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.recipientEmail !== currentUser.email) {
      return NextResponse.json(
        { error: 'Unauthorized to mark this message as read' },
        { status: 403 }
      )
    }

    // Mark message as read
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Message marked as read',
      data: updatedMessage
    })

  } catch (error) {
    console.error('Error marking message as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    )
  }
}

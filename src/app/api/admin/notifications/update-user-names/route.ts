import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const body = await request.json()
    const { userId, oldName, newName, userEmail } = body

    // Validate required fields
    if (!userId || !newName || !userEmail) {
      return NextResponse.json(
        { error: 'User ID, new name, and email are required' },
        { status: 400 }
      )
    }

    // Update notifications where this user is the authorizer
    const updateResult = await prisma.notification.updateMany({
      where: {
        authorizedByEmail: userEmail
      },
      data: {
        authorizedBy: newName
      }
    })

    return NextResponse.json({
      message: 'User names updated in notifications successfully',
      updatedCount: updateResult.count
    })

  } catch (error) {
    console.error('Error updating user names in notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update user names in notifications' },
      { status: 500 }
    )
  }
}

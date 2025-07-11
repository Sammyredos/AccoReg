import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user
    const userType = payload.type || 'admin'
    let currentUser

    if (userType === 'admin') {
      currentUser = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    } else {
      currentUser = await prisma.user.findUnique({
        where: { id: payload.adminId },
        include: { role: true }
      })
    }

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Get limit from query params (default 5, max 10 for performance)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

    // Get recent registrations as notifications
    const recentRegistrations = await prisma.registration.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      select: {
        id: true,
        fullName: true,
        emailAddress: true,
        phoneNumber: true,
        createdAt: true,
        parentGuardianName: true
      }
    })

    // Format as notifications
    const notifications = recentRegistrations.map(registration => ({
      id: registration.id,
      type: 'registration',
      title: 'New Registration',
      message: `${registration.fullName} has registered for the youth program`,
      details: {
        participantName: registration.fullName,
        participantEmail: registration.emailAddress,
        participantPhone: registration.phoneNumber,
        parentGuardian: registration.parentGuardianName,
        registrationDate: registration.createdAt
      },
      timestamp: registration.createdAt,
      read: false,
      icon: '🎉'
    }))

    return NextResponse.json({
      success: true,
      notifications,
      total: notifications.length
    })

  } catch (error) {
    console.error('Recent notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

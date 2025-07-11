import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, signToken } from '@/lib/auth'
import { getSessionTimeout } from '@/lib/settings'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Get current token from cookie
    const currentToken = request.cookies.get('auth-token')?.value
    if (!currentToken) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify current token
    const payload = verifyToken(currentToken)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get session timeout from settings
    const sessionTimeoutHours = await getSessionTimeout()

    // Verify user still exists and is active
    if (payload.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })

      if (!admin || !admin.isActive) {
        return NextResponse.json({ error: 'User no longer active' }, { status: 401 })
      }

      // Generate new token with fresh expiration
      const newToken = signToken({
        adminId: admin.id,
        email: admin.email,
        type: 'admin'
      }, sessionTimeoutHours)

      // Create response
      const response = NextResponse.json({
        success: true,
        message: 'Session refreshed successfully',
        expiresIn: sessionTimeoutHours * 60 * 60 // seconds
      })

      // Set new HTTP-only cookie
      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: sessionTimeoutHours * 60 * 60 // Convert hours to seconds
      })

      return response

    } else if (payload.type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: payload.adminId }, // Using adminId field for compatibility
        include: {
          role: true
        }
      })

      if (!user || !user.isActive) {
        return NextResponse.json({ error: 'User no longer active' }, { status: 401 })
      }

      // Generate new token with fresh expiration
      const newToken = signToken({
        adminId: user.id,
        email: user.email,
        type: 'user'
      }, sessionTimeoutHours)

      // Create response
      const response = NextResponse.json({
        success: true,
        message: 'Session refreshed successfully',
        expiresIn: sessionTimeoutHours * 60 * 60 // seconds
      })

      // Set new HTTP-only cookie
      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: sessionTimeoutHours * 60 * 60 // Convert hours to seconds
      })

      return response

    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 401 })
    }

  } catch (error) {
    console.error('Session refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}

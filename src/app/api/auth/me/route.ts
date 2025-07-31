import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Determine if this is an admin or user based on the token type
    const userType = payload.type || 'admin' // Default to admin for backward compatibility

    let user
    if (userType === 'admin') {
      // Fetch admin user
      user = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })
    } else {
      // Fetch regular user
      user = await prisma.user.findUnique({
        where: { id: payload.adminId }, // adminId field is used for both types
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Return user info with flattened permissions for easier access
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        type: userType,
        role: user.role,
        permissions: user.role?.permissions?.map(p => p.name) || [],
        isActive: user.isActive
      }
    })

  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

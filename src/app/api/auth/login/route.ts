import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, signToken } from '@/lib/auth'
import { getSessionTimeout } from '@/lib/settings'

export async function POST(request: NextRequest) {
  try {
    // Monitor memory usage for login requests
    const memUsage = process.memoryUsage()
    const memUsagePercent = Math.round((memUsage.rss / (512 * 1024 * 1024)) * 100) // Assuming 512MB limit

    if (memUsagePercent > 90) {
      console.warn('High memory usage during login:', {
        memUsagePercent,
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
      })

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    }

    const { email, password } = await request.json()

    // Get session timeout from settings
    const sessionTimeoutHours = await getSessionTimeout()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Optimized: Try to find admin by email with minimal data first
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    // If admin found and password matches
    if (admin && verifyPassword(password, admin.password)) {
      if (!admin.isActive) {
        return NextResponse.json(
          { error: 'Account is inactive' },
          { status: 401 }
        )
      }

      // Generate JWT token for admin with custom session timeout
      const token = signToken({
        adminId: admin.id,
        email: admin.email,
        type: 'admin'
      }, sessionTimeoutHours)

      // Update last login timestamp asynchronously (don't wait)
      prisma.admin.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() }
      }).catch(console.error) // Log error but don't block response

      // Create response with token
      const response = NextResponse.json({
        success: true,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          type: 'admin',
          role: admin.role
        }
      })

      // Set HTTP-only cookie with custom session timeout
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: sessionTimeoutHours * 60 * 60 // Convert hours to seconds
      })

      return response
    }

    // If admin not found or password doesn't match, try user table with optimized query
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 401 }
      )
    }

    // Generate JWT token for user with custom session timeout
    const token = signToken({
      adminId: user.id, // Keep same field name for compatibility
      email: user.email,
      type: 'user'
    }, sessionTimeoutHours)

    // Update last login timestamp asynchronously (don't wait)
    prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    }).catch(console.error) // Log error but don't block response

    // Create response with token
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        type: 'user',
        role: user.role
      }
    })

    // Set HTTP-only cookie with custom session timeout
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: sessionTimeoutHours * 60 * 60 // Convert hours to seconds
    })

    console.log('User login successful - Cookie set for:', user.email)
    console.log('Token preview:', token.substring(0, 20) + '...')
    console.log('Session timeout hours:', sessionTimeoutHours)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

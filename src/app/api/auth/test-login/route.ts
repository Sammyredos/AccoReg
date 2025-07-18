/**
 * Test Login Endpoint - For debugging login issues
 * GET /api/auth/test-login
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const userCount = await prisma.user.count()
    const adminCount = await prisma.admin.count()
    
    // Test memory usage
    const memUsage = process.memoryUsage()
    const memUsagePercent = Math.round((memUsage.rss / (512 * 1024 * 1024)) * 100)
    
    // Check if default admin exists
    const defaultAdmin = await prisma.admin.findFirst({
      where: { email: 'admin@mopgomglobal.com' },
      select: { id: true, email: true, isActive: true }
    })
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        userCount,
        adminCount,
        defaultAdminExists: !!defaultAdmin,
        defaultAdminActive: defaultAdmin?.isActive || false
      },
      memory: {
        usagePercent: memUsagePercent,
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasGC: !!global.gc
      }
    })
    
  } catch (error) {
    console.error('Test login endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password required'
      }, { status: 400 })
    }
    
    // Test admin lookup
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
        password: true
      }
    })
    
    return NextResponse.json({
      success: true,
      adminFound: !!admin,
      adminActive: admin?.isActive || false,
      passwordProvided: !!password,
      // Don't return actual password hash for security
      hasPassword: !!admin?.password
    })
    
  } catch (error) {
    console.error('Test login POST error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

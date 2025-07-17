import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db-init'

/**
 * Manual Database Initialization Endpoint
 * This can be called to manually trigger database initialization
 * Useful for troubleshooting or manual setup
 */
export async function POST(request: NextRequest) {
  try {
    // Check if this is a valid initialization request
    const body = await request.json().catch(() => ({}))
    const initKey = body.initKey || request.headers.get('x-init-key')
    
    // Simple security check - require a key to prevent abuse
    const expectedKey = process.env.INIT_KEY || 'init-db-2024'
    if (initKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Invalid initialization key' },
        { status: 401 }
      )
    }

    console.log('🔧 Manual database initialization requested...')
    await initializeDatabase()

    return NextResponse.json({
      success: true,
      message: 'Database initialization completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Manual database initialization failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Database initialization failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check initialization status
 */
export async function GET() {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // Check if database is initialized by looking for settings
    const settingsCount = await prisma.setting.count().catch(() => 0)
    const rolesCount = await prisma.role.count().catch(() => 0)
    const adminsCount = await prisma.admin.count().catch(() => 0)

    await prisma.$disconnect()

    const isInitialized = settingsCount > 0 && rolesCount > 0 && adminsCount > 0

    return NextResponse.json({
      initialized: isInitialized,
      stats: {
        settings: settingsCount,
        roles: rolesCount,
        admins: adminsCount
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({
      initialized: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

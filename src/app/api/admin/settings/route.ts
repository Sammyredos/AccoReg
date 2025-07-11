import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

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

    // Determine user type from token
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

    // Check if user has permission to view settings (Super Admin, Admin only)
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all settings grouped by category
    const settings = await prisma.setting.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = []
      }

      // Parse JSON values
      let parsedValue
      try {
        parsedValue = JSON.parse(setting.value)
      } catch {
        parsedValue = setting.value
      }

      let parsedOptions = null
      if (setting.options) {
        try {
          parsedOptions = JSON.parse(setting.options)
        } catch {
          parsedOptions = null
        }
      }

      acc[setting.category].push({
        ...setting,
        value: parsedValue,
        options: parsedOptions
      })

      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      success: true,
      settings: groupedSettings
    })

  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({
      error: 'Failed to fetch settings'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    // Determine user type from token
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

    // Check if user has permission to update settings (Super Admin only)
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Only Super Admin can modify settings' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({
        error: 'Invalid settings data'
      }, { status: 400 })
    }

    // Update settings in database
    const updatePromises = settings.map(async (setting: any) => {
      const { category, key, value } = setting

      if (!category || !key || value === undefined) {
        throw new Error(`Invalid setting: ${JSON.stringify(setting)}`)
      }

      return prisma.setting.update({
        where: {
          category_key: {
            category,
            key
          }
        },
        data: {
          value: JSON.stringify(value),
          updatedAt: new Date()
        }
      })
    })

    await Promise.all(updatePromises)

    // Settings are stored globally and apply to all access levels
    // Super Admin changes affect the entire system universally
    console.log(`Settings updated by Super Admin ${currentUser.email}: ${settings.length} settings changed - applies to all users`)

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully and applied universally to all access levels'
    })

  } catch (error) {
    // In production, this should be logged to a proper error tracking system
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update settings',
      details: 'An error occurred while saving the settings. Please try again or contact support if the issue persists.'
    }, { status: 500 })
  }
}

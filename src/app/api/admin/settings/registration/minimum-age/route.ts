import { NextRequest, NextResponse } from 'next/server'
import { getSetting, updateSetting } from '@/lib/settings'
import { verifyToken } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

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

    // Get current admin with role
    const currentAdmin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentAdmin || !currentAdmin.isActive) {
      return NextResponse.json({ error: 'Admin not found or inactive' }, { status: 401 })
    }

    // Check if user has admin permissions
    if (!['Admin', 'Super Admin'].includes(currentAdmin.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const minimumAge = await getSetting('registration', 'minimumAge', 13)

    return NextResponse.json({ minimumAge })
  } catch (error) {
    console.error('Error getting minimum age:', error)
    return NextResponse.json(
      { error: 'Failed to get minimum age' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Get current admin with role
    const currentAdmin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentAdmin || !currentAdmin.isActive) {
      return NextResponse.json({ error: 'Admin not found or inactive' }, { status: 401 })
    }

    // Check if user has admin permissions
    if (!['Admin', 'Super Admin'].includes(currentAdmin.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { minimumAge } = await request.json()

    // Validate minimum age
    if (typeof minimumAge !== 'number' || minimumAge < 1 || minimumAge > 100) {
      return NextResponse.json({ error: 'Minimum age must be between 1 and 100' }, { status: 400 })
    }

    await updateSetting('registration', 'minimumAge', minimumAge)

    return NextResponse.json({
      success: true,
      minimumAge
    })
  } catch (error) {
    console.error('Error updating minimum age:', error)
    return NextResponse.json(
      { error: 'Failed to update minimum age' },
      { status: 500 }
    )
  }
}

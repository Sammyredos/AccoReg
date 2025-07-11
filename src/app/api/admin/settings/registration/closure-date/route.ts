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

    const formClosureDate = await getSetting('registration', 'formClosureDate', '')

    return NextResponse.json({ formClosureDate })
  } catch (error) {
    console.error('Error getting form closure date:', error)
    return NextResponse.json(
      { error: 'Failed to get form closure date' },
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

    const { formClosureDate } = await request.json()

    // Validate date format if provided
    if (formClosureDate && formClosureDate.trim()) {
      const date = new Date(formClosureDate)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
    }

    await updateSetting('registration', 'formClosureDate', formClosureDate || '')

    return NextResponse.json({
      success: true,
      formClosureDate: formClosureDate || ''
    })
  } catch (error) {
    console.error('Error updating form closure date:', error)
    return NextResponse.json(
      { error: 'Failed to update form closure date' },
      { status: 500 }
    )
  }
}

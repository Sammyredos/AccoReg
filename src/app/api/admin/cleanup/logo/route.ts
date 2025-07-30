import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { cleanupOrphanedLogoReferences } from '@/lib/logo-cleanup'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user and check permissions
    const currentUser = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: { role: true }
    })

    if (!currentUser || !currentUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission (Super Admin or Admin)
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Run the cleanup
    const result = await cleanupOrphanedLogoReferences()

    return NextResponse.json({
      success: true,
      message: `Logo cleanup completed. Removed ${result.cleanedCount} orphaned references.`,
      cleanedCount: result.cleanedCount
    })

  } catch (error) {
    console.error('Error running logo cleanup:', error)
    return NextResponse.json(
      {
        error: 'Failed to run logo cleanup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

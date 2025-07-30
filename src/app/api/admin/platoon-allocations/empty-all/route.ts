import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user details from database
    const user = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to manage platoon allocations
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff']
    if (!allowedRoles.includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // For now, work with mock data until Prisma client is updated
    console.log('⚠️ Emptying mock platoons until Prisma client is updated')
    
    if (!global.mockPlatoons) {
      return NextResponse.json({ error: 'No platoons found' }, { status: 404 })
    }

    // Count total allocated participants before emptying
    let totalUnallocated = 0
    global.mockPlatoons.forEach(platoon => {
      if (platoon.participants) {
        totalUnallocated += platoon.participants.length
        platoon.participants = [] // Empty the platoon
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully emptied all platoons`,
      unallocatedCount: totalUnallocated,
      platoonsEmptied: global.mockPlatoons.length
    })

  } catch (error) {
    console.error('Error emptying platoons:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: platoonId } = await params

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

    // For mock data, skip database user validation
    console.log('⚠️ Using mock authentication for platoon empty endpoint')

    // For now, work with mock data until Prisma client is updated
    console.log('⚠️ Emptying mock platoon until Prisma client is updated')
    
    if (!global.mockPlatoons) {
      return NextResponse.json({ error: 'No platoons found' }, { status: 404 })
    }

    // Find the specific platoon
    const platoonIndex = global.mockPlatoons.findIndex(p => p.id === platoonId)
    if (platoonIndex === -1) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    const platoon = global.mockPlatoons[platoonIndex]
    const participantCount = platoon.participants?.length || 0

    if (participantCount === 0) {
      return NextResponse.json({ error: 'Platoon is already empty' }, { status: 400 })
    }

    // Empty the specific platoon
    global.mockPlatoons[platoonIndex].participants = []

    return NextResponse.json({
      success: true,
      message: `Successfully emptied platoon "${platoon.name}"`,
      unallocatedCount: participantCount,
      platoonName: platoon.name
    })

  } catch (error) {
    console.error('Error emptying platoon:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

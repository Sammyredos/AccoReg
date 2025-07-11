import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

// Default age gap if not configured
const DEFAULT_AGE_GAP = 5

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Get age gap configuration from database or return default
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'accommodation_max_age_gap' }
    })

    const ageGap = config ? parseInt(config.value) : DEFAULT_AGE_GAP
    const finalAgeGap = isNaN(ageGap) ? DEFAULT_AGE_GAP : ageGap



    return NextResponse.json({
      success: true,
      ageGap: finalAgeGap
    })

  } catch (error) {
    console.error('Error getting age gap config:', error)
    return NextResponse.json(
      { error: 'Failed to get age gap configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to modify settings
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { ageGap } = data

    // Validate age gap
    if (!ageGap || typeof ageGap !== 'number' || ageGap < 1 || ageGap > 20) {
      return NextResponse.json(
        { error: 'Age gap must be a number between 1 and 20 years' },
        { status: 400 }
      )
    }

    // Update or create the configuration
    await prisma.systemConfig.upsert({
      where: { key: 'accommodation_max_age_gap' },
      update: {
        value: ageGap.toString(),
        updatedAt: new Date()
      },
      create: {
        key: 'accommodation_max_age_gap',
        value: ageGap.toString(),
        description: 'Maximum age gap allowed in accommodation rooms'
      }
    })



    return NextResponse.json({
      success: true,
      message: 'Age gap configuration updated successfully',
      ageGap
    })

  } catch (error) {
    console.error('Error updating age gap config:', error)
    return NextResponse.json(
      { error: 'Failed to update age gap configuration' },
      { status: 500 }
    )
  }
}

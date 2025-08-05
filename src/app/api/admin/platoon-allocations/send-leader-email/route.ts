import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { PlatoonLeaderEmailService } from '@/lib/services/platoon-leader-email'

// POST - Send email to platoon leader(s)
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to send emails to platoon leaders
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { platoonIds, subject, message, sendToAll } = body

    // Validate required fields
    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Email subject is required' }, { status: 400 })
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Email message is required' }, { status: 400 })
    }

    if (!sendToAll && (!platoonIds || !Array.isArray(platoonIds) || platoonIds.length === 0)) {
      return NextResponse.json({ error: 'At least one platoon must be selected' }, { status: 400 })
    }

    let targetPlatoonIds = platoonIds || []

    // If sending to all platoon leaders, get all platoon IDs
    if (sendToAll) {
      const allPlatoons = await prisma.platoonAllocation.findMany({
        select: { id: true }
      })
      targetPlatoonIds = allPlatoons.map(p => p.id)
    }

    if (targetPlatoonIds.length === 0) {
      return NextResponse.json({ error: 'No platoons found to send emails to' }, { status: 400 })
    }

    console.log(`📧 Sending emails to ${targetPlatoonIds.length} platoon leaders...`)

    // Send emails to platoon leaders
    const emailResults = await PlatoonLeaderEmailService.sendBulkEmailsToPlatoonLeaders(
      targetPlatoonIds,
      subject.trim(),
      message.trim(),
      currentUser.name || currentUser.email,
      currentUser.email
    )

    console.log(`✅ Platoon leader emails completed: ${emailResults.summary.successful}/${emailResults.summary.total} sent successfully`)

    return NextResponse.json({
      success: true,
      message: `Email sent to ${emailResults.summary.successful} platoon leaders`,
      results: emailResults
    })

  } catch (error) {
    console.error('Error sending emails to platoon leaders:', error)
    return NextResponse.json(
      { error: 'Failed to send emails to platoon leaders' },
      { status: 500 }
    )
  }
}

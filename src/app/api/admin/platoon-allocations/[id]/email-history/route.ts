import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

// GET - Get email history for a platoon with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: platoonId } = await params

    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to view email history
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get pagination parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '5')
    const offset = (page - 1) * limit

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }

    // Check if platoon exists
    const platoon = await prisma.platoonAllocation.findUnique({
      where: { id: platoonId },
      select: { id: true, name: true, label: true }
    })

    if (!platoon) {
      return NextResponse.json({ error: 'Platoon not found' }, { status: 404 })
    }

    // Get total count for pagination
    const totalCount = await prisma.platoonEmailHistory.count({
      where: { platoonId }
    })

    // Get email history with pagination
    const emailHistory = await prisma.platoonEmailHistory.findMany({
      where: { platoonId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        subject: true,
        message: true,
        emailTarget: true,
        recipientCount: true,
        successCount: true,
        failedCount: true,
        senderName: true,
        senderEmail: true,
        createdAt: true
      }
    })

    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        platoon: {
          id: platoon.id,
          name: platoon.name,
          label: platoon.label
        },
        emails: emailHistory,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    })

  } catch (error) {
    console.error('Error fetching email history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email history' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an email history record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: platoonId } = await params

    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check if user has permission to delete email history
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get email ID from query parameters
    const url = new URL(request.url)
    const emailId = url.searchParams.get('emailId')

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    // Check if email history record exists and belongs to the platoon
    const emailRecord = await prisma.platoonEmailHistory.findFirst({
      where: {
        id: emailId,
        platoonId: platoonId
      }
    })

    if (!emailRecord) {
      return NextResponse.json({ error: 'Email history record not found' }, { status: 404 })
    }

    // Delete the email history record
    await prisma.platoonEmailHistory.delete({
      where: { id: emailId }
    })

    console.log(`🗑️ Email history record deleted: ${emailId} by ${currentUser.email}`)

    return NextResponse.json({
      success: true,
      message: 'Email history record deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting email history:', error)
    return NextResponse.json(
      { error: 'Failed to delete email history record' },
      { status: 500 }
    )
  }
}

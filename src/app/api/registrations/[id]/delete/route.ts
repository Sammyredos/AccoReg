import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: registrationId } = await params

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }

    // Check if registration exists
    const existingRegistration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        fullName: true,
        emailAddress: true
      }
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Delete the registration
    await prisma.registration.delete({
      where: { id: registrationId }
    })

    return NextResponse.json({
      success: true,
      message: `Registration for ${existingRegistration.fullName} has been deleted successfully`,
      deletedRegistration: {
        id: existingRegistration.id,
        fullName: existingRegistration.fullName,
        emailAddress: existingRegistration.emailAddress
      }
    })

  } catch (error) {
    console.error('Delete registration error:', error)
    return NextResponse.json(
      { error: 'Failed to delete registration' },
      { status: 500 }
    )
  }
}

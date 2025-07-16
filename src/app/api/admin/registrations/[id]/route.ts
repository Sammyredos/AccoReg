import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Check if user has permission to view registrations
    if (!['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get registration with room allocation
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        roomAllocation: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                gender: true,
                capacity: true
              }
            }
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      registration,
      message: 'Registration retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Update registration API called for ID:', id)

    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      console.log('No token found in cookies')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      console.log('Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Determine user type from token
    const userType = payload.type || 'admin'

    let currentUser
    if (userType === 'admin') {
      // Fetch admin user
      currentUser = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })
    } else {
      // Fetch regular user
      currentUser = await prisma.user.findUnique({
        where: { id: payload.adminId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })
    }

    if (!currentUser || !currentUser.isActive) {
      console.log('User not found or inactive')
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Check if user has permission to update registrations (Super Admin, Admin, Manager, Staff)
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      console.log('Insufficient permissions. User role:', currentUser.role?.name)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      fullName,
      dateOfBirth,
      gender,
      emailAddress,
      phoneNumber,
      address,
      branch,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      parentGuardianName,
      parentGuardianPhone,
      parentGuardianEmail,
      medications,
      allergies,
      specialNeeds,
      dietaryRestrictions,
      parentalPermissionGranted
    } = body

    // Validate required fields with detailed error messages
    const missingFields = []
    if (!fullName?.trim()) missingFields.push('fullName')
    if (!dateOfBirth) missingFields.push('dateOfBirth')
    if (!gender?.trim()) missingFields.push('gender')
    if (!emailAddress?.trim()) missingFields.push('emailAddress')
    if (!phoneNumber?.trim()) missingFields.push('phoneNumber')
    if (!address?.trim()) missingFields.push('address')
    if (!emergencyContactName?.trim()) missingFields.push('emergencyContactName')
    if (!emergencyContactRelationship?.trim()) missingFields.push('emergencyContactRelationship')
    if (!emergencyContactPhone?.trim()) missingFields.push('emergencyContactPhone')

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields)
      console.log('Request body:', JSON.stringify(body, null, 2))
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      }, { status: 400 })
    }

    // Check if registration exists
    const existingRegistration = await prisma.registration.findUnique({
      where: { id }
    })

    if (!existingRegistration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Calculate age from date of birth
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    // Update the registration
    const updatedRegistration = await prisma.registration.update({
      where: { id },
      data: {
        fullName,
        dateOfBirth: birthDate,
        age,
        gender,
        emailAddress,
        phoneNumber,
        address,
        branch: branch || 'Not Specified',
        emergencyContactName,
        emergencyContactRelationship,
        emergencyContactPhone,
        parentGuardianName: parentGuardianName || null,
        parentGuardianPhone: parentGuardianPhone || null,
        parentGuardianEmail: parentGuardianEmail || null,
        medications: medications || null,
        allergies: allergies || null,
        specialNeeds: specialNeeds || null,
        dietaryRestrictions: dietaryRestrictions || null,
        parentalPermissionGranted: Boolean(parentalPermissionGranted),
        parentalPermissionDate: parentalPermissionGranted && !existingRegistration.parentalPermissionGranted
          ? new Date()
          : existingRegistration.parentalPermissionDate,
        updatedAt: new Date()
      }
    })

    console.log('Registration updated successfully:', updatedRegistration.id)

    return NextResponse.json({
      success: true,
      message: 'Registration updated successfully',
      registration: updatedRegistration
    })

  } catch (error) {
    console.error('Update registration error:', error)
    return NextResponse.json({
      error: 'Failed to update registration'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Delete registration API called for ID:', id)

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

    // Check if user has permission to delete registrations (Super Admin, Admin, Staff)
    if (!['Super Admin', 'Admin', 'Staff'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if registration exists
    const existingRegistration = await prisma.registration.findUnique({
      where: { id }
    })

    if (!existingRegistration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Delete the registration
    await prisma.registration.delete({
      where: { id }
    })

    console.log('Registration deleted successfully:', id)

    return NextResponse.json({
      success: true,
      message: 'Registration deleted successfully'
    })

  } catch (error) {
    console.error('Delete registration error:', error)
    return NextResponse.json({
      error: 'Failed to delete registration'
    }, { status: 500 })
  }
}

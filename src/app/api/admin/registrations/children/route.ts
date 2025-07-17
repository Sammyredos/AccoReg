import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - Allow all roles to view children registrations
    const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // If ID is provided, return single registration
    if (id) {
      try {
        const registration = await prisma.childrenRegistration.findUnique({
          where: { id }
        })

        if (!registration) {
          return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
        }
      } catch (error: any) {
        // Handle missing table error
        if (error.code === 'P2021' && error.message.includes('does not exist')) {
          return NextResponse.json({ error: 'Children registrations table not found' }, { status: 404 })
        }
        throw error
      }

      // Calculate age
      const birthDate = new Date(registration.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      return NextResponse.json({
        registration: {
          ...registration,
          age,
          dateOfBirth: registration.dateOfBirth.toISOString().split('T')[0],
          createdAt: registration.createdAt.toISOString(),
          updatedAt: registration.updatedAt.toISOString()
        }
      })
    }

    // Otherwise, return paginated list
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const gender = searchParams.get('gender') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { parentGuardianName: { contains: search } },
        { parentGuardianEmail: { contains: search } }
      ]
    }

    if (gender && gender !== 'all') {
      where.gender = gender
    }

    // Get total count with error handling
    let total = 0
    let registrations: any[] = []

    try {
      total = await prisma.childrenRegistration.count({ where })

      // Get registrations
      registrations = await prisma.childrenRegistration.findMany({
        where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        branch: true,
        parentGuardianName: true,
        parentGuardianPhone: true,
        parentGuardianEmail: true,
        createdAt: true,
        updatedAt: true
      }
    })
    } catch (error: any) {
      // Handle missing table error
      if (error.code === 'P2021' && error.message.includes('does not exist')) {
        console.log('Children registrations table does not exist, returning empty results')
        return NextResponse.json({
          registrations: [],
          pagination: {
            page: 1,
            limit: limit,
            total: 0,
            totalPages: 0
          }
        })
      }
      throw error
    }

    // Calculate age for each registration
    const registrationsWithAge = registrations.map(reg => {
      const today = new Date()
      const birthDate = new Date(reg.dateOfBirth)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      return {
        ...reg,
        age,
        dateOfBirth: reg.dateOfBirth.toISOString().split('T')[0], // Format as YYYY-MM-DD
        createdAt: reg.createdAt.toISOString(),
        updatedAt: reg.updatedAt.toISOString()
      }
    })

    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      registrations: registrationsWithAge,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    })

  } catch (error) {
    console.error('Error fetching children registrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch children registrations' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - Only Super Admin and Admin can delete
    const allowedRoles = ['Super Admin', 'Admin']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions to delete registrations' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 })
    }

    // Check if registration exists
    const existingRegistration = await prisma.childrenRegistration.findUnique({
      where: { id },
      select: { id: true, fullName: true }
    })

    if (!existingRegistration) {
      return NextResponse.json({ error: 'Children registration not found' }, { status: 404 })
    }

    // Delete the registration
    await prisma.childrenRegistration.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: `Children registration for ${existingRegistration.fullName} deleted successfully`
    })

  } catch (error) {
    console.error('Error deleting children registration:', error)
    return NextResponse.json(
      { error: 'Failed to delete children registration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - Admin, Manager, and Staff can update
    const allowedRoles = ['Admin', 'Manager', 'Staff', 'Super Admin']
    if (!allowedRoles.includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      fullName,
      dateOfBirth,
      gender,
      address,
      branch,
      parentGuardianName,
      parentGuardianPhone,
      parentGuardianEmail
    } = body

    // Validate required fields
    if (!fullName || !dateOfBirth || !gender || !parentGuardianName || !parentGuardianPhone || !parentGuardianEmail) {
      return NextResponse.json({ error: 'All required fields must be provided' }, { status: 400 })
    }

    // Check if registration exists
    const existingRegistration = await prisma.childrenRegistration.findUnique({
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
    const updatedRegistration = await prisma.childrenRegistration.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        dateOfBirth: birthDate,
        age,
        gender,
        address: address.trim(),
        branch: branch?.trim() || 'Not Specified',
        parentGuardianName: parentGuardianName.trim(),
        parentGuardianPhone: parentGuardianPhone.trim(),
        parentGuardianEmail: parentGuardianEmail.trim().toLowerCase(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      registration: {
        ...updatedRegistration,
        dateOfBirth: updatedRegistration.dateOfBirth.toISOString().split('T')[0],
        createdAt: updatedRegistration.createdAt.toISOString(),
        updatedAt: updatedRegistration.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating children registration:', error)
    return NextResponse.json(
      { error: 'Failed to update children registration' },
      { status: 500 }
    )
  }
}

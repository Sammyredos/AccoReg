import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSetting } from '@/lib/settings'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    const requiredFields = [
      'fullName',
      'dateOfBirth',
      'gender',
      'address',
      'branch',
      'parentGuardianName',
      'parentGuardianPhone',
      'parentGuardianEmail'
    ]

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          {
            error: `${field} is required`,
            field: field,
            message: `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`
          },
          { status: 400 }
        )
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.parentGuardianEmail)) {
      return NextResponse.json(
        {
          error: 'Invalid email format',
          field: 'parentGuardianEmail',
          message: 'Please enter a valid email address'
        },
        { status: 400 }
      )
    }

    // Validate date of birth
    const birthDate = new Date(data.dateOfBirth)
    if (isNaN(birthDate.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid date of birth',
          field: 'dateOfBirth',
          message: 'Please enter a valid date of birth'
        },
        { status: 400 }
      )
    }

    // Get minimum age setting
    const minimumAge = await getSetting('registration', 'minimumAge', 13)

    // Calculate age and validate it's under minimum age
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age >= minimumAge) {
      return NextResponse.json(
        {
          error: 'Age validation failed',
          field: 'dateOfBirth',
          message: `Children registration is for ages under ${minimumAge}. Please use the main registration form.`
        },
        { status: 400 }
      )
    }

    // Check for duplicate registration (same name + age + gender - matching the duplicate check API)
    const normalizedName = data.fullName.toLowerCase().trim()

    const existingRegistration = await prisma.childrenRegistration.findFirst({
      where: {
        AND: [
          {
            fullName: normalizedName
          },
          {
            dateOfBirth: birthDate
          },
          {
            gender: data.gender
          }
        ]
      }
    })

    if (existingRegistration) {
      return NextResponse.json(
        {
          error: 'Duplicate registration',
          field: 'fullName',
          message: 'A child with this name, age, and gender is already registered'
        },
        { status: 400 }
      )
    }

    // Create the children registration
    const registration = await prisma.childrenRegistration.create({
      data: {
        fullName: data.fullName.trim(),
        dateOfBirth: birthDate,
        gender: data.gender,
        address: data.address.trim(),
        branch: data.branch,
        parentGuardianName: data.parentGuardianName.trim(),
        parentGuardianPhone: data.parentGuardianPhone.trim(),
        parentGuardianEmail: data.parentGuardianEmail.toLowerCase().trim()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Children registration submitted successfully',
      registrationId: registration.id
    })

  } catch (error) {
    console.error('Children registration error:', error)

    // Handle Prisma unique constraint errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          error: 'Duplicate registration',
          field: 'fullName',
          message: 'A registration with this information already exists'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}

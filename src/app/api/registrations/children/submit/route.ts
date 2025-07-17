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

    let existingRegistration = null
    try {
      existingRegistration = await prisma.childrenRegistration.findFirst({
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
    } catch (error: any) {
      // If table doesn't exist, no duplicates possible
      if (error.code === 'P2021' && error.message.includes('does not exist')) {
        console.log('Children registrations table does not exist, no duplicates possible')
        existingRegistration = null
      } else {
        throw error
      }
    }

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

    // Create the children registration (handle missing table)
    let registration
    try {
      // Ensure branch is properly set
      const branchValue = data.branch?.trim() || 'Not Specified'

      registration = await prisma.childrenRegistration.create({
        data: {
          fullName: data.fullName.trim(),
          dateOfBirth: birthDate,
          age,
          gender: data.gender,
          address: data.address.trim(),
          branch: branchValue,
          parentGuardianName: data.parentGuardianName.trim(),
          parentGuardianPhone: data.parentGuardianPhone.trim(),
          parentGuardianEmail: data.parentGuardianEmail.toLowerCase().trim()
        }
      })
    } catch (error: any) {
      // If table doesn't exist, create it first then retry
      if (error.code === 'P2021' && error.message.includes('does not exist')) {
        console.log('Children registrations table does not exist, creating it...')

        // Create the table using raw SQL
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "children_registrations" (
            "id" TEXT NOT NULL,
            "fullName" TEXT NOT NULL,
            "dateOfBirth" TIMESTAMP(3) NOT NULL,
            "age" INTEGER NOT NULL,
            "gender" TEXT NOT NULL,
            "address" TEXT NOT NULL,
            "branch" TEXT NOT NULL DEFAULT 'Not Specified',
            "phoneNumber" TEXT,
            "emailAddress" TEXT,
            "emergencyContactName" TEXT,
            "emergencyContactRelationship" TEXT,
            "emergencyContactPhone" TEXT,
            "parentGuardianName" TEXT NOT NULL,
            "parentGuardianPhone" TEXT NOT NULL,
            "parentGuardianEmail" TEXT,
            "medications" TEXT,
            "allergies" TEXT,
            "specialNeeds" TEXT,
            "dietaryRestrictions" TEXT,
            "parentalPermissionGranted" BOOLEAN NOT NULL DEFAULT false,
            "qrCode" TEXT,
            "isVerified" BOOLEAN NOT NULL DEFAULT false,
            "verifiedAt" TIMESTAMP(3),
            "verifiedBy" TEXT,
            "unverifiedAt" TIMESTAMP(3),
            "unverifiedBy" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "children_registrations_pkey" PRIMARY KEY ("id")
          )
        `

        // Create indexes
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "children_registrations_branch_idx" ON "children_registrations"("branch")
        `

        console.log('Children registrations table created, retrying registration...')

        // Retry the registration
        registration = await prisma.childrenRegistration.create({
          data: {
            fullName: data.fullName.trim(),
            dateOfBirth: birthDate,
            age,
            gender: data.gender,
            address: data.address.trim(),
            branch: branchValue,
            parentGuardianName: data.parentGuardianName.trim(),
            parentGuardianPhone: data.parentGuardianPhone.trim(),
            parentGuardianEmail: data.parentGuardianEmail.toLowerCase().trim()
          }
        })
      } else {
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Children registration submitted successfully',
      registrationId: registration.id
    })

  } catch (error: any) {
    console.error('Children registration error:', error)

    // Handle missing table error
    if (error.code === 'P2021' && error.message.includes('does not exist')) {
      return NextResponse.json(
        {
          error: 'System not ready',
          field: 'system',
          message: 'Children registration system is being set up. Please try again in a few minutes.'
        },
        { status: 503 }
      )
    }

    // Handle missing column errors
    if (error.code === 'P2022') {
      return NextResponse.json(
        {
          error: 'System updating',
          field: 'system',
          message: 'Registration system is being updated. Please try again in a few minutes.'
        },
        { status: 503 }
      )
    }

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

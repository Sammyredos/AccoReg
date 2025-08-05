import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendRegistrationNotification, sendRegistrationConfirmationEmail } from '@/lib/email'
import { generateRegistrationQR } from '@/lib/qr-code'

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
      'phoneNumber',
      'emailAddress',
      'parentGuardianName',
      'parentGuardianPhone'
      // parentGuardianEmail is optional
    ]

    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
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

    // Convert dateOfBirth to Date object
    const dateOfBirth = new Date(data.dateOfBirth)
    if (isNaN(dateOfBirth.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid date of birth',
          field: 'dateOfBirth',
          message: 'Please enter a valid date of birth'
        },
        { status: 400 }
      )
    }

    // Validate email format if provided (parentGuardianEmail is optional)
    if (data.parentGuardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parentGuardianEmail)) {
      return NextResponse.json(
        { error: 'Invalid parent/guardian email format' },
        { status: 400 }
      )
    }

    // Calculate age from date of birth
    const today = new Date()
    let age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--
    }

    // Debug the branch value
    console.log('🔍 Registration API Debug:', {
      fullName: data.fullName,
      originalBranch: data.branch,
      branchAfterTrim: data.branch?.trim(),
      branchLength: data.branch?.length,
      branchType: typeof data.branch
    })

    // Validate that branch is not empty (the required field validation should catch this)
    if (!data.branch || data.branch.trim() === '') {
      console.log('❌ Branch validation failed - empty branch provided')
      return NextResponse.json(
        {
          error: 'Church branch is required',
          field: 'branch',
          message: 'Please select a church branch'
        },
        { status: 400 }
      )
    }

    // Use the actual branch value (don't default to "Not Specified")
    const branchValue = data.branch.trim()

    console.log('✅ Using branch value:', branchValue)

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        fullName: data.fullName,
        dateOfBirth: dateOfBirth,
        age: age,
        gender: data.gender,
        address: data.address,
        branch: branchValue,
        phoneNumber: data.phoneNumber,
        emailAddress: data.emailAddress,
        // Use emergency contact info (either manually entered or copied from parent)
        emergencyContactName: data.emergencyContactName || data.parentGuardianName,
        emergencyContactRelationship: data.emergencyContactRelationship || 'Parent/Guardian',
        emergencyContactPhone: data.emergencyContactPhone || data.parentGuardianPhone,
        parentGuardianName: data.parentGuardianName,
        parentGuardianPhone: data.parentGuardianPhone,
        parentGuardianEmail: data.parentGuardianEmail,
        roommateRequestConfirmationNumber: null, // Field removed from form
        medications: null,
        allergies: null,
        specialNeeds: null,
        dietaryRestrictions: null,
        parentalPermissionGranted: true, // Always mark as completed/approved
        parentalPermissionDate: new Date() // Set current date as completion date
      }
    })

    // Return success response immediately after saving to database
    const response = NextResponse.json({
      success: true,
      registrationId: registration.id,
      message: 'Registration submitted successfully'
    })

    // Add headers to trigger real-time updates in admin communications
    response.headers.set('X-Registration-Updated', 'true')
    response.headers.set('X-Registration-Action', 'new')
    response.headers.set('X-New-Registration-Data', JSON.stringify({
      id: registration.id,
      fullName: registration.fullName,
      emailAddress: registration.emailAddress,
      phoneNumber: registration.phoneNumber,
      gender: registration.gender,
      isVerified: registration.isVerified,
      createdAt: registration.createdAt
    }))

    // Process background tasks without blocking the response
    // These operations will continue after the response is sent
    Promise.resolve().then(async () => {
      try {
        // First, generate QR code synchronously
        console.log('🔄 Generating QR code for registration:', registration.id)
        const qrResult = await generateRegistrationQR(registration.id)
        if (qrResult.success) {
          console.log('✅ QR code generated for registration:', registration.id)
        } else {
          console.error('❌ Failed to generate QR code:', qrResult.error)
        }

        // Get the updated registration with QR code
        const updatedRegistration = await prisma.registration.findUnique({
          where: { id: registration.id }
        })

        // Then run other tasks in parallel
        const results = await Promise.allSettled([
          // Create notification record in database
          prisma.notification.create({
            data: {
              type: 'new_registration',
              title: 'New Registration',
              message: `${registration.fullName} has registered for the youth program`,
              priority: 'medium',
              metadata: JSON.stringify({
                registrationId: registration.id,
                participantName: registration.fullName,
                participantEmail: registration.emailAddress,
                participantPhone: registration.phoneNumber,
                parentGuardian: registration.parentGuardianName,
                registrationDate: registration.createdAt
              })
            }
          }).then(() => {
            console.log('✅ Database notification created for:', registration.fullName)
          }),

          // Send confirmation email with QR code to registrant (QR code is now ready)
          sendRegistrationConfirmationEmail(updatedRegistration || registration).then(() => {
            console.log('✅ Registration confirmation email sent to:', registration.emailAddress)
          }),

          // Send notification email to admins
          sendRegistrationNotification(registration).then(() => {
            console.log('✅ Registration notification sent for:', registration.fullName)
          })
        ])

        console.log('✅ Background tasks completed for registration:', registration.id)
        // Log any failures for monitoring
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`❌ Background task ${index} failed:`, result.reason)
          }
        })
      } catch (error) {
        console.error('❌ Background tasks error for registration:', registration.id, error)
      }
    })

    return response
  } catch (error: any) {
    console.error('Registration submission error:', error)

    // Handle missing column errors (like age column)
    if (error.code === 'P2022') {
      return NextResponse.json(
        {
          error: 'System updating',
          message: 'Registration system is being updated. Please try again in a few minutes.'
        },
        { status: 503 }
      )
    }

    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Duplicate registration',
          message: 'A registration with this information already exists.'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

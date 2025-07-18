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

    console.log('Registration data received:', {
      fullName: data.fullName,
      branch: data.branch,
      branchLength: data.branch?.length,
      branchTrimmed: data.branch?.trim()
    })

    // Final duplicate check before creating registration
    const normalizedEmail = data.emailAddress.toLowerCase().trim()
    const normalizedPhone = data.phoneNumber.trim()
    const normalizedName = data.fullName.toLowerCase().trim()

    const existingRegistration = await prisma.registration.findFirst({
      where: {
        OR: [
          { emailAddress: normalizedEmail },
          { phoneNumber: normalizedPhone },
          { fullName: normalizedName }
        ]
      }
    })

    if (existingRegistration) {
      const duplicateField =
        existingRegistration.emailAddress === normalizedEmail ? 'emailAddress' :
        existingRegistration.phoneNumber === normalizedPhone ? 'phoneNumber' : 'fullName'

      return NextResponse.json(
        {
          error: 'Duplicate registration',
          field: duplicateField,
          message: `This ${duplicateField === 'fullName' ? 'name' : duplicateField === 'emailAddress' ? 'email' : 'phone number'} is already registered`
        },
        { status: 400 }
      )
    }

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        fullName: data.fullName,
        dateOfBirth: dateOfBirth,
        age: age,
        gender: data.gender,
        address: data.address,
        branch: data.branch,
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

    console.log('Registration created:', {
      id: registration.id,
      fullName: registration.fullName,
      branch: registration.branch,
      savedSuccessfully: true
    })

    // Return success response immediately after saving to database
    const response = NextResponse.json({
      success: true,
      registrationId: registration.id,
      message: 'Registration submitted successfully'
    })

    // Process background tasks without blocking the response
    // These operations will continue after the response is sent
    Promise.allSettled([
      // Generate QR code for the registration
      generateRegistrationQR(registration.id).then(qrResult => {
        if (qrResult.success) {
          console.log('QR code generated for registration:', registration.id)
        } else {
          console.error('Failed to generate QR code:', qrResult.error)
        }
      }).catch(qrError => {
        console.error('QR code generation error:', qrError)
      }),

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
        console.log('Database notification created for:', registration.fullName)
      }).catch(notificationError => {
        console.error('Failed to create notification record:', notificationError)
      }),

      // Send confirmation email with QR code to registrant
      sendRegistrationConfirmationEmail(registration).then(() => {
        console.log('Registration confirmation email sent to:', registration.emailAddress)
      }).catch(emailError => {
        console.error('Failed to send registration confirmation email:', emailError)
      }),

      // Send notification email to admins
      sendRegistrationNotification(registration).then(() => {
        console.log('Registration notification sent for:', registration.fullName)
      }).catch(emailError => {
        console.error('Failed to send registration notification:', emailError)
      })
    ]).then(results => {
      console.log('Background tasks completed for registration:', registration.id)
      // Log any failures for monitoring
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Background task ${index} failed:`, result.reason)
        }
      })
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

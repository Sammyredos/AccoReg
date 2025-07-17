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

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        fullName: data.fullName,
        dateOfBirth: dateOfBirth,
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

    // Return success response immediately after saving to database
    const response = NextResponse.json({
      success: true,
      registrationId: registration.id,
      message: 'Registration submitted successfully'
    })

    // Process background tasks without blocking the response
    // These operations will continue after the response is sent
    setImmediate(() => {
      Promise.allSettled([
        // Generate QR code for the registration with timeout
        Promise.race([
          generateRegistrationQR(registration.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('QR generation timeout')), 10000))
        ]).then(qrResult => {
          if (qrResult && qrResult.success) {
            console.log('QR code generated for registration:', registration.id)
          } else {
            console.error('Failed to generate QR code:', qrResult?.error || 'Unknown error')
          }
        }).catch(qrError => {
          console.error('QR code generation error:', qrError.message || qrError)
        }),

        // Create notification record in database with timeout
        Promise.race([
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
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Notification creation timeout')), 5000))
        ]).then(() => {
          console.log('Database notification created for:', registration.fullName)
        }).catch(notificationError => {
          console.error('Failed to create notification record:', notificationError.message || notificationError)
        }),

        // Send confirmation email with QR code to registrant with timeout
        Promise.race([
          sendRegistrationConfirmationEmail(registration),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 15000))
        ]).then(() => {
          console.log('Registration confirmation email sent to:', registration.emailAddress)
        }).catch(emailError => {
          console.error('Failed to send registration confirmation email:', emailError.message || emailError)
        }),

        // Send notification email to admins with timeout
        Promise.race([
          sendRegistrationNotification(registration),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Admin notification timeout')), 15000))
        ]).then(() => {
          console.log('Registration notification sent for:', registration.fullName)
        }).catch(emailError => {
          console.error('Failed to send registration notification:', emailError.message || emailError)
        })
      ]).then(results => {
        console.log('Background tasks completed for registration:', registration.id)
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length > 0) {
          console.error(`${failures.length} background tasks failed for registration:`, registration.id)
          failures.forEach((failure, index) => {
            console.error(`Task ${index} failed:`, failure.reason?.message || failure.reason)
          })
        }
      }).catch(error => {
        console.error('Background task processing error:', error)
      })
    })

    return response
  } catch (error) {
    console.error('Registration submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

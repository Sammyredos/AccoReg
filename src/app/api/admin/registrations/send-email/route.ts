import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie (same as /api/auth/me)
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('Token payload:', payload)

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

    console.log('Current user:', currentUser.email, 'Role:', currentUser.role?.name)

    // Check if user has permission to send emails (Super Admin, Admin, Manager)
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      console.log('Insufficient permissions. User role:', currentUser.role?.name)
      return NextResponse.json({
        error: 'Insufficient permissions to send emails',
        details: `Your role (${currentUser.role?.name || 'Unknown'}) does not have permission to send emails. Only Super Admins, Admins, and Managers can send emails to registrants. Staff users have view-only access to registration data.`,
        userRole: currentUser.role?.name,
        requiredRoles: ['Super Admin', 'Admin', 'Manager'],
        action: 'send_email',
        resource: 'registrations'
      }, { status: 403 })
    }

    const body = await request.json()
    const { registrationId, recipientEmail, recipientName } = body

    if (!registrationId || !recipientEmail || !recipientName) {
      return NextResponse.json({
        error: 'Missing required fields: registrationId, recipientEmail, recipientName'
      }, { status: 400 })
    }

    // Get registration details
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId }
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Generate email content
    const emailContent = generateEmailContent(registration, recipientName)

    // Send actual email using the email service
    try {
      const { sendEmail } = await import('@/lib/email')

      await sendEmail({
        to: [recipientEmail],
        subject: `Registration Details - ${registration.fullName}`,
        html: emailContent
      })

      console.log('Email sent successfully to:', recipientEmail)
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      throw new Error(`Failed to send email: ${emailError.message}`)
    }

    // Log the email activity (optional)
    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: currentUser.id },
        data: {
          updatedAt: new Date()
        }
      })
    } else {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      recipient: recipientEmail
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({
      error: 'Failed to send email'
    }, { status: 500 })
  }
}

function generateEmailContent(registration: any, recipientName: string) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return {
    subject: `Youth Program Registration Confirmation - ${registration.fullName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Youth Program Registration</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Registration Confirmation</p>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="margin-top: 0;">Dear ${recipientName},</p>

          <p>Thank you for registering for our youth program! Here are your registration details:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #333;">Personal Information</h3>
            <p><strong>Name:</strong> ${registration.fullName}</p>
            <p><strong>Age:</strong> ${calculateAge(registration.dateOfBirth)} years old</p>
            <p><strong>Gender:</strong> ${registration.gender}</p>
            <p><strong>Email:</strong> ${registration.emailAddress}</p>
            <p><strong>Phone:</strong> ${registration.phoneNumber}</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #333;">Registration Status</h3>
            <p><strong>Status:</strong> ${registration.parentalPermissionGranted ?
              '<span style="color: #28a745;">✓ Completed</span>' :
              '<span style="color: #ffc107;">⏳ Pending Approval</span>'
            }</p>
            <p><strong>Registration Date:</strong> ${formatDate(registration.createdAt)}</p>
            <p><strong>Registration ID:</strong> ${registration.id}</p>
          </div>

          ${!registration.parentalPermissionGranted ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <p style="margin: 0; color: #856404;"><strong>Next Steps:</strong> Your registration is pending final approval. We will contact you soon with next steps.</p>
          </div>
          ` : `
          <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <p style="margin: 0; color: #155724;"><strong>Welcome!</strong> Your registration is complete. We're excited to have you join our program!</p>
          </div>
          `}

          <p>If you have any questions, please don't hesitate to contact us.</p>

          <p style="margin-bottom: 0;">
            Best regards,<br>
            <strong>Youth Program Team</strong>
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
          <p>This email was sent automatically. Please do not reply to this email.</p>
        </div>
      </div>
    `,
    text: `
Youth Program Registration Confirmation

Dear ${recipientName},

Thank you for registering for our youth program! Here are your registration details:

Personal Information:
- Name: ${registration.fullName}
- Age: ${calculateAge(registration.dateOfBirth)} years old
- Gender: ${registration.gender}
- Email: ${registration.emailAddress}
- Phone: ${registration.phoneNumber}

Registration Status:
- Status: ${registration.parentalPermissionGranted ? 'Completed' : 'Pending Approval'}
- Registration Date: ${formatDate(registration.createdAt)}
- Registration ID: ${registration.id}

${!registration.parentalPermissionGranted ?
  'Next Steps: Your registration is pending final approval. We will contact you soon with next steps.' :
  'Welcome! Your registration is complete. We\'re excited to have you join our program!'
}

If you have any questions, please don't hesitate to contact us.

Best regards,
Youth Program Team

This email was sent automatically. Please do not reply to this email.
    `.trim()
  }
}

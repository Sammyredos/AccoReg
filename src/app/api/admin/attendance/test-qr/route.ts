/**
 * Test QR Code API
 * GET /api/admin/attendance/test-qr
 * 
 * Generates a test QR code for debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { generateRegistrationQR } from '@/lib/qr-code'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Get the first registration for testing
    const registration = await prisma.registration.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!registration) {
      return NextResponse.json({
        error: 'No registrations found for testing'
      }, { status: 404 })
    }

    // Generate QR code for this registration
    const qrResult = await generateRegistrationQR(registration.id)

    if (!qrResult.success) {
      return NextResponse.json({
        error: qrResult.error || 'Failed to generate QR code'
      }, { status: 500 })
    }

    // Also return the raw QR data for testing
    const qrData = {
      id: registration.id,
      fullName: registration.fullName,
      gender: registration.gender,
      dateOfBirth: registration.dateOfBirth,
      phoneNumber: registration.phoneNumber,
      emailAddress: registration.emailAddress,
      timestamp: Date.now(),
      checksum: 'test-checksum'
    }

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        fullName: registration.fullName,
        emailAddress: registration.emailAddress,
        isVerified: registration.isVerified
      },
      qrCode: qrResult.qrCode,
      qrDataUrl: qrResult.qrDataUrl,
      rawQrData: JSON.stringify(qrData),
      testInstructions: 'Copy the rawQrData and paste it into the QR scanner for testing'
    })

  } catch (error) {
    console.error('Test QR generation failed:', error)
    return NextResponse.json({
      error: 'Failed to generate test QR code'
    }, { status: 500 })
  }
}

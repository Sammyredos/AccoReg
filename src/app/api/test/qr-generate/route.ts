import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const testId = searchParams.get('id') || 'test-registration-123'
    
    let qrData: string
    
    if (format === 'simple') {
      // Simple format - just the registration ID
      qrData = testId
    } else {
      // JSON format (default)
      qrData = JSON.stringify({
        id: testId,
        fullName: "Test User",
        gender: "Male",
        dateOfBirth: "1990-01-01T00:00:00.000Z",
        phoneNumber: "+1234567890",
        emailAddress: "test@example.com",
        timestamp: Date.now(),
        checksum: "TEST123"
      })
    }
    
    // Generate QR code with optimal settings
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H', // High error correction
      margin: 3,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      width: 400,
      scale: 10
    })
    
    return NextResponse.json({
      success: true,
      format,
      qrData,
      qrDataUrl,
      instructions: {
        simple: 'Use ?format=simple for just registration ID',
        json: 'Use ?format=json for full JSON data (default)',
        customId: 'Use ?id=your-id to test with specific ID'
      }
    })
    
  } catch (error) {
    console.error('Test QR generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate test QR code'
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyQRCode } from '@/lib/qr-code'

export async function POST(request: NextRequest) {
  try {
    const { qrData } = await request.json()
    
    if (!qrData) {
      return NextResponse.json({
        success: false,
        error: 'QR data is required'
      }, { status: 400 })
    }

    console.log('Testing QR verification for:', qrData.substring(0, 100) + '...')
    
    // Verify the QR code
    const result = await verifyQRCode(qrData)
    
    console.log('QR verification result:', {
      success: result.success,
      isValid: result.isValid,
      error: result.error,
      registrationId: result.registration?.id,
      fullName: result.registration?.fullName
    })
    
    return NextResponse.json({
      success: true,
      verification: result,
      debug: {
        qrDataLength: qrData.length,
        qrDataPreview: qrData.substring(0, 100) + (qrData.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('QR verification test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

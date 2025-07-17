import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🧪 Test form submission started')
    
    // Test basic request parsing
    const data = await request.json()
    console.log('✅ Request parsed successfully')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Test simple database query
    const count = await prisma.registration.count()
    console.log('✅ Database query successful, registrations:', count)
    
    // Test simple database write (create a test record)
    const testRecord = await prisma.registration.create({
      data: {
        fullName: `Test User ${Date.now()}`,
        dateOfBirth: new Date('2000-01-01'),
        age: 24,
        gender: 'Male',
        address: 'Test Address',
        branch: 'Test Branch',
        phoneNumber: '1234567890',
        emailAddress: `test${Date.now()}@example.com`,
        emergencyContactName: 'Test Emergency Contact',
        emergencyContactRelationship: 'Parent',
        emergencyContactPhone: '0987654321',
        parentGuardianName: 'Test Parent',
        parentGuardianPhone: '1111111111',
        parentGuardianEmail: `parent${Date.now()}@example.com`,
        qrCode: `TEST_QR_${Date.now()}`,
        isVerified: false,
        parentalPermissionGranted: true,
        parentalPermissionDate: new Date()
      }
    })
    console.log('✅ Database write successful, ID:', testRecord.id)
    
    // Clean up test record
    await prisma.registration.delete({
      where: { id: testRecord.id }
    })
    console.log('✅ Test record cleaned up')
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'Form submission test completed successfully',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      tests: {
        requestParsing: 'passed',
        databaseConnection: 'passed',
        databaseRead: 'passed',
        databaseWrite: 'passed',
        cleanup: 'passed'
      },
      registrationCount: count
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ Test form submission failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
    
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test form submission endpoint',
    usage: 'Send POST request with form data to test submission pipeline',
    timestamp: new Date().toISOString()
  })
}

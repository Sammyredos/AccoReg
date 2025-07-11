/**
 * Test Real-Time Attendance Events
 * POST /api/admin/attendance/test-realtime
 * For testing real-time functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { broadcastAttendanceEvent } from '../events/route'
import { Logger } from '@/lib/logger'

const logger = Logger('TestRealTime')

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin can test
    if (currentUser.role?.name !== 'Super Admin') {
      return NextResponse.json({ error: 'Only Super Admin can test real-time events' }, { status: 403 })
    }

    const body = await request.json()
    const { eventType = 'verification', testData } = body

    // Create test event
    const testEvent = {
      type: eventType as 'verification' | 'status_change' | 'new_scan',
      data: {
        registrationId: testData?.registrationId || 'test-123',
        fullName: testData?.fullName || 'Test User',
        status: testData?.status || 'present',
        timestamp: new Date().toISOString(),
        scannerName: testData?.scannerName || `Test Scanner (${currentUser.fullName})`,
        platoonName: testData?.platoonName || 'Test Platoon',
        roomName: testData?.roomName || 'Test Room'
      }
    }

    logger.info('Broadcasting test real-time event', { 
      eventType, 
      testData,
      triggeredBy: currentUser.email 
    })

    // Broadcast the test event
    broadcastAttendanceEvent(testEvent)

    return NextResponse.json({
      success: true,
      message: 'Test real-time event broadcasted successfully',
      event: testEvent
    })

  } catch (error) {
    logger.error('Error in test real-time endpoint', error)
    return NextResponse.json(
      { error: 'Failed to broadcast test event' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    return NextResponse.json({
      success: true,
      message: 'Real-time test endpoint is available',
      usage: {
        method: 'POST',
        body: {
          eventType: 'verification | status_change | new_scan',
          testData: {
            registrationId: 'string (optional)',
            fullName: 'string (optional)',
            status: 'present | absent | late (optional)',
            scannerName: 'string (optional)',
            platoonName: 'string (optional)',
            roomName: 'string (optional)'
          }
        }
      },
      examples: [
        {
          eventType: 'verification',
          testData: {
            registrationId: 'reg-123',
            fullName: 'John Doe',
            status: 'present',
            scannerName: 'Admin Scanner'
          }
        }
      ]
    })

  } catch (error) {
    logger.error('Error in test real-time GET endpoint', error)
    return NextResponse.json(
      { error: 'Failed to get test endpoint info' },
      { status: 500 }
    )
  }
}

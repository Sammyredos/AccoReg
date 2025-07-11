/**
 * Real-Time Attendance Events API
 * GET /api/admin/attendance/events
 * Server-Sent Events for real-time attendance updates
 */

import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { Logger } from '@/lib/logger'

const logger = Logger('AttendanceEvents')

// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

// Event types
export interface AttendanceEvent {
  type: 'verification' | 'status_change' | 'new_scan'
  data: {
    registrationId: string
    fullName: string
    status: 'present' | 'absent' | 'late'
    timestamp: string
    scannerName?: string
    platoonName?: string
    roomName?: string
  }
}

// Broadcast event to all connected clients with enhanced reliability
export function broadcastAttendanceEvent(event: AttendanceEvent) {
  const eventData = `data: ${JSON.stringify(event)}\n\n`

  logger.info('Broadcasting attendance event', {
    type: event.type,
    registrationId: event.data.registrationId,
    fullName: event.data.fullName,
    connections: connections.size,
    timestamp: event.data.timestamp
  })

  if (connections.size === 0) {
    logger.warn('No active SSE connections to broadcast to')
    return
  }

  let successCount = 0
  let failureCount = 0

  // Send to all connected clients with error handling
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(eventData))
      successCount++
    } catch (error) {
      logger.error('Failed to send event to client', error)
      connections.delete(controller)
      failureCount++
    }
  })

  logger.info('Event broadcast completed', {
    successCount,
    failureCount,
    remainingConnections: connections.size
  })

  // If we have failures, log them for debugging
  if (failureCount > 0) {
    logger.warn(`${failureCount} connections failed during broadcast`)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return new Response('Unauthorized', { status: 401 })
    }

    const currentUser = authResult.user!

    // Check permissions
    if (!['Super Admin', 'Admin', 'Manager'].includes(currentUser.role?.name || '')) {
      return new Response('Insufficient permissions', { status: 403 })
    }

    logger.info('New SSE connection established', { 
      userId: currentUser.id,
      role: currentUser.role?.name 
    })

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Add connection to active connections
        connections.add(controller)

        // Send initial connection message
        const welcomeEvent = `data: ${JSON.stringify({
          type: 'connected',
          data: {
            message: 'Real-time attendance updates connected',
            timestamp: new Date().toISOString()
          }
        })}\n\n`
        
        controller.enqueue(new TextEncoder().encode(welcomeEvent))

        // Send heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          try {
            const heartbeatEvent = `data: ${JSON.stringify({
              type: 'heartbeat',
              data: { timestamp: new Date().toISOString() }
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(heartbeatEvent))
          } catch (error) {
            clearInterval(heartbeat)
            connections.delete(controller)
          }
        }, 30000)

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          connections.delete(controller)
          controller.close()
          logger.info('SSE connection closed', { userId: currentUser.id })
        })
      },
      
      cancel() {
        connections.delete(controller)
        logger.info('SSE connection cancelled', { userId: currentUser.id })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error) {
    logger.error('Error in attendance events endpoint', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

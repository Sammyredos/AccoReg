/**
 * Real-Time Attendance Events API
 * GET /api/admin/attendance/events
 * Server-Sent Events for real-time attendance updates
 */

import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth-helpers'
import { Logger } from '@/lib/logger'

const logger = Logger('AttendanceEvents')

// Store active connections with metadata for better cleanup
const connections = new Map<ReadableStreamDefaultController, {
  userId: string
  createdAt: number
  lastHeartbeat: number
}>()

// Clean up stale connections every 2 minutes
setInterval(() => {
  const now = Date.now()
  const staleThreshold = 60000 // 1 minute without heartbeat
  const staleConnections: ReadableStreamDefaultController[] = []

  connections.forEach((metadata, controller) => {
    if (now - metadata.lastHeartbeat > staleThreshold) {
      staleConnections.push(controller)
    }
  })

  if (staleConnections.length > 0) {
    logger.info(`Cleaning up ${staleConnections.length} stale connections`)
    staleConnections.forEach(controller => {
      try {
        controller.close()
      } catch (error) {
        // Ignore errors when closing stale connections
      }
      connections.delete(controller)
    })
  }
}, 120000) // Every 2 minutes

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
  const failedConnections: ReadableStreamDefaultController[] = []

  // Send to all connected clients with error handling
  connections.forEach((metadata, controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(eventData))
      successCount++
      // Update last heartbeat time
      metadata.lastHeartbeat = Date.now()
    } catch (error) {
      logger.error('Failed to send event to client', error)
      failedConnections.push(controller)
      failureCount++
    }
  })

  // Clean up failed connections
  failedConnections.forEach(controller => {
    connections.delete(controller)
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

    // Check permissions (include Staff level)
    if (!['Super Admin', 'Admin', 'Manager', 'Staff'].includes(currentUser.role?.name || '')) {
      return new Response('Insufficient permissions', { status: 403 })
    }

    logger.info('New SSE connection established', { 
      userId: currentUser.id,
      role: currentUser.role?.name 
    })

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const now = Date.now()

        // Add connection to active connections with metadata
        connections.set(controller, {
          userId: currentUser.id,
          createdAt: now,
          lastHeartbeat: now
        })

        logger.info('New SSE connection established', {
          userId: currentUser.id,
          totalConnections: connections.size
        })

        // Send initial connection message
        const welcomeEvent = `data: ${JSON.stringify({
          type: 'connected',
          data: {
            message: 'Real-time attendance updates connected',
            timestamp: new Date().toISOString()
          }
        })}\n\n`

        controller.enqueue(new TextEncoder().encode(welcomeEvent))

        // Send heartbeat every 15 seconds (reduced from 30 for better reliability)
        const heartbeat = setInterval(() => {
          try {
            const heartbeatEvent = `data: ${JSON.stringify({
              type: 'heartbeat',
              data: { timestamp: new Date().toISOString() }
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(heartbeatEvent))

            // Update last heartbeat time
            const metadata = connections.get(controller)
            if (metadata) {
              metadata.lastHeartbeat = Date.now()
            }
          } catch (error) {
            logger.error('Heartbeat failed, cleaning up connection', error)
            clearInterval(heartbeat)
            connections.delete(controller)
          }
        }, 15000) // Reduced to 15 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          connections.delete(controller)
          controller.close()
          logger.info('SSE connection closed', {
            userId: currentUser.id,
            remainingConnections: connections.size
          })
        })
      },

      cancel() {
        connections.delete(controller)
        logger.info('SSE connection cancelled', {
          userId: currentUser.id,
          remainingConnections: connections.size
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    })

  } catch (error) {
    logger.error('Error in attendance events endpoint', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

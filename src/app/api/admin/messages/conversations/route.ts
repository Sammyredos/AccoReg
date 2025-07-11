import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateRequest } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

// Cache conversations for 60 seconds to improve performance
const conversationsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60 * 1000 // 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!
    const cacheKey = `conversations_${currentUser.email}`

    // Check cache first
    const cached = conversationsCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
          'X-Cache': 'HIT'
        }
      })
    }

    // Get all messages where current user is either sender or recipient
    // Limit to recent messages for better performance
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderEmail: currentUser.email },
          { recipientEmail: currentUser.email }
        ]
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 1000 // Limit to last 1000 messages for performance
    })

    // Group messages by conversation (other participant)
    const conversationsMap = new Map()

    messages.forEach(message => {
      // Determine the other participant
      const otherParticipant = message.senderEmail === currentUser.email 
        ? { email: message.recipientEmail, name: message.recipientName, type: message.recipientType }
        : { email: message.senderEmail, name: message.senderName, type: message.senderType }

      const conversationKey = otherParticipant.email

      if (!conversationsMap.has(conversationKey)) {
        conversationsMap.set(conversationKey, {
          id: conversationKey,
          participantEmail: otherParticipant.email,
          participantName: otherParticipant.name,
          participantType: otherParticipant.type,
          messages: [],
          lastMessage: '',
          lastMessageTime: '',
          unreadCount: 0,
          isOnline: false // This would need real-time data in a production app
        })
      }

      const conversation = conversationsMap.get(conversationKey)
      conversation.messages.push(message)

      // Update last message info (since messages are ordered by sentAt desc, first message is the latest)
      if (!conversation.lastMessage) {
        conversation.lastMessage = message.content
        conversation.lastMessageTime = message.sentAt
      }

      // Count unread messages (messages sent to current user that haven't been read)
      if (message.recipientEmail === currentUser.email && !message.readAt) {
        conversation.unreadCount++
      }
    })

    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())

    // Sort messages within each conversation by sentAt (oldest first for display)
    conversations.forEach(conversation => {
      conversation.messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
    })

    const responseData = {
      success: true,
      conversations
    }

    // Cache the result
    conversationsCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    })

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        'X-Cache': 'MISS'
      }
    })

  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Skeleton components are now inline
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'
import { Send, Reply, User, Clock, Check, CheckCheck } from 'lucide-react'

interface Message {
  id: string
  subject: string
  content: string
  senderEmail: string
  senderName: string
  recipientEmail: string
  recipientName: string
  senderType: 'admin' | 'user'
  recipientType: 'admin' | 'user'
  status: string
  sentAt: string
  readAt: string | null
  createdAt: string
}

interface ConversationViewProps {
  conversationId: string
  participantEmail: string
  participantName: string
  onClose: () => void
}

export function ConversationView({ conversationId, participantEmail, participantName, onClose }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const { success, error } = useToast()
  const { currentUser } = useUser()

  useEffect(() => {
    fetchConversation()
  }, [conversationId])

  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/admin/messages/conversation?participant=${encodeURIComponent(participantEmail)}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        error('Failed to load conversation')
      }
    } catch (err) {
      error('Network error loading conversation')
    } finally {
      setLoading(false)
    }
  }

  const sendReply = async () => {
    if (!replyContent.trim()) {
      error('Please enter a message')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: participantEmail,
          recipientType: 'admin',
          subject: `Re: Conversation with ${participantName}`,
          message: replyContent
        })
      })

      if (response.ok) {
        success('Message sent successfully')
        setReplyContent('')
        fetchConversation() // Refresh conversation
      } else {
        error('Failed to send message')
      }
    } catch (err) {
      error('Network error sending message')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const isMyMessage = (message: Message) => {
    return message.senderEmail === currentUser?.email
  }

  if (loading) {
    return (
      <div className="h-64 bg-gray-200 rounded-lg animate-pulse p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-300 rounded-full animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-gray-300 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-300 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-300 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-gray-300 rounded animate-pulse" />
            <div className="h-3 w-4/6 bg-gray-300 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="font-apercu-bold text-white text-sm">
              {participantName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-apercu-bold text-lg text-gray-900">{participantName}</h3>
            <p className="font-apercu-regular text-sm text-gray-600">{participantEmail}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onClose} className="font-apercu-medium">
          Close
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="font-apercu-medium text-gray-600">No messages yet</p>
            <p className="font-apercu-regular text-sm text-gray-500">Start the conversation below</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  isMyMessage(message)
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-apercu-medium text-xs ${
                    isMyMessage(message) ? 'text-indigo-100' : 'text-gray-600'
                  }`}>
                    {isMyMessage(message) ? 'You' : message.senderName}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Clock className={`h-3 w-3 ${
                      isMyMessage(message) ? 'text-indigo-200' : 'text-gray-500'
                    }`} />
                    <span className={`text-xs ${
                      isMyMessage(message) ? 'text-indigo-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.sentAt)}
                    </span>
                  </div>
                </div>
                
                {message.subject && (
                  <p className={`font-apercu-bold text-sm mb-2 ${
                    isMyMessage(message) ? 'text-white' : 'text-gray-900'
                  }`}>
                    {message.subject}
                  </p>
                )}
                
                <p className={`font-apercu-regular text-sm leading-relaxed whitespace-pre-wrap ${
                  isMyMessage(message) ? 'text-white' : 'text-gray-900'
                }`}>
                  {message.content}
                </p>
                
                {isMyMessage(message) && (
                  <div className="flex items-center justify-end mt-2">
                    {message.readAt ? (
                      <CheckCheck className="h-3 w-3 text-indigo-200" />
                    ) : (
                      <Check className="h-3 w-3 text-indigo-300" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Input */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex space-x-3">
          <div className="flex-1">
            <Textarea
              placeholder="Type your message..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] resize-none font-apercu-regular"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendReply()
                }
              }}
            />
          </div>
          <Button
            onClick={sendReply}
            disabled={sending || !replyContent.trim()}
            className="self-end bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-apercu-medium"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-apercu-regular">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  )
}

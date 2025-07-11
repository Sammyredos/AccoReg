'use client'

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/contexts/ToastContext'
import { ErrorModal } from '@/components/ui/error-modal'
import { useUser } from '@/contexts/UserContext'
import { useMessages } from '@/contexts/MessageContext'
import { ChatMessage } from '@/components/admin/ChatMessage'

import { MessageInput } from '@/components/admin/MessageInput'
import { DateSeparator } from '@/components/admin/DateSeparator'
import { UserDirectory } from '@/components/admin/UserDirectory'
import { useTranslation } from '@/contexts/LanguageContext'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
// import { InboxContentSkeleton } from '@/components/ui/skeleton' // Commented out as unused
import {
  Mail,
  Search,
  MailOpen,
  CheckCircle,
  MessageSquare,
  Plus
} from 'lucide-react'

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

interface ChatConversation {
  id: string
  participantEmail: string
  participantName: string
  participantType: 'admin' | 'user'
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isOnline: boolean
}

export default function InboxPage() {
  const { t } = useTranslation()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [sending, setSending] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [showUserDirectory, setShowUserDirectory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    type: 'error' | 'warning' | 'info' | 'success'
    title: string
    description: string
    details?: string
    errorCode?: string
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    description: ''
  })

  const { success, error } = useToast()
  const { currentUser } = useUser()
  const { refreshStats, markAsRead: markMessageAsRead } = useMessages()

  // Debounce search term to prevent excessive filtering
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300) // 300ms delay

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Auto-scroll to bottom when new messages arrive - debounced to prevent excessive re-renders
  useEffect(() => {
    if (messagesEndRef.current && selectedConversation?.messages?.length) {
      const timeoutId = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100) // Small delay to prevent rapid scrolling

      return () => clearTimeout(timeoutId)
    }
    // Return undefined for the else case
    return undefined
  }, [selectedConversation?.messages?.length]) // Only depend on message count, not the entire messages array

  // Removed real-time update to prevent interference with optimistic updates

  const fetchConversations = useCallback(async (skipStatsRefresh = false) => {
    try {
      if (!skipStatsRefresh) {
        setLoading(true)
      }
      const response = await fetch('/api/admin/messages/conversations', {
        headers: {
          'Cache-Control': 'max-age=60', // Increase cache to 60 seconds
        }
      })
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        // Only refresh stats on initial load, not on polling
        if (!skipStatsRefresh) {
          // Call refreshStats without making it a dependency to prevent re-renders
          refreshStats()
        }
      } else {
        throw new Error('Failed to fetch conversations')
      }
    } catch (error) {
      // Only show error on initial load, not on polling failures
      if (!skipStatsRefresh) {
        setErrorModal({
          isOpen: true,
          type: 'error',
          title: 'Failed to Load Conversations',
          description: 'Unable to load your conversations. Please refresh the page or contact support.',
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\nTime: ${new Date().toISOString()}`,
          errorCode: 'CONVERSATIONS_LOAD_ERROR'
        })
      }
    } finally {
      if (!skipStatsRefresh) {
        setLoading(false)
        setInitialLoadComplete(true)
      }
    }
  }, []) // Remove refreshStats dependency to prevent re-renders

  // Initial fetch only - disable polling to prevent interference with optimistic updates
  useEffect(() => {
    fetchConversations() // Initial load with stats refresh
  }, []) // Remove fetchConversations dependency to prevent re-renders

  const markAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/read`, {
        method: 'PUT'
      })

      if (response.ok) {
        // Update conversations
        setConversations(prev => prev.map(conv => ({
          ...conv,
          messages: conv.messages.map(msg =>
            msg.id === messageId ? { ...msg, readAt: new Date().toISOString() } : msg
          ),
          unreadCount: conv.messages.filter(msg =>
            !msg.readAt && msg.senderEmail !== currentUser?.email
          ).length
        })))

        // Update selected conversation
        if (selectedConversation) {
          setSelectedConversation(prev => prev ? {
            ...prev,
            messages: prev.messages.map(msg =>
              msg.id === messageId ? { ...msg, readAt: new Date().toISOString() } : msg
            )
          } : null)
        }

        markMessageAsRead(messageId)
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error)
    }
  }

  const sendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim()) return

    // Create optimistic message immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      subject: `Chat message from ${currentUser?.name}`,
      content,
      senderEmail: currentUser?.email || '',
      senderName: currentUser?.name || '',
      recipientEmail: selectedConversation.participantEmail,
      recipientName: selectedConversation.participantName,
      senderType: 'admin',
      recipientType: selectedConversation.participantType,
      status: 'sending',
      sentAt: new Date().toISOString(),
      readAt: null,
      createdAt: new Date().toISOString()
    }

    // Update UI immediately with optimistic message
    setSelectedConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, optimisticMessage],
      lastMessage: content,
      lastMessageTime: optimisticMessage.sentAt
    } : null)

    setConversations(prev => prev.map(conv =>
      conv.id === selectedConversation.id
        ? {
            ...conv,
            messages: [...conv.messages, optimisticMessage],
            lastMessage: content,
            lastMessageTime: optimisticMessage.sentAt
          }
        : conv
    ))

    setSending(true)
    try {
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: selectedConversation.participantEmail,
          recipientType: selectedConversation.participantType,
          subject: `Chat message from ${currentUser?.name}`,
          message: content
        })
      })

      if (response.ok) {
        const responseData = await response.json()
        const actualMessage: Message = {
          id: responseData.messageId || Date.now().toString(),
          subject: `Chat message from ${currentUser?.name}`,
          content,
          senderEmail: currentUser?.email || '',
          senderName: currentUser?.name || '',
          recipientEmail: selectedConversation.participantEmail,
          recipientName: selectedConversation.participantName,
          senderType: 'admin',
          recipientType: selectedConversation.participantType,
          status: 'sent',
          sentAt: new Date().toISOString(),
          readAt: null,
          createdAt: new Date().toISOString()
        }

        // Replace optimistic message with actual message
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === optimisticMessage.id ? actualMessage : msg
          ),
          lastMessage: content,
          lastMessageTime: actualMessage.sentAt
        } : null)

        setConversations(prev => prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === optimisticMessage.id ? actualMessage : msg
                ),
                lastMessage: content,
                lastMessageTime: actualMessage.sentAt
              }
            : conv
        ))

        refreshStats()
        success('Message sent successfully')
      } else {
        throw new Error('Failed to send message')
      }
    } catch {
      // Remove optimistic message on error
      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== optimisticMessage.id)
      } : null)

      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: conv.messages.filter(msg => msg.id !== optimisticMessage.id)
            }
          : conv
      ))

      error('Send Failed', 'Unable to send the message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!selectedConversation) return

    setSending(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('recipientId', selectedConversation.participantEmail)
      formData.append('recipientType', selectedConversation.participantType)
      formData.append('subject', `File from ${currentUser?.name}`)

      const response = await fetch('/api/admin/messages/send-file', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const newMessage: Message = {
          id: Date.now().toString(),
          subject: `File from ${currentUser?.name}`,
          content: `📎 ${file.name}`,
          senderEmail: currentUser?.email || '',
          senderName: currentUser?.name || '',
          recipientEmail: selectedConversation.participantEmail,
          recipientName: selectedConversation.participantName,
          senderType: 'admin',
          recipientType: selectedConversation.participantType,
          status: 'sent',
          sentAt: new Date().toISOString(),
          readAt: null,
          createdAt: new Date().toISOString()
        }

        // Update selected conversation
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage],
          lastMessage: `📎 ${file.name}`,
          lastMessageTime: newMessage.sentAt
        } : null)

        // Update conversations list
        setConversations(prev => prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                lastMessage: `📎 ${file.name}`,
                lastMessageTime: newMessage.sentAt
              }
            : conv
        ))

        refreshStats()
        success('File sent successfully')
      } else {
        throw new Error('Failed to send file')
      }
    } catch {
      error('Upload Failed', 'Unable to send the file. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleUserSelect = (user: { email: string; name: string; type: 'admin' | 'user' }) => {
    // Check if conversation already exists
    const existingConversation = conversations.find(conv => conv.participantEmail === user.email)

    if (existingConversation) {
      // Select existing conversation
      selectConversation(existingConversation)
    } else {
      // Create new conversation
      const newConversation: ChatConversation = {
        id: user.email,
        participantEmail: user.email,
        participantName: user.name,
        participantType: user.type,
        messages: [],
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isOnline: false
      }

      setConversations(prev => [newConversation, ...prev])
      setSelectedConversation(newConversation)
      setShowMobileChat(true)
    }

    setShowUserDirectory(false)
  }

  const selectConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation)
    setShowMobileChat(true)

    // Mark unread messages as read and update the conversation immediately
    const unreadMessages = conversation.messages.filter(
      message => !message.readAt && message.senderEmail !== currentUser?.email
    )

    if (unreadMessages.length > 0) {
      // Update the conversation state immediately to remove badge
      const updatedConversation = {
        ...conversation,
        unreadCount: 0,
        messages: conversation.messages.map(msg =>
          unreadMessages.some(unread => unread.id === msg.id)
            ? { ...msg, readAt: new Date().toISOString() }
            : msg
        )
      }

      // Update conversations list
      setConversations(prev => prev.map(conv =>
        conv.id === conversation.id ? updatedConversation : conv
      ))

      // Update selected conversation
      setSelectedConversation(updatedConversation)

      // Mark messages as read on server
      unreadMessages.forEach(message => {
        markAsRead(message.id)
      })
    }
  }

  const filteredConversations = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return conversations
    }

    const searchLower = debouncedSearchTerm.toLowerCase()
    return conversations.filter(conversation =>
      conversation.participantName.toLowerCase().includes(searchLower) ||
      conversation.participantEmail.toLowerCase().includes(searchLower) ||
      conversation.lastMessage.toLowerCase().includes(searchLower)
    )
  }, [conversations, debouncedSearchTerm])

  const { totalUnreadCount, totalMessages } = useMemo(() => {
    // Only recalculate when conversations array actually changes
    if (!conversations.length) {
      return { totalUnreadCount: 0, totalMessages: 0 }
    }

    return {
      totalUnreadCount: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
      totalMessages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0)
    }
  }, [conversations.length, conversations.map(c => `${c.unreadCount}-${c.messages.length}`).join(',')])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  // Skeleton components
  const StatsSkeleton = () => (
    <StatsGrid columns={4}>
      {Array.from({ length: 4 }).map((_, i) => (
        <StatsCard
          key={i}
          title=""
          value=""
          icon={MessageSquare}
          gradient="bg-gradient-to-r from-gray-400 to-gray-500"
          bgGradient="bg-gradient-to-br from-white to-gray-50"
          loading={true}
        />
      ))}
    </StatsGrid>
  )

  const ConversationsSkeleton = () => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden h-[calc(100vh-280px)]">
      <div className="flex h-full">
        {/* Left Sidebar Skeleton */}
        <div className="flex flex-col w-full lg:w-1/3 border-r border-gray-200 bg-white">
          {/* Header Skeleton */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between p-4 bg-gray-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="h-6 w-20 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-10 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
            <div className="p-3">
              <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Conversations List Skeleton */}
          <div className="flex-1 overflow-y-auto bg-white">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Skeleton */}
        <div className="hidden lg:flex flex-col w-full lg:w-2/3 bg-white">
          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="h-32 w-32 mx-auto mb-6 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>
            <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )

  // Show skeleton only on initial load, not on subsequent updates
  if (loading && !initialLoadComplete) {
    return (
      <ProtectedRoute requiredRoles={['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']}>
        <AdminLayoutNew title={t('page.inbox.title')} description={t('page.inbox.description')}>
          <StatsSkeleton />
          <ConversationsSkeleton />
        </AdminLayoutNew>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']}>
      <AdminLayoutNew title={t('page.inbox.title')} description={t('page.inbox.description')}>
        {/* Stats Cards - Consistent Design */}
        <StatsGrid columns={4}>
          <StatsCard
            title="Conversations"
            value={conversations.length}
            subtitle="Active message threads"
            icon={MessageSquare}
            gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
            bgGradient="bg-gradient-to-br from-white to-blue-50"
          />

          <StatsCard
            title="Unread Messages"
            value={totalUnreadCount}
            subtitle="Pending your attention"
            icon={MailOpen}
            gradient="bg-gradient-to-r from-red-500 to-pink-600"
            bgGradient="bg-gradient-to-br from-white to-red-50"
          />

          <StatsCard
            title="Total Messages"
            value={totalMessages}
            subtitle="All message history"
            icon={Mail}
            gradient="bg-gradient-to-r from-green-500 to-emerald-600"
            bgGradient="bg-gradient-to-br from-white to-green-50"
          />

          <StatsCard
            title="Online Users"
            value={conversations.filter(conv => conv.isOnline).length}
            subtitle="Currently active"
            icon={CheckCircle}
            gradient="bg-gradient-to-r from-purple-500 to-indigo-600"
            bgGradient="bg-gradient-to-br from-white to-purple-50"
          />
        </StatsGrid>

        {/* WhatsApp Web-Style Chat Interface */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 mt-8 overflow-hidden h-[calc(100vh-280px)]">
          <div className="flex h-full">
            {/* Left Sidebar - Conversations List */}
            <div className={`${showMobileChat ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-1/3 border-r border-gray-200 bg-white`}>
              {/* Header with Search and New Chat */}
              <div className="bg-gray-50 border-b border-gray-200">
                {/* Top Header */}
                <div className="flex items-center justify-between p-4 bg-indigo-600">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h1 className="font-apercu-bold text-lg text-white">Messages</h1>
                  </div>
                  <button
                    onClick={() => setShowUserDirectory(true)}
                    className="h-10 w-10 bg-indigo-500 hover:bg-indigo-400 rounded-full flex items-center justify-center transition-colors"
                    title="New Chat"
                  >
                    <Plus className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search or start new chat"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 font-apercu-regular bg-gray-100 border-0 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto bg-white">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="font-apercu-medium text-gray-600 mb-2">No conversations yet</p>
                    <p className="font-apercu-regular text-sm text-gray-500 max-w-xs">
                      {searchTerm ? 'No results found. Try a different search term.' : 'Click the + button to start a new conversation'}
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredConversations.map(conversation => (
                      <div
                        key={conversation.id}
                        onClick={() => selectConversation(conversation)}
                        className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 border-b border-gray-100 ${
                          selectedConversation?.id === conversation.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative flex-shrink-0">
                            <div className="h-12 w-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                              <span className="font-apercu-bold text-white text-sm">
                                {conversation.participantName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {conversation.isOnline && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-indigo-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-apercu-medium text-gray-900 truncate text-base">
                                {conversation.participantName}
                              </h3>
                              <span className="font-apercu-regular text-xs text-gray-500 flex-shrink-0 ml-2">
                                {formatDate(conversation.lastMessageTime)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="font-apercu-regular text-sm text-gray-600 truncate">
                                {conversation.lastMessage || 'No messages yet'}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <div className="bg-indigo-500 text-gray text-xs font-apercu-bold rounded-full h-5 w-5 flex items-center justify-center ml-2 flex-shrink-0 min-w-[20px]">
                                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Chat Area */}
            <div className={`${showMobileChat ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-2/3 bg-white`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header - WhatsApp Style */}
                  <div className="bg-gray-50 border-b border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShowMobileChat(false)}
                        className="lg:hidden p-2 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="relative flex-shrink-0">
                        <div className="h-10 w-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                          <span className="font-apercu-bold text-white text-sm">
                            {selectedConversation.participantName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {selectedConversation.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-indigo-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-apercu-medium text-gray-900 truncate">
                          {selectedConversation.participantName}
                        </h2>
                        <p className="font-apercu-regular text-sm text-gray-500">
                          {selectedConversation.isOnline ? 'Online' : 'Last seen recently'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                          <Search className="h-5 w-5 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area - Indigo Theme */}
                  <div
                    className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-indigo-50 to-indigo-100"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e0e7ff' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  >
                    <div className="space-y-1">
                      {selectedConversation.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <div className="bg-white rounded-full p-4 mb-3 shadow-sm">
                            <MessageSquare className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="font-apercu-medium text-gray-600">No messages yet</p>
                          <p className="font-apercu-regular text-sm text-gray-500">Start the conversation below</p>
                        </div>
                      ) : (
                        selectedConversation.messages
                          .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
                          .map((message, index) => {
                            const isFromCurrentUser = message.senderEmail === currentUser?.email
                            const sortedMessages = selectedConversation.messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
                            const prevMessage = index > 0 ? sortedMessages[index - 1] : null
                            const showDateSeparator = !prevMessage ||
                              new Date(message.sentAt).toDateString() !== new Date(prevMessage.sentAt).toDateString()

                            return (
                              <div key={message.id}>
                                {showDateSeparator && (
                                  <DateSeparator date={message.sentAt} />
                                )}
                                <ChatMessage
                                  id={message.id}
                                  content={message.content}
                                  timestamp={message.sentAt}
                                  isFromUser={isFromCurrentUser}
                                  isRead={!!message.readAt}
                                  senderName={isFromCurrentUser ? undefined : message.senderName}
                                  status={message.status === 'sending' ? 'sent' : (message.readAt ? 'read' : 'delivered')}
                                  fileAttachment={
                                    message.content.includes('📎 File attachment:')
                                      ? {
                                          originalName: message.content.replace('📎 File attachment: ', ''),
                                          filename: 'sample-file.pdf',
                                          size: 1024000,
                                          type: 'application/pdf',
                                          url: '/uploads/messages/sample-file.pdf'
                                        }
                                      : undefined
                                  }
                                />
                              </div>
                            )
                          })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Message Input */}
                  <MessageInput
                    onSend={sendMessage}
                    onFileUpload={handleFileUpload}
                    placeholder="Type a message..."
                    disabled={sending}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-indigo-50 to-indigo-100">
                  <div className="mb-8">
                    <div className="h-32 w-32 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-16 w-16 text-gray-400" />
                    </div>
                    <h2 className="font-apercu-bold text-2xl text-gray-900 mb-3">
                      Welcome to Messages
                    </h2>
                    <p className="font-apercu-regular text-gray-600 max-w-md text-base leading-relaxed">
                      Select a Contact to start a conversation.
                    </p>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => setShowUserDirectory(true)}
                      className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-3 transition-colors font-apercu-medium"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-white">Start New Conversation</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Directory Modal */}
        <UserDirectory
          isOpen={showUserDirectory}
          onClose={() => setShowUserDirectory(false)}
          onSendMessage={handleUserSelect}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
          type={errorModal.type}
          title={errorModal.title}
          description={errorModal.description}
          details={errorModal.details}
          errorCode={errorModal.errorCode}
        />
      </AdminLayoutNew>
    </ProtectedRoute>
  )
}

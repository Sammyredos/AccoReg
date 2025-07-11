'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useMessages } from '@/contexts/MessageContext'
import {
  MessageSquare,
  Send,
  X,
  User,
  Shield,
  Eye,
  Settings,
  Crown,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: {
    name: string
  }
  type: 'admin' | 'user'
}

interface SimpleMessagingProps {
  isOpen: boolean
  onClose: () => void
  recipient: User | null
  hideSubject?: boolean
}

export function SimpleMessaging({ isOpen, onClose, recipient, hideSubject = false }: SimpleMessagingProps) {
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { refreshStats } = useMessages()

  const handleSend = async () => {
    if (!recipient || !message.trim() || (!hideSubject && !subject.trim())) {
      setError(hideSubject ? 'Please fill in the message' : 'Please fill in both subject and message')
      return
    }

    setSending(true)
    setError('')

    try {
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: recipient.id,
          recipientType: recipient.type,
          subject: hideSubject ? 'Direct Message' : subject.trim(),
          message: message.trim()
        })
      })

      if (response.ok) {
        setSent(true)
        setMessage('')
        setSubject('')
        // Refresh message stats as the recipient will have a new unread message
        refreshStats()
        setTimeout(() => {
          setSent(false)
          onClose()
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send message')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin':
        return <Crown className="h-4 w-4 text-purple-600" />
      case 'Admin':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'Manager':
        return <Settings className="h-4 w-4 text-green-600" />
      case 'Staff':
        return <User className="h-4 w-4 text-orange-600" />
      case 'Viewer':
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Manager':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Staff':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen || !recipient) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-xl text-white">Send Message</h3>
                <p className="font-apercu-regular text-indigo-100 text-sm">
                  Direct message to user
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Recipient Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="font-apercu-bold text-white">
                {recipient.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-apercu-bold text-lg text-gray-900">
                  {recipient.name}
                </h4>
                <Badge className={`font-apercu-medium text-xs ${getRoleBadgeColor(recipient.role.name)}`}>
                  <div className="flex items-center space-x-1">
                    {getRoleIcon(recipient.role.name)}
                    <span>{recipient.role.name}</span>
                  </div>
                </Badge>
              </div>
              <p className="font-apercu-regular text-sm text-gray-600">
                {recipient.email}
              </p>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="p-6 space-y-4">
          {sent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-apercu-medium text-green-800">
                  Message sent successfully!
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-apercu-medium text-red-800">
                  {error}
                </span>
              </div>
            </div>
          )}

          {!hideSubject && (
            <div>
              <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                Subject *
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject..."
                className="font-apercu-regular"
                disabled={sending || sent}
              />
            </div>
          )}

          <div>
            <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              disabled={sending || sent}
            />
            <p className="font-apercu-regular text-xs text-gray-500 mt-1">
              {message.length}/1000 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
              className="font-apercu-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || sent || !message.trim() || (!hideSubject && !subject.trim())}
              className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

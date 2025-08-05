'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/contexts/ToastContext'
import { parseApiError } from '@/lib/error-messages'
import {
  X,
  Mail,
  Send,
  Loader2,
  Users,
  User,
  History,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react'

interface PlatoonEmailModalProps {
  isOpen: boolean
  onClose: () => void
  platoonId: string
  platoonName: string
  leaderName: string
  leaderEmail: string
  participants: Array<{
    id: string
    registration: {
      id: string
      fullName: string
      emailAddress: string
      gender: string
      branch: string
    }
  }>
}

type EmailTarget = 'leader' | 'team' | 'all' | 'participants-to-leader'
type ModalView = 'compose' | 'history'

interface EmailHistoryRecord {
  id: string
  subject: string
  message: string
  emailTarget: string
  recipientCount: number
  successCount: number
  failedCount: number
  senderName: string
  senderEmail: string
  createdAt: string
}

interface EmailHistoryData {
  platoon: {
    id: string
    name: string
    label: string
  }
  emails: EmailHistoryRecord[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export function PlatoonEmailModal({
  isOpen,
  onClose,
  platoonId,
  platoonName,
  leaderName,
  leaderEmail,
  participants
}: PlatoonEmailModalProps) {
  const { success, error } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [currentView, setCurrentView] = useState<ModalView>('compose')
  const [emailTarget, setEmailTarget] = useState<EmailTarget>('leader')
  const [emailHistory, setEmailHistory] = useState<EmailHistoryData | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  })

  const safeShowToast = (message: string, type: 'success' | 'error') => {
    try {
      if (type === 'success') {
        success(message)
      } else if (type === 'error') {
        error(message)
      }
    } catch (error) {
      console.error('Error showing toast:', error, message)
    }
  }

  // Fetch email history
  const fetchEmailHistory = async (page: number = 1) => {
    setHistoryLoading(true)
    try {
      const response = await fetch(`/api/admin/platoon-allocations/${platoonId}/email-history?page=${page}&limit=5`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch email history')
      }
      const data = await response.json()
      if (data.success && data.data) {
        setEmailHistory(data.data)
        setCurrentPage(page)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error fetching email history:', error)
      safeShowToast('Failed to load email history. Please try again.', 'error')
      // Set empty history state on error
      setEmailHistory({
        platoon: { id: platoonId, name: platoonName, label: '' },
        emails: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          limit: 5,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  // Delete email history record
  const deleteEmailHistory = async (emailId: string) => {
    setDeletingEmailId(emailId)
    try {
      const response = await fetch(`/api/admin/platoon-allocations/${platoonId}/email-history?emailId=${emailId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('Failed to delete email history')
      }
      safeShowToast('Email history deleted successfully', 'success')
      // Refresh the current page
      await fetchEmailHistory(currentPage)
    } catch (error) {
      console.error('Error deleting email history:', error)
      safeShowToast('Failed to delete email history', 'error')
    } finally {
      setDeletingEmailId(null)
    }
  }

  // Load email history when switching to history view
  useEffect(() => {
    if (currentView === 'history' && isOpen) {
      fetchEmailHistory(1)
    }
  }, [currentView, isOpen])

  // Get email recipients based on target
  const getEmailRecipients = () => {
    switch (emailTarget) {
      case 'leader':
        return [{ name: leaderName, email: leaderEmail, type: 'Leader' }]
      case 'team':
        return participants.map(p => ({
          name: p.registration.fullName,
          email: p.registration.emailAddress,
          type: 'Participant'
        }))
      case 'all':
        return [
          { name: leaderName, email: leaderEmail, type: 'Leader' },
          ...participants.map(p => ({
            name: p.registration.fullName,
            email: p.registration.emailAddress,
            type: 'Participant'
          }))
        ]
      case 'participants-to-leader':
        return [{ name: leaderName, email: leaderEmail, type: 'Leader (Participant List)' }]
      default:
        return []
    }
  }

  const recipients = getEmailRecipients()



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!formData.subject.trim()) {
      safeShowToast('Please enter an email subject', 'error')
      return
    }
    if (!formData.message.trim()) {
      safeShowToast('Please enter an email message', 'error')
      return
    }
    if (recipients.length === 0) {
      safeShowToast('No recipients selected', 'error')
      return
    }

    setIsLoading(true)

    try {
      // Use the appropriate API based on email target
      if (emailTarget === 'leader') {
        const response = await fetch('/api/admin/platoon-allocations/send-leader-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platoonIds: [platoonId],
            subject: formData.subject.trim(),
            message: formData.message.trim(),
            sendToAll: false
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to send email')
        }
      } else if (emailTarget === 'participants-to-leader') {
        // Use roster email API for sending participant list to leader
        const response = await fetch('/api/admin/platoon-allocations/send-roster', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platoonId,
            subject: formData.subject.trim(),
            message: formData.message.trim()
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to send roster email')
        }
      } else {
        // Use team email API for team and all recipients
        const response = await fetch('/api/admin/platoon-allocations/send-team-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platoonId,
            subject: formData.subject.trim(),
            message: formData.message.trim(),
            emailTarget
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to send email')
        }
      }
      
      // Close modal and reset form immediately for better UX
      onClose()
      setFormData({ subject: '', message: '' })
      setCurrentView('compose')
      setEmailTarget('leader')

      // Show immediate success message (email is being sent in background)
      const recipientText = emailTarget === 'leader' ? leaderName :
                           emailTarget === 'team' ? `${participants.length} team members` :
                           emailTarget === 'participants-to-leader' ? `${leaderName} (participant roster)` :
                           `${leaderName} and ${participants.length} team members`
      safeShowToast(`Email is being sent to ${recipientText}...`, 'success')
      
    } catch (error) {
      console.error('Error sending email:', error)
      const errorMessage = parseApiError(error)
      safeShowToast(errorMessage.description, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setFormData({ subject: '', message: '' })
      setCurrentView('compose')
      setEmailTarget('leader')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-4 sm:p-6 border-b border-violet-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center shadow-lg">
                {currentView === 'compose' ? (
                  <Mail className="h-5 w-5 text-white" />
                ) : (
                  <History className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="font-apercu-bold text-lg text-white">
                  {currentView === 'compose' ? 'Send Email' : 'Email History'} - {platoonName}
                </h2>
                <p className="font-apercu-regular text-sm text-violet-100">
                  {currentView === 'compose' 
                    ? 'Communicate with your platoon leader and team'
                    : 'View previous email communications'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentView === 'history' && (
                <Button
                  onClick={() => setCurrentView('compose')}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white hover:bg-white/10"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/10"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {currentView === 'compose' ? (
          <>
            {/* Email Target Selection */}
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <Label className="font-apercu-medium text-sm text-gray-700 mb-3 block">
                Send Email To:
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setEmailTarget('leader')}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    emailTarget === 'leader'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="h-4 w-4 text-violet-600" />
                    <span className="font-apercu-medium text-sm">Leader Only</span>
                  </div>
                  <p className="text-xs text-gray-600">{leaderName}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEmailTarget('team')}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    emailTarget === 'team'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="h-4 w-4 text-violet-600" />
                    <span className="font-apercu-medium text-sm">Team Only</span>
                  </div>
                  <p className="text-xs text-gray-600">{participants.length} participants</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEmailTarget('all')}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    emailTarget === 'all'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Filter className="h-4 w-4 text-violet-600" />
                    <span className="font-apercu-medium text-sm">Everyone</span>
                  </div>
                  <p className="text-xs text-gray-600">Leader + {participants.length} participants</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEmailTarget('participants-to-leader')}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    emailTarget === 'participants-to-leader'
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="h-4 w-4 text-violet-600" />
                    <span className="font-apercu-medium text-sm">Send Roster</span>
                  </div>
                  <p className="text-xs text-gray-600">Send participant list to leader</p>
                </button>
              </div>
            </div>

            {/* Recipients Preview */}
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="bg-violet-50 p-4 rounded-lg">
                <h3 className="font-apercu-bold text-sm text-violet-900 mb-2">
                  📧 Recipients ({recipients.length})
                </h3>
                <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-apercu-medium text-violet-700">
                        {recipient.name}
                      </span>
                      <span className="font-apercu-regular text-violet-600 text-xs">
                        {recipient.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <Label htmlFor="subject" className="font-apercu-medium text-sm text-gray-700">
                  Email Subject *
                </Label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={
                    emailTarget === 'participants-to-leader'
                      ? "e.g., Your Complete Platoon Roster"
                      : "e.g., Important Update for Your Platoon"
                  }
                  required
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="message" className="font-apercu-medium text-sm text-gray-700">
                  Email Message *
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={
                    emailTarget === 'participants-to-leader'
                      ? "Please find attached the complete roster of participants assigned to your platoon. Review the contact details and prepare for an amazing leadership experience!"
                      : "Enter your message..."
                  }
                  required
                  className="mt-1 min-h-[120px] resize-none"
                  disabled={isLoading}
                />
                {emailTarget === 'participants-to-leader' && (
                  <p className="text-xs text-violet-600 mt-1">
                    💡 A detailed participant roster with contact information will be automatically included in the email.
                  </p>
                )}
              </div>

              {/* Action Buttons - Mobile Responsive */}
              <div className="space-y-3 pt-4 sm:space-y-0 sm:flex sm:gap-3">
                <Button
                  type="button"
                  onClick={() => setCurrentView('history')}
                  variant="outline"
                  className="font-apercu-medium w-full sm:w-auto"
                  disabled={isLoading}
                >
                  <History className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">View History</span>
                  <span className="sm:hidden">History</span>
                </Button>
                <div className="flex gap-3 sm:flex-1">
                  <Button
                    type="button"
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1 font-apercu-medium"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 font-apercu-medium bg-violet-600 hover:bg-violet-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Sending...</span>
                        <span className="sm:hidden">Send...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Send Email</span>
                        <span className="sm:hidden">Send</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </>
        ) : (
          /* Email History View */
          <div className="p-4 sm:p-6">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                <span className="ml-2 text-gray-600">Loading email history...</span>
              </div>
            ) : !emailHistory || emailHistory.emails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-apercu-bold text-lg text-gray-900 mb-2">No Email History</h3>
                <p className="text-gray-600">No emails have been sent to this platoon yet.</p>
              </div>
            ) : (
              <>
                {/* Email History List */}
                <div className="space-y-4 mb-6">
                  {emailHistory.emails.map((email) => (
                    <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-apercu-bold text-sm text-gray-900 truncate">{email.subject}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                            <span>Sent by {email.senderName}</span>
                            <span>•</span>
                            <span>{new Date(email.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="capitalize">{email.emailTarget.replace('-', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <div className="flex items-center space-x-1">
                            {email.successCount > 0 && (
                              <div className="flex items-center">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-green-600 ml-1">{email.successCount}</span>
                              </div>
                            )}
                            {email.failedCount > 0 && (
                              <div className="flex items-center">
                                <XCircle className="h-3 w-3 text-red-600" />
                                <span className="text-xs text-red-600 ml-1">{email.failedCount}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => deleteEmailHistory(email.id)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingEmailId === email.id}
                          >
                            {deletingEmailId === email.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{email.message}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Recipients: {email.recipientCount}</span>
                        <span>Success Rate: {Math.round((email.successCount / email.recipientCount) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {emailHistory.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-gray-600">
                      Showing {((emailHistory.pagination.currentPage - 1) * emailHistory.pagination.limit) + 1} to{' '}
                      {Math.min(emailHistory.pagination.currentPage * emailHistory.pagination.limit, emailHistory.pagination.totalCount)} of{' '}
                      {emailHistory.pagination.totalCount} emails
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => fetchEmailHistory(currentPage - 1)}
                        variant="outline"
                        size="sm"
                        disabled={!emailHistory.pagination.hasPrevPage || historyLoading}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-600">
                        {emailHistory.pagination.currentPage} of {emailHistory.pagination.totalPages}
                      </span>
                      <Button
                        onClick={() => fetchEmailHistory(currentPage + 1)}
                        variant="outline"
                        size="sm"
                        disabled={!emailHistory.pagination.hasNextPage || historyLoading}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

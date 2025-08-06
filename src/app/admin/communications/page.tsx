'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/ToastContext'
import { ErrorModal } from '@/components/ui/error-modal'
import { useUser } from '@/contexts/UserContext'
import { EmailConfigDisplay } from '@/components/admin/EmailConfigDisplay'
import { SMSConfigDisplay } from '@/components/admin/SMSConfigDisplay'
import { formatNumber } from '@/lib/statistics'
import { CommunicationTabs, CommunicationTabContent } from '@/components/ui/communication-tabs'
import { Skeleton } from '@/components/ui/skeleton'

import { useTranslation } from '@/contexts/LanguageContext'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'

// Optimized icon imports - only import what we need
import {
  Mail,
  Phone,
  Download,
  Send,
  Users,
  Copy,
  CheckCircle,
  Loader2,
  MessageSquare,
  Filter,
  Search,
  X,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react'

interface Registration {
  id: string
  fullName: string
  emailAddress: string
  phoneNumber: string
  createdAt: string
  gender: string
  dateOfBirth: string
  isVerified?: boolean
  attendanceMarked?: boolean
  verifiedAt?: string
  verifiedBy?: string
}

export default function CommunicationsPage() {
  const { t } = useTranslation()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [totalRegistrations, setTotalRegistrations] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [selectedPhones, setSelectedPhones] = useState<string[]>([])
  const [isAllEmailsSelected, setIsAllEmailsSelected] = useState(false)
  const [isAllPhonesSelected, setIsAllPhonesSelected] = useState(false)
  // Separate search states for Email and SMS tabs
  const [emailSearchTerm, setEmailSearchTerm] = useState('')
  const [emailGenderFilter, setEmailGenderFilter] = useState('')
  const [emailVerificationFilter, setEmailVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [smsSearchTerm, setSmsSearchTerm] = useState('')
  const [smsGenderFilter, setSmsGenderFilter] = useState('')
  const [smsVerificationFilter, setSmsVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all')

  // Pagination states for emails and phone numbers (10 per page as required)
  const [emailCurrentPage, setEmailCurrentPage] = useState(1)
  const [phoneCurrentPage, setPhoneCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false)
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email')
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [showBulkSmsModal, setShowBulkSmsModal] = useState(false)
  const [bulkEmailData, setBulkEmailData] = useState({
    subject: '',
    message: '',
    includeNames: true
  })
  const [bulkSmsData, setBulkSmsData] = useState({
    message: '',
    includeNames: true
  })
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

  // Role-based permissions
  const canSendBulkMessages = currentUser?.role?.name && ['Super Admin', 'Admin', 'Manager'].includes(currentUser.role.name)
  const isStaffUser = currentUser?.role?.name === 'Staff'

  const fetchRegistrations = useCallback(async () => {
    try {
      setIsLoading(true)
      // Fetch registrations with essential fields only for faster loading
      const response = await fetch('/api/registrations?limit=10000&fields=id,fullName,emailAddress,phoneNumber,gender,isVerified', {
        headers: {
          'Cache-Control': 'max-age=300', // Cache for 5 minutes
        }
      })
      if (response.ok) {
        const data = await response.json()
        const registrationData = data.registrations || []
        setRegistrations(registrationData)
        setTotalRegistrations(data.pagination?.total || registrationData.length || 0)

        // Show success message only if we have data
        if (registrationData.length > 0) {
          console.log(`Loaded ${registrationData.length} registrations for communications`)
        }
      } else {
        throw new Error(`Failed to fetch registrations: ${response.status}`)
      }
    } catch (err) {
      console.error('Registration fetch error:', err)
      error('Failed to Load Registrations', 'Unable to fetch registration data. Please refresh the page or contact support.')
    } finally {
      setIsLoading(false)
    }
  }, [error])

  useEffect(() => {
    fetchRegistrations()

    // Set up real-time polling for new registrations
    const pollInterval = setInterval(() => {
      fetchRegistrations()
    }, 30000) // Poll every 30 seconds for new registrations

    // Listen for storage events (when new registrations are added)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'registration_updated') {
        console.log('🔄 New registration detected, refreshing list...')
        fetchRegistrations()
        // Clear the storage flag
        localStorage.removeItem('registration_updated')
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom events within the same tab
    const handleRegistrationUpdate = () => {
      console.log('🔄 Registration update event received, refreshing list...')
      fetchRegistrations()
    }

    window.addEventListener('registrationUpdated', handleRegistrationUpdate)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('registrationUpdated', handleRegistrationUpdate)
    }
  }, [fetchRegistrations])

  // Listen for real-time registration updates (email/phone changes)
  useEffect(() => {
    const handleRegistrationUpdate = (event: any) => {
      console.log('📧 Registration update detected in communications:', event.detail)

      if (event.detail?.action === 'edit' && event.detail?.registration) {
        const updatedReg = event.detail.registration

        // Update the registration in our list
        setRegistrations(prev => {
          const index = prev.findIndex(reg => reg.id === updatedReg.id)
          if (index !== -1) {
            const updated = [...prev]
            updated[index] = { ...updated[index], ...updatedReg }
            console.log('✅ Updated registration in communications list:', updatedReg.fullName)
            return updated
          }
          return prev
        })
      } else {
        // For new registrations or general updates, refetch data
        console.log('🔄 Refetching registrations due to update')
        fetchRegistrations()
      }
    }

    // Listen for storage events (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'registration_edit_data') {
        const editData = localStorage.getItem('registration_edit_data')
        if (editData) {
          try {
            const updatedReg = JSON.parse(editData)
            setRegistrations(prev => {
              const index = prev.findIndex(reg => reg.id === updatedReg.id)
              if (index !== -1) {
                const updated = [...prev]
                updated[index] = { ...updated[index], ...updatedReg }
                console.log('✅ Updated registration from storage:', updatedReg.fullName)
                return updated
              }
              return prev
            })
            localStorage.removeItem('registration_edit_data')
          } catch (error) {
            console.error('Error parsing registration edit data:', error)
          }
        }
      } else if (e.key === 'registration_updated') {
        fetchRegistrations()
        localStorage.removeItem('registration_updated')
      }
    }

    window.addEventListener('registrationUpdated', handleRegistrationUpdate)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('registrationUpdated', handleRegistrationUpdate)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [fetchRegistrations])



  // Memoize expensive filtering operations for each tab with optimized search
  const emailFilteredRegistrations = useMemo(() => {
    if (!emailSearchTerm && !emailGenderFilter && emailVerificationFilter === 'all') return registrations

    return registrations.filter(registration => {
      // Apply gender filter
      if (emailGenderFilter && registration.gender !== emailGenderFilter) return false

      // Apply verification filter
      if (emailVerificationFilter === 'verified' && !registration.isVerified) return false
      if (emailVerificationFilter === 'unverified' && registration.isVerified) return false

      // Apply search filter
      if (emailSearchTerm) {
        const searchLower = emailSearchTerm.toLowerCase()
        return registration.fullName.toLowerCase().includes(searchLower) ||
               registration.emailAddress.toLowerCase().includes(searchLower) ||
               registration.phoneNumber.includes(emailSearchTerm)
      }

      return true
    })
  }, [registrations, emailSearchTerm, emailGenderFilter, emailVerificationFilter])

  const smsFilteredRegistrations = useMemo(() => {
    if (!smsSearchTerm && !smsGenderFilter && smsVerificationFilter === 'all') return registrations

    return registrations.filter(registration => {
      // Apply gender filter
      if (smsGenderFilter && registration.gender !== smsGenderFilter) return false

      // Apply verification filter
      if (smsVerificationFilter === 'verified' && !registration.isVerified) return false
      if (smsVerificationFilter === 'unverified' && registration.isVerified) return false

      // Apply search filter
      if (smsSearchTerm) {
        const searchLower = smsSearchTerm.toLowerCase()
        return registration.fullName.toLowerCase().includes(searchLower) ||
               registration.emailAddress.toLowerCase().includes(searchLower) ||
               registration.phoneNumber.includes(smsSearchTerm)
      }

      return true
    })
  }, [registrations, smsSearchTerm, smsGenderFilter, smsVerificationFilter])

  // Use the appropriate filtered registrations based on active tab
  const filteredRegistrations = activeTab === 'email' ? emailFilteredRegistrations : smsFilteredRegistrations

  // Memoize unique emails and phones extraction with optimized Set operations
  const { allEmails, allPhones, paginatedEmails, paginatedPhones, emailPagination, phonePagination } = useMemo(() => {
    const emailSet = new Set<string>()
    const phoneSet = new Set<string>()

    // Process ALL registrations for stats (not filtered)
    for (const registration of registrations) {
      if (registration.emailAddress) {
        emailSet.add(registration.emailAddress)
      }
      if (registration.phoneNumber) {
        phoneSet.add(registration.phoneNumber)
      }
    }

    // For pagination, use filtered data
    const filteredEmailSet = new Set<string>()
    const filteredPhoneSet = new Set<string>()

    // Process email filtered registrations for pagination
    for (const registration of emailFilteredRegistrations) {
      if (registration.emailAddress) {
        filteredEmailSet.add(registration.emailAddress)
      }
    }

    // Process SMS filtered registrations for pagination
    for (const registration of smsFilteredRegistrations) {
      if (registration.phoneNumber) {
        filteredPhoneSet.add(registration.phoneNumber)
      }
    }

    const allEmailsArray = Array.from(emailSet)
    const allPhonesArray = Array.from(phoneSet)
    const filteredEmailsArray = Array.from(filteredEmailSet)
    const filteredPhonesArray = Array.from(filteredPhoneSet)

    // Calculate pagination for emails (using filtered data)
    const emailTotalPages = Math.ceil(filteredEmailsArray.length / ITEMS_PER_PAGE)
    const emailStartIndex = (emailCurrentPage - 1) * ITEMS_PER_PAGE
    const emailEndIndex = emailStartIndex + ITEMS_PER_PAGE
    const paginatedEmailsArray = filteredEmailsArray.slice(emailStartIndex, emailEndIndex)

    // Calculate pagination for phones (using filtered data)
    const phoneTotalPages = Math.ceil(filteredPhonesArray.length / ITEMS_PER_PAGE)
    const phoneStartIndex = (phoneCurrentPage - 1) * ITEMS_PER_PAGE
    const phoneEndIndex = phoneStartIndex + ITEMS_PER_PAGE
    const paginatedPhonesArray = filteredPhonesArray.slice(phoneStartIndex, phoneEndIndex)

    return {
      allEmails: allEmailsArray,
      allPhones: allPhonesArray,
      paginatedEmails: paginatedEmailsArray,
      paginatedPhones: paginatedPhonesArray,
      emailPagination: {
        currentPage: emailCurrentPage,
        totalPages: emailTotalPages,
        totalItems: filteredEmailsArray.length,
        itemsPerPage: ITEMS_PER_PAGE,
        startIndex: emailStartIndex + 1,
        endIndex: Math.min(emailEndIndex, filteredEmailsArray.length)
      },
      phonePagination: {
        currentPage: phoneCurrentPage,
        totalPages: phoneTotalPages,
        totalItems: filteredPhonesArray.length,
        itemsPerPage: ITEMS_PER_PAGE,
        startIndex: phoneStartIndex + 1,
        endIndex: Math.min(phoneEndIndex, filteredPhonesArray.length)
      }
    }
  }, [emailFilteredRegistrations, smsFilteredRegistrations, emailCurrentPage, phoneCurrentPage, ITEMS_PER_PAGE])

  const handleSelectAllEmails = useCallback(() => {
    if (isAllEmailsSelected) {
      setSelectedEmails([])
      setIsAllEmailsSelected(false)
    } else {
      // For performance, we'll use a flag instead of copying all emails
      setIsAllEmailsSelected(true)
      setSelectedEmails([]) // Clear individual selections when selecting all
    }
  }, [isAllEmailsSelected])

  const handleSelectAllPhones = useCallback(() => {
    if (isAllPhonesSelected) {
      setSelectedPhones([])
      setIsAllPhonesSelected(false)
    } else {
      // For performance, we'll use a flag instead of copying all phones
      setIsAllPhonesSelected(true)
      setSelectedPhones([]) // Clear individual selections when selecting all
    }
  }, [isAllPhonesSelected])

  // Helper functions to get effective selections
  const getEffectiveSelectedEmails = useCallback(() => {
    return isAllEmailsSelected ? allEmails : selectedEmails
  }, [isAllEmailsSelected, allEmails, selectedEmails])

  const getEffectiveSelectedPhones = useCallback(() => {
    return isAllPhonesSelected ? allPhones : selectedPhones
  }, [isAllPhonesSelected, allPhones, selectedPhones])

  const getEffectiveSelectedEmailsCount = useCallback(() => {
    return isAllEmailsSelected ? allEmails.length : selectedEmails.length
  }, [isAllEmailsSelected, allEmails.length, selectedEmails.length])

  const getEffectiveSelectedPhonesCount = useCallback(() => {
    return isAllPhonesSelected ? allPhones.length : selectedPhones.length
  }, [isAllPhonesSelected, allPhones.length, selectedPhones.length])

  const isEmailSelected = useCallback((email: string) => {
    return isAllEmailsSelected || selectedEmails.includes(email)
  }, [isAllEmailsSelected, selectedEmails])

  const isPhoneSelected = useCallback((phone: string) => {
    return isAllPhonesSelected || selectedPhones.includes(phone)
  }, [isAllPhonesSelected, selectedPhones])

  const handleEmailToggle = (email: string) => {
    if (isAllEmailsSelected) {
      // If all are selected, switch to individual selection mode
      // and deselect only this email (keep all others selected)
      setIsAllEmailsSelected(false)
      const allEmailsExceptThis = allEmails.filter(e => e !== email)
      setSelectedEmails(allEmailsExceptThis)
    } else {
      // Normal toggle behavior for individual selections
      setSelectedEmails(prev =>
        prev.includes(email)
          ? prev.filter(e => e !== email)
          : [...prev, email]
      )
    }
  }

  const handlePhoneToggle = (phone: string) => {
    if (isAllPhonesSelected) {
      // If all are selected, switch to individual selection mode
      // and deselect only this phone (keep all others selected)
      setIsAllPhonesSelected(false)
      const allPhonesExceptThis = allPhones.filter(p => p !== phone)
      setSelectedPhones(allPhonesExceptThis)
    } else {
      // Normal toggle behavior for individual selections
      setSelectedPhones(prev =>
        prev.includes(phone)
          ? prev.filter(p => p !== phone)
          : [...prev, phone]
      )
    }
  }

  const copyToClipboard = useCallback(async (text: string, type: 'emails' | 'phones') => {
    try {
      await navigator.clipboard.writeText(text)
      success('Copied to Clipboard', `${type === 'emails' ? 'Email addresses' : 'Phone numbers'} have been copied to your clipboard.`)
    } catch {
      error('Copy Failed', 'Unable to copy to clipboard. Please select and copy manually.')
    }
  }, [success])

  const exportEmails = useCallback(() => {
    const emailsToExport = getEffectiveSelectedEmails()
    const csvContent = emailsToExport.join('\n')

    const blob = new Blob([csvContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const element = document.createElement('a')
    element.href = url
    element.download = `participant-emails-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    window.URL.revokeObjectURL(url)

    success('Emails Exported', `Successfully exported ${formatNumber(emailsToExport.length)} email addresses to a text file.`)
  }, [getEffectiveSelectedEmails, success])

  const exportPhones = useCallback(() => {
    const phonesToExport = getEffectiveSelectedPhones()
    const csvContent = phonesToExport.join('\n')

    const blob = new Blob([csvContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const element = document.createElement('a')
    element.href = url
    element.download = `participant-phones-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    window.URL.revokeObjectURL(url)

    success('Phone Numbers Exported', `Successfully exported ${formatNumber(phonesToExport.length)} phone numbers to a text file.`)
  }, [getEffectiveSelectedPhones, success])

  const handleSendBulkEmail = async () => {
    if (!bulkEmailData.subject || !bulkEmailData.message) {
      error('Missing Information', 'Please provide both subject and message for the email.')
      return
    }

    if (getEffectiveSelectedEmailsCount() === 0) {
      error('No Recipients Selected', 'Please select at least one email address to send the bulk email.')
      return
    }

    setIsSendingBulkEmail(true)

    try {
      // Show progress message for large batches
      const recipientCount = getEffectiveSelectedEmailsCount()
      if (recipientCount > 50) {
        success('Processing Started', `Processing ${recipientCount} emails in batches. This may take a few minutes...`)
      }

      const response = await fetch('/api/admin/communications/bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: getEffectiveSelectedEmails(),
          subject: bulkEmailData.subject,
          message: bulkEmailData.message,
          includeNames: bulkEmailData.includeNames
        }),
        // Increase timeout for large batches
        signal: AbortSignal.timeout(recipientCount > 100 ? 300000 : 120000) // 5 min for large batches, 2 min for smaller
      })

      const data = await response.json()

      if (response.ok) {
        success('Bulk Email Sent Successfully', `Email sent to ${data.results.successful} of ${data.results.total} recipients. ${data.results.failed > 0 ? `${data.results.failed} emails failed to send.` : ''}`)

        // Reset form and close modal
        setBulkEmailData({
          subject: '',
          message: '',
          includeNames: true
        })
        setShowBulkEmailModal(false)
        setSelectedEmails([])
        setIsAllEmailsSelected(false)
      } else {
        setErrorModal({
          isOpen: true,
          type: 'error',
          title: 'Bulk Email Failed',
          description: data.message || 'Unable to send the bulk email. This could be due to server issues or email configuration problems.',
          details: `Error: ${data.error}\nRecipients: ${getEffectiveSelectedEmailsCount()}\nTime: ${new Date().toISOString()}`,
          errorCode: 'BULK_EMAIL_ERROR'
        })
      }
    } catch (error) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        description: 'Unable to send the bulk email due to a network error. Please check your connection and try again.',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\nRecipients: ${getEffectiveSelectedEmailsCount()}\nTime: ${new Date().toISOString()}`,
        errorCode: 'BULK_EMAIL_NETWORK_ERROR'
      })
    } finally {
      setIsSendingBulkEmail(false)
    }
  }

  const handleSendBulkSms = async () => {
    if (!bulkSmsData.message) {
      error('Missing Information', 'Please provide a message for the SMS.')
      return
    }

    if (getEffectiveSelectedPhonesCount() === 0) {
      error('No Recipients Selected', 'Please select at least one phone number to send the bulk SMS.')
      return
    }

    setIsSendingBulkEmail(true) // Reusing the loading state

    try {
      const response = await fetch('/api/admin/communications/bulk-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: getEffectiveSelectedPhones(),
          message: bulkSmsData.message,
          includeNames: bulkSmsData.includeNames
        })
      })

      const data = await response.json()

      if (response.ok) {
        success('Bulk SMS Sent Successfully', `SMS sent to ${data.results.successful} of ${data.results.total} recipients. ${data.results.failed > 0 ? `${data.results.failed} SMS messages failed to send.` : ''}`)

        // Reset form and close modal
        setBulkSmsData({
          message: '',
          includeNames: true
        })
        setShowBulkSmsModal(false)
        setSelectedPhones([])
        setIsAllPhonesSelected(false)
      } else {
        setErrorModal({
          isOpen: true,
          type: 'error',
          title: 'Bulk SMS Failed',
          description: data.message || 'Unable to send the bulk SMS. This could be due to SMS service configuration issues.',
          details: `Error: ${data.error}\nRecipients: ${getEffectiveSelectedPhonesCount()}\nTime: ${new Date().toISOString()}`,
          errorCode: 'BULK_SMS_ERROR'
        })
      }
    } catch (error) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        description: 'Unable to send the bulk SMS due to a network error. Please check your connection and try again.',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\nRecipients: ${getEffectiveSelectedPhonesCount()}\nTime: ${new Date().toISOString()}`,
        errorCode: 'BULK_SMS_NETWORK_ERROR'
      })
    } finally {
      setIsSendingBulkEmail(false)
    }
  }

  // Pagination handlers
  const handleEmailPageChange = (page: number) => {
    setEmailCurrentPage(page)
  }

  const handlePhonePageChange = (page: number) => {
    setPhoneCurrentPage(page)
  }

  // Reset pagination when filters change
  useEffect(() => {
    setEmailCurrentPage(1)
  }, [emailSearchTerm, emailGenderFilter, emailVerificationFilter])

  useEffect(() => {
    setPhoneCurrentPage(1)
  }, [smsSearchTerm, smsGenderFilter, smsVerificationFilter])

  // Pagination component
  const PaginationControls = ({ pagination, onPageChange, type }: {
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
      startIndex: number
      endIndex: number
    }
    onPageChange: (page: number) => void
    type: 'emails' | 'phones'
  }) => {
    if (pagination.totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages: number[] = []
      const maxVisiblePages = 5
      let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2))
      const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1)

      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
      return pages
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600 font-apercu-regular">
          Showing {pagination.startIndex}-{pagination.endIndex} of {pagination.totalItems} {type}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="font-apercu-medium"
          >
            Previous
          </Button>

          {getPageNumbers().map(page => (
            <Button
              key={page}
              variant={page === pagination.currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="font-apercu-medium min-w-[40px]"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="font-apercu-medium"
          >
            Next
          </Button>
        </div>
      </div>
    )
  }



  // Remove loading screen - page shows immediately with progressive data loading

  // Check permissions - Allow all roles including Staff to view communications
  const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff']
  if (currentUser && !allowedRoles.includes(currentUser.role?.name || '')) {
    return (
      <AdminLayoutNew title={t('page.communications.title')} description={t('page.communications.description')}>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew title={t('page.communications.title')} description={t('page.communications.description')}>
      <div className="space-y-6">
        {/* Staff Access Notice */}
        {isStaffUser && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-amber-900">Staff Access Mode</h3>
                <p className="font-apercu-regular text-sm text-amber-800">
                  You have view and export access to participant communications. Bulk messaging features are restricted to Admin and Manager roles.
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Stats Cards - Consistent Design */}
        {isLoading ? (
          <StatsGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCard
                key={i}
                title=""
                value=""
                icon={Users}
                gradient="bg-gradient-to-r from-gray-400 to-gray-500"
                bgGradient="bg-gradient-to-br from-white to-gray-50"
                loading={true}
              />
            ))}
          </StatsGrid>
        ) : (
          <StatsGrid columns={4}>
            <StatsCard
              title="Unverified Participants"
              value={filteredRegistrations.filter(r => !r.isVerified).length}
              subtitle="Awaiting verification"
              icon={UserX}
              gradient="bg-gradient-to-r from-amber-500 to-orange-600"
              bgGradient="bg-gradient-to-br from-white to-amber-50"
            />

            <StatsCard
              title="Email Addresses"
              value={emailPagination.totalItems}
              subtitle="Unique email contacts"
              icon={Mail}
              gradient="bg-gradient-to-r from-green-500 to-emerald-600"
              bgGradient="bg-gradient-to-br from-white to-green-50"
            />

            <StatsCard
              title="Phone Numbers"
              value={phonePagination.totalItems}
              subtitle="Unique phone contacts"
              icon={Phone}
              gradient="bg-gradient-to-r from-purple-500 to-pink-600"
              bgGradient="bg-gradient-to-br from-white to-purple-50"
            />

            <StatsCard
              title="Selected Contacts"
              value={getEffectiveSelectedEmailsCount() + getEffectiveSelectedPhonesCount()}
              subtitle="Ready for messaging"
              icon={MessageSquare}
              gradient="bg-gradient-to-r from-indigo-500 to-purple-600"
              bgGradient="bg-gradient-to-br from-white to-indigo-50"
            />
          </StatsGrid>
        )}



        {/* Configuration Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
          <EmailConfigDisplay />
          <SMSConfigDisplay />
        </div>

        {/* Contact Management Tabs */}
        <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <CommunicationTabs
              activeTab={activeTab}
              onTabChangeAction={setActiveTab}
              emailCount={allEmails.length}
              smsCount={allPhones.length}
              className="max-w-2xl mx-auto px-4 sm:px-0"
            />
          </div>

          {/* Email Tab Content */}
          {activeTab === 'email' && (
            <CommunicationTabContent type="email" className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-gradient-to-r from-green-500/5 to-emerald-600/5 border border-green-100 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between sm:space-x-4">
                  <div className="flex-1 sm:max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={emailSearchTerm}
                        onChange={(e) => setEmailSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 sm:py-2.5 border border-green-200 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-3">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      <select
                        value={emailGenderFilter}
                        onChange={(e) => setEmailGenderFilter(e.target.value)}
                        className="w-full sm:w-auto pl-10 pr-8 py-3 sm:py-2.5 border border-green-200 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white/50"
                      >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      <select
                        value={emailVerificationFilter}
                        onChange={(e) => setEmailVerificationFilter(e.target.value as 'all' | 'verified' | 'unverified')}
                        className="w-full sm:w-auto pl-10 pr-8 py-3 sm:py-2.5 border border-green-200 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white/50"
                      >
                        <option value="all">All Registrants</option>
                        <option value="verified">Verified Only</option>
                        <option value="unverified">Unverified Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Results count */}
                <div className="mt-4 pt-4 border-t border-green-100">
                  <p className="font-apercu-regular text-xs sm:text-sm text-green-700">
                    Showing {emailFilteredRegistrations.length} of {registrations.length} loaded participants
                    {totalRegistrations > registrations.length && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0 text-amber-600">
                        • {formatNumber(totalRegistrations)} total registrations (showing recent {registrations.length})
                      </span>
                    )}
                    {emailSearchTerm && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • Filtered by: <span className="font-apercu-medium text-green-800">&quot;{emailSearchTerm}&quot;</span>
                      </span>
                    )}
                    {emailGenderFilter && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • Gender: <span className="font-apercu-medium text-green-800">{emailGenderFilter}</span>
                      </span>
                    )}
                    {emailVerificationFilter !== 'all' && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • Status: <span className="font-apercu-medium text-green-800">
                          {emailVerificationFilter === 'verified' ? 'Verified Only' : 'Unverified Only'}
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">Email Addresses</h3>
                    <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">
                      <span className="block sm:inline sm:mt-1">{formatNumber(allEmails.length)} unique email addresses</span>
                      <span className="block sm:inline sm:mt-1">• {formatNumber(getEffectiveSelectedEmailsCount())} selected</span>
                      <span className="block sm:inline sm:ml-1">• Showing {emailPagination.startIndex}-{emailPagination.endIndex} of {emailPagination.totalItems}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllEmails}
                    className="font-apercu-medium text-xs sm:text-sm flex-1 sm:flex-none"
                  >
                    {isAllEmailsSelected ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getEffectiveSelectedEmails().join(', '), 'emails')}
                    className="font-apercu-medium text-xs sm:text-sm"
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="sm:inline">Copy</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportEmails}
                    className="font-apercu-medium text-xs sm:text-sm"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-white">Export</span>
                  </Button>
                </div>
              </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {isLoading ? (
              // Skeleton loaders for email contacts
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="p-3 sm:p-4 border rounded-lg bg-white">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Skeleton className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              paginatedEmails.map((email, index) => {
                const registration = filteredRegistrations.find(r => r.emailAddress === email)
                return (
                  <div
                    key={index}
                    className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                      isEmailSelected(email)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                    }`}
                    onClick={() => handleEmailToggle(email)}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isEmailSelected(email)
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {isEmailSelected(email) && (
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate">{email}</p>
                        {registration && (
                          <p className="font-apercu-regular text-xs text-gray-500 truncate mt-0.5">
                            {registration.fullName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Email Pagination Controls */}
          <PaginationControls
            pagination={emailPagination}
            onPageChange={handleEmailPageChange}
            type="emails"
          />

              {allEmails.length === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <Mail className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="font-apercu-medium text-sm sm:text-base text-gray-500">No email addresses found</p>
                  <p className="font-apercu-regular text-xs sm:text-sm text-gray-400 px-4">
                    {emailSearchTerm || emailGenderFilter || emailVerificationFilter !== 'all' ? 'Try adjusting your filters' : 'No registrations with email addresses yet'}
                  </p>
                </div>
              )}
            </CommunicationTabContent>
          )}

          {/* SMS Tab Content */}
          {activeTab === 'sms' && (
            <CommunicationTabContent type="sms" className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-gradient-to-r from-purple-500/5 to-pink-600/5 border border-purple-100 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between sm:space-x-4">
                  <div className="flex-1 sm:max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={smsSearchTerm}
                        onChange={(e) => setSmsSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 sm:py-2.5 border border-purple-200 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base bg-white/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-3">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500" />
                      <select
                        value={smsGenderFilter}
                        onChange={(e) => setSmsGenderFilter(e.target.value)}
                        className="w-full sm:w-auto pl-10 pr-8 py-3 sm:py-2.5 border border-purple-200 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base bg-white/50"
                      >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500" />
                      <select
                        value={smsVerificationFilter}
                        onChange={(e) => setSmsVerificationFilter(e.target.value as 'all' | 'verified' | 'unverified')}
                        className="w-full sm:w-auto pl-10 pr-8 py-3 sm:py-2.5 border border-purple-200 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base bg-white/50"
                      >
                        <option value="all">All Registrants</option>
                        <option value="verified">Verified Only</option>
                        <option value="unverified">Unverified Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Results count */}
                <div className="mt-4 pt-4 border-t border-purple-100">
                  <p className="font-apercu-regular text-xs sm:text-sm text-purple-700">
                    Showing {smsFilteredRegistrations.length} of {registrations.length} participants
                    {smsSearchTerm && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • Filtered by: <span className="font-apercu-medium text-purple-800">&quot;{smsSearchTerm}&quot;</span>
                      </span>
                    )}
                    {smsGenderFilter && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • Gender: <span className="font-apercu-medium text-purple-800">{smsGenderFilter}</span>
                      </span>
                    )}
                    {smsVerificationFilter !== 'all' && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • Status: <span className="font-apercu-medium text-purple-800">
                          {smsVerificationFilter === 'verified' ? 'Verified Only' : 'Unverified Only'}
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">Phone Numbers</h3>
                    <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">
                      <span className="block sm:inline">{formatNumber(allPhones.length)} unique phone numbers</span>
                      <span className="block sm:inline sm:ml-1">• {formatNumber(getEffectiveSelectedPhonesCount())} selected</span>
                      <span className="block sm:inline sm:ml-1">• Showing {phonePagination.startIndex}-{phonePagination.endIndex} of {phonePagination.totalItems}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllPhones}
                    className="font-apercu-medium text-xs sm:text-sm flex-1 sm:flex-none"
                  >
                    {isAllPhonesSelected ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getEffectiveSelectedPhones().join(', '), 'phones')}
                    className="font-apercu-medium text-xs sm:text-sm"
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="sm:inline">Copy</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportPhones}
                    className="font-apercu-medium text-xs sm:text-sm"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-white">Export</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {isLoading ? (
                  // Skeleton loaders for phone contacts
                  Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="p-3 sm:p-4 border rounded-lg bg-white">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <Skeleton className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  paginatedPhones.map((phone, index) => {
                    const registration = filteredRegistrations.find(r => r.phoneNumber === phone)
                    return (
                      <div
                        key={index}
                        className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                          isPhoneSelected(phone)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                        }`}
                        onClick={() => handlePhoneToggle(phone)}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isPhoneSelected(phone)
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}>
                            {isPhoneSelected(phone) && (
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate">{phone}</p>
                            {registration && (
                              <p className="font-apercu-regular text-xs text-gray-500 truncate mt-0.5">
                                {registration.fullName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Phone Pagination Controls */}
              <PaginationControls
                pagination={phonePagination}
                onPageChange={handlePhonePageChange}
                type="phones"
              />

              {allPhones.length === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <Phone className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="font-apercu-medium text-sm sm:text-base text-gray-500">No phone numbers found</p>
                  <p className="font-apercu-regular text-xs sm:text-sm text-gray-400 px-4">
                    {smsSearchTerm || smsGenderFilter || smsVerificationFilter !== 'all' ? 'Try adjusting your filters' : 'No registrations with phone numbers yet'}
                  </p>
                </div>
              )}
            </CommunicationTabContent>
          )}
        </div>

        {/* Bulk Actions */}
        <Card className="p-4 sm:p-6 bg-white">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">Bulk Actions</h3>
                <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">
                  {canSendBulkMessages ? 'Send bulk emails/SMS or export contact lists' : 'Export contact lists (view only)'}
                </p>
              </div>
            </div>
            {isStaffUser && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 self-start sm:self-center">
                <p className="font-apercu-medium text-xs text-amber-800">
                  Staff Access: View & Export Only
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <div className="h-5 w-5 sm:h-6 sm:w-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div>
                <h4 className="font-apercu-medium text-xs sm:text-sm text-blue-900 mb-2">
                  {canSendBulkMessages ? 'How to Send Bulk Messages' : 'How to Export Contact Lists'}
                </h4>
                {canSendBulkMessages ? (
                  <ol className="font-apercu-regular text-xs sm:text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Select email addresses or phone numbers by clicking on them in the sections above</li>
                    <li>Click &quot;Send Bulk Email&quot; or &quot;Send Bulk SMS&quot; button below (only enabled when contacts are selected)</li>
                    <li>Fill in the subject and message for your communication</li>
                    <li>Optionally enable personalization to include participant names</li>
                    <li>Click &quot;Send&quot; to deliver to all selected recipients</li>
                  </ol>
                ) : (
                  <ol className="font-apercu-regular text-xs sm:text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Use search and filter options to find specific participants</li>
                    <li>Select contacts by clicking on them or use &quot;Select All&quot; buttons</li>
                    <li>Click &quot;Export&quot; buttons to download contact lists</li>
                    <li>Use &quot;Copy&quot; buttons to copy contacts to clipboard</li>
                  </ol>
                )}
                <p className="font-apercu-regular text-xs text-blue-700 mt-2">
                  💡 Tip: Use the search and filter options above to find specific participants before selecting their contacts.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Email Tab - Only show email actions */}
            {activeTab === 'email' && canSendBulkMessages && (
              <Button
                onClick={() => setShowBulkEmailModal(true)}
                disabled={getEffectiveSelectedEmailsCount() === 0}
                className={`font-apercu-medium h-10 sm:h-12 text-xs sm:text-sm ${
                  getEffectiveSelectedEmailsCount() === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-lg transform hover:scale-105 transition-all duration-200'
                }`}
              >
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-white">
                  {getEffectiveSelectedEmailsCount() === 0
                    ? 'Send Bulk Email (Select emails first)'
                    : `Send Bulk Email (${formatNumber(getEffectiveSelectedEmailsCount())} recipients)`
                  }
                </span>
              </Button>
            )}

            {/* SMS Tab - Only show SMS actions */}
            {activeTab === 'sms' && canSendBulkMessages && (
              <Button
                onClick={() => setShowBulkSmsModal(true)}
                disabled={getEffectiveSelectedPhonesCount() === 0}
                className={`font-apercu-medium h-10 sm:h-12 text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 ${
                  getEffectiveSelectedPhonesCount() === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-lg transform hover:scale-105 transition-all duration-200'
                }`}
              >
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-white">
                  {getEffectiveSelectedPhonesCount() === 0
                    ? 'Send Bulk SMS (Select phones first)'
                    : `Send Bulk SMS (${formatNumber(getEffectiveSelectedPhonesCount())} recipients)`
                  }
                </span>
              </Button>
            )}

            {/* Export button - Show appropriate export for each tab */}
            <Button
              variant="outline"
              onClick={() => {
                if (activeTab === 'email') {
                  const emailData = `EMAILS:\n${allEmails.join('\n')}`
                  const blob = new Blob([emailData], { type: 'text/plain' })
                  const url = window.URL.createObjectURL(blob)
                  const element = document.createElement('a')
                  element.href = url
                  element.download = `email-contacts-${new Date().toISOString().split('T')[0]}.txt`
                  document.body.appendChild(element)
                  element.click()
                  document.body.removeChild(element)
                  window.URL.revokeObjectURL(url)
                  success('Email Contacts Exported', `Successfully exported ${formatNumber(allEmails.length)} email addresses.`)
                } else {
                  const phoneData = `PHONE NUMBERS:\n${allPhones.join('\n')}`
                  const blob = new Blob([phoneData], { type: 'text/plain' })
                  const url = window.URL.createObjectURL(blob)
                  const element = document.createElement('a')
                  element.href = url
                  element.download = `phone-contacts-${new Date().toISOString().split('T')[0]}.txt`
                  document.body.appendChild(element)
                  element.click()
                  document.body.removeChild(element)
                  window.URL.revokeObjectURL(url)
                  success('Phone Contacts Exported', `Successfully exported ${formatNumber(allPhones.length)} phone numbers.`)
                }
              }}
              className="font-apercu-medium h-10 sm:h-12 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>
                Export {activeTab === 'email' ? 'Email' : 'Phone'} Contacts
              </span>
            </Button>

            {/* Export All button - Always available */}
            <Button
              variant="outline"
              onClick={() => {
                const allContacts = `EMAILS:\n${allEmails.join('\n')}\n\nPHONE NUMBERS:\n${allPhones.join('\n')}`
                const blob = new Blob([allContacts], { type: 'text/plain' })
                const url = window.URL.createObjectURL(blob)
                const element = document.createElement('a')
                element.href = url
                element.download = `all-contacts-${new Date().toISOString().split('T')[0]}.txt`
                document.body.appendChild(element)
                element.click()
                document.body.removeChild(element)
                window.URL.revokeObjectURL(url)
                success('All Contacts Exported', `Successfully exported ${formatNumber(allEmails.length)} emails and ${formatNumber(allPhones.length)} phone numbers.`)
              }}
              className="font-apercu-medium h-10 sm:h-12 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>Export All Contacts</span>
            </Button>
          </div>
        </Card>

        {/* Bulk Email Modal */}
        {showBulkEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start sm:items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl my-4 sm:my-0">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-apercu-bold text-lg sm:text-xl text-white">Send Bulk Email</h3>
                      <p className="font-apercu-regular text-indigo-100 text-xs sm:text-sm">
                        Sending to {formatNumber(getEffectiveSelectedEmailsCount())} recipients
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBulkEmailModal(false)}
                    className="text-white hover:bg-white/20 p-1 sm:p-2"
                    disabled={isSendingBulkEmail}
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <label className="block font-apercu-medium text-sm text-gray-700">
                      Subject *
                    </label>
                    <div className="flex flex-wrap gap-1 sm:space-x-1">
                      <button
                        type="button"
                        onClick={() => setBulkEmailData(prev => ({ ...prev, subject: 'Welcome to Youth Program!' }))}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-apercu-regular px-2 py-1 rounded bg-indigo-50 sm:bg-transparent sm:px-0 sm:py-0"
                        disabled={isSendingBulkEmail}
                      >
                        Welcome
                      </button>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkEmailData(prev => ({ ...prev, subject: 'Important Program Update' }))}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-apercu-regular px-2 py-1 rounded bg-indigo-50 sm:bg-transparent sm:px-0 sm:py-0"
                        disabled={isSendingBulkEmail}
                      >
                        Update
                      </button>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkEmailData(prev => ({ ...prev, subject: 'Event Reminder' }))}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-apercu-regular px-2 py-1 rounded bg-indigo-50 sm:bg-transparent sm:px-0 sm:py-0"
                        disabled={isSendingBulkEmail}
                      >
                        Reminder
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={bulkEmailData.subject}
                    onChange={(e) => setBulkEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject..."
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                    disabled={isSendingBulkEmail}
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <label className="block font-apercu-medium text-sm text-gray-700">
                      Message *
                    </label>
                    <div className="flex flex-wrap gap-1 sm:space-x-1">
                      <button
                        type="button"
                        onClick={() => setBulkEmailData(prev => ({
                          ...prev,
                          message: 'We are excited to welcome you to our youth program! Please check your email for important updates and program information.\n\nIf you have any questions, feel free to contact us.\n\nBest regards,\nYouth Program Team'
                        }))}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-apercu-regular px-2 py-1 rounded bg-indigo-50 sm:bg-transparent sm:px-0 sm:py-0"
                        disabled={isSendingBulkEmail}
                      >
                        Welcome
                      </button>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkEmailData(prev => ({
                          ...prev,
                          message: 'We have an important update regarding our youth program. Please review the information below:\n\n[Add your update details here]\n\nThank you for your attention.\n\nBest regards,\nYouth Program Team'
                        }))}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-apercu-regular px-2 py-1 rounded bg-indigo-50 sm:bg-transparent sm:px-0 sm:py-0"
                        disabled={isSendingBulkEmail}
                      >
                        Update
                      </button>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkEmailData(prev => ({
                          ...prev,
                          message: 'This is a friendly reminder about our upcoming event:\n\nDate: [Event Date]\nTime: [Event Time]\nLocation: [Event Location]\n\nPlease make sure to attend. We look forward to seeing you there!\n\nBest regards,\nYouth Program Team'
                        }))}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-apercu-regular px-2 py-1 rounded bg-indigo-50 sm:bg-transparent sm:px-0 sm:py-0"
                        disabled={isSendingBulkEmail}
                      >
                        Reminder
                      </button>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkEmailData(prev => ({
                          ...prev,
                          subject: '📱 Your LINGER NO LONGER 6.0 Registration & QR Code',
                          message: 'Thank you for registering for LINGER NO LONGER 6.0!\n\n YOUR QR CODE:\nYour unique QR code is attached to this email as a PNG file. Please:\n\n1. Download the attached QR code file to your phone\n2. Save it to your Photos or Screenshots folder\n3. Present it during event check-in\n4. Keep it accessible throughout the event\n5. Keep this email as a backup\n\n✅ WHAT\'S NEXT:\n• Wait for room allocation notification\n• Wait for platoon assignment notification\n• Prepare for an amazing event experience!\n\nIf you have any questions, please reply to this email.\n\nSee you at LINGER NO LONGER 6.0!\n\n---\nThis email contains your personal QR code. Please keep it secure.'
                        }))}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-apercu-regular px-2 py-1 rounded bg-indigo-50 sm:bg-transparent sm:px-0 sm:py-0"
                        disabled={isSendingBulkEmail}
                      >
                        Registration Info
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={bulkEmailData.message}
                    onChange={(e) => setBulkEmailData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter your message..."
                    rows={6}
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm sm:text-base"
                    disabled={isSendingBulkEmail}
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="includeNames"
                    checked={bulkEmailData.includeNames}
                    onChange={(e) => setBulkEmailData(prev => ({ ...prev, includeNames: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-0.5"
                    disabled={isSendingBulkEmail}
                  />
                  <label htmlFor="includeNames" className="font-apercu-regular text-xs sm:text-sm text-gray-700">
                    Personalize emails with participant names (e.g., &quot;Dear John Doe,&quot;)
                  </label>
                </div>

                {/* Recipients Preview */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-apercu-medium text-xs sm:text-sm text-gray-700 mb-2">
                    Recipients ({formatNumber(getEffectiveSelectedEmailsCount())})
                  </h4>
                  <div className="max-h-24 sm:max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {getEffectiveSelectedEmails().slice(0, 8).map((email, index) => (
                        <span key={index} className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded font-apercu-regular truncate max-w-[120px] sm:max-w-none">
                          {email}
                        </span>
                      ))}
                      {getEffectiveSelectedEmailsCount() > 8 && (
                        <span className="inline-block bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded font-apercu-regular">
                          +{formatNumber(getEffectiveSelectedEmailsCount() - 8)} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 rounded-b-lg">
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkEmailModal(false)}
                    disabled={isSendingBulkEmail}
                    className="font-apercu-medium text-sm order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendBulkEmail}
                    disabled={isSendingBulkEmail || !bulkEmailData.subject || !bulkEmailData.message}
                    className="font-apercu-medium text-sm order-1 sm:order-2"
                  >
                    {isSendingBulkEmail ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk SMS Modal */}
        {showBulkSmsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start sm:items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl my-4 sm:my-0">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-apercu-bold text-lg sm:text-xl text-white">Send Bulk SMS</h3>
                      <p className="font-apercu-regular text-purple-100 text-xs sm:text-sm">
                        Sending to {formatNumber(getEffectiveSelectedPhonesCount())} recipients
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBulkSmsModal(false)}
                    className="text-white hover:bg-white/20 p-1 sm:p-2"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <label className="block font-apercu-medium text-sm text-gray-700">
                      Message *
                    </label>
                    <div className="flex flex-wrap gap-1 sm:space-x-1">
                      <button
                        type="button"
                        onClick={() => setBulkSmsData(prev => ({
                          ...prev,
                          message: 'Welcome to our youth program! We are excited to have you join us. Check your email for more details.'
                        }))}
                        className="text-xs text-purple-600 hover:text-purple-800 font-apercu-regular px-2 py-1 rounded bg-purple-50 sm:bg-transparent sm:px-0 sm:py-0"
                      >
                        Welcome
                      </button>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkSmsData(prev => ({
                          ...prev,
                          message: 'Important update regarding our youth program. Please check your email for full details.'
                        }))}
                        className="text-xs text-purple-600 hover:text-purple-800 font-apercu-regular px-2 py-1 rounded bg-purple-50 sm:bg-transparent sm:px-0 sm:py-0"
                      >
                        Update
                      </button>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={() => setBulkSmsData(prev => ({
                          ...prev,
                          message: 'Reminder: Youth program event tomorrow. See you there!'
                        }))}
                        className="text-xs text-purple-600 hover:text-purple-800 font-apercu-regular px-2 py-1 rounded bg-purple-50 sm:bg-transparent sm:px-0 sm:py-0"
                      >
                        Reminder
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={bulkSmsData.message}
                    onChange={(e) => setBulkSmsData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter your SMS message..."
                    rows={4}
                    maxLength={160}
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-sm sm:text-base"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="font-apercu-regular text-xs text-gray-500">
                      SMS messages are limited to 160 characters
                    </p>
                    <p className="font-apercu-medium text-xs text-gray-600">
                      {bulkSmsData.message.length}/160
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="sms-include-names"
                    checked={bulkSmsData.includeNames}
                    onChange={(e) => setBulkSmsData(prev => ({ ...prev, includeNames: e.target.checked }))}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="sms-include-names" className="font-apercu-regular text-xs sm:text-sm text-gray-700">
                    Personalize messages with participant names
                  </label>
                </div>

                {/* Recipients Preview */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="font-apercu-medium text-xs sm:text-sm text-gray-700 mb-2">
                    Recipients ({formatNumber(getEffectiveSelectedPhonesCount())})
                  </h4>
                  <div className="max-h-24 sm:max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getEffectiveSelectedPhones().slice(0, 8).map((phone, index) => (
                        <div key={index} className="font-apercu-regular text-xs text-gray-600 bg-white px-2 py-1 rounded truncate">
                          {phone}
                        </div>
                      ))}
                      {getEffectiveSelectedPhonesCount() > 8 && (
                        <div className="font-apercu-medium text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          +{formatNumber(getEffectiveSelectedPhonesCount() - 8)} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkSmsModal(false)}
                    className="font-apercu-medium text-sm order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendBulkSms}
                    disabled={!bulkSmsData.message}
                    className="font-apercu-medium text-sm bg-purple-600 hover:bg-purple-700 order-1 sm:order-2"
                  >
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Send SMS
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
          type={errorModal.type}
          title={errorModal.title}
          description={errorModal.description}
          details={errorModal.details}
          errorCode={errorModal.errorCode}
          showRetry={errorModal.type === 'error'}
          onRetry={() => {
            setErrorModal(prev => ({ ...prev, isOpen: false }))
            fetchRegistrations()
          }}
          showContactSupport={errorModal.type === 'error'}
        />
      </div>
      </AdminLayoutNew>
  )
}
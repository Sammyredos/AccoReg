'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { capitalizeName } from '@/lib/utils'
import { ErrorModal } from '@/components/ui/error-modal'
import { parseApiError } from '@/lib/error-messages'
// Removed heavy animations for better performance
import { Input } from '@/components/ui/input'
// import { Avatar } from '@/components/ui/avatar'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
import { UserCard } from '@/components/ui/user-card'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'
import { useTranslation } from '@/contexts/LanguageContext'
import { clearStatisticsCache } from '@/lib/statistics'

import {
  Users,
  Search,
  Download,
  Calendar,
  QrCode,
  Clock,
  RefreshCw,
  User,
  Shield,

  AlertTriangle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  UserCheck,
  Loader2,
  Trash2
} from 'lucide-react'

interface Registration {
  id: string
  // Fields collected from /register page
  fullName: string
  dateOfBirth: string
  gender: string
  address: string
  branch: string
  phoneNumber: string
  emailAddress: string
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
  parentGuardianName?: string
  parentGuardianPhone?: string
  parentGuardianEmail?: string

  // System fields
  createdAt: string
  updatedAt: string
  // Admin-only verification fields (not shown in modal)
  isVerified?: boolean
  verifiedAt?: string
  verifiedBy?: string
  qrCode?: string
  attendanceMarked?: boolean
  attendanceTime?: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AdminRegistrations() {
  const { t } = useTranslation()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10, // 10 registrations per page
    total: 0,
    pages: 0
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<Registration | null>(null)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null)
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

  const [analyticsData, setAnalyticsData] = useState({
    registrationsToday: 0,
    registrationsThisWeek: 0,
    registrationsThisMonth: 0,
    averageAge: 0
  })

  const { success, error } = useToast()



  const fetchRegistrations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      // Fetch registrations and analytics data in parallel for speed
      // Add cache-busting timestamp to prevent stale data
      const timestamp = Date.now()
      const [registrationsResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/registrations?limit=50000&refresh=true&_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`/api/admin/analytics?_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      ])

      if (registrationsResponse.ok) {
        const data = await registrationsResponse.json()
        // Data fetched successfully
        setRegistrations(data.registrations || [])
        // Update pagination info based on actual total count from API
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: Math.ceil((data.pagination?.total || 0) / prev.limit)
        }))
      }

      // Load analytics in background without blocking UI
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalyticsData({
          registrationsToday: analyticsData.registrationsToday || 0,
          registrationsThisWeek: analyticsData.registrationsThisWeek || 0,
          registrationsThisMonth: analyticsData.registrationsThisMonth || 0,
          averageAge: analyticsData.stats?.averageAge || 0
        })
      }
    } catch {
      // Show error toast for fetch failures
      error('Failed to Load Registrations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, []) // Remove error dependency to prevent infinite loop

  // Fetch registrations on component mount
  useEffect(() => {
    fetchRegistrations()
  }, []) // Remove fetchRegistrations dependency to prevent infinite loop

  // Reset to page 1 when search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [searchTerm])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }



  // Filter registrations based on search (client-side like user management)
  const allFilteredRegistrations = registrations.filter(registration => {
    const matchesSearch = searchTerm === '' ||
      registration.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.phoneNumber.includes(searchTerm)

    return matchesSearch
  })

  // Client-side pagination
  const startIndex = (pagination.page - 1) * pagination.limit
  const endIndex = startIndex + pagination.limit
  const filteredRegistrations = allFilteredRegistrations.slice(startIndex, endIndex)

  // Update pagination info based on filtered results
  const totalFilteredPages = Math.ceil(allFilteredRegistrations.length / pagination.limit)

  // Modal button handlers
  const handleExportPDF = async () => {
    if (!selectedRegistration) return

    setIsExporting(true)
    try {
      // Generate HTML content for PDF
      const htmlContent = generateHTMLContent(selectedRegistration)

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        success('PDF Export Successful', 'PDF report opened in a new window. Use your browser\'s print function to save as PDF.')
      } else {
        // Fallback: download as HTML file
        const element = document.createElement('a')
        const file = new Blob([htmlContent], { type: 'text/html' })
        element.href = URL.createObjectURL(file)
        element.download = `registration-${selectedRegistration.fullName.replace(/\s+/g, '-').toLowerCase()}.html`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        success('PDF Export Successful', 'PDF export downloaded as HTML file. Open in browser and print to save as PDF.')
      }
    } catch (err) {
      // Show error modal
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'PDF Export Failed',
        description: 'Unable to export the registration as PDF. This could be due to browser restrictions or a temporary issue.',
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}\nRegistration: ${selectedRegistration?.fullName}\nTime: ${new Date().toISOString()}`,
        errorCode: 'PDF_EXPORT_ERROR'
      })
    } finally {
      setIsExporting(false)
    }
  }



  // Export all registrations as CSV
  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      // Create CSV content
      const csvContent = generateCSVContent(allFilteredRegistrations)

      // Create and download CSV file
      const element = document.createElement('a')
      const file = new Blob([csvContent], { type: 'text/csv' })
      element.href = URL.createObjectURL(file)
      element.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      success('CSV Export Successful')
    } catch (err) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'CSV Export Failed',
        description: 'Unable to export registrations to CSV format. This could be due to browser restrictions or insufficient data.',
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}\nTotal Records: ${allFilteredRegistrations.length}\nTime: ${new Date().toISOString()}`,
        errorCode: 'CSV_EXPORT_ERROR'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Export all registrations as PDF
  const handleExportPDFAll = async () => {
    setIsExporting(true)
    try {
      // Generate comprehensive PDF content for all registrations
      const htmlContent = generateBulkPDFContent(allFilteredRegistrations)

      // Create and download PDF
      const element = document.createElement('a')
      const file = new Blob([htmlContent], { type: 'text/html' })
      element.href = URL.createObjectURL(file)
      element.download = `registrations-bulk-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      success('Bulk PDF Export Successful')
    } catch (err) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Bulk PDF Export Failed',
        description: 'Unable to generate the bulk PDF export file. This could be due to browser limitations or insufficient memory for large datasets.',
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}\nTotal Records: ${allFilteredRegistrations.length}\nTime: ${new Date().toISOString()}`,
        errorCode: 'BULK_PDF_EXPORT_ERROR'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Delete registration
  const handleDeleteRegistration = async (registration: Registration) => {
    setRegistrationToDelete(registration)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteRegistration = async () => {
    if (!registrationToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/registrations/${registrationToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (response.ok) {
        // Show success toast
        success('Registration Deleted Successfully')

        // Immediately remove from local state for instant UI update
        setRegistrations(prev => prev.filter(reg => reg.id !== registrationToDelete.id))

        // Update pagination total immediately for real-time feedback
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
          pages: Math.ceil((prev.total - 1) / prev.limit)
        }))

        // Update analytics data immediately for real-time stats
        setAnalyticsData(prev => ({
          ...prev,
          // Note: We don't update today/week counts here as they need server calculation
          // They will be refreshed in the background fetch
        }))

        // Close modals
        setShowDeleteConfirm(false)
        setSelectedRegistration(null)
        setRegistrationToDelete(null)

        // Clear global stats cache to ensure all pages get updated stats
        clearStatisticsCache()

        // Refresh the registrations list and analytics in background to ensure consistency
        setTimeout(() => {
          fetchRegistrations()
        }, 500)
      } else {
        const errorData = await response.json()
        setErrorModal({
          isOpen: true,
          type: 'error',
          title: 'Delete Failed',
          description: 'Unable to delete the registration. This could be due to insufficient permissions or the registration being referenced by other data.',
          details: `Error: ${errorData.error}\nRegistration: ${registrationToDelete.fullName}\nID: ${registrationToDelete.id}\nTime: ${new Date().toISOString()}`,
          errorCode: `DELETE_${response.status}`
        })
      }
    } catch (err) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Operation Failed',
        description: 'A network error occurred while trying to delete the registration. Please check your connection and try again.',
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}\nRegistration: ${registrationToDelete?.fullName}\nTime: ${new Date().toISOString()}`,
        errorCode: 'DELETE_NETWORK_ERROR'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeleteRegistration = () => {
    setShowDeleteConfirm(false)
    setRegistrationToDelete(null)
  }

  const handleEditRegistration = async () => {
    if (!selectedRegistration) return

    // Prepare registration data for editing

    // Check if we have all the required fields, if not fetch fresh data
    const hasAllFields = selectedRegistration.address !== undefined &&
                        selectedRegistration.emergencyContactName !== undefined &&
                        selectedRegistration.parentGuardianName !== undefined

    let registrationData = selectedRegistration

    if (!hasAllFields) {
      // Missing fields detected, fetching fresh registration data
      try {
        const response = await fetch(`/api/admin/registrations/${selectedRegistration.id}`)
        if (response.ok) {
          const result = await response.json()
          registrationData = result.registration
          // Fresh data fetched successfully
        }
      } catch (error) {
        console.error('Failed to fetch fresh registration data:', error)
      }
    }

    // Set the form data to the current registration with default values for missing fields
    const formData = {
      ...registrationData,
      // Ensure required fields have default values if they're null/undefined
      fullName: registrationData.fullName || '',
      dateOfBirth: registrationData.dateOfBirth || '',
      gender: registrationData.gender || '',
      emailAddress: registrationData.emailAddress || '',
      phoneNumber: registrationData.phoneNumber || '',
      address: registrationData.address || '',
      branch: registrationData.branch || '',
      emergencyContactName: registrationData.emergencyContactName || '',
      emergencyContactRelationship: registrationData.emergencyContactRelationship || '',
      emergencyContactPhone: registrationData.emergencyContactPhone || '',
      parentGuardianName: registrationData.parentGuardianName || '',
      parentGuardianPhone: registrationData.parentGuardianPhone || '',
      parentGuardianEmail: registrationData.parentGuardianEmail || ''
    }

    // Set form data for editing
    setEditFormData(formData)
    setShowEditModal(true)
  }

  const handleCloseModal = () => {
    setSelectedRegistration(null)
    setIsExporting(false)
    setIsEditing(false)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditFormData(null)
    setIsEditing(false)
  }

  const handleGenerateQRCode = async (registrationId: string) => {
    setGeneratingQR(true)
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to generate QR code')
      }

      const result = await response.json()

      if (result.success) {
        success('QR code generated successfully!')
        // Refresh the registration data
        if (selectedRegistration && selectedRegistration.id === registrationId) {
          setSelectedRegistration({
            ...selectedRegistration,
            qrCode: result.qrCode
          })
        }
        // Refresh the registrations list
        await fetchRegistrations()
      } else {
        throw new Error(result.error || 'Failed to generate QR code')
      }
    } catch (err) {
      console.error('Error generating QR code:', err)
      const errorMessage = parseApiError(err)
      error('Failed to generate QR code', errorMessage.description)
    } finally {
      setGeneratingQR(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editFormData) return

    setIsEditing(true)
    try {
      // Prepare data for submission

      const response = await fetch(`/api/admin/registrations/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })

      if (response.ok) {
        // Refresh the registrations list
        await fetchRegistrations()

        // Update the selected registration if it's the same one
        if (selectedRegistration?.id === editFormData.id) {
          setSelectedRegistration(editFormData)
        }

        // Close the edit modal
        handleCloseEditModal()

        // Show success toast
        success('Registration Updated')
      } else {
        const errorData = await response.json()
        setErrorModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          description: 'Unable to save the registration changes. This could be due to validation errors or insufficient permissions.',
          details: `Error: ${errorData.error}\nRegistration: ${editFormData.fullName}\nID: ${editFormData.id}\nTime: ${new Date().toISOString()}`,
          errorCode: `UPDATE_${response.status}`
        })
      }
    } catch (err) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Update Operation Failed',
        description: 'A network error occurred while trying to save the registration changes. Please check your connection and try again.',
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}\nRegistration: ${editFormData?.fullName}\nTime: ${new Date().toISOString()}`,
        errorCode: 'UPDATE_NETWORK_ERROR'
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleEditFormChange = (field: keyof Registration, value: string | boolean) => {
    if (!editFormData) return

    setEditFormData({
      ...editFormData,
      [field]: value
    })
  }

  // Helper function to generate CSV content for bulk export
  const generateCSVContent = (registrations: Registration[]) => {
    const headers = [
      'Full Name',
      'Date of Birth',
      'Age',
      'Gender',
      'Email Address',
      'Phone Number',
      'Address',
      'Parent/Guardian Name',
      'Parent/Guardian Phone',
      'Parent/Guardian Email',

      'Registration Date',
      'Registration ID'
    ]

    const csvRows = [
      headers.join(','),
      ...registrations.map(reg => [
        `"${reg.fullName}"`,
        `"${formatDate(reg.dateOfBirth)}"`,
        calculateAge(reg.dateOfBirth),
        `"${reg.gender}"`,
        `"${reg.emailAddress}"`,
        `"${reg.phoneNumber}"`,
        `"${reg.address.replace(/"/g, '""')}"`,
        `"${reg.parentGuardianName || ''}"`,
        `"${reg.parentGuardianPhone || ''}"`,
        `"${reg.parentGuardianEmail || ''}"`,

        `"${formatDate(reg.createdAt)}"`,
        `"${reg.id}"`
      ].join(','))
    ]

    return csvRows.join('\n')
  }

  // Helper function to generate bulk PDF content for all registrations
  const generateBulkPDFContent = (registrations: Registration[]) => {
    const registrationCards = registrations.map(registration => `
      <div style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <div style="border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: bold;">Youth Program Registration</h2>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Registration ID: ${registration.id}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Personal Information</h3>
            <p><strong>Name:</strong> ${registration.fullName}</p>
            <p><strong>Date of Birth:</strong> ${formatDate(registration.dateOfBirth)}</p>
            <p><strong>Age:</strong> ${calculateAge(registration.dateOfBirth)} years</p>
            <p><strong>Gender:</strong> ${registration.gender}</p>
          </div>

          <div>
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Contact Information</h3>
            <p><strong>Email:</strong> ${registration.emailAddress}</p>
            <p><strong>Phone:</strong> ${registration.phoneNumber}</p>
            <p><strong>Address:</strong> ${registration.address}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Parent/Guardian</h3>
            <p><strong>Name:</strong> ${registration.parentGuardianName || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${registration.parentGuardianPhone || 'Not provided'}</p>
            <p><strong>Email:</strong> ${registration.parentGuardianEmail || 'Not provided'}</p>
          </div>


        </div>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
          <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px;">Registration Information</h3>
          <p><strong>Registration Date:</strong> ${formatDate(registration.createdAt)}</p>
        </div>
      </div>
    `).join('')

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Youth Program Registrations - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1 { color: #6366f1; text-align: center; margin-bottom: 30px; }
        p { margin: 5px 0; }
        @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <h1>Youth Program Registrations Export</h1>
    <p style="text-align: center; color: #6b7280; margin-bottom: 40px;">
        Generated on ${new Date().toLocaleDateString()} | Total Registrations: ${registrations.length}
    </p>
    ${registrationCards}
</body>
</html>`
  }

  // Helper function to generate HTML content for PDF export
  const generateHTMLContent = (registration: Registration) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration - ${registration.fullName}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 30px;
            background: #fff;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin: -30px -30px 40px -30px;
        }
        .title {
            font-size: 32px;
            font-weight: bold;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .subtitle {
            font-size: 16px;
            margin: 10px 0 5px 0;
            opacity: 0.9;
        }
        .section {
            margin: 30px 0;
            background: #f8fafc;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #4F46E5;
        }
        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #4F46E5;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
        }
        .section-icon {
            width: 24px;
            height: 24px;
            margin-right: 10px;
            background: #4F46E5;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
        }
        .field-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 15px;
        }
        .field {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .field-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .field-value {
            color: #1f2937;
            font-size: 16px;
            word-wrap: break-word;
        }
        .full-width {
            grid-column: 1 / -1;
        }
        .badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            padding: 20px;
            background: #f1f5f9;
            border-radius: 8px;
            font-size: 14px;
            color: #64748b;
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .header { margin: -20px -20px 30px -20px; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">AccoReg Registration Certificate</h1>
            <p class="subtitle">Official Registration Document</p>
            <p class="subtitle">Participant: ${registration.fullName}</p>
            <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
        </div>

        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">👤</span>
                Personal Information
            </h2>
            <div class="field-grid">
                <div class="field">
                    <div class="field-label">Full Name</div>
                    <div class="field-value">${registration.fullName}</div>
                </div>
                <div class="field">
                    <div class="field-label">Date of Birth</div>
                    <div class="field-value">${formatDate(registration.dateOfBirth)}</div>
                </div>
                <div class="field">
                    <div class="field-label">Age</div>
                    <div class="field-value">${calculateAge(registration.dateOfBirth)} years old</div>
                </div>
                <div class="field">
                    <div class="field-label">Gender</div>
                    <div class="field-value">${registration.gender}</div>
                </div>
                <div class="field">
                    <div class="field-label">Registration Date</div>
                    <div class="field-value">${formatDate(registration.createdAt)}</div>
                </div>
                <div class="field">
                    <div class="field-label">Status</div>
                    <div class="field-value"><span class="badge">Completed</span></div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">📧</span>
                Contact Information
            </h2>
            <div class="field-grid">
                <div class="field">
                    <div class="field-label">Email Address</div>
                    <div class="field-value">${registration.emailAddress}</div>
                </div>
                <div class="field">
                    <div class="field-label">Phone Number</div>
                    <div class="field-value">${registration.phoneNumber}</div>
                </div>
                <div class="field full-width">
                    <div class="field-label">Home Address</div>
                    <div class="field-value">${registration.address}</div>
                </div>
            </div>
        </div>

        ${registration.parentGuardianName ? `
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">👨‍👩‍👧‍👦</span>
                Parent/Guardian Information
            </h2>
            <div class="field-grid">
                <div class="field">
                    <div class="field-label">Parent/Guardian Name</div>
                    <div class="field-value">${registration.parentGuardianName}</div>
                </div>
                <div class="field">
                    <div class="field-label">Parent/Guardian Phone</div>
                    <div class="field-value">${registration.parentGuardianPhone}</div>
                </div>
                ${registration.parentGuardianEmail ? `
                <div class="field">
                    <div class="field-label">Parent/Guardian Email</div>
                    <div class="field-value">${registration.parentGuardianEmail}</div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}





        <div class="footer">
            <p><strong>Youth Registration System</strong></p>
            <p>This document serves as official confirmation of registration.</p>
            <p>Document ID: REG-${registration.id.slice(-8).toUpperCase()} | Generated: ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`
  }

  // Show skeleton loader while data is loading
  if (loading) {
    return (
      <AdminLayoutNew title={t('page.registrations.title')} description={t('page.registrations.description')}>
        <div className="space-y-6">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 lg:p-6 bg-white">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gray-200 rounded-lg animate-pulse flex-shrink-0 ml-3" />
                </div>
              </Card>
            ))}
          </div>

          {/* Search and Filters Skeleton */}
          <Card className="p-4 lg:p-6 mb-6 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex-1 lg:max-w-md">
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </Card>

          {/* Registration Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {Array.from({ length: 15 }).map((_, i) => (
              <Card key={i} className="p-4 lg:p-6 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 bg-gray-200 rounded-full animate-pulse" />
                </div>
                <div className="mb-4">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mr-2" />
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mr-2" />
                      <div className="h-3 w-36 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mr-2" />
                      <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mr-2" />
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew title={t('page.registrations.title')} description={t('page.registrations.description')}>
      {/* Stats Cards */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Registrations"
          value={pagination.total}
          subtitle="All participants registered"
          icon={Users}
          gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
          bgGradient="bg-gradient-to-br from-white to-blue-50"
        />



        <StatsCard
          title="Today"
          value={analyticsData.registrationsToday}
          subtitle="Registrations today"
          icon={Calendar}
          gradient="bg-gradient-to-r from-purple-500 to-pink-600"
          bgGradient="bg-gradient-to-br from-white to-purple-50"
        />

        <StatsCard
          title="This Week"
          value={analyticsData.registrationsThisWeek}
          subtitle="Weekly registrations"
          icon={UserCheck}
          gradient="bg-gradient-to-r from-green-500 to-emerald-600"
          bgGradient="bg-gradient-to-br from-white to-green-50"
        />

        <StatsCard
          title="Average Age"
          value={`${Math.round(analyticsData.averageAge)} years`}
          subtitle="Participant demographics"
          icon={Users}
          gradient="bg-gradient-to-r from-orange-500 to-red-600"
          bgGradient="bg-gradient-to-br from-white to-orange-50"
        />
      </StatsGrid>

      {/* Search and Filters */}
      <Card className="p-4 lg:p-6 my-6 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 lg:py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm lg:text-base"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              variant="outline"
              className="font-apercu-medium text-sm lg:text-base"
              onClick={() => fetchRegistrations(true)}
              disabled={refreshing || loading}
              size="sm"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              <span className="sm:hidden">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>

            <Button
              variant="outline"
              className="font-apercu-medium text-sm lg:text-base"
              onClick={handleExportCSV}
              disabled={isExporting || allFilteredRegistrations.length === 0}
              size="sm"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
              <span className="sm:hidden">{isExporting ? 'Exporting...' : 'CSV'}</span>
            </Button>

            <Button
              variant="outline"
              className="font-apercu-medium text-sm lg:text-base"
              onClick={handleExportPDFAll}
              disabled={isExporting || allFilteredRegistrations.length === 0}
              size="sm"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
              <span className="sm:hidden">{isExporting ? 'Exporting...' : 'PDF'}</span>
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="font-apercu-regular text-sm text-gray-600">
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading registrations...
                </span>
              ) : (
                <>
                  Showing {allFilteredRegistrations.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, allFilteredRegistrations.length)} of {allFilteredRegistrations.length} registrations
                  {searchTerm && (
                    <span className="ml-2">
                      • Filtered by: <span className="font-apercu-medium">&quot;{searchTerm}&quot;</span>
                    </span>
                  )}
                </>
              )}
            </p>
            {refreshing && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="font-apercu-regular">Refreshing...</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Registrations Grid - Using Attendance UI Card Design */}
      {filteredRegistrations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {filteredRegistrations.map((registration) => (
            <UserCard
              key={registration.id}
              user={{
                id: registration.id,
                fullName: registration.fullName,
                emailAddress: registration.emailAddress,
                phoneNumber: registration.phoneNumber,
                gender: registration.gender,
                age: calculateAge(registration.dateOfBirth),
                dateOfBirth: registration.dateOfBirth,
                createdAt: registration.createdAt,
                isVerified: registration.isVerified || false,
                verifiedAt: registration.verifiedAt,
                verifiedBy: registration.verifiedBy,
                hasQRCode: !!registration.qrCode
              }}
              onView={() => setSelectedRegistration(registration)}
              onDelete={() => handleDeleteRegistration(registration)}
              showDeleteButton={true}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center mb-8 bg-white">
          {(
            <>
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-apercu-bold text-lg text-gray-900 mb-2">
                {pagination.total === 0 ? 'No Registrations Yet' : 'No Matching Registrations'}
              </h3>
              <p className="font-apercu-regular text-gray-600 mb-4">
                {pagination.total === 0
                  ? 'When youth register for your program, they will appear here.'
                  : 'Try adjusting your search or filter criteria to find registrations.'
                }
              </p>
              {pagination.total === 0 && (
                <Button className="font-apercu-medium">
                  <FileText className="h-4 w-4 mr-2" />
                  View Registration Form
                </Button>
              )}
            </>
          )}
        </Card>
      )}

      {/* Pagination */}
      {totalFilteredPages > 1 && (
        <Card className="p-4 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="font-apercu-regular text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, allFilteredRegistrations.length)} of {allFilteredRegistrations.length} registrations
            </div>

            <div className="flex items-center space-x-1 order-1 sm:order-2">
              {/* Previous button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="font-apercu-medium px-2 sm:px-3"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {(() => {
                  const getVisiblePages = (): (number | string)[] => {
                    const delta = 2
                    const range: number[] = []
                    const rangeWithDots: (number | string)[] = []

                    // Always show first page
                    if (totalFilteredPages > 1) {
                      rangeWithDots.push(1)
                    }

                    // Add ellipsis if needed
                    if (pagination.page - delta > 2) {
                      rangeWithDots.push('...')
                    }

                    // Add pages around current page
                    for (let i = Math.max(2, pagination.page - delta); i <= Math.min(totalFilteredPages - 1, pagination.page + delta); i++) {
                      range.push(i)
                    }
                    rangeWithDots.push(...range)

                    // Add ellipsis if needed
                    if (pagination.page + delta < totalFilteredPages - 1) {
                      rangeWithDots.push('...')
                    }

                    // Always show last page
                    if (totalFilteredPages > 1 && !rangeWithDots.includes(totalFilteredPages)) {
                      rangeWithDots.push(totalFilteredPages)
                    }

                    return rangeWithDots
                  }

                  return getVisiblePages().map((page, index) => (
                    <div key={index}>
                      {page === '...' ? (
                        <span className="px-1 sm:px-2 py-1 text-gray-400 font-apercu-regular text-sm">...</span>
                      ) : (
                        <Button
                          variant={pagination.page === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: page as number }))}
                          className={`font-apercu-medium min-w-[2rem] sm:min-w-[2.5rem] px-2 sm:px-3 text-sm ${
                            pagination.page === page
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </Button>
                      )}
                    </div>
                  ))
                })()}
              </div>

              {/* Next button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === totalFilteredPages}
                className="font-apercu-medium px-2 sm:px-3"
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Registration Details Modal */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-2 sm:p-4 lg:p-6">
          <div className="relative w-full max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl max-h-[98vh] sm:max-h-[95vh] lg:max-h-[90vh] bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl overflow-hidden my-2 sm:my-4 lg:my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 flex items-center justify-center flex-shrink-0 rounded-full">
                    <span className="text-white font-apercu-bold text-xs sm:text-sm">
                      {getInitials(selectedRegistration.fullName)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-apercu-bold text-lg sm:text-xl text-white truncate">
                      {capitalizeName(selectedRegistration.fullName)}
                    </h3>
                    <p className="font-apercu-regular text-indigo-100 text-xs sm:text-sm">
                      Registration Details
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModal}
                  className="text-white hover:bg-white/20 flex-shrink-0 ml-2"
                  disabled={isExporting || isEditing}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Personal Information */}
                <div>
                  <h4 className="font-apercu-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-indigo-600" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <label className="block font-apercu-medium text-xs sm:text-sm text-gray-600 mb-1">Full Name</label>
                      <p className="font-apercu-regular text-sm sm:text-base text-gray-900 break-words">{capitalizeName(selectedRegistration.fullName)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <label className="block font-apercu-medium text-xs sm:text-sm text-gray-600 mb-1">Date of Birth</label>
                      <p className="font-apercu-regular text-sm sm:text-base text-gray-900">
                        {formatDate(selectedRegistration.dateOfBirth)} <span className="text-gray-600">(Age: {calculateAge(selectedRegistration.dateOfBirth)})</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <label className="block font-apercu-medium text-xs sm:text-sm text-gray-600 mb-1">Gender</label>
                      <p className="font-apercu-regular text-sm sm:text-base text-gray-900">{selectedRegistration.gender}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <label className="block font-apercu-medium text-xs sm:text-sm text-gray-600 mb-1">Phone Number</label>
                      <p className="font-apercu-regular text-sm sm:text-base text-gray-900">{selectedRegistration.phoneNumber}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <label className="block font-apercu-medium text-xs sm:text-sm text-gray-600 mb-1">Email Address</label>
                      <p className="font-apercu-regular text-sm sm:text-base text-gray-900 break-all">{selectedRegistration.emailAddress}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg lg:col-span-2">
                      <label className="block font-apercu-medium text-xs sm:text-sm text-gray-600 mb-1">Address</label>
                      <p className="font-apercu-regular text-sm sm:text-base text-gray-900 break-words">{selectedRegistration.address}</p>
                    </div>
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                      <label className="block font-apercu-medium text-xs sm:text-sm text-gray-600 mb-1">Branch</label>
                      <p className="font-apercu-regular text-sm sm:text-base text-gray-900">{selectedRegistration.branch || 'Not Specified'}</p>
                    </div>
                  </div>
                </div>



                {/* Emergency Contact */}
                <div>
                  <h4 className="font-apercu-bold text-lg text-gray-900 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <label className="block font-apercu-medium text-sm text-red-700 mb-1">Contact Name</label>
                      <p className="font-apercu-regular text-red-900">{selectedRegistration.emergencyContactName}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <label className="block font-apercu-medium text-sm text-red-700 mb-1">Relationship</label>
                      <p className="font-apercu-regular text-red-900">{selectedRegistration.emergencyContactRelationship}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200 md:col-span-2">
                      <label className="block font-apercu-medium text-sm text-red-700 mb-1">Phone Number</label>
                      <p className="font-apercu-regular text-red-900">{selectedRegistration.emergencyContactPhone}</p>
                    </div>
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                {(selectedRegistration.parentGuardianName || selectedRegistration.parentGuardianPhone || selectedRegistration.parentGuardianEmail) && (
                  <div>
                    <h4 className="font-apercu-bold text-lg text-gray-900 mb-4 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-blue-600" />
                      Parent/Guardian Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRegistration.parentGuardianName && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <label className="block font-apercu-medium text-sm text-blue-700 mb-1">Name</label>
                          <p className="font-apercu-regular text-blue-900">{selectedRegistration.parentGuardianName}</p>
                        </div>
                      )}
                      {selectedRegistration.parentGuardianPhone && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <label className="block font-apercu-medium text-sm text-blue-700 mb-1">Phone</label>
                          <p className="font-apercu-regular text-blue-900">{selectedRegistration.parentGuardianPhone}</p>
                        </div>
                      )}
                      {selectedRegistration.parentGuardianEmail && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 md:col-span-2">
                          <label className="block font-apercu-medium text-sm text-blue-700 mb-1">Email</label>
                          <p className="font-apercu-regular text-blue-900">{selectedRegistration.parentGuardianEmail}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {/* Registration Information */}
                <div>
                  <h4 className="font-apercu-bold text-lg text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-purple-600" />
                    Registration Information
                  </h4>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block font-apercu-medium text-sm text-purple-700 mb-1">Registration Date</label>
                        <p className="font-apercu-regular text-purple-900">{formatDate(selectedRegistration.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <label className="block font-apercu-medium text-sm text-purple-700 mb-1">Registration ID</label>
                        <p className="font-apercu-regular text-purple-900 text-xs">{selectedRegistration.id}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Information */}
                <div>
                  <h4 className="font-apercu-bold text-lg text-gray-900 mb-4 flex items-center">
                    <QrCode className="h-5 w-5 mr-2 text-indigo-600" />
                    QR Code Details
                  </h4>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block font-apercu-medium text-sm text-indigo-700 mb-1">QR Code Status</label>
                          <p className="font-apercu-regular text-indigo-900">
                            {selectedRegistration.qrCode ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Generated
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Not Generated
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <label className="block font-apercu-medium text-sm text-indigo-700 mb-1">Validity</label>
                          <p className="font-apercu-regular text-indigo-900 text-xs">Valid Until Scanned</p>
                        </div>
                      </div>

                      {selectedRegistration.qrCode ? (
                        <>
                          {/* Visual QR Code */}
                          <div className="pt-2 border-t border-indigo-200">
                            <label className="block font-apercu-medium text-sm text-indigo-700 mb-2">Visual QR Code</label>
                            <div className="flex flex-col items-center bg-white p-4 rounded border border-indigo-300">
                              <QRCodeDisplay qrData={selectedRegistration.qrCode} />
                              <p className="text-xs text-indigo-600 mt-2 text-center">
                                📱 Scan this QR code for verification
                              </p>
                            </div>
                          </div>

                          {/* QR Code Data */}
                          <div className="pt-2 border-t border-indigo-200">
                            <label className="block font-apercu-medium text-sm text-indigo-700 mb-2">QR Code Data</label>
                            <div className="bg-white p-3 rounded border border-indigo-300">
                              <code className="text-xs text-gray-600 break-all font-mono">
                                {selectedRegistration.qrCode}
                              </code>
                            </div>
                            <p className="text-xs text-green-600 mt-2">
                              ✅ QR codes remain valid until scanned by the application
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="pt-2 border-t border-indigo-200">
                          <div className="text-center bg-white p-6 rounded border border-indigo-300">
                            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 mb-3">No QR code generated yet</p>
                            <Button
                              onClick={() => handleGenerateQRCode(selectedRegistration.id)}
                              disabled={generatingQR}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              {generatingQR ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <QrCode className="h-4 w-4 mr-2" />
                                  Generate QR Code
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
                <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      className="font-apercu-medium text-sm"
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      size="sm"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
                      <span className="sm:hidden">{isExporting ? 'Exporting...' : 'PDF'}</span>
                    </Button>

                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      className="font-apercu-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-sm"
                      onClick={() => handleDeleteRegistration(selectedRegistration)}
                      disabled={isExporting || isEditing}
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Delete Registration</span>
                      <span className="sm:hidden">Delete</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCloseModal}
                      className="font-apercu-medium text-sm"
                      disabled={isExporting || isEditing}
                      size="sm"
                    >
                      Close
                    </Button>
                    <Button
                      className="font-apercu-medium text-sm"
                      onClick={handleEditRegistration}
                      disabled={isEditing}
                      size="sm"
                    >
                      {isEditing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      <span className="hidden sm:inline text-white">{isEditing ? 'Loading...' : 'Edit Registration'}</span>
                      <span className="sm:hidden text-white">{isEditing ? 'Loading...' : 'Edit'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Registration Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Edit Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-white/20 flex items-center justify-center rounded-full">
                    <span className="text-white font-apercu-bold text-sm">
                      {getInitials(editFormData.fullName)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-apercu-bold text-xl text-white">
                      Edit Registration
                    </h3>
                    <p className="font-apercu-regular text-green-100 text-sm">
                      {capitalizeName(editFormData.fullName)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseEditModal}
                  className="text-white hover:bg-white/20"
                  disabled={isEditing}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Edit Modal Content */}
            <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Personal Information Section */}
                <div>
                  <h4 className="font-apercu-bold text-lg text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-green-600" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Full Name
                      </label>
                      <Input
                        value={editFormData.fullName || ''}
                        onChange={(e) => handleEditFormChange('fullName', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <Input
                        type="date"
                        value={editFormData.dateOfBirth || ''}
                        onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        value={editFormData.gender || 'Male'}
                        onChange={(e) => handleEditFormChange('gender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isEditing}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <Input
                        value={editFormData.phoneNumber || ''}
                        onChange={(e) => handleEditFormChange('phoneNumber', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        value={editFormData.emailAddress || ''}
                        onChange={(e) => handleEditFormChange('emailAddress', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Address
                      </label>
                      <Input
                        value={editFormData.address || ''}
                        onChange={(e) => handleEditFormChange('address', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter full address"
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Branch
                      </label>
                      <select
                        value={editFormData.branch || ''}
                        onChange={(e) => handleEditFormChange('branch', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isEditing}
                      >
                        <option value="">Select Branch</option>
                        <option value="Iyana Ipaja">Iyana Ipaja</option>
                        <option value="Bajomo">Bajomo</option>
                        <option value="Badagry">Badagry</option>
                        <option value="Bada">Bada</option>
                        <option value="Itele">Itele</option>
                        <option value="Atan">Atan</option>
                        <option value="Ijoko">Ijoko</option>
                        <option value="Sango">Sango</option>
                        <option value="Ifo">Ifo</option>
                        <option value="Gudugba">Gudugba</option>
                        <option value="Great City">Great City</option>
                        <option value="Abeokuta">Abeokuta</option>
                        <option value="Osiele">Osiele</option>
                        <option value="Ayetoro 1">Ayetoro 1</option>
                        <option value="Ayetoro 2">Ayetoro 2</option>
                        <option value="Imeko">Imeko</option>
                        <option value="Sagamu">Sagamu</option>
                        <option value="Ikorodu">Ikorodu</option>
                        <option value="Ibadan">Ibadan</option>
                        <option value="Akure">Akure</option>
                        <option value="Iju">Iju</option>
                        <option value="Osogbo">Osogbo</option>
                        <option value="Ikire">Ikire</option>
                        <option value="Ido Ekiti">Ido Ekiti</option>
                        <option value="Not a Member">Not a Member</option>
                      </select>
                    </div>
                  </div>
                </div>



                {/* Emergency Contact Section */}
                <div>
                  <h4 className="font-apercu-bold text-lg text-gray-900 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Contact Name
                      </label>
                      <Input
                        value={editFormData.emergencyContactName || ''}
                        onChange={(e) => handleEditFormChange('emergencyContactName', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter emergency contact name"
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Relationship
                      </label>
                      <Input
                        value={editFormData.emergencyContactRelationship || ''}
                        onChange={(e) => handleEditFormChange('emergencyContactRelationship', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter relationship"
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <Input
                        value={editFormData.emergencyContactPhone || ''}
                        onChange={(e) => handleEditFormChange('emergencyContactPhone', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent/Guardian Section */}
                <div>
                  <h4 className="font-apercu-bold text-lg text-gray-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Parent/Guardian Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Parent/Guardian Name
                      </label>
                      <Input
                        value={editFormData.parentGuardianName || ''}
                        onChange={(e) => handleEditFormChange('parentGuardianName', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter parent/guardian name"
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Parent/Guardian Phone
                      </label>
                      <Input
                        value={editFormData.parentGuardianPhone || ''}
                        onChange={(e) => handleEditFormChange('parentGuardianPhone', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                        Parent/Guardian Email
                      </label>
                      <Input
                        type="email"
                        value={editFormData.parentGuardianEmail || ''}
                        onChange={(e) => handleEditFormChange('parentGuardianEmail', e.target.value)}
                        className="font-apercu-regular"
                        disabled={isEditing}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                </div>


              </div>
            </div>

            {/* Edit Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <div className="text-sm text-gray-600 order-2 sm:order-1">
                  <span className="font-apercu-medium">Registration ID:</span> {editFormData.id}
                </div>
                <div className="flex space-x-3 order-1 sm:order-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCloseEditModal}
                    className="font-apercu-medium flex-1 sm:flex-none"
                    disabled={isEditing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="font-apercu-medium bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                    disabled={isEditing}
                  >
                    {isEditing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isEditing ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && registrationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Delete Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-apercu-bold text-xl text-white">
                    Delete Registration
                  </h3>
                  <p className="font-apercu-regular text-red-100 text-sm">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Modal Content */}
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="font-apercu-bold text-lg text-gray-900 mb-2">
                  Are you sure you want to delete this registration?
                </h4>
                <p className="font-apercu-regular text-gray-600 mb-4">
                  You are about to permanently delete the registration for:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="font-apercu-bold text-gray-900">{capitalizeName(registrationToDelete.fullName)}</p>
                  <p className="font-apercu-regular text-sm text-gray-600">{registrationToDelete.emailAddress}</p>
                  <p className="font-apercu-regular text-sm text-gray-600">Registered on {formatDate(registrationToDelete.createdAt)}</p>
                </div>
                <p className="font-apercu-regular text-sm text-red-600">
                  This action cannot be undone. All registration data will be permanently removed.
                </p>
              </div>
            </div>

            {/* Delete Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={cancelDeleteRegistration}
                  className="font-apercu-medium"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteRegistration}
                  className="font-apercu-medium bg-red-600 hover:bg-red-700 text-white"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete Registration'}
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
        }}
        showContactSupport={errorModal.type === 'error'}
      />
    </AdminLayoutNew>
  )
}

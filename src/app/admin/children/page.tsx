'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
import { UserCard } from '@/components/ui/user-card'
import { useToast } from '@/contexts/ToastContext'
import { capitalizeName } from '@/lib/utils'
import {
  Heart,
  Users,
  Search,
  Filter,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  AlertCircle,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Edit
} from 'lucide-react'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { ErrorModal } from '@/components/ui/error-modal'
import { useTranslation } from '@/contexts/LanguageContext'

interface ChildrenRegistration {
  id: string
  fullName: string
  dateOfBirth: string
  age: number
  gender: string
  address: string
  branch: string
  parentGuardianName: string
  parentGuardianPhone: string
  parentGuardianEmail: string
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export default function ChildrenRegistrationsPage() {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [registrations, setRegistrations] = useState<ChildrenRegistration[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12, // 12 cards per page for better grid layout
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [selectedRegistration, setSelectedRegistration] = useState<ChildrenRegistration | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [registrationToDelete, setRegistrationToDelete] = useState<ChildrenRegistration | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<ChildrenRegistration | null>(null)
  const [isEditing, setIsEditing] = useState(false)
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

  const fetchRegistrations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      // Fetch all registrations without search/filter params for client-side filtering
      const params = new URLSearchParams({
        limit: '1000' // Get all registrations for client-side filtering
      })

      const response = await fetch(`/api/admin/registrations/children?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch registrations')

      const data = await response.json()
      setRegistrations(data.registrations)
      // Set pagination based on all data for client-side filtering
      setPagination({
        page: 1,
        limit: 50,
        total: data.registrations.length,
        pages: Math.ceil(data.registrations.length / 50)
      })
    } catch (err) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Load Children Registrations',
        description: 'Unable to fetch children registrations. Please check your connection and try again.',
        details: `Error: ${err instanceof Error ? err.message : 'Unknown error'}\nTime: ${new Date().toISOString()}`,
        errorCode: 'FETCH_CHILDREN_ERROR'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [error])

  useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  // Reset to page 1 when search or filter changes (for client-side pagination)
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [searchTerm, genderFilter])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleGenderFilter = (gender: string) => {
    setGenderFilter(gender)
  }

  // Client-side filtering for real-time search (no API calls needed)
  const filteredRegistrations = registrations.filter((registration: ChildrenRegistration) => {
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = (
        registration.fullName.toLowerCase().includes(searchLower) ||
        registration.parentGuardianName.toLowerCase().includes(searchLower) ||
        registration.parentGuardianEmail.toLowerCase().includes(searchLower) ||
        registration.parentGuardianPhone.includes(searchTerm) ||
        registration.branch.toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }

    // Apply gender filter
    if (genderFilter && genderFilter !== 'all') {
      if (registration.gender !== genderFilter) return false
    }

    return true
  })

  // Client-side pagination
  const startIndex = (pagination.page - 1) * pagination.limit
  const endIndex = startIndex + pagination.limit
  const paginatedRegistrations = filteredRegistrations.slice(startIndex, endIndex)

  // Update pagination info based on filtered results
  const filteredPagination = {
    ...pagination,
    total: filteredRegistrations.length,
    pages: Math.ceil(filteredRegistrations.length / pagination.limit)
  }

  const handleViewDetails = (registration: ChildrenRegistration) => {
    setSelectedRegistration(registration)
    setShowDetails(true)
  }

  const handleDeleteRegistration = (registration: ChildrenRegistration) => {
    setRegistrationToDelete(registration)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteRegistration = async () => {
    if (!registrationToDelete) return

    setIsDeleting(true)
    setShowDeleteConfirm(false)

    try {
      const response = await fetch(`/api/admin/registrations/children?id=${registrationToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (response.ok) {
        success('Registration deleted successfully')

        // Remove from local state for instant UI update
        setRegistrations(prev => prev.filter(reg => reg.id !== registrationToDelete.id))

        // Update pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
          pages: Math.ceil((prev.total - 1) / prev.limit)
        }))

        // Refresh data in background
        setTimeout(() => {
          fetchRegistrations(true)
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
      setRegistrationToDelete(null)
    }
  }

  const cancelDeleteRegistration = () => {
    setShowDeleteConfirm(false)
    setRegistrationToDelete(null)
  }

  const handleEditRegistration = async (registration: ChildrenRegistration) => {
    setEditFormData(registration)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditFormData(null)
    setIsEditing(false)
  }

  const handleEditFormChange = (field: keyof ChildrenRegistration, value: string) => {
    if (!editFormData) return

    setEditFormData({
      ...editFormData,
      [field]: value
    })
  }

  const handleSaveEdit = async () => {
    if (!editFormData) return

    setIsEditing(true)

    try {
      const response = await fetch(`/api/admin/registrations/children?id=${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          fullName: editFormData.fullName,
          dateOfBirth: editFormData.dateOfBirth,
          gender: editFormData.gender,
          address: editFormData.address,
          branch: editFormData.branch,
          parentGuardianName: editFormData.parentGuardianName,
          parentGuardianPhone: editFormData.parentGuardianPhone,
          parentGuardianEmail: editFormData.parentGuardianEmail
        })
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
        success('Registration updated successfully')
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

  // Helper functions
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

  // Calculate stats based on filtered data
  const stats = {
    total: filteredRegistrations.length,
    male: filteredRegistrations.filter(r => r.gender === 'Male').length,
    female: filteredRegistrations.filter(r => r.gender === 'Female').length,
    averageAge: filteredRegistrations.length > 0
      ? Math.round(filteredRegistrations.reduce((sum, r) => sum + r.age, 0) / filteredRegistrations.length)
      : 0
  }

  if (loading && registrations.length === 0) {
    return (
      <AdminLayoutNew title="Children Registrations" description="Manage children registrations (information collection only)">
        <div className="space-y-6">
          {/* Stats Cards Skeleton */}
          <StatsGrid columns={4}>
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
          </StatsGrid>

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
          </Card>

          {/* Registration Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {Array.from({ length: 12 }).map((_, i) => (
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
    <AdminLayoutNew title="Children Registrations" description="Manage children registrations (information collection only - no verification required)">
      <div className="space-y-6">
        {/* Stats Cards */}
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Children"
            value={stats.total}
            subtitle="All registered children"
            icon={Heart}
            gradient="bg-gradient-to-r from-pink-500 to-rose-600"
            bgGradient="bg-gradient-to-br from-white to-pink-50"
          />
          <StatsCard
            title="Male Children"
            value={stats.male}
            subtitle="Male registrations"
            icon={Users}
            gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
            bgGradient="bg-gradient-to-br from-white to-blue-50"
          />
          <StatsCard
            title="Female Children"
            value={stats.female}
            subtitle="Female registrations"
            icon={Users}
            gradient="bg-gradient-to-r from-purple-500 to-pink-600"
            bgGradient="bg-gradient-to-br from-white to-purple-50"
          />
          <StatsCard
            title="Average Age"
            value={`${stats.averageAge} years`}
            subtitle="Average child age"
            icon={Calendar}
            gradient="bg-gradient-to-r from-green-500 to-emerald-600"
            bgGradient="bg-gradient-to-br from-white to-green-50"
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
                  placeholder="Search by child name, parent name, or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 lg:py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm lg:text-base"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Gender Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={genderFilter}
                  onChange={(e) => handleGenderFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

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

              <Button variant="outline" className="flex items-center gap-2 font-apercu-medium text-sm lg:text-base" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
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
                    Loading children registrations...
                  </span>
                ) : (
                  <>
                    Showing {paginatedRegistrations.length > 0 ? ((filteredPagination.page - 1) * filteredPagination.limit) + 1 : 0}-{Math.min(filteredPagination.page * filteredPagination.limit, filteredPagination.total)} of {filteredPagination.total} children registrations
                    {searchTerm && (
                      <span className="ml-2">
                        • Filtered by: <span className="font-apercu-medium">&quot;{searchTerm}&quot;</span>
                      </span>
                    )}
                    {genderFilter !== 'all' && (
                      <span className="ml-2">
                        • Gender: <span className="font-apercu-medium">{genderFilter}</span>
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

        {/* Children Registrations Grid - Using UserCard UI */}
        {paginatedRegistrations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {paginatedRegistrations.map((registration) => (
              <UserCard
                key={registration.id}
                user={{
                  id: registration.id,
                  fullName: registration.fullName,
                  emailAddress: registration.parentGuardianEmail, // Show parent email as primary contact
                  phoneNumber: registration.parentGuardianPhone, // Show parent phone as primary contact
                  gender: registration.gender,
                  age: registration.age,
                  dateOfBirth: registration.dateOfBirth,
                  createdAt: registration.createdAt
                }}
                onView={() => handleViewDetails(registration)}
                onDelete={() => handleDeleteRegistration(registration)}
                showDeleteButton={true}
                loading={isDeleting}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center mb-8 bg-white">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-apercu-bold text-lg text-gray-900 mb-2">
              {registrations.length === 0 ? 'No Children Registrations Yet' : 'No Matching Children Registrations'}
            </h3>
            <p className="font-apercu-regular text-gray-600 mb-4">
              {registrations.length === 0
                ? 'When children register for your program, they will appear here.'
                : 'Try adjusting your search or filter criteria to find children registrations.'
              }
            </p>
            {registrations.length === 0 && (
              <Button
                className="font-apercu-medium"
                onClick={() => window.open('/register/children', '_blank')}
              >
                <Heart className="h-4 w-4 mr-2" />
                Register New Children
              </Button>
            )}
          </Card>
        )}

        {/* Pagination */}
        {filteredPagination.pages > 1 && (
          <Card className="p-4 bg-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="font-apercu-regular text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
                Showing {((filteredPagination.page - 1) * filteredPagination.limit) + 1} to {Math.min(filteredPagination.page * filteredPagination.limit, filteredPagination.total)} of {filteredPagination.total} children registrations
              </div>

              <div className="flex items-center space-x-1 order-1 sm:order-2">
                {/* Previous button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={filteredPagination.page === 1}
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
                      if (filteredPagination.pages > 1) {
                        rangeWithDots.push(1)
                      }

                      // Add ellipsis if needed
                      if (filteredPagination.page - delta > 2) {
                        rangeWithDots.push('...')
                      }

                      // Add pages around current page
                      for (let i = Math.max(2, filteredPagination.page - delta); i <= Math.min(filteredPagination.pages - 1, filteredPagination.page + delta); i++) {
                        range.push(i)
                      }
                      rangeWithDots.push(...range)

                      // Add ellipsis if needed
                      if (filteredPagination.page + delta < filteredPagination.pages - 1) {
                        rangeWithDots.push('...')
                      }

                      // Always show last page
                      if (filteredPagination.pages > 1 && !rangeWithDots.includes(filteredPagination.pages)) {
                        rangeWithDots.push(filteredPagination.pages)
                      }

                      return rangeWithDots
                    }

                    return getVisiblePages().map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="px-1 sm:px-2 py-1 text-gray-400 font-apercu-regular text-sm">...</span>
                        ) : (
                          <Button
                            variant={filteredPagination.page === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: page as number }))}
                            className={`font-apercu-medium min-w-[2rem] sm:min-w-[2.5rem] px-2 sm:px-3 text-sm ${
                              filteredPagination.page === page
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
                  disabled={filteredPagination.page === filteredPagination.pages}
                  className="font-apercu-medium px-2 sm:px-3"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Children Registration Details Modal */}
      {selectedRegistration && showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-2 sm:p-4 lg:p-6">
          <div className="relative w-full max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[98vh] sm:max-h-[95vh] lg:max-h-[90vh] bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-2xl overflow-hidden my-2 sm:my-4 lg:my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-apercu-bold text-base sm:text-lg lg:text-xl text-white truncate">
                      {capitalizeName(selectedRegistration.fullName)}
                    </h2>
                    <p className="font-apercu-regular text-xs sm:text-sm text-white/90 truncate">
                      Children Registration Details
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="text-white hover:bg-white/20 flex-shrink-0 ml-2"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-3 sm:p-4 lg:p-6 overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-[calc(95vh-200px)] lg:max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Child Information */}
                <Card className="p-4 lg:p-6 bg-gradient-to-br from-white to-pink-50 border-pink-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-8 w-8 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-lg text-gray-900">Child Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Full Name</label>
                      <p className="font-apercu-regular text-gray-900">{capitalizeName(selectedRegistration.fullName)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-apercu-medium text-sm text-gray-600">Age</label>
                        <p className="font-apercu-regular text-gray-900">{selectedRegistration.age} years old</p>
                      </div>
                      <div>
                        <label className="font-apercu-medium text-sm text-gray-600">Gender</label>
                        <p className="font-apercu-regular text-gray-900">{selectedRegistration.gender}</p>
                      </div>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Date of Birth</label>
                      <p className="font-apercu-regular text-gray-900">{formatDate(selectedRegistration.dateOfBirth)}</p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Branch</label>
                      <p className="font-apercu-regular text-gray-900">{selectedRegistration.branch}</p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Address</label>
                      <p className="font-apercu-regular text-gray-900">{selectedRegistration.address}</p>
                    </div>
                  </div>
                </Card>

                {/* Parent/Guardian Information */}
                <Card className="p-4 lg:p-6 bg-gradient-to-br from-white to-blue-50 border-blue-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-lg text-gray-900">Parent/Guardian Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Parent/Guardian Name</label>
                      <p className="font-apercu-regular text-gray-900">{capitalizeName(selectedRegistration.parentGuardianName)}</p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Phone Number</label>
                      <p className="font-apercu-regular text-gray-900 flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {selectedRegistration.parentGuardianPhone}
                      </p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Email Address</label>
                      <p className="font-apercu-regular text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {selectedRegistration.parentGuardianEmail}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Registration Information */}
                <Card className="p-4 lg:p-6 bg-gradient-to-br from-white to-green-50 border-green-200 lg:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-lg text-gray-900">Registration Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Registration Date</label>
                      <p className="font-apercu-regular text-gray-900">{formatDate(selectedRegistration.createdAt)}</p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Last Updated</label>
                      <p className="font-apercu-regular text-gray-900">{formatDate(selectedRegistration.updatedAt)}</p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Registration ID</label>
                      <p className="font-apercu-regular text-gray-900 font-mono text-sm">{selectedRegistration.id}</p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Status</label>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <Heart className="h-3 w-3 mr-1" />
                        Information Collected
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                  className="font-apercu-medium"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="font-apercu-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                  onClick={() => {
                    setShowDetails(false)
                    handleEditRegistration(selectedRegistration)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Registration
                </Button>
                <Button
                  variant="outline"
                  className="font-apercu-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    setShowDetails(false)
                    handleDeleteRegistration(selectedRegistration)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Registration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={cancelDeleteRegistration}
        onConfirm={confirmDeleteRegistration}
        title="Delete Children Registration"
        description={`Are you sure you want to delete the registration for ${registrationToDelete?.fullName}? This action cannot be undone.`}
        confirmText="Delete Registration"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
      />

      {/* Edit Registration Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Edit Modal Header */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-apercu-bold text-xl text-white">
                      Edit Children Registration
                    </h3>
                    <p className="font-apercu-regular text-sm text-white/90">
                      Update {capitalizeName(editFormData.fullName)}'s information
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
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Child Information */}
                <Card className="p-6 bg-gradient-to-br from-white to-pink-50 border-pink-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-8 w-8 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-lg text-gray-900">Child Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={editFormData.fullName}
                        onChange={(e) => handleEditFormChange('fullName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        disabled={isEditing}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Date of Birth</label>
                        <input
                          type="date"
                          value={editFormData.dateOfBirth}
                          onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          disabled={isEditing}
                        />
                      </div>
                      <div>
                        <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Gender</label>
                        <select
                          value={editFormData.gender}
                          onChange={(e) => handleEditFormChange('gender', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          disabled={isEditing}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Branch</label>
                      <select
                        value={editFormData.branch}
                        onChange={(e) => handleEditFormChange('branch', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Address</label>
                      <textarea
                        value={editFormData.address}
                        onChange={(e) => handleEditFormChange('address', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        disabled={isEditing}
                      />
                    </div>
                  </div>
                </Card>

                {/* Parent/Guardian Information */}
                <Card className="p-6 bg-gradient-to-br from-white to-blue-50 border-blue-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-lg text-gray-900">Parent/Guardian Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Parent/Guardian Name</label>
                      <input
                        type="text"
                        value={editFormData.parentGuardianName}
                        onChange={(e) => handleEditFormChange('parentGuardianName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isEditing}
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={editFormData.parentGuardianPhone}
                        onChange={(e) => handleEditFormChange('parentGuardianPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isEditing}
                      />
                    </div>
                    <div>
                      <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={editFormData.parentGuardianEmail}
                        onChange={(e) => handleEditFormChange('parentGuardianEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isEditing}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCloseEditModal}
                  disabled={isEditing}
                  className="font-apercu-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isEditing}
                  className="font-apercu-medium bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Registration
                    </>
                  )}
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
          fetchRegistrations(true)
        }}
        showContactSupport={errorModal.type === 'error'}
      />
    </AdminLayoutNew>
  )
}

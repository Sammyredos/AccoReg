'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/contexts/ToastContext'
import { ErrorModal } from '@/components/ui/error-modal'
import { parseApiError } from '@/lib/error-messages'
import { useUser } from '@/contexts/UserContext'
import { formatNumber } from '@/lib/statistics'
import { useTranslation } from '@/contexts/LanguageContext'
import { Skeleton } from '@/components/ui/skeleton'
import { capitalizeName } from '@/lib/utils'

import { PlatoonAllocationCard } from '@/components/admin/PlatoonAllocationCard'
import { PlatoonAllocationSetupModal } from '@/components/admin/PlatoonAllocationSetupModal'
import { ParticipantViewModal } from '@/components/admin/ParticipantViewModal'



import { ConfirmationModal } from '@/components/ui/confirmation-modal'
// import { ManualPlatoonAllocationModal } from '@/components/admin/ManualPlatoonAllocationModal'

import {
  Users,
  Plus,
  Shuffle,
  UserPlus,
  Loader2,
  Search,
  X,
  UserCheck,
  Download,
  FileText,
  Filter
} from 'lucide-react'

interface PlatoonAllocation {
  id: string
  name: string
  leaderName: string
  label: string
  leaderPhone: string
  capacity: number
  occupancy: number
  occupancyRate: number
  participants: Array<{
    id: string
    registration: {
      id: string
      fullName: string
      gender: string
      dateOfBirth: string
      phoneNumber: string
      emailAddress: string
      branch: string
    }
  }>
}

interface UnallocatedParticipant {
  id: string
  fullName: string
  dateOfBirth: string
  gender: 'Male' | 'Female'
  emailAddress: string
  phoneNumber: string
  branch: string
}

interface AllocationStats {
  totalVerified: number
  totalAllocated: number
  totalUnallocated: number
  allocationRate: number
  totalPlatoons: number
  activePlatoons: number
}

function AllocatePlatoonPageContent() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<AllocationStats | null>(null)
  const [platoons, setPlatoons] = useState<PlatoonAllocation[]>([])
  const [unallocatedParticipants, setUnallocatedParticipants] = useState<UnallocatedParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAutoAllocating, setIsAutoAllocating] = useState(false)
  const [showPlatoonModal, setShowPlatoonModal] = useState(false)
  const [editingPlatoon, setEditingPlatoon] = useState<PlatoonAllocation | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedParticipant, setSelectedParticipant] = useState<UnallocatedParticipant | null>(null)
  const [loadingPlatoonId, setLoadingPlatoonId] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showParticipantModal, setShowParticipantModal] = useState(false)
  const [showManualAllocationModal, setShowManualAllocationModal] = useState(false)

  // Pagination states
  const [currentPlatoonPage, setCurrentPlatoonPage] = useState(1)
  const [participantPagination, setParticipantPagination] = useState({ currentPage: 1, itemsPerPage: 6 })
  const platoonsPerPage = 8

  // Unallocated participants search
  const [participantSearchTerm, setParticipantSearchTerm] = useState('')

  // Platoon search filter (like accommodations page)
  const [platoonSearchTerm, setPlatoonSearchTerm] = useState('')



  // Global search with suggestions
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{
    name: string
    status: 'allocated' | 'unallocated'
    platoonName?: string
    platoonId?: string
  }>>([])
  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null)





  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {})
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [confirmationText, setConfirmationText] = useState('Confirm')
  const [confirmationVariant, setConfirmationVariant] = useState<'danger' | 'warning' | 'info' | 'success'>('info')

  const { currentUser } = useUser()

  // Memoized permission helpers - matching accommodations page exactly
  const permissions = useMemo(() => {
    const userRole = currentUser?.role?.name || ''
    return {
      canExport: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canAutoAllocate: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canEditPlatoons: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canCreatePlatoons: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canViewPersonDetails: ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(userRole),
      canRemoveAllocations: ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(userRole),

      isViewerOnly: userRole === 'Viewer'
    }
  }, [currentUser?.role?.name])

  const { success, error } = useToast()

  const showToast = useCallback((title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    }
  }, [success, error])

  const fetchAllocationData = useCallback(async (forceRefresh = false) => {
    try {
      console.log('🔄 Fetching allocation data...', forceRefresh ? '(FORCED REFRESH)' : '')
      console.time('fetch-allocation-data')
      setIsLoading(true)

      const timestamp = Date.now()
      const response = await fetch(`/api/admin/platoon-allocations?t=${timestamp}&force=${forceRefresh}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch allocation data')
      }

      const data = await response.json()

      // Update state with fresh data
      flushSync(() => {
        setStats(data.stats)
        setPlatoons(data.platoons)
        setUnallocatedParticipants(data.unallocatedParticipants)
        setErrorMessage(null)
      })

      console.timeEnd('fetch-allocation-data')
    } catch (error) {
      console.error('Error fetching allocation data:', error)
      const errorMessage = parseApiError(error)
      setErrorMessage(errorMessage.description)
      showToast(errorMessage.description, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  // Add state to track initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      await fetchAllocationData()
      setInitialLoadComplete(true)
    }
    loadData()
  }, []) // No dependencies to prevent re-renders

  // Reset participant page when search term changes
  useEffect(() => {
    setParticipantPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [participantSearchTerm])

  // Reset platoon page when search term changes
  useEffect(() => {
    setCurrentPlatoonPage(1)
  }, [platoonSearchTerm])



  // Filter participants based on search term
  const safeUnallocatedParticipants = Array.isArray(unallocatedParticipants) ? unallocatedParticipants : []
  const filteredParticipants = safeUnallocatedParticipants.filter(participant => {
    if (!participantSearchTerm) return true
    const searchLower = participantSearchTerm.toLowerCase()
    return (
      participant.fullName.toLowerCase().includes(searchLower) ||
      participant.emailAddress.toLowerCase().includes(searchLower) ||
      participant.branch.toLowerCase().includes(searchLower) ||
      participant.gender.toLowerCase().includes(searchLower)
    )
  })

  // Filter platoons based on search term (like accommodations page)
  const filteredPlatoons = useMemo(() => {
    const allPlatoons = platoons || []
    if (!platoonSearchTerm) return allPlatoons

    return allPlatoons.filter(platoon => {
      const searchLower = platoonSearchTerm.toLowerCase()

      // Search in platoon name
      const nameMatch = platoon?.name && platoon.name.toLowerCase().includes(searchLower)

      // Search in leader name
      const leaderMatch = platoon?.leaderName && platoon.leaderName.toLowerCase().includes(searchLower)

      // Search in platoon label
      const labelMatch = platoon?.label && platoon.label.toLowerCase().includes(searchLower)

      // Search in participant names
      const participantMatch = platoon?.participants && Array.isArray(platoon.participants) &&
        platoon.participants.some(participant =>
          participant?.registration?.fullName &&
          participant.registration.fullName.toLowerCase().includes(searchLower)
        )

      return nameMatch || leaderMatch || labelMatch || participantMatch
    })
  }, [platoons, platoonSearchTerm])

  // Pagination calculations
  const totalPlatoonPages = Math.ceil(filteredPlatoons.length / platoonsPerPage)
  const totalParticipantPages = Math.ceil(filteredParticipants.length / participantPagination.itemsPerPage)

  const paginatedPlatoons = filteredPlatoons.slice(
    (currentPlatoonPage - 1) * platoonsPerPage,
    currentPlatoonPage * platoonsPerPage
  )

  const paginatedParticipants = filteredParticipants.slice(
    (participantPagination.currentPage - 1) * participantPagination.itemsPerPage,
    participantPagination.currentPage * participantPagination.itemsPerPage
  )

  const handleCreatePlatoon = () => {
    setEditingPlatoon(null)
    setShowPlatoonModal(true)
  }

  const handleEditPlatoon = (platoon: PlatoonAllocation) => {
    setLoadingPlatoonId(platoon.id)
    setLoadingAction('edit')
    setEditingPlatoon(platoon)
    setShowPlatoonModal(true)

    // Clear loading state after modal opens
    setTimeout(() => {
      setLoadingPlatoonId(null)
      setLoadingAction(null)
    }, 100)
  }

  const handleDeletePlatoon = (platoon: PlatoonAllocation) => {
    const participantCount = platoon.participants?.length || 0
    const message = participantCount > 0
      ? `Are you sure you want to delete "${platoon.name}"? This action cannot be undone and will unallocate ${participantCount} participant${participantCount !== 1 ? 's' : ''} from this platoon.`
      : `Are you sure you want to delete "${platoon.name}"? This action cannot be undone.`

    handleConfirmAction(
      () => deletePlatoon(platoon.id),
      message,
      'Delete',
      'danger'
    )
  }

  const handleEmptyPlatoonAction = (platoon: PlatoonAllocation) => {
    const participantCount = platoon.participants?.length || 0
    const message = `Are you sure you want to empty "${platoon.name}"? This will unallocate ${participantCount} participant${participantCount !== 1 ? 's' : ''} from this platoon. This action cannot be undone.`

    handleConfirmAction(
      () => handleEmptyPlatoon(platoon.id),
      message,
      'Empty Platoon',
      'warning'
    )
  }

  const deletePlatoon = async (platoonId: string) => {
    try {
      setLoadingPlatoonId(platoonId)
      setLoadingAction('delete')

      const response = await fetch(`/api/admin/platoon-allocations/${platoonId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete platoon')
      }

      // Get platoon name for success message
      const deletedPlatoon = platoons.find(p => p.id === platoonId)
      const platoonName = deletedPlatoon?.name || 'Platoon'

      // Refresh the data first
      await fetchAllocationData(true)
      setRefreshTrigger(prev => prev + 1)

      // Show success message after refresh
      showToast(`${platoonName} deleted successfully`, 'success')
    } catch (error) {
      console.error('Error deleting platoon:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setLoadingPlatoonId(null)
      setLoadingAction(null)
    }
  }

  const handlePlatoonSaved = async () => {
    try {
      // Force refresh the data to show the new/updated platoon
      await fetchAllocationData(true) // Force refresh with cache busting

      // Trigger additional refresh mechanisms
      setRefreshTrigger(prev => prev + 1)

      // Close modal and reset state after successful refresh
      setShowPlatoonModal(false)
      setEditingPlatoon(null)

    } catch (error) {
      console.error('❌ Error during platoon refresh:', error)
      // Still close the modal even if refresh fails
      setShowPlatoonModal(false)
      setEditingPlatoon(null)

      // Show error message
      showToast('Platoon saved but failed to refresh the list. Please refresh the page.', 'error')
    }
  }

  const handleViewParticipant = (participant: UnallocatedParticipant) => {
    setSelectedParticipant(participant)
    setShowParticipantModal(true)
  }

  // Export functions
  const handleExportCSV = () => {
    // TODO: Implement CSV export functionality
    showToast('CSV export functionality coming soon', 'info')
  }

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    showToast('PDF export functionality coming soon', 'info')
  }



  // Search functions
  const generateSearchSuggestions = (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchSuggestions([])
      return
    }

    try {
      console.log('🔍 Generating suggestions for:', searchTerm)

      // Get unallocated participants
      const unallocatedSuggestions = (safeUnallocatedParticipants || [])
        .filter(participant =>
          participant?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          participant?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          participant?.phoneNumber?.includes(searchTerm)
        )
        .map(participant => ({
          name: participant.fullName || 'Unknown',
          status: 'unallocated' as const,
          platoonName: undefined,
          platoonId: undefined
        }))

      // Get allocated participants from platoons
      const allocatedSuggestions = (platoons || []).flatMap(platoon => {
        if (!platoon?.participants || !Array.isArray(platoon.participants)) {
          return []
        }

        return platoon.participants
          .filter(p =>
            p?.registration?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p?.registration?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p?.registration?.phoneNumber?.includes(searchTerm)
          )
          .map(p => ({
            name: p.registration?.fullName || 'Unknown',
            status: 'allocated' as const,
            platoonName: platoon.name || 'Unknown Platoon',
            platoonId: platoon.id
          }))
      })

      const allSuggestions = [...unallocatedSuggestions, ...allocatedSuggestions]

      // Remove duplicates by name and limit to 5
      const uniqueSuggestions = allSuggestions
        .filter((suggestion, index, self) =>
          index === self.findIndex(s => s.name === suggestion.name)
        )
        .slice(0, 5)

      console.log('📝 Generated suggestions:', uniqueSuggestions)
      setSearchSuggestions(uniqueSuggestions)
    } catch (error) {
      console.error('Error generating search suggestions:', error)
      setSearchSuggestions([])
    }
  }

  const handleSearchChange = (value: string) => {
    setGlobalSearchTerm(value)
    generateSearchSuggestions(value)
  }

  const handleSuggestionClick = (suggestion: { name: string; status: string; platoonName?: string; platoonId?: string }) => {
    console.log('🎯 Suggestion clicked:', suggestion)
    setGlobalSearchTerm(suggestion.name)

    // Find the participant details
    const foundParticipant = findParticipantByName(suggestion.name)
    console.log('🔍 Found participant result:', foundParticipant)
    setSelectedSearchResult(foundParticipant)
  }

  const findParticipantByName = (name: string) => {
    console.log('🔍 Searching for participant:', name)
    console.log('📊 Available data:', {
      unallocatedCount: safeUnallocatedParticipants.length,
      platoonsCount: (platoons || []).length,
      unallocatedSample: safeUnallocatedParticipants[0],
      platoonsSample: (platoons || [])[0]
    })

    // Check unallocated participants
    const unallocatedMatch = safeUnallocatedParticipants.find(p => p.fullName === name)
    if (unallocatedMatch) {
      console.log('✅ Found in unallocated:', unallocatedMatch)
      return {
        id: unallocatedMatch.id,
        fullName: unallocatedMatch.fullName,
        emailAddress: unallocatedMatch.emailAddress,
        phoneNumber: unallocatedMatch.phoneNumber,
        gender: unallocatedMatch.gender,
        dateOfBirth: unallocatedMatch.dateOfBirth,
        branch: unallocatedMatch.branch,
        status: 'unallocated',
        platoonName: null,
        platoonId: null,
        platoonDetails: null
      }
    }

    // Check allocated participants in platoons
    for (const platoon of platoons || []) {
      const allocatedMatch = platoon.participants.find(p => p.registration?.fullName === name)
      if (allocatedMatch) {
        console.log('✅ Found in platoon:', platoon.name, allocatedMatch)
        return {
          id: allocatedMatch.id,
          fullName: allocatedMatch.registration.fullName,
          emailAddress: allocatedMatch.registration.emailAddress,
          phoneNumber: allocatedMatch.registration.phoneNumber,
          gender: allocatedMatch.registration.gender,
          dateOfBirth: allocatedMatch.registration.dateOfBirth,
          branch: allocatedMatch.registration.branch,
          status: 'allocated',
          platoonName: platoon.name,
          platoonId: platoon.id,
          platoonDetails: {
            leaderName: platoon.leaderName,
            leaderPhone: platoon.leaderPhone,
            participantCount: platoon.participants.length,
            capacity: platoon.capacity,
            occupancy: platoon.occupancy,
            occupancyRate: platoon.occupancyRate,
            label: platoon.label
          }
        }
      }
    }

    console.log('❌ Participant not found')
    return null
  }

  const clearSearchResult = () => {
    setGlobalSearchTerm('')
    setSelectedSearchResult(null)
    setSearchSuggestions([])
  }



  const handleCloseParticipantModal = () => {
    setShowParticipantModal(false)
    setSelectedParticipant(null)
  }

  const handleAutoAllocate = async () => {
    const safeParticipants = Array.isArray(unallocatedParticipants) ? unallocatedParticipants : []
    if (safeParticipants.length === 0) {
      showToast('No unallocated participants to allocate', 'warning')
      return
    }

    if (!platoons || platoons.length === 0) {
      showToast('No platoons created. Please create platoons first before allocating participants.', 'error')
      return
    }

    try {
      setIsAutoAllocating(true)

      const response = await fetch('/api/admin/platoon-allocations/auto-allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: unallocatedParticipants.map(p => p.id),
          platoonIds: platoons.map(p => p.id)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to auto-allocate participants')
      }

      const result = await response.json()
      showToast(`Successfully allocated ${result.totalAllocated} participants across ${platoons.length} platoons`, 'success')

      fetchAllocationData()
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error auto-allocating:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setIsAutoAllocating(false)
    }
  }

  const handleEmptyPlatoon = async (platoonId: string) => {
    try {
      setLoadingPlatoonId(platoonId)
      setLoadingAction('empty')

      const response = await fetch(`/api/admin/platoon-allocations/${platoonId}/empty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to empty platoon')
      }

      const result = await response.json()
      showToast(`Successfully unallocated ${result.unallocatedCount} participants from platoon`, 'success')

      // Refresh data to get updated participant lists
      fetchAllocationData()
    } catch (error) {
      console.error('Error emptying platoon:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setLoadingPlatoonId(null)
      setLoadingAction(null)
    }
  }

  const handleManualAllocate = () => {
    const safeParticipants = Array.isArray(unallocatedParticipants) ? unallocatedParticipants : []
    if (safeParticipants.length === 0) {
      showToast('No unallocated participants to allocate', 'warning')
      return
    }

    if (!platoons || platoons.length === 0) {
      showToast('No platoons created. Please create platoons first before allocating participants.', 'error')
      return
    }

    setShowManualAllocationModal(true)
  }

  // This function will be used when manual allocation is implemented
  // const handleManualAllocationSuccess = async () => {
  //   console.log('🎯 Manual allocation successful, refreshing data...')
  //   setShowManualAllocationModal(false)
  //   await fetchAllocationData(true) // Force refresh
  //   console.log('✅ Manual allocation refresh completed')
  // }

  const handleConfirmAction = (
    action: () => void,
    message: string,
    confirmText: string = 'Confirm',
    variant: 'danger' | 'warning' | 'info' | 'success' = 'info'
  ) => {
    setConfirmationAction(() => action)
    setConfirmationMessage(message)
    setConfirmationText(confirmText)
    setConfirmationVariant(variant)
    setShowConfirmation(true)
  }

  const executeConfirmationAction = () => {
    confirmationAction()
    setShowConfirmation(false)
  }

  const handleAutoAllocateConfirm = () => {
    // Prevent accidental double-taps on mobile
    if (isAutoAllocating) return

    // Additional safety checks
    const safeParticipants = Array.isArray(unallocatedParticipants) ? unallocatedParticipants : []
    if (safeParticipants.length === 0) {
      showToast('No unallocated participants to allocate', 'warning')
      return
    }

    if (!platoons || platoons.length === 0) {
      showToast('No platoons created. Please create platoons first before allocating participants.', 'error')
      return
    }

    const message = `Are you sure you want to auto-allocate ${safeParticipants.length} participants across ${platoons.length} platoons? This will randomly distribute participants evenly across all platoons.`
    handleConfirmAction(handleAutoAllocate, message, 'Allocate', 'info')
  }



  // Check permissions
  const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
  if (currentUser && !allowedRoles.includes(currentUser.role?.name || '')) {
    return (
      <AdminLayoutNew title="Allocate Platoon" description="Manage platoon allocations for verified participants">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew title="Allocate Platoon" description="Manage platoon allocations for verified participants">
      {/* Stats Cards */}
      <div className="mb-8">
        {isLoading && !initialLoadComplete ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 sm:p-5 bg-white border border-gray-100 shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Verified */}
          <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="p-4 sm:p-5">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                    Total Verified
                  </p>
                  <div className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                    {formatNumber(stats?.totalVerified || 0)}
                  </div>
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                    All verified participants
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Allocated */}
          <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="p-4 sm:p-5">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                    Allocated
                  </p>
                  <div className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                    {formatNumber(stats?.totalAllocated || 0)}
                  </div>
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                    {stats?.totalVerified ? Math.round((stats.totalAllocated / stats.totalVerified) * 100) : 0}% allocated
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Unallocated */}
          <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="p-4 sm:p-5">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                    Unallocated
                  </p>
                  <div className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                    {formatNumber(safeUnallocatedParticipants.length)}
                  </div>
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                    Awaiting platoon assignment
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Total Platoons */}
          <Card className="relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="p-4 sm:p-5">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-500 uppercase tracking-wide mb-1 truncate">
                    Total Platoons
                  </p>
                  <div className="font-apercu-bold text-lg sm:text-xl lg:text-2xl text-gray-900 leading-tight truncate">
                    {formatNumber(platoons.length)}
                  </div>
                  <p className="font-apercu-regular text-xs sm:text-xs text-gray-600 mt-1 truncate">
                    Active platoon units
                  </p>
                </div>
              </div>
            </div>
          </Card>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
            {permissions.canCreatePlatoons && (
              <Button
                onClick={handleCreatePlatoon}
                className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700 h-12 sm:h-10 touch-manipulation select-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Platoon
              </Button>
            )}

            {permissions.canAutoAllocate && (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  onClick={handleAutoAllocateConfirm}
                  disabled={isAutoAllocating || safeUnallocatedParticipants.length === 0 || !platoons || platoons.length === 0}
                  variant="outline"
                  className="font-apercu-medium h-12 sm:h-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto touch-manipulation select-none"
                >
                  {isAutoAllocating ? (
                    <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 mr-2 animate-spin" />
                  ) : (
                    <Shuffle className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                  )}
                  Auto Allocate
                </Button>

                <Button
                  onClick={handleManualAllocate}
                  disabled={safeUnallocatedParticipants.length === 0 || !platoons || platoons.length === 0}
                  variant="outline"
                  className="font-apercu-medium border-green-200 text-green-700 hover:bg-green-50 h-12 sm:h-10 text-sm w-full sm:w-auto touch-manipulation select-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                  Manual Allocate
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Export Section - Exactly like accommodations page */}
      <div className="space-y-6 mb-6 sm:mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm">
          <div className="space-y-4">
            {/* Search Input - Responsive width */}
            <div className="w-full sm:max-w-md lg:max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={globalSearchTerm}
                  onChange={(e) => {
                    console.log('🔍 Search input changed:', e.target.value)
                    handleSearchChange(e.target.value)
                  }}
                  placeholder="Search by name, email, phone number..."
                  className="w-full pl-10 pr-10 py-2.5 sm:py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                />
                {globalSearchTerm && (
                  <button
                    onClick={() => {
                      console.log('🧹 Clearing search')
                      clearSearchResult()
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Real-time search info */}
            {!globalSearchTerm ? (
              <div className="text-sm text-gray-500 font-apercu-regular">
                Start typing to search participants across all platoons
              </div>
            ) : (
              <div className="text-sm text-blue-600 font-apercu-regular">
                Searching for "{globalSearchTerm}"... {searchSuggestions.length} result{searchSuggestions.length !== 1 ? 's' : ''} found
              </div>
            )}

            {/* Export and Scan Buttons - On next line like accommodations page */}
            {permissions.canExport && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="font-apercu-medium w-full sm:w-auto flex items-center justify-center sm:justify-start transition-all duration-200 hover:shadow-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="font-apercu-medium w-full sm:w-auto flex items-center justify-center sm:justify-start transition-all duration-200 hover:shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Results Section */}
      <div className="space-y-6 mb-6 sm:mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm">
          {/* Search Results - List View like accommodations page */}
          {globalSearchTerm && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="font-apercu-bold text-base text-gray-900">
                  Search Results ({searchSuggestions.length})
                </h3>
                {globalSearchTerm && (
                  <Badge variant="outline" className="font-apercu-medium w-fit text-xs">
                    "{globalSearchTerm}"
                  </Badge>
                )}
              </div>

              {searchSuggestions.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-apercu-medium text-gray-500">No participants found</p>
                  <p className="font-apercu-regular text-sm text-gray-400">
                    Try adjusting your search terms
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm cursor-pointer"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-indigo-500 to-indigo-600">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                            <span className="font-apercu-medium text-sm sm:text-base text-gray-900 truncate">
                              {suggestion.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {suggestion.status === 'allocated' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-apercu-medium">
                                ✅ {suggestion.platoonName}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-apercu-medium">
                                ⏳ Unallocated
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Platoons Section */}
      <Card className="p-4 sm:p-6 bg-white border-gray-200">
        <div className="space-y-4 sm:space-y-6">
          {/* Unallocated Participants Section - Top Priority */}
          {safeUnallocatedParticipants.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-apercu-bold text-base sm:text-lg text-blue-900">
                      {safeUnallocatedParticipants.length} Unallocated Participants
                    </h3>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-apercu-medium text-xs">
                      Ready for allocation
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, branch, or gender..."
                    value={participantSearchTerm}
                    onChange={(e) => setParticipantSearchTerm(e.target.value)}
                    className="pl-10 pr-10 font-apercu-regular border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {participantSearchTerm && (
                    <button
                      onClick={() => setParticipantSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Participants Grid */}
              {filteredParticipants.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3 md:gap-4">
                    {(isLoading && !initialLoadComplete) ? (
                      // Skeleton loaders for unallocated participants
                      Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="p-1.5 sm:p-3 md:p-4 bg-white border-gray-200">
                          <div className="flex flex-col space-y-1 sm:space-y-2">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <Skeleton className="h-3 w-3 sm:h-5 sm:w-5 md:h-6 md:w-6 rounded-full flex-shrink-0" />
                              <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 md:w-24 flex-1" />
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <Skeleton className="h-3 w-8 sm:w-10" />
                              <Skeleton className="h-4 w-8" />
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      paginatedParticipants.map((participant) => (
                        <Card
                          key={participant.id}
                          onClick={() => permissions.canViewPersonDetails && handleViewParticipant(participant)}
                          className={`p-1.5 sm:p-3 md:p-4 bg-white border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:shadow-sm ${
                            permissions.canViewPersonDetails ? 'cursor-pointer' : ''
                          }`}
                        >
                          <div className="flex flex-col space-y-1 sm:space-y-2">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className={`h-3 w-3 sm:h-5 sm:w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                participant.gender === 'Male'
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  : 'bg-gradient-to-r from-pink-500 to-pink-600'
                              }`}>
                                <Users className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-white" />
                              </div>
                              <span className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate leading-tight">
                                {participant.fullName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-apercu-regular text-xs text-gray-500 truncate">
                                {new Date().getFullYear() - new Date(participant.dateOfBirth).getFullYear()} yrs
                              </span>
                              {permissions.canViewPersonDetails && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewParticipant(participant)
                                  }}
                                  className="font-apercu-medium text-xs text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 px-0.5"
                                >
                                  <span className="hidden sm:inline">View</span>
                                  <span className="sm:hidden">•••</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>

                  {/* Pagination for Unallocated Participants - Mobile Optimized */}
                  {totalParticipantPages > 1 && (
                    <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-blue-100">
                      <div className="flex items-center justify-center sm:justify-start">
                        <span className="font-apercu-regular text-xs text-blue-700 text-center sm:text-left">
                          {((participantPagination.currentPage - 1) * participantPagination.itemsPerPage) + 1}-{Math.min(participantPagination.currentPage * participantPagination.itemsPerPage, filteredParticipants.length)} of {filteredParticipants.length}
                          {participantSearchTerm && (
                            <span className="ml-2 text-blue-600">• "{participantSearchTerm}"</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setParticipantPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                          disabled={participantPagination.currentPage === 1}
                          className="px-2 py-1 text-xs font-apercu-medium text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                        >
                          ‹ Prev
                        </button>
                        <span className="px-2 py-1 text-xs font-apercu-medium text-blue-900 bg-blue-100 border border-blue-200 rounded min-w-[40px] text-center">
                          {participantPagination.currentPage}/{totalParticipantPages}
                        </span>
                        <button
                          onClick={() => setParticipantPagination(prev => ({ ...prev, currentPage: Math.min(totalParticipantPages, prev.currentPage + 1) }))}
                          disabled={participantPagination.currentPage === totalParticipantPages}
                          className="px-2 py-1 text-xs font-apercu-medium text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                        >
                          Next ›
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                !isLoading && initialLoadComplete && (
                  <div className="text-center py-8 bg-white rounded-lg">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {participantSearchTerm ? (
                        <Search className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Users className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <h4 className="font-apercu-medium text-base text-blue-700 mb-2">
                      {participantSearchTerm ? 'No participants found' : 'All Participants Allocated'}
                    </h4>
                    <p className="font-apercu-regular text-sm text-blue-600">
                      {participantSearchTerm ? 'Try adjusting your search terms.' : 'Great! All verified participants have been allocated to platoons.'}
                    </p>
                  </div>
                )
              )}
            </div>
          )}



          {/* All Platoons Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">
                  All Platoons
                </h3>
                <Badge className="bg-gray-100 text-gray-800 border-gray-200 font-apercu-medium text-xs">
                  {filteredPlatoons.length}
                </Badge>
              </div>
              <p className="font-apercu-regular text-sm text-gray-600">
                Manage and view all platoons and their allocations
              </p>
            </div>
          </div>

          {/* Platoon Search Filter - Same style as accommodations page */}
          <div className="bg-gradient-to-r from-indigo-500/5 to-purple-600/5 border border-indigo-100 rounded-lg p-2 sm:p-3 md:p-4 lg:p-6 mb-6">
            <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between md:space-x-3">
              <div className="flex-1 md:max-w-md">
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-indigo-500" />
                  <input
                    type="text"
                    placeholder="Search platoons..."
                    value={platoonSearchTerm}
                    onChange={(e) => setPlatoonSearchTerm(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-6 sm:pr-8 py-2 sm:py-2.5 md:py-2.5 border border-indigo-200 rounded-md sm:rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm md:text-base bg-white/50"
                  />
                  {platoonSearchTerm && (
                    <button
                      onClick={() => setPlatoonSearchTerm('')}
                      className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <X className="h-3 sm:h-4 w-3 sm:w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-indigo-100">
              <p className="font-apercu-regular text-xs text-indigo-700 text-center sm:text-left">
                {filteredPlatoons.length} of {platoons?.length || 0} platoons
                {platoonSearchTerm && (
                  <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                    • &quot;{platoonSearchTerm}&quot;
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Platoons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {isLoading && !initialLoadComplete ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="p-4 sm:p-6 bg-white">
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 sm:h-4 md:h-5 w-12 sm:w-16 md:w-20" />
                        <Skeleton className="h-4 sm:h-5 md:h-6 w-10 sm:w-12 md:w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-2.5 sm:h-3 md:h-4 w-full" />
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Skeleton className="h-2.5 sm:h-3 md:h-4 w-2.5 sm:w-3 md:w-4" />
                        <Skeleton className="h-2.5 sm:h-3 md:h-4 w-16 sm:w-20 md:w-24" />
                      </div>
                      <div className="flex space-x-1 sm:space-x-2">
                        <Skeleton className="h-6 sm:h-7 md:h-8 w-10 sm:w-12 md:w-16" />
                        <Skeleton className="h-6 sm:h-7 md:h-8 w-10 sm:w-12 md:w-16" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : paginatedPlatoons.length > 0 ? (
                paginatedPlatoons.map((platoon) => (
                  <PlatoonAllocationCard
                    key={platoon.id}
                    platoon={platoon}
                    onEdit={handleEditPlatoon}
                    onDelete={handleDeletePlatoon}
                    onEmpty={handleEmptyPlatoonAction}
                    onRefresh={fetchAllocationData}
                    isLoading={loadingPlatoonId === platoon.id}
                    loadingAction={loadingAction || undefined}
                    canEditPlatoons={permissions.canEditPlatoons}
                    canViewPersonDetails={permissions.canViewPersonDetails}
                    canRemoveAllocations={permissions.canRemoveAllocations}
                  />
                ))
              ) : (
              // No platoons created empty state - match accommodation page design
              <div className="col-span-full">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-xl text-indigo-700 mb-3">No Platoons Created</h3>
                    <p className="font-apercu-regular text-indigo-600 mb-6 leading-relaxed">
                      Create platoons to start organizing participants into groups. You can set capacity, assign leaders, and manage allocations.
                    </p>
                    {permissions.canCreatePlatoons ? (
                      <Button
                        onClick={handleCreatePlatoon}
                        className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Platoon
                      </Button>
                    ) : (
                      <div className="text-sm text-indigo-500 font-apercu-regular">
                        Contact an administrator to create platoons
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>

          {/* Pagination for Platoons */}
          {totalPlatoonPages > 1 && (
            <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-indigo-100">
              <div className="flex items-center justify-center sm:justify-start">
                <span className="font-apercu-regular text-xs text-indigo-700 text-center sm:text-left">
                  {((currentPlatoonPage - 1) * platoonsPerPage) + 1}-{Math.min(currentPlatoonPage * platoonsPerPage, filteredPlatoons.length)} of {filteredPlatoons.length}
                </span>
              </div>
              <div className="flex items-center justify-center space-x-1">
                <button
                  onClick={() => setCurrentPlatoonPage(Math.max(1, currentPlatoonPage - 1))}
                  disabled={currentPlatoonPage === 1}
                  className="px-2 py-1 text-xs font-apercu-medium text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                >
                  ‹ Prev
                </button>
                <span className="px-2 py-1 text-xs font-apercu-medium text-indigo-900 bg-indigo-100 border border-indigo-200 rounded min-w-[40px] text-center">
                  {currentPlatoonPage}/{totalPlatoonPages}
                </span>
                <button
                  onClick={() => setCurrentPlatoonPage(Math.min(totalPlatoonPages, currentPlatoonPage + 1))}
                  disabled={currentPlatoonPage === totalPlatoonPages}
                  className="px-2 py-1 text-xs font-apercu-medium text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>







      {/* Modals */}
      <PlatoonAllocationSetupModal
        isOpen={showPlatoonModal}
        onCloseAction={() => setShowPlatoonModal(false)}
        onSaveAction={handlePlatoonSaved}
        platoon={editingPlatoon}
      />

      {/* <ManualPlatoonAllocationModal
        isOpen={showManualAllocationModal}
        onClose={() => setShowManualAllocationModal(false)}
        onSuccess={handleManualAllocationSuccess}
        unallocatedParticipants={safeUnallocatedParticipants}
        platoons={platoons}
      /> */}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={executeConfirmationAction}
        title="Confirm Action"
        description={confirmationMessage}
        confirmText={confirmationText}
        cancelText="Cancel"
        variant={confirmationVariant}
        loading={isLoading}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={!!errorMessage}
        onClose={() => setErrorMessage(null)}
        type="error"
        title="Error"
        description={errorMessage || ''}
      />

      {/* Participant View Modal */}
      <ParticipantViewModal
        participant={selectedParticipant}
        isOpen={showParticipantModal}
        onCloseAction={handleCloseParticipantModal}
      />


    </AdminLayoutNew>
  )
}

// Main component
export default function AllocatePlatoonPage() {
  return <AllocatePlatoonPageContent />
}

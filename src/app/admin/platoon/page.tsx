'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Skeleton components are now inline in the loading state
import { useToast } from '@/contexts/ToastContext'
import { ErrorModal } from '@/components/ui/error-modal'
import { parseApiError } from '@/lib/error-messages'
import { useUser } from '@/contexts/UserContext'
import { formatNumber } from '@/lib/statistics'
import { useTranslation } from '@/contexts/LanguageContext'
import { Skeleton } from '@/components/ui/skeleton'
import { capitalizeName } from '@/lib/utils'

import { PlatoonCard } from '@/components/admin/PlatoonCard'
import { PlatoonSetupModal } from '@/components/admin/PlatoonSetupModal'
import { AllocationSetupModal } from '@/components/admin/AllocationSetupModal'
import { AccommodationSearchExport } from '@/components/admin/AccommodationSearchExport'
import { PersonPreviewModal } from '@/components/admin/PersonPreviewModal'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { GenderTabs, GenderTabContent } from '@/components/ui/gender-tabs'
import { ManualAllocationModal } from '@/components/admin/ManualAllocationModal'
import { AccommodationSettingsModal } from '@/components/admin/AccommodationSettingsModal'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

import { AccommodationUpdatesProvider, useAccommodationUpdates, useAccommodationRefresh } from '@/contexts/AccommodationUpdatesContext'
import { AccommodationStatsCards } from '@/components/admin/AccommodationStatsCards'
import {
  Users,
  Plus,
  Shuffle,
  UserPlus,
  Settings,
  Search,
  Filter,
  X,
  Trash2,
  Home
} from 'lucide-react'

interface AccommodationStats {
  totalRegistrations: number
  allocatedRegistrations: number
  unallocatedRegistrations: number
  allocationRate: number
  totalRooms: number
  activeRooms: number
  totalCapacity: number
  occupiedSpaces: number
  availableSpaces: number
  roomOccupancyRate: number
}

interface Platoon {
  id: string
  name: string
  gender: string
  capacity: number
  isActive: boolean
  description?: string
  occupancy: number
  availableSpaces: number
  occupancyRate: number
  allocations: Array<{
    id: string
    registration: {
      id: string
      fullName: string
      gender: string
      dateOfBirth: string
      phoneNumber: string
      emailAddress: string
    }
  }>
}

function PlatoonPageContent() {
  const { t } = useTranslation()
  const { triggerStatsUpdate } = useAccommodationUpdates()
  const [stats, setStats] = useState<AccommodationStats | null>(null)
  const [platoonsByGender, setPlatoonsByGender] = useState<Record<string, Platoon[]>>({})
  const [unallocatedByGender, setUnallocatedByGender] = useState<Record<string, Array<{
    id: string
    fullName: string
    dateOfBirth: string
    gender: string
    emailAddress: string
  }>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [unallocatedLoading, setUnallocatedLoading] = useState(false)
  const [showPlatoonModal, setShowPlatoonModal] = useState(false)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [showManualAllocationModal, setShowManualAllocationModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingPlatoon, setEditingPlatoon] = useState<Platoon | null>(null)
  const [allocationGender, setAllocationGender] = useState<string>('All')
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [platoonUpdateTrigger, setPlatoonUpdateTrigger] = useState<Record<string, number>>({})

  // Pagination states
  const [currentMalePage, setCurrentMalePage] = useState(1)
  const [currentFemalePage, setCurrentFemalePage] = useState(1)
  const roomsPerPage = 8

  // Person preview modal state
  const [showPersonPreview, setShowPersonPreview] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {})
  const [confirmationMessage, setConfirmationMessage] = useState('')

  const { currentUser } = useUser()

  // Permission checks
  const permissions = useMemo(() => {
    const userRole = currentUser?.role?.name || ''
    return {
      canCreatePlatoons: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canEditPlatoons: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canDeletePlatoons: ['Super Admin', 'Admin'].includes(userRole),
      canAllocateParticipants: ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(userRole),
      canRemoveAllocations: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canViewPersonDetails: ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].includes(userRole),
      canExportData: ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(userRole),
      canManageSettings: ['Super Admin', 'Admin'].includes(userRole)
    }
  }, [currentUser])

  const { showSuccess, showError } = useToast()

  const showToast = useCallback((title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      showSuccess(title)
    } else if (type === 'error') {
      showError(title)
    }
  }, [showSuccess, showError])

  const fetchAccommodationData = useCallback(async () => {
    try {
      console.time('fetch-accommodation-data')
      setIsLoading(true)

      const response = await fetch(`/api/admin/accommodations?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch accommodation data')
      }

      const data = await response.json()

      // Update state with fresh data
      flushSync(() => {
        setStats(data.stats)
        setPlatoonsByGender(data.roomsByGender)
        setUnallocatedByGender(data.unallocatedByGender)
        setError(null)
      })

      console.timeEnd('fetch-accommodation-data')
    } catch (error) {
      console.error('Error fetching accommodation data:', error)
      const errorMessage = parseApiError(error)
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  const refreshSinglePlatoon = useCallback(async (platoonId: string) => {
    try {
      setPlatoonUpdateTrigger(prev => ({
        ...prev,
        [platoonId]: (prev[platoonId] || 0) + 1
      }))

      const response = await fetch(`/api/admin/accommodations/rooms/${platoonId}?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to refresh platoon data')
      }

      const platoonData = await response.json()

      // Update the specific platoon in state
      setPlatoonsByGender(prev => ({
        ...prev,
        [platoonData.gender]: prev[platoonData.gender]?.map(platoon =>
          platoon.id === platoonId ? platoonData : platoon
        ) || []
      }))

      // Trigger stats update
      triggerStatsUpdate()

    } catch (error) {
      console.error('Error refreshing platoon:', error)
      showToast('Failed to refresh platoon data', 'error')
    }
  }, [triggerStatsUpdate, showToast])

  // Add state to track initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      await fetchAccommodationData()
      setInitialLoadComplete(true)
    }
    loadData()
  }, []) // No dependencies to prevent re-renders

  // Removed auto-refresh for better performance

  // Set up real-time updates with immediate refresh
  useAccommodationRefresh(fetchAccommodationData)

  // Pagination calculations
  const malePlatoons = platoonsByGender.Male || []
  const femalePlatoons = platoonsByGender.Female || []

  const totalMalePages = Math.ceil(malePlatoons.length / roomsPerPage)
  const totalFemalePages = Math.ceil(femalePlatoons.length / roomsPerPage)

  const paginatedMalePlatoons = malePlatoons.slice(
    (currentMalePage - 1) * roomsPerPage,
    currentMalePage * roomsPerPage
  )

  const paginatedFemalePlatoons = femalePlatoons.slice(
    (currentFemalePage - 1) * roomsPerPage,
    currentFemalePage * roomsPerPage
  )

  const handleCreatePlatoon = () => {
    setEditingPlatoon(null)
    setShowPlatoonModal(true)
  }

  const handleEditPlatoon = (platoon: Platoon) => {
    setEditingPlatoon(platoon)
    setShowPlatoonModal(true)
  }

  const handlePlatoonSaved = () => {
    setShowPlatoonModal(false)
    setEditingPlatoon(null)
    fetchAccommodationData()
    setRefreshTrigger(prev => prev + 1)
  }

  const handlePersonPreview = (registrationId: string) => {
    setSelectedPersonId(registrationId)
    setShowPersonPreview(true)
  }

  const handlePersonPreviewClose = () => {
    setShowPersonPreview(false)
    setSelectedPersonId(null)
  }

  const handleRemoveAllocationFromPreview = () => {
    setShowPersonPreview(false)
    setSelectedPersonId(null)
    fetchAccommodationData()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleManualAllocationSuccess = () => {
    setShowManualAllocationModal(false)
    fetchAccommodationData()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleSettingsSaved = () => {
    setShowSettingsModal(false)
    fetchAccommodationData()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleStartAllocation = (gender: string) => {
    // Check if platoons exist for the selected gender
    const malePlatoonsExist = (platoonsByGender.Male?.length || 0) > 0
    const femalePlatoonsExist = (platoonsByGender.Female?.length || 0) > 0

    if (gender === 'Male' && !malePlatoonsExist) {
      showToast('No Male platoons have been created. Please create platoons first before allocating participants.', 'error')
      return
    }

    if (gender === 'Female' && !femalePlatoonsExist) {
      showToast('No Female platoons have been created. Please create platoons first before allocating participants.', 'error')
      return
    }

    if (gender === 'All' && !malePlatoonsExist && !femalePlatoonsExist) {
      showToast('No platoons have been created. Please create platoons first before allocating participants.', 'error')
      return
    }

    if (gender === 'All' && !malePlatoonsExist) {
      showToast('No Male platoons have been created. Only Female participants can be allocated.', 'warning')
    }

    if (gender === 'All' && !femalePlatoonsExist) {
      showToast('No Female platoons have been created. Only Male participants can be allocated.', 'warning')
    }

    setAllocationGender(gender)
    setShowAllocationModal(true)
  }



  const handleAllocationComplete = (result: { totalAllocated: number; emailResults?: unknown }) => {
    setShowAllocationModal(false)
    setUnallocatedLoading(true)
    fetchAccommodationData().finally(() => setUnallocatedLoading(false))
    setRefreshTrigger(prev => prev + 1)

    // Create success message with email results
    let message = `Successfully allocated ${result.totalAllocated} registrations`

    if (result.emailResults) {
      // Add email results to message if available
      message += '. Email notifications sent.'
    }

    showToast(message, 'success')
  }

  const handleConfirmAction = (action: () => void, message: string) => {
    setConfirmationAction(() => action)
    setConfirmationMessage(message)
    setShowConfirmation(true)
  }

  const executeConfirmationAction = () => {
    confirmationAction()
    setShowConfirmation(false)
  }

  // Check permissions - Allow all roles including Staff and Viewer
  const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
  if (currentUser && !allowedRoles.includes(currentUser.role?.name || '')) {
    return (
      <AdminLayoutNew title="Platoon Management" description="Manage platoon assignments and allocations">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew title="Platoon Management" description="Manage platoon assignments and allocations">
        {/* Stats Cards */}
        <div className="mb-8">
          <AccommodationStatsCards
            stats={{
              totalRegistrations: stats?.totalRegistrations || 0,
              allocatedRegistrations: stats?.allocatedRegistrations || 0,
              unallocatedRegistrations: stats?.unallocatedRegistrations || 0,
              allocationRate: stats?.allocationRate || 0,
              totalRooms: stats?.totalRooms || 0,
              activeRooms: stats?.activeRooms || 0,
              totalCapacity: stats?.totalCapacity || 0,
              occupiedSpaces: stats?.occupiedSpaces || 0,
              availableSpaces: stats?.availableSpaces || 0,
              roomOccupancyRate: stats?.roomOccupancyRate || 0
            }}
            loading={isLoading && !initialLoadComplete}
          />
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              {permissions.canCreatePlatoons && (
                <Button
                  onClick={handleCreatePlatoon}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 px-4 py-2.5"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Platoon</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}

              {permissions.canAllocateParticipants && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStartAllocation('All')}
                    disabled={isLoading || (stats?.unallocatedRegistrations || 0) === 0}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Shuffle className="h-4 w-4" />
                    <span className="hidden sm:inline">Auto Allocate</span>
                    <span className="sm:hidden">Auto</span>
                  </Button>

                  <Button
                    onClick={() => setShowManualAllocationModal(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50 font-apercu-medium flex items-center justify-center gap-2 px-4 py-2.5"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Manual</span>
                    <span className="sm:hidden">Manual</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-2 sm:gap-3">
              <AccommodationSearchExport
                canExport={permissions.canExportData}
                disabled={isLoading}
              />

              {permissions.canManageSettings && (
                <Button
                  onClick={() => setShowSettingsModal(true)}
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 font-apercu-medium flex items-center justify-center gap-2 px-4 py-2.5"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Gender Tabs */}
        <GenderTabs defaultValue="Male">
          {/* Male Tab */}
          <GenderTabContent value="Male">
            <div className="space-y-6">
              {/* Unallocated Male Participants */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-apercu-bold text-base sm:text-lg text-blue-700">
                        Unallocated Male Participants
                      </h3>
                      <p className="font-apercu-regular text-xs sm:text-sm text-blue-600">
                        {formatNumber(unallocatedByGender.Male?.length || 0)} participants waiting for platoon assignment
                      </p>
                    </div>
                  </div>

                  {permissions.canAllocateParticipants && (unallocatedByGender.Male?.length || 0) > 0 && (
                    <Button
                      onClick={() => handleStartAllocation('Male')}
                      disabled={isLoading || unallocatedLoading}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 px-4 py-2.5"
                    >
                      <Shuffle className="h-4 w-4" />
                      <span className="hidden sm:inline">Allocate Male</span>
                      <span className="sm:hidden">Allocate</span>
                    </Button>
                  )}
                </div>

                {(unallocatedByGender.Male?.length || 0) > 0 ? (
                  <div className="space-y-3">
                    <p className="font-apercu-regular text-xs sm:text-sm text-blue-600">
                      Click on any participant to view their details and manually assign them to a platoon.
                    </p>

                  {/* Ultra-responsive grid for small phones */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3 md:gap-4">
                    {(isLoading && !initialLoadComplete) || unallocatedLoading ? (
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
                              <Skeleton className="h-3 w-6 sm:w-8" />
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      unallocatedByGender.Male?.map((person) => (
                        <Card
                          key={person.id}
                          className="p-1.5 sm:p-3 md:p-4 bg-white border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                          onClick={() => permissions.canViewPersonDetails && handlePersonPreview(person.id)}
                        >
                          <div className="flex flex-col space-y-1 sm:space-y-2">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="h-3 w-3 sm:h-5 sm:w-5 md:h-6 md:w-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs sm:text-sm font-apercu-bold">
                                  {person.fullName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <p className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate flex-1 group-hover:text-blue-700 transition-colors">
                                {capitalizeName(person.fullName)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-apercu-regular text-xs text-gray-500 truncate">
                                Age {new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear()}
                              </p>
                              <Badge variant="secondary" className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 border-blue-200">
                                {person.gender}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h4 className="font-apercu-bold text-sm sm:text-base text-blue-700 mb-1 sm:mb-2">All Male Participants Allocated</h4>
                    <p className="font-apercu-regular text-xs sm:text-sm text-blue-600">
                      Great job! All male participants have been assigned to rooms.
                    </p>
                  </div>
                )}
              </div>

              {/* Male Platoons */}
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">
                      Male Platoons ({formatNumber(malePlatoons.length)})
                    </h3>
                    <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">
                      Manage platoon assignments and capacity
                    </p>
                  </div>

                  {totalMalePages > 1 && (
                    <PaginationControls
                      currentPage={currentMalePage}
                      totalPages={totalMalePages}
                      onPageChange={setCurrentMalePage}
                      itemsPerPage={roomsPerPage}
                      totalItems={malePlatoons.length}
                      itemName="platoons"
                    />
                  )}
                </div>



              {/* Room cards grid - 2 cards per viewport on tablet, 4 on desktop, 8 total per page */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
                {isLoading && !initialLoadComplete ? (
                  // Responsive skeleton loaders for room cards
                  Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="p-2 sm:p-3 md:p-4 lg:p-5 bg-white">
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
                ) : (
                  paginatedMalePlatoons.map((platoon) => (
                    <PlatoonCard
                      key={`${platoon.id}-${platoonUpdateTrigger[platoon.id] || 0}`}
                      platoon={platoon}
                      onEdit={handleEditPlatoon}
                      onRefresh={() => refreshSinglePlatoon(platoon.id)}
                      onPersonPreview={handlePersonPreview}
                      canEditPlatoons={permissions.canEditPlatoons}
                      canViewPersonDetails={permissions.canViewPersonDetails}
                      canRemoveAllocations={permissions.canRemoveAllocations}
                    />
                  ))
                )}
              </div>

              {/* Pagination for Male Platoons */}
              {totalMalePages > 1 && (
                <div className="flex justify-center mt-6">
                  <PaginationControls
                    currentPage={currentMalePage}
                    totalPages={totalMalePages}
                    onPageChange={setCurrentMalePage}
                    itemsPerPage={roomsPerPage}
                    totalItems={malePlatoons.length}
                    itemName="platoons"
                  />
                </div>
              )}

              {/* No platoons exist at all for Male */}
              {(platoonsByGender.Male?.length || 0) === 0 && !isLoading && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-xl text-blue-700 mb-3">No Male Platoons Created</h3>
                    <p className="font-apercu-regular text-blue-600 mb-6 leading-relaxed">
                      Create platoons to start allocating male participants. You can set capacity, add descriptions, and manage allocations.
                    </p>
                    {permissions.canCreatePlatoons ? (
                      <Button
                        onClick={handleCreatePlatoon}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 mx-auto px-6 py-3"
                      >
                        <Plus className="h-5 w-5" />
                        Create Your First Male Platoon
                      </Button>
                    ) : (
                      <p className="font-apercu-regular text-blue-500 text-sm">
                        Contact an administrator to create platoons.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>
          </GenderTabContent>

          {/* Female Tab */}
          <GenderTabContent value="Female">
            <div className="space-y-6">
              {/* Unallocated Female Participants */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-apercu-bold text-base sm:text-lg text-pink-700">
                        Unallocated Female Participants
                      </h3>
                      <p className="font-apercu-regular text-xs sm:text-sm text-pink-600">
                        {formatNumber(unallocatedByGender.Female?.length || 0)} participants waiting for room assignment
                      </p>
                    </div>
                  </div>

                  {permissions.canAllocateParticipants && (unallocatedByGender.Female?.length || 0) > 0 && (
                    <Button
                      onClick={() => handleStartAllocation('Female')}
                      disabled={isLoading || unallocatedLoading}
                      className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 px-4 py-2.5"
                    >
                      <Shuffle className="h-4 w-4" />
                      <span className="hidden sm:inline">Allocate Female</span>
                      <span className="sm:hidden">Allocate</span>
                    </Button>
                  )}
                </div>

                {(unallocatedByGender.Female?.length || 0) > 0 ? (
                  <div className="space-y-3">
                    <p className="font-apercu-regular text-xs sm:text-sm text-pink-600">
                      Click on any participant to view their details and manually assign them to a platoon.
                    </p>

                  {/* Ultra-responsive grid for small phones */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3 md:gap-4">
                    {isLoading || unallocatedLoading ? (
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
                              <Skeleton className="h-3 w-6 sm:w-8" />
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      unallocatedByGender.Female?.map((person) => (
                        <Card
                          key={person.id}
                          className="p-1.5 sm:p-3 md:p-4 bg-white border-gray-200 hover:border-pink-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                          onClick={() => permissions.canViewPersonDetails && handlePersonPreview(person.id)}
                        >
                          <div className="flex flex-col space-y-1 sm:space-y-2">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="h-3 w-3 sm:h-5 sm:w-5 md:h-6 md:w-6 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs sm:text-sm font-apercu-bold">
                                  {person.fullName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <p className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate flex-1 group-hover:text-pink-700 transition-colors">
                                {capitalizeName(person.fullName)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-apercu-regular text-xs text-gray-500 truncate">
                                Age {new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear()}
                              </p>
                              <Badge variant="secondary" className="text-xs px-1 py-0.5 bg-pink-100 text-pink-700 border-pink-200">
                                {person.gender}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h4 className="font-apercu-bold text-sm sm:text-base text-pink-700 mb-1 sm:mb-2">All Female Participants Allocated</h4>
                    <p className="font-apercu-regular text-xs sm:text-sm text-pink-600">
                      Great job! All female participants have been assigned to rooms.
                    </p>
                  </div>
                )}
              </div>

              {/* Female Platoons */}
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">
                      Female Platoons ({formatNumber(femalePlatoons.length)})
                    </h3>
                    <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">
                      Manage platoon assignments and capacity
                    </p>
                  </div>

                  {totalFemalePages > 1 && (
                    <PaginationControls
                      currentPage={currentFemalePage}
                      totalPages={totalFemalePages}
                      onPageChange={setCurrentFemalePage}
                      itemsPerPage={roomsPerPage}
                      totalItems={femalePlatoons.length}
                      itemName="platoons"
                    />
                  )}
                </div>



              {/* Room cards grid - 2 cards per viewport on tablet, 4 on desktop, 8 total per page */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
                {isLoading ? (
                  // Responsive skeleton loaders for room cards
                  Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="p-2 sm:p-3 md:p-4 lg:p-5 bg-white">
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
                ) : (
                  paginatedFemalePlatoons.map((platoon) => (
                    <PlatoonCard
                      key={`${platoon.id}-${platoonUpdateTrigger[platoon.id] || 0}`}
                      platoon={platoon}
                      onEdit={handleEditPlatoon}
                      onRefresh={() => refreshSinglePlatoon(platoon.id)}
                      onPersonPreview={handlePersonPreview}
                      canEditPlatoons={permissions.canEditPlatoons}
                      canViewPersonDetails={permissions.canViewPersonDetails}
                      canRemoveAllocations={permissions.canRemoveAllocations}
                    />
                  ))
                )}
              </div>

              {/* Pagination for Female Platoons */}
              {totalFemalePages > 1 && (
                <div className="flex justify-center mt-6">
                  <PaginationControls
                    currentPage={currentFemalePage}
                    totalPages={totalFemalePages}
                    onPageChange={setCurrentFemalePage}
                    itemsPerPage={roomsPerPage}
                    totalItems={femalePlatoons.length}
                    itemName="platoons"
                  />
                </div>
              )}

              {/* No platoons exist at all for Female */}
              {(platoonsByGender.Female?.length || 0) === 0 && !isLoading && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-dashed border-pink-200 rounded-xl p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="h-16 w-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-xl text-pink-700 mb-3">No Female Platoons Created</h3>
                    <p className="font-apercu-regular text-pink-600 mb-6 leading-relaxed">
                      Create platoons to start allocating female participants. You can set capacity, add descriptions, and manage allocations.
                    </p>
                    {permissions.canCreatePlatoons ? (
                      <Button
                        onClick={handleCreatePlatoon}
                        className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 mx-auto px-6 py-3"
                      >
                        <Plus className="h-5 w-5" />
                        Create Your First Female Platoon
                      </Button>
                    ) : (
                      <p className="font-apercu-regular text-pink-500 text-sm">
                        Contact an administrator to create platoons.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>
          </GenderTabContent>
        </GenderTabs>

        {/* Modals */}
        <PlatoonSetupModal
          isOpen={showPlatoonModal}
          onClose={() => setShowPlatoonModal(false)}
          onSave={handlePlatoonSaved}
          platoon={editingPlatoon}
        />

        <AllocationSetupModal
          isOpen={showAllocationModal}
          onCloseAction={() => setShowAllocationModal(false)}
          onCompleteAction={handleAllocationComplete}
          unallocatedCount={stats?.unallocatedRegistrations || 0}
          gender={allocationGender}
        />

        <ManualAllocationModal
          isOpen={showManualAllocationModal}
          onClose={() => setShowManualAllocationModal(false)}
          onSuccess={handleManualAllocationSuccess}
        />

        <AccommodationSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSaved={handleSettingsSaved}
        />

        {/* Person Preview Modal */}
        <PersonPreviewModal
          isOpen={showPersonPreview}
          onCloseAction={handlePersonPreviewClose}
          registrationId={selectedPersonId}
          onRemoveAllocationAction={handleRemoveAllocationFromPreview}
          canRemoveAllocations={permissions.canRemoveAllocations}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={executeConfirmationAction}
          title="Confirm Action"
          message={confirmationMessage}
          confirmText="Confirm"
          cancelText="Cancel"
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={!!error}
          onClose={() => setError(null)}
          type="error"
          title="Error"
          description={error || ''}
        />
      </AdminLayoutNew>
  )
}

// Wrapper component with real-time updates provider
export default function PlatoonPage() {
  return (
    <AccommodationUpdatesProvider>
      <PlatoonPageContent />
    </AccommodationUpdatesProvider>
  )
}

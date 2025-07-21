'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { PaginationControls } from '@/components/admin/PaginationControls'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

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
  gender: string
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
  const [showPlatoonModal, setShowPlatoonModal] = useState(false)
  const [editingPlatoon, setEditingPlatoon] = useState<PlatoonAllocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Pagination states
  const [currentPlatoonPage, setCurrentPlatoonPage] = useState(1)
  const [currentParticipantPage, setCurrentParticipantPage] = useState(1)
  const platoonsPerPage = 8
  const participantsPerPage = 20

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

  const fetchAllocationData = useCallback(async () => {
    try {
      console.time('fetch-allocation-data')
      setIsLoading(true)

      const response = await fetch(`/api/admin/platoon-allocations?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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
        setError(null)
      })

      console.timeEnd('fetch-allocation-data')
    } catch (error) {
      console.error('Error fetching allocation data:', error)
      const errorMessage = parseApiError(error)
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAllocationData()
  }, [fetchAllocationData])

  // Pagination calculations
  const totalPlatoonPages = Math.ceil(platoons.length / platoonsPerPage)
  const totalParticipantPages = Math.ceil(unallocatedParticipants.length / participantsPerPage)

  const paginatedPlatoons = platoons.slice(
    (currentPlatoonPage - 1) * platoonsPerPage,
    currentPlatoonPage * platoonsPerPage
  )

  const paginatedParticipants = unallocatedParticipants.slice(
    (currentParticipantPage - 1) * participantsPerPage,
    currentParticipantPage * participantsPerPage
  )

  const handleCreatePlatoon = () => {
    setEditingPlatoon(null)
    setShowPlatoonModal(true)
  }

  const handleEditPlatoon = (platoon: PlatoonAllocation) => {
    setEditingPlatoon(platoon)
    setShowPlatoonModal(true)
  }

  const handlePlatoonSaved = () => {
    setShowPlatoonModal(false)
    setEditingPlatoon(null)
    fetchAllocationData()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleAutoAllocate = async () => {
    if (unallocatedParticipants.length === 0) {
      showToast('No unallocated participants to allocate', 'warning')
      return
    }

    if (platoons.length === 0) {
      showToast('No platoons created. Please create platoons first before allocating participants.', 'error')
      return
    }

    try {
      setIsLoading(true)

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
      showToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Verified */}
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-apercu-regular text-xs text-blue-600">Total Verified</p>
                <p className="font-apercu-bold text-lg text-blue-700">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : formatNumber(stats?.totalVerified || 0)}
                </p>
              </div>
            </div>
          </Card>

          {/* Total Allocated */}
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-apercu-regular text-xs text-green-600">Allocated</p>
                <p className="font-apercu-bold text-lg text-green-700">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : formatNumber(stats?.totalAllocated || 0)}
                </p>
              </div>
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
              <Button
                onClick={() => handleConfirmAction(handleAutoAllocate, `Are you sure you want to auto-allocate ${unallocatedParticipants.length} participants across ${platoons.length} platoons? This will randomly distribute participants evenly across all platoons.`)}
                disabled={isLoading || unallocatedParticipants.length === 0 || platoons.length === 0}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shuffle className="h-4 w-4" />
                <span className="hidden sm:inline">Auto Allocate Platoon</span>
                <span className="sm:hidden">Auto Allocate</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Unallocated Participants Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-base sm:text-lg text-orange-700">
                  Unallocated Verified Participants
                </h3>
                <p className="font-apercu-regular text-xs sm:text-sm text-orange-600">
                  {formatNumber(unallocatedParticipants.length)} participants waiting for platoon assignment
                </p>
              </div>
            </div>

            {totalParticipantPages > 1 && (
              <PaginationControls
                currentPage={currentParticipantPage}
                totalPages={totalParticipantPages}
                onPageChange={setCurrentParticipantPage}
                itemsPerPage={participantsPerPage}
                totalItems={unallocatedParticipants.length}
                itemName="participants"
              />
            )}
          </div>

          {unallocatedParticipants.length > 0 ? (
            <div className="space-y-3">
              <p className="font-apercu-regular text-xs sm:text-sm text-orange-600">
                All verified participants from both male and female categories are listed here. Click on any participant to view their details.
              </p>

              {/* Unified participant grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {isLoading ? (
                  // Skeleton loaders for participants
                  Array.from({ length: 12 }).map((_, i) => (
                    <Card key={i} className="p-2 sm:p-3 md:p-4 bg-white border-gray-200">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded-full flex-shrink-0" />
                          <Skeleton className="h-4 w-20 sm:w-24 flex-1" />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </Card>
                  ))
                ) : (
                  paginatedParticipants.map((participant) => (
                    <Card
                      key={participant.id}
                      className="p-2 sm:p-3 md:p-4 bg-white border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            participant.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                          }`}>
                            <span className="text-white text-xs font-apercu-bold">
                              {participant.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate flex-1 group-hover:text-orange-700 transition-colors">
                            {capitalizeName(participant.fullName)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-apercu-regular text-xs text-gray-500 truncate">
                            Age {new Date().getFullYear() - new Date(participant.dateOfBirth).getFullYear()}
                          </p>
                          <Badge variant="secondary" className={`text-xs px-1 py-0.5 ${
                            participant.gender === 'Male' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-pink-100 text-pink-700 border-pink-200'
                          }`}>
                            {participant.gender}
                          </Badge>
                        </div>
                        <p className="font-apercu-regular text-xs text-gray-500 truncate">
                          {participant.branch}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination for participants */}
              {totalParticipantPages > 1 && (
                <div className="flex justify-center mt-4">
                  <PaginationControls
                    currentPage={currentParticipantPage}
                    totalPages={totalParticipantPages}
                    onPageChange={setCurrentParticipantPage}
                    itemsPerPage={participantsPerPage}
                    totalItems={unallocatedParticipants.length}
                    itemName="participants"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h4 className="font-apercu-bold text-sm sm:text-base text-orange-700 mb-1 sm:mb-2">All Participants Allocated</h4>
              <p className="font-apercu-regular text-xs sm:text-sm text-orange-600">
                Great job! All verified participants have been assigned to platoons.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Platoons Section */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">
              Platoons ({formatNumber(platoons.length)})
            </h3>
            <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">
              Manage platoon assignments and participant allocations
            </p>
          </div>

          {totalPlatoonPages > 1 && (
            <PaginationControls
              currentPage={currentPlatoonPage}
              totalPages={totalPlatoonPages}
              onPageChange={setCurrentPlatoonPage}
              itemsPerPage={platoonsPerPage}
              totalItems={platoons.length}
              itemName="platoons"
            />
          )}
        </div>

        {/* Platoon cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
          {isLoading ? (
            // Skeleton loaders for platoon cards
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
            paginatedPlatoons.map((platoon) => (
              <PlatoonAllocationCard
                key={platoon.id}
                platoon={platoon}
                onEdit={handleEditPlatoon}
                onRefresh={fetchAllocationData}
                canEditPlatoons={permissions.canEditPlatoons}
                canViewPersonDetails={permissions.canViewPersonDetails}
                canRemoveAllocations={permissions.canRemoveAllocations}
              />
            ))
          )}
        </div>

        {/* Pagination for platoons */}
        {totalPlatoonPages > 1 && (
          <div className="flex justify-center mt-6">
            <PaginationControls
              currentPage={currentPlatoonPage}
              totalPages={totalPlatoonPages}
              onPageChange={setCurrentPlatoonPage}
              itemsPerPage={platoonsPerPage}
              totalItems={platoons.length}
              itemName="platoons"
            />
          </div>
        )}

        {/* No platoons exist */}
        {platoons.length === 0 && !isLoading && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-apercu-bold text-xl text-blue-700 mb-3">No Platoons Created</h3>
              <p className="font-apercu-regular text-blue-600 mb-6 leading-relaxed">
                Create platoons to start allocating verified participants. You can set platoon details, leader information, and manage allocations.
              </p>
              {permissions.canCreatePlatoons ? (
                <Button
                  onClick={handleCreatePlatoon}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 mx-auto px-6 py-3"
                >
                  <Plus className="h-5 w-5" />
                  Create Your First Platoon
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

      {/* Modals */}
      <PlatoonAllocationSetupModal
        isOpen={showPlatoonModal}
        onClose={() => setShowPlatoonModal(false)}
        onSave={handlePlatoonSaved}
        platoon={editingPlatoon}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={executeConfirmationAction}
        title="Confirm Auto Allocation"
        message={confirmationMessage}
        confirmText="Allocate"
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

// Main component
export default function AllocatePlatoonPage() {
  return <AllocatePlatoonPageContent />
}
          </Card>

          {/* Total Unallocated */}
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-apercu-regular text-xs text-orange-600">Unallocated</p>
                <p className="font-apercu-bold text-lg text-orange-700">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : formatNumber(stats?.totalUnallocated || 0)}
                </p>
              </div>
            </div>
          </Card>

          {/* Allocation Rate */}
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Shuffle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-apercu-regular text-xs text-purple-600">Allocation Rate</p>
                <p className="font-apercu-bold text-lg text-purple-700">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : `${stats?.allocationRate || 0}%`}
                </p>
              </div>
            </div>
          </Card>

          {/* Total Platoons */}
          <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-apercu-regular text-xs text-teal-600">Total Platoons</p>
                <p className="font-apercu-bold text-lg text-teal-700">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : formatNumber(stats?.totalPlatoons || 0)}
                </p>
              </div>
            </div>
          </Card>

          {/* Active Platoons */}
          <Card className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-apercu-regular text-xs text-pink-600">Active Platoons</p>
                <p className="font-apercu-bold text-lg text-pink-700">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : formatNumber(stats?.activePlatoons || 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

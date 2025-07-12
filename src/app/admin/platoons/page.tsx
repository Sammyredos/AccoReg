'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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

import { PlatoonCard } from '@/components/admin/PlatoonCard'
import { CreatePlatoonModal } from '@/components/admin/CreatePlatoonModal'
import { PlatoonSearchExport } from '@/components/admin/PlatoonSearchExport'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { GenderTabs, GenderTabContent } from '@/components/ui/gender-tabs'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { PlatoonStatsCards } from '@/components/admin/PlatoonStatsCards'
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
  Shield
} from 'lucide-react'

interface PlatoonStats {
  totalRegistrations: number
  allocatedRegistrations: number
  unallocatedRegistrations: number
  allocationRate: number
  totalPlatoons: number
  activePlatoons: number
  totalCapacity: number
  occupiedSpaces: number
  availableSpaces: number
  platoonOccupancyRate: number
}

interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
}

interface Participant {
  id: string
  fullName: string
  gender: string
  age: string
  emailAddress: string
  phoneNumber: string
  verifiedAt: string
}

interface Platoon {
  id: string
  name: string
  leaderName: string
  leaderPhone: string
  label?: string | null
  isActive: boolean
  capacity: number
  occupancy: number
  createdAt: string
  allocations: Array<{
    id: string
    registration: {
      id: string
      fullName: string
      gender: string
      age: string
    }
  }>
  _count: {
    allocations: number
  }
}

function PlatoonsPageContent() {
  const { toast } = useToast()
  const { currentUser } = useUser()
  const { t } = useTranslation()

  // State management
  const [platoons, setPlatoons] = useState<Platoon[]>([])
  const [unallocatedParticipants, setUnallocatedParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<PlatoonStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [autoAllocating, setAutoAllocating] = useState(false)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'full' | 'available'>('all')

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 12,
    totalItems: 0,
    totalPages: 0
  })

  const [unallocatedPagination, setUnallocatedPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 0
  })

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchPlatoonData(),
          fetchUnallocatedParticipants()
        ])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
        setInitialLoadComplete(true)
      }
    }

    loadData()
  }, [pagination.currentPage, unallocatedPagination.currentPage, searchTerm, filterStatus])

  const fetchPlatoonData = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchTerm,
        status: filterStatus,
        includeAllocations: 'true'
      })

      const response = await fetch(`/api/admin/platoons?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPlatoons(data.platoons || [])

        // Update pagination
        setPagination(prev => ({
          ...prev,
          totalItems: data.pagination?.total || 0,
          totalPages: Math.ceil((data.pagination?.total || 0) / prev.itemsPerPage)
        }))

        // Update stats
        if (data.stats) {
          setStats(data.stats)
        }
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load platoons', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error loading platoons:', error)
      toast({ title: 'Error', description: 'Failed to load platoons', variant: 'destructive' })
    }
  }

  const fetchUnallocatedParticipants = async () => {
    try {
      const params = new URLSearchParams({
        page: unallocatedPagination.currentPage.toString(),
        limit: unallocatedPagination.itemsPerPage.toString()
      })

      const response = await fetch(`/api/admin/platoons/unallocated?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUnallocatedParticipants(data.participants || [])

        // Update pagination
        setUnallocatedPagination(prev => ({
          ...prev,
          totalItems: data.pagination?.total || 0,
          totalPages: Math.ceil((data.pagination?.total || 0) / prev.itemsPerPage)
        }))
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to load unallocated participants', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error loading unallocated participants:', error)
      toast({ title: 'Error', description: 'Failed to load unallocated participants', variant: 'destructive' })
    }
  }

  // Memoized platoon filtering
  const filteredPlatoons = useMemo(() => {
    return platoons.filter(platoon => {
      // Search filter
      const matchesSearch = platoon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           platoon.leaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (platoon.label || '').toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      let matchesFilter = true
      switch (filterStatus) {
        case 'active':
          matchesFilter = platoon.isActive
          break
        case 'inactive':
          matchesFilter = !platoon.isActive
          break
        case 'full':
          matchesFilter = (platoon.occupancy || platoon._count?.allocations || 0) >= (platoon.capacity || 50)
          break
        case 'available':
          matchesFilter = (platoon.occupancy || platoon._count?.allocations || 0) < (platoon.capacity || 50) && platoon.isActive
          break
        default:
          matchesFilter = true
      }

      return matchesSearch && matchesFilter
    })
  }, [platoons, searchTerm, filterStatus])

  // Memoized pagination calculations
  const paginatedPlatoons = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage
    const endIndex = startIndex + pagination.itemsPerPage
    return filteredPlatoons.slice(startIndex, endIndex)
  }, [filteredPlatoons, pagination.currentPage, pagination.itemsPerPage])

  const handleAutoAllocate = async () => {
    if (platoons.length === 0) {
      toast({ title: 'Error', description: 'Please create at least one platoon before auto-allocating', variant: 'destructive' })
      return
    }

    if (stats?.unallocatedRegistrations === 0) {
      toast({ title: 'Error', description: 'No unallocated participants found', variant: 'destructive' })
      return
    }

    setAutoAllocating(true)

    try {
      const activePlatoonIds = platoons.filter(p => p.isActive).map(p => p.id)

      const response = await fetch('/api/admin/platoons/auto-allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platoonIds: activePlatoonIds })
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: 'Success', description: data.message })
        fetchPlatoonData()
        fetchUnallocatedParticipants()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to auto-allocate participants', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to auto-allocate participants', variant: 'destructive' })
    } finally {
      setAutoAllocating(false)
    }
  }

  return (
    <AdminLayoutNew
      title="Platoons Management"
      description="Organize participants into balanced platoons for activities and events"
    >
      {/* Stats Cards */}
      <div className="mb-8">
        <PlatoonStatsCards
          stats={{
            totalRegistrations: stats?.totalRegistrations || 0,
            allocatedRegistrations: stats?.allocatedRegistrations || 0,
            unallocatedRegistrations: stats?.unallocatedRegistrations || 0,
            allocationRate: stats?.allocationRate || 0,
            totalPlatoons: stats?.totalPlatoons || 0,
            activePlatoons: stats?.activePlatoons || 0,
            totalCapacity: stats?.totalCapacity || 0,
            occupiedSpaces: stats?.occupiedSpaces || 0,
            availableSpaces: stats?.availableSpaces || 0,
            platoonOccupancyRate: stats?.platoonOccupancyRate || 0
          }}
          loading={isLoading && !initialLoadComplete}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700 h-12 sm:h-10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Platoon
        </Button>

        <Button
          onClick={handleAutoAllocate}
          variant="outline"
          className="font-apercu-medium h-12 sm:h-10 text-sm"
          disabled={autoAllocating || platoons.length === 0 || stats?.unallocatedRegistrations === 0}
        >
          {autoAllocating ? (
            <div className="h-5 w-5 sm:h-4 sm:w-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Shuffle className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
          )}
          Auto Allocate Participants
        </Button>

        <Button
          variant="outline"
          className="font-apercu-medium border-green-200 text-green-700 hover:bg-green-50 h-12 sm:h-10 text-sm"
          disabled={unallocatedParticipants.length === 0}
        >
          <UserPlus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
          Manual Allocation
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <PlatoonSearchExport
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          totalResults={filteredPlatoons.length}
          loading={isLoading}
        />
      </div>

      <div className="space-y-6">
        {/* Platoons Section */}
        <Card>
          <div className="p-6">
            {paginatedPlatoons.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-apercu-medium text-gray-900 mb-2">
                  {filteredPlatoons.length === 0 && platoons.length > 0
                    ? 'No platoons match your search'
                    : 'No Platoons Created'
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {filteredPlatoons.length === 0 && platoons.length > 0
                    ? 'Try adjusting your search terms or filters.'
                    : 'Create your first platoon to start organizing participants.'
                  }
                </p>
                {filteredPlatoons.length === 0 && platoons.length === 0 && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Platoon
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {paginatedPlatoons.map((platoon) => (
                    <PlatoonCard
                      key={platoon.id}
                      platoon={platoon}
                      onView={(platoon) => {
                        toast({ title: 'Info', description: 'View platoon details - Coming soon' })
                      }}
                      onEdit={(platoon) => {
                        toast({ title: 'Info', description: 'Edit platoon - Coming soon' })
                      }}
                      onDelete={(platoon) => {
                        toast({ title: 'Info', description: 'Delete platoon - Coming soon' })
                      }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
                    totalItems={filteredPlatoons.length}
                    itemsPerPage={pagination.itemsPerPage}
                  />
                )}
              </>
            )}
          </div>
        </Card>

        {/* Unallocated Participants Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-apercu-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                Unallocated Participants ({stats?.unallocatedRegistrations || 0})
              </h3>
            </div>
            {unallocatedParticipants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-apercu-medium text-gray-900 mb-2">
                  All Participants Allocated
                </h3>
                <p className="text-gray-600">
                  All verified participants have been allocated to platoons.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {unallocatedParticipants.map((participant) => (
                    <Card key={participant.id} className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-apercu-medium text-gray-900 truncate">
                              {capitalizeName(participant.fullName)}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {participant.gender}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">Age: {participant.age}</p>
                          <p className="text-sm text-gray-600 truncate">{participant.emailAddress}</p>
                          <p className="text-sm text-gray-600">{participant.phoneNumber}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {unallocatedPagination.totalPages > 1 && (
                  <PaginationControls
                    currentPage={unallocatedPagination.currentPage}
                    totalPages={unallocatedPagination.totalPages}
                    onPageChange={(page) => setUnallocatedPagination(prev => ({ ...prev, currentPage: page }))}
                    totalItems={unallocatedParticipants.length}
                    itemsPerPage={unallocatedPagination.itemsPerPage}
                  />
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Create Platoon Modal */}
      <CreatePlatoonModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchPlatoonData()
          fetchUnallocatedParticipants()
        }}
      />
    </AdminLayoutNew>
  )
}

// Wrapper component with provider (like accommodations)
export default function PlatoonsPage() {
  return <PlatoonsPageContent />
}

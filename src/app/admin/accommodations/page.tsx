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

import { RoomCard } from '@/components/admin/RoomCard'
import { RoomSetupModal } from '@/components/admin/RoomSetupModal'
import { AllocationSetupModal } from '@/components/admin/AllocationSetupModal'
import { AccommodationSearchExport } from '@/components/admin/AccommodationSearchExport'
import { PersonPreviewModal } from '@/components/admin/PersonPreviewModal'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { GenderTabs, GenderTabContent } from '@/components/ui/gender-tabs'
import { ManualAllocationModal } from '@/components/admin/ManualAllocationModal'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

import { AccommodationUpdatesProvider, useAccommodationUpdates, useAccommodationRefresh } from '@/contexts/AccommodationUpdatesContext'
import { AccommodationStatsCards } from '@/components/admin/AccommodationStatsCards'
import {
  Users,
  Plus,
  Shuffle,
  UserPlus,
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

interface Room {
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

function AccommodationsPageContent() {
  const { t } = useTranslation()
  const { triggerStatsUpdate } = useAccommodationUpdates()
  const [stats, setStats] = useState<AccommodationStats | null>(null)
  const [roomsByGender, setRoomsByGender] = useState<Record<string, Room[]>>({})
  const [unallocatedByGender, setUnallocatedByGender] = useState<Record<string, Array<{
    id: string
    fullName: string
    dateOfBirth: string
    gender: string
    emailAddress: string
  }>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [unallocatedLoading, setUnallocatedLoading] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [allocationGender, setAllocationGender] = useState<'Male' | 'Female' | 'All'>('All')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [defaultGender, setDefaultGender] = useState<'Male' | 'Female' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPersonPreview, setShowPersonPreview] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [forceButtonRefresh, setForceButtonRefresh] = useState(0)
  const [roomUpdateTrigger, setRoomUpdateTrigger] = useState<Record<string, number>>({})
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showManualAllocationModal, setShowManualAllocationModal] = useState(false)
  const [activeGenderTab, setActiveGenderTab] = useState<'Male' | 'Female'>('Male')
  const [showEmptyAllModal, setShowEmptyAllModal] = useState(false)
  const [emptyingAllRooms, setEmptyingAllRooms] = useState(false)
  const [emptyAllGender, setEmptyAllGender] = useState<'Male' | 'Female'>('Male')


  // Room search and filter states - separate for each gender tab
  const [maleRoomSearchTerm, setMaleRoomSearchTerm] = useState('')
  const [maleRoomFilter, setMaleRoomFilter] = useState<'all' | 'active' | 'inactive' | 'full' | 'available'>('all')
  const [femaleRoomSearchTerm, setFemaleRoomSearchTerm] = useState('')
  const [femaleRoomFilter, setFemaleRoomFilter] = useState<'all' | 'active' | 'inactive' | 'full' | 'available'>('all')

  // Pagination state - 8 rooms per page

  const [malePagination, setMalePagination] = useState({ currentPage: 1, itemsPerPage: 8 })
  const [femalePagination, setFemalePagination] = useState({ currentPage: 1, itemsPerPage: 8 })

  // Pagination for unallocated participants (6 per page)
  const [maleUnallocatedPagination, setMaleUnallocatedPagination] = useState({ currentPage: 1, itemsPerPage: 6 })
  const [femaleUnallocatedPagination, setFemaleUnallocatedPagination] = useState({ currentPage: 1, itemsPerPage: 6 })

  const { currentUser, isRole } = useUser()
  const { success: showSuccess, error: showError } = useToast()

  // Memoized permission helpers
  const permissions = useMemo(() => {
    const userRole = currentUser?.role?.name || ''
    return {
      canExport: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canAutoAllocate: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canEditRooms: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canCreateRooms: ['Super Admin', 'Admin', 'Manager'].includes(userRole),
      canViewPersonDetails: ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(userRole),
      canRemoveAllocations: ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(userRole),
      canEmptyAllRooms: ['Super Admin', 'Admin', 'Manager'].includes(userRole), // Staff cannot empty all rooms
      isViewerOnly: isRole('Viewer')
    }
  }, [currentUser?.role?.name, isRole])

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
      console.log('🏠 Accommodation data fetched successfully at', new Date().toISOString())
      console.log('📊 Accommodation Stats Received:', {
        totalRegistrations: data.stats?.totalRegistrations,
        verifiedRegistrations: data.stats?.verifiedRegistrations,
        allocatedRegistrations: data.stats?.allocatedRegistrations,
        unallocatedRegistrations: data.stats?.unallocatedRegistrations,
        occupiedSpaces: data.stats?.occupiedSpaces,
        totalCapacity: data.stats?.totalCapacity,
        roomOccupancyRate: data.stats?.roomOccupancyRate,
        timestamp: new Date().toISOString()
      })

      // Batch state updates for better performance
      const previousUnallocated = stats?.unallocatedRegistrations || 0
      const newUnallocated = data.stats?.unallocatedRegistrations || 0

      if (previousUnallocated !== newUnallocated) {
        console.log('🔄 Unallocated count changed:', {
          from: previousUnallocated,
          to: newUnallocated,
          difference: newUnallocated - previousUnallocated,
          timestamp: new Date().toISOString()
        })
      }

      setStats(data.stats)

      const newRoomsByGender = data.roomsByGender || {}
      setRoomsByGender(newRoomsByGender)
      setUnallocatedByGender(data.unallocatedByGender || {})

      // Adjust pagination if current page is now empty
      const maleRooms = newRoomsByGender.Male || []
      const femaleRooms = newRoomsByGender.Female || []

      const maxMalePage = Math.max(1, Math.ceil(maleRooms.length / 8)) // Use fixed value instead of state
      const maxFemalePage = Math.max(1, Math.ceil(femaleRooms.length / 8)) // Use fixed value instead of state

      setMalePagination(prev => ({
        ...prev,
        currentPage: prev.currentPage > maxMalePage ? maxMalePage : prev.currentPage
      }))

      setFemalePagination(prev => ({
        ...prev,
        currentPage: prev.currentPage > maxFemalePage ? maxFemalePage : prev.currentPage
      }))
    } catch (error) {
      console.error('Error fetching accommodation data:', error)
      // Don't show error modal during normal operation - just log the error
      // Only show error for critical failures that prevent the app from working
      if (error instanceof Error && error.message.includes('Network')) {
        const errorMessage = parseApiError(error)
        setError(errorMessage.description)
      }
    } finally {
      setIsLoading(false)
      console.timeEnd('fetch-accommodation-data')
    }
  }, []) // Remove dependencies to prevent re-renders

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

  // Fast room card refresh function for individual room updates
  const refreshSingleRoom = useCallback((roomId: string) => {
    // Trigger immediate room-specific update
    setRoomUpdateTrigger(prev => ({
      ...prev,
      [roomId]: (prev[roomId] || 0) + 1
    }))

    // Clear any pending timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    // Force immediate state updates with flushSync for instant UI response
    flushSync(() => {
      setForceButtonRefresh(prev => prev + 1)
      setRefreshTrigger(prev => prev + 1)
    })

    // Immediate data refresh
    fetchAccommodationData()

    // Additional refresh to ensure data consistency
    updateTimeoutRef.current = setTimeout(() => {
      fetchAccommodationData()
      setRoomUpdateTrigger(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || 0) + 1
      }))
    }, 100)
  }, [fetchAccommodationData, setRoomUpdateTrigger])

  // Additional real-time listener for immediate stats updates
  const { onUpdate } = useAccommodationUpdates()
  useEffect(() => {
    const unsubscribe = onUpdate((update) => {
      console.log('🔄 Accommodation update received:', update.type, 'at', new Date().toISOString())

      // Force immediate refresh for stats updates (verification/unverification)
      if (update.type === 'stats_update') {
        console.log('📊 Stats update detected - triggering fast refresh')
        console.time('accommodations-stats-update')

        // Use general data refresh for stats updates
        fetchAccommodationData()

        setTimeout(() => {
          console.timeEnd('accommodations-stats-update')
        }, 300)
      }
    })

    return unsubscribe
  }, [onUpdate, fetchAccommodationData])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const handleCreateRoom = () => {
    setSelectedRoom(null)
    setDefaultGender(null)
    setShowRoomModal(true)
  }

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room)
    setShowRoomModal(true)
  }

  const handleRoomSaved = () => {
    const isEditing = selectedRoom !== null
    const roomId = selectedRoom?.id

    setShowRoomModal(false)
    setSelectedRoom(null)
    setDefaultGender(null)

    if (isEditing && roomId) {
      // Fast refresh for specific room when editing with multiple updates
      refreshSingleRoom(roomId)

      // Additional immediate refresh to ensure UI updates
      setTimeout(() => {
        refreshSingleRoom(roomId)
      }, 50)
    } else {
      // Full refresh when creating new room
      fetchAccommodationData()

      // Additional refresh for new room creation
      setTimeout(() => {
        fetchAccommodationData()
      }, 100)
    }

    // Trigger real-time updates for other components
    triggerStatsUpdate()
    showToast(isEditing ? 'Room Updated Successfully' : 'Room Created Successfully', 'success')
  }

  const handleRoomError = (error: string) => {
    // Handle specific room creation errors
    if (error.includes('already exists') || error.includes('duplicate')) {
      showError('Room Creation Failed', 'A room with this name already exists. Please choose a different name.')
    } else if (error.includes('permission') || error.includes('Insufficient')) {
      showError('Permission Denied', 'You do not have permission to create rooms. Please contact an administrator.')
    } else if (error.includes('capacity')) {
      showError('Invalid Capacity', 'Room capacity must be a positive number.')
    } else if (error.includes('gender')) {
      showError('Invalid Gender', 'Please select a valid gender for the room.')
    } else if (error.includes('name')) {
      showError('Invalid Room Name', 'Please provide a valid room name.')
    } else {
      showError('Room Creation Failed', error || 'An unexpected error occurred while creating the room. Please try again.')
    }
  }

  const handleAutoAllocate = (gender: 'Male' | 'Female' | 'All' = 'All') => {
    // Check if rooms exist for the selected gender before opening modal
    const maleRoomsExist = (roomsByGender.Male?.length || 0) > 0
    const femaleRoomsExist = (roomsByGender.Female?.length || 0) > 0

    if (gender === 'Male' && !maleRoomsExist) {
      showToast('No Male rooms have been created. Please create Male rooms first.', 'error')
      return
    }

    if (gender === 'Female' && !femaleRoomsExist) {
      showToast('No Female rooms have been created. Please create Female rooms first.', 'error')
      return
    }

    if (gender === 'All' && !maleRoomsExist && !femaleRoomsExist) {
      showToast('No rooms have been created for either Male or Female. Please create rooms first.', 'error')
      return
    }

    if (gender === 'All' && !maleRoomsExist) {
      showToast('No Male rooms have been created. Only Female participants can be allocated.', 'warning')
    }

    if (gender === 'All' && !femaleRoomsExist) {
      showToast('No Female rooms have been created. Only Male participants can be allocated.', 'warning')
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

    // Add email results if available
    if (result.emailResults) {
      // Handle both old structure (direct properties) and new structure (summary object)
      const emailData = (result.emailResults as any).summary || result.emailResults
      const emailsSent = (emailData as any).successful || (emailData as any).emailsSent || 0
      const emailsFailed = (emailData as any).failed || (emailData as any).emailsFailed || 0
      const totalEmails = (emailData as any).total || (emailData as any).totalEmails || 0
      const status = (emailData as any).status

      if (totalEmails > 0) {
        if (status === 'sending') {
          message += `. Allocation emails are being sent in the background`
        } else {
          message += `. Room details sent to ${emailsSent} registrants`
          if (emailsFailed > 0) {
            message += ` (${emailsFailed} emails failed)`
          }
        }
      }
    }

    showToast(message, 'success')
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
    setUnallocatedLoading(true)
    fetchAccommodationData().finally(() => setUnallocatedLoading(false))
    setRefreshTrigger(prev => prev + 1)
  }

  const handleManualAllocate = () => {
    setShowManualAllocationModal(true)
  }

  const handleManualAllocationSuccess = () => {
    setShowManualAllocationModal(false)
    setUnallocatedLoading(true)
    fetchAccommodationData().finally(() => setUnallocatedLoading(false))
    setRefreshTrigger(prev => prev + 1)
    showToast('Manual allocation successful', 'success')
  }

  // Settings functionality removed

  const handleEmptyAllRooms = (gender: 'Male' | 'Female') => {
    // Check if there are any allocated participants in the specified gender
    const genderRooms = roomsByGender[gender] || []
    const totalOccupancy = genderRooms.reduce((total, room) => total + room.occupancy, 0)

    if (totalOccupancy === 0) {
      showToast(`All ${gender.toLowerCase()} rooms are already empty`, 'info')
      return
    }

    setEmptyAllGender(gender)
    setShowEmptyAllModal(true)
  }

  const handleConfirmEmptyAllRooms = async () => {
    try {
      setEmptyingAllRooms(true)
      setUnallocatedLoading(true)

      const response = await fetch('/api/admin/accommodations/empty-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gender: emptyAllGender
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Only show specific error messages, not generic ones
        if (response.status === 403) {
          showToast('You do not have permission to empty all rooms', 'error')
        } else if (response.status === 400) {
          showToast(errorData.error || 'Invalid request', 'error')
        } else {
          console.error('Empty all rooms error:', errorData)
          // Don't show generic error toast during normal operation
        }
        return
      }

      const result = await response.json()

      // Show success message
      showToast(
        `Successfully emptied all ${emptyAllGender.toLowerCase()} rooms. ${result.removedAllocations} participants returned to unallocated list.`,
        'success'
      )

      // Trigger real-time updates
      triggerStatsUpdate()

      // Refresh data in background (don't await)
      fetchAccommodationData().finally(() => setUnallocatedLoading(false))
      setRefreshTrigger(prev => prev + 1)

    } catch (error) {
      console.error('Error emptying all rooms:', error)
      // Only show error toast for network/connection issues, not server errors
      if (error instanceof Error && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        showToast('Connection error. Please check your internet connection.', 'error')
      }
      setUnallocatedLoading(false)
    } finally {
      // Always close modal and reset state
      setEmptyingAllRooms(false)
      setShowEmptyAllModal(false)
    }
  }



  // Memoized room filtering
  const filteredMaleRooms = useMemo(() => {
    const rooms = roomsByGender.Male || []
    return rooms.filter(room => {
      // Search filter
      const matchesSearch = room.name.toLowerCase().includes(maleRoomSearchTerm.toLowerCase()) ||
                           (room.description || '').toLowerCase().includes(maleRoomSearchTerm.toLowerCase()) ||
                           room.allocations.some(allocation =>
                             allocation.registration.fullName.toLowerCase().includes(maleRoomSearchTerm.toLowerCase())
                           )

      // Status filter
      let matchesFilter = true
      switch (maleRoomFilter) {
        case 'active':
          matchesFilter = room.isActive
          break
        case 'inactive':
          matchesFilter = !room.isActive
          break
        case 'full':
          matchesFilter = room.occupancy >= room.capacity
          break
        case 'available':
          matchesFilter = room.occupancy < room.capacity && room.isActive
          break
        default:
          matchesFilter = true
      }

      return matchesSearch && matchesFilter
    })
  }, [roomsByGender.Male, maleRoomSearchTerm, maleRoomFilter])

  const filteredFemaleRooms = useMemo(() => {
    const rooms = roomsByGender.Female || []
    return rooms.filter(room => {
      // Search filter
      const matchesSearch = room.name.toLowerCase().includes(femaleRoomSearchTerm.toLowerCase()) ||
                           (room.description || '').toLowerCase().includes(femaleRoomSearchTerm.toLowerCase()) ||
                           room.allocations.some(allocation =>
                             allocation.registration.fullName.toLowerCase().includes(femaleRoomSearchTerm.toLowerCase())
                           )

      // Status filter
      let matchesFilter = true
      switch (femaleRoomFilter) {
        case 'active':
          matchesFilter = room.isActive
          break
        case 'inactive':
          matchesFilter = !room.isActive
          break
        case 'full':
          matchesFilter = room.occupancy >= room.capacity
          break
        case 'available':
          matchesFilter = room.occupancy < room.capacity && room.isActive
          break
        default:
          matchesFilter = true
      }

      return matchesSearch && matchesFilter
    })
  }, [roomsByGender.Female, femaleRoomSearchTerm, femaleRoomFilter])

  // Memoized pagination calculations
  const paginatedMaleRooms = useMemo(() => {
    const startIndex = (malePagination.currentPage - 1) * malePagination.itemsPerPage
    const endIndex = startIndex + malePagination.itemsPerPage
    return filteredMaleRooms.slice(startIndex, endIndex)
  }, [filteredMaleRooms, malePagination.currentPage, malePagination.itemsPerPage])

  const paginatedFemaleRooms = useMemo(() => {
    const startIndex = (femalePagination.currentPage - 1) * femalePagination.itemsPerPage
    const endIndex = startIndex + femalePagination.itemsPerPage
    return filteredFemaleRooms.slice(startIndex, endIndex)
  }, [filteredFemaleRooms, femalePagination.currentPage, femalePagination.itemsPerPage])

  // Memoized pagination for unallocated participants
  const paginatedMaleUnallocated = useMemo(() => {
    const unallocated = unallocatedByGender.Male || []
    const startIndex = (maleUnallocatedPagination.currentPage - 1) * maleUnallocatedPagination.itemsPerPage
    const endIndex = startIndex + maleUnallocatedPagination.itemsPerPage
    return unallocated.slice(startIndex, endIndex)
  }, [unallocatedByGender.Male, maleUnallocatedPagination.currentPage, maleUnallocatedPagination.itemsPerPage])

  const paginatedFemaleUnallocated = useMemo(() => {
    const unallocated = unallocatedByGender.Female || []
    const startIndex = (femaleUnallocatedPagination.currentPage - 1) * femaleUnallocatedPagination.itemsPerPage
    const endIndex = startIndex + femaleUnallocatedPagination.itemsPerPage
    return unallocated.slice(startIndex, endIndex)
  }, [unallocatedByGender.Female, femaleUnallocatedPagination.currentPage, femaleUnallocatedPagination.itemsPerPage])

  const paginationInfo = useMemo(() => ({
    male: {
      totalPages: Math.ceil(filteredMaleRooms.length / malePagination.itemsPerPage),
      totalItems: filteredMaleRooms.length,
      originalTotal: roomsByGender.Male?.length || 0
    },
    female: {
      totalPages: Math.ceil(filteredFemaleRooms.length / femalePagination.itemsPerPage),
      totalItems: filteredFemaleRooms.length,
      originalTotal: roomsByGender.Female?.length || 0
    },
    maleUnallocated: {
      totalPages: Math.ceil((unallocatedByGender.Male?.length || 0) / maleUnallocatedPagination.itemsPerPage),
      totalItems: unallocatedByGender.Male?.length || 0,
      currentPage: maleUnallocatedPagination.currentPage,
      itemsPerPage: maleUnallocatedPagination.itemsPerPage
    },
    femaleUnallocated: {
      totalPages: Math.ceil((unallocatedByGender.Female?.length || 0) / femaleUnallocatedPagination.itemsPerPage),
      totalItems: unallocatedByGender.Female?.length || 0,
      currentPage: femaleUnallocatedPagination.currentPage,
      itemsPerPage: femaleUnallocatedPagination.itemsPerPage
    }
  }), [
    filteredMaleRooms.length,
    filteredFemaleRooms.length,
    malePagination.itemsPerPage,
    femalePagination.itemsPerPage,
    roomsByGender.Male?.length,
    roomsByGender.Female?.length,
    unallocatedByGender.Male?.length,
    unallocatedByGender.Female?.length,
    maleUnallocatedPagination.currentPage,
    maleUnallocatedPagination.itemsPerPage,
    femaleUnallocatedPagination.currentPage,
    femaleUnallocatedPagination.itemsPerPage
  ])



  // Computed values for allocation button state and messages
  const allocationButtonState = useMemo(() => {
    const maleRoomsExist = (roomsByGender.Male?.length || 0) > 0
    const femaleRoomsExist = (roomsByGender.Female?.length || 0) > 0
    const maleUnallocated = (unallocatedByGender.Male?.length || 0) > 0
    const femaleUnallocated = (unallocatedByGender.Female?.length || 0) > 0
    const hasUnallocated = stats?.unallocatedRegistrations || 0 > 0

    console.log('🔄 Allocation button state recalculated:', {
      maleRoomsExist,
      femaleRoomsExist,
      maleUnallocated,
      femaleUnallocated,
      hasUnallocated,
      statsUnallocated: stats?.unallocatedRegistrations
    })

    // Case 1: No rooms for both genders (only show after loading is complete)
    if (!maleRoomsExist && !femaleRoomsExist && !isLoading) {
      return {
        disabled: true,
        message: 'No Rooms for Allocation',
        description: 'Create Rooms for Male and Female participants to enable Allocation'
      }
    }

    // Case 2: Only male rooms exist, but female participants need allocation
    if (maleRoomsExist && !femaleRoomsExist && femaleUnallocated) {
      return {
        disabled: false,
        message: 'Female Rooms Required',
        description: 'Create Female rooms to allocate all participants'
      }
    }

    // Case 3: Only female rooms exist, but male participants need allocation
    if (!maleRoomsExist && femaleRoomsExist && maleUnallocated) {
      return {
        disabled: false,
        message: 'Male Rooms Required',
        description: 'Create Male rooms to allocate all participants'
      }
    }

    // Case 4: Both genders have rooms OR only one gender has unallocated participants
    return {
      disabled: !hasUnallocated,
      message: null,
      description: null
    }
  }, [roomsByGender, unallocatedByGender, stats?.unallocatedRegistrations, forceButtonRefresh])

  const handlePageChange = (gender: 'Male' | 'Female', newPage: number) => {
    if (gender === 'Male') {
      setMalePagination(prev => ({ ...prev, currentPage: newPage }))
    } else {
      setFemalePagination(prev => ({ ...prev, currentPage: newPage }))
    }
  }

  // Reset pagination when filters change
  useEffect(() => {
    setMalePagination(prev => ({ ...prev, currentPage: 1 }))
    setMaleUnallocatedPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [maleRoomSearchTerm, maleRoomFilter])

  useEffect(() => {
    setFemalePagination(prev => ({ ...prev, currentPage: 1 }))
    setFemaleUnallocatedPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [femaleRoomSearchTerm, femaleRoomFilter])

  // Computed values for empty all button state
  const emptyAllButtonState = useMemo(() => {
    const maleRooms = roomsByGender.Male || []
    const femaleRooms = roomsByGender.Female || []

    const maleOccupancy = maleRooms.reduce((total, room) => total + room.occupancy, 0)
    const femaleOccupancy = femaleRooms.reduce((total, room) => total + room.occupancy, 0)

    return {
      maleDisabled: maleOccupancy === 0,
      femaleDisabled: femaleOccupancy === 0,
      maleOccupancy,
      femaleOccupancy
    }
  }, [roomsByGender])

  // Remove loading screen - page shows immediately with progressive data loading

  // Check permissions - Allow all roles including Staff and Viewer
  const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer']
  if (currentUser && !allowedRoles.includes(currentUser.role?.name || '')) {
    return (
      <AdminLayoutNew title={t('page.accommodations.title')} description={t('page.accommodations.description')}>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew title={t('page.accommodations.title')} description={t('page.accommodations.description')}>
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
        {!permissions.isViewerOnly && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {permissions.canCreateRooms && (
              <Button
                onClick={handleCreateRoom}
                className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700 h-12 sm:h-10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Room
              </Button>
            )}

            {permissions.canAutoAllocate && (
              <Button
                onClick={() => handleAutoAllocate('All')}
                variant="outline"
                className="font-apercu-medium h-12 sm:h-10 text-sm"
                disabled={allocationButtonState.disabled}
              >
                <Shuffle className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                Auto Allocate Rooms
              </Button>
            )}

            {permissions.canAutoAllocate && (
              <Button
                onClick={handleManualAllocate}
                variant="outline"
                className="font-apercu-medium border-green-200 text-green-700 hover:bg-green-50 h-12 sm:h-10 text-sm"
                disabled={allocationButtonState.disabled}
              >
                <UserPlus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                Manual Allocation
              </Button>
            )}

            {/* Settings button removed */}
          </div>
        )}

        {/* Allocation Status Message - Mobile Optimized */}
        {allocationButtonState.message && (
          <div className="mb-4 sm:mb-6">
            <div className={`p-3 sm:p-4 rounded-lg border ${
              allocationButtonState.disabled
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start sm:items-center space-x-3">
                <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  allocationButtonState.disabled
                    ? 'bg-red-100'
                    : 'bg-amber-100'
                }`}>
                  <Home className={`h-3 w-3 sm:h-4 sm:w-4 ${
                    allocationButtonState.disabled
                      ? 'text-red-600'
                      : 'text-amber-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-apercu-bold text-xs sm:text-sm leading-tight ${
                    allocationButtonState.disabled
                      ? 'text-red-800'
                      : 'text-amber-800'
                  }`}>
                    {allocationButtonState.message}
                  </h3>
                  <p className={`font-apercu-regular text-xs mt-1 leading-relaxed ${
                    allocationButtonState.disabled
                      ? 'text-red-600'
                      : 'text-amber-600'
                  }`}>
                    {allocationButtonState.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Export */}
        <AccommodationSearchExport
          onPersonSelectAction={handlePersonPreview}
          refreshTrigger={refreshTrigger}
          canExport={permissions.canExport}
          canViewPersonDetails={permissions.canViewPersonDetails}
          isViewerOnly={permissions.isViewerOnly}
        />



        {/* Rooms by Gender - Beautiful Tabs */}
        <div className="mt-8 mb-8">
          <div className="mb-6">
            <GenderTabs
              activeTab={activeGenderTab}
              onTabChangeAction={setActiveGenderTab}
              maleCount={roomsByGender.Male?.length || 0}
              femaleCount={roomsByGender.Female?.length || 0}
              maleUnallocated={unallocatedByGender.Male?.length || 0}
              femaleUnallocated={unallocatedByGender.Female?.length || 0}
              className="max-w-2xl mx-auto"
            />
          </div>



          {/* Male Rooms Tab Content */}
          {activeGenderTab === 'Male' && (
            <GenderTabContent gender="Male" className="space-y-6">
              {/* Male Unallocated Registrations - Optimized for Small Phones */}
              {unallocatedByGender.Male && unallocatedByGender.Male.length > 0 && (
                <div className="mb-3 sm:mb-6 pb-3 sm:pb-6 border-b border-blue-200">
                  <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-apercu-bold text-sm sm:text-lg lg:text-xl text-blue-900 leading-tight">Unallocated Male Participants</h3>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-apercu-medium text-xs">
                        {unallocatedByGender.Male.length} unallocated
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {permissions.canAutoAllocate && unallocatedByGender.Male.length > 0 && (roomsByGender.Male?.length || 0) > 0 && (
                        <Button
                          onClick={() => handleAutoAllocate('Male')}
                          size="sm"
                          className="font-apercu-medium bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          <Shuffle className="h-3 w-3 mr-1" />
                          Auto Allocate Males
                        </Button>
                      )}

                      {/* Empty All Male Rooms Button - Always visible, enabled only when participants allocated */}
                      {permissions.canEmptyAllRooms && (
                        <Button
                          onClick={() => handleEmptyAllRooms('Male')}
                          size="sm"
                          className="font-apercu-medium bg-red-600 text-white hover:bg-red-700 border-red-600 hover:border-red-700 transition-colors text-xs disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed"
                          disabled={emptyingAllRooms || isLoading || emptyAllButtonState.maleDisabled}
                        >
                          <Trash2 className="h-3 w-3 mr-1 text-white" />
                          <span className="text-white">
                            {emptyAllButtonState.maleDisabled ? 'All Empty' : 'Empty All'}
                          </span>
                        </Button>
                      )}

                    </div>
                  </div>

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
                      paginatedMaleUnallocated.map((reg) => (
                        <Card key={reg.id} className="p-1.5 sm:p-3 md:p-4 bg-white border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:shadow-sm">
                          <div className="flex flex-col space-y-1 sm:space-y-2">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="h-3 w-3 sm:h-5 sm:w-5 md:h-6 md:w-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <Users className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-white" />
                              </div>
                              <span className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate leading-tight">{capitalizeName(reg.fullName)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-apercu-regular text-xs text-gray-500 truncate">
                                {new Date().getFullYear() - new Date(reg.dateOfBirth).getFullYear()} yrs
                              </span>
                              {permissions.canViewPersonDetails && (
                                <button
                                  onClick={() => handlePersonPreview(reg.id)}
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

                  {/* Pagination for Male Unallocated Participants - Mobile Optimized */}
                  {paginationInfo.maleUnallocated.totalPages > 1 && (
                    <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-blue-100">
                      <div className="flex items-center justify-center sm:justify-start">
                        <span className="font-apercu-regular text-xs text-blue-700 text-center sm:text-left">
                          {((maleUnallocatedPagination.currentPage - 1) * maleUnallocatedPagination.itemsPerPage) + 1}-{Math.min(maleUnallocatedPagination.currentPage * maleUnallocatedPagination.itemsPerPage, paginationInfo.maleUnallocated.totalItems)} of {paginationInfo.maleUnallocated.totalItems}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setMaleUnallocatedPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                          disabled={maleUnallocatedPagination.currentPage === 1}
                          className="px-2 py-1 text-xs font-apercu-medium text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                        >
                          ‹ Prev
                        </button>
                        <span className="px-2 py-1 text-xs font-apercu-medium text-blue-900 bg-blue-100 border border-blue-200 rounded min-w-[40px] text-center">
                          {maleUnallocatedPagination.currentPage}/{paginationInfo.maleUnallocated.totalPages}
                        </span>
                        <button
                          onClick={() => setMaleUnallocatedPagination(prev => ({ ...prev, currentPage: Math.min(paginationInfo.maleUnallocated.totalPages, prev.currentPage + 1) }))}
                          disabled={maleUnallocatedPagination.currentPage === paginationInfo.maleUnallocated.totalPages}
                          className="px-2 py-1 text-xs font-apercu-medium text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                        >
                          Next ›
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Room Search and Filters - Mobile Optimized */}
              <div className="bg-gradient-to-r from-blue-500/5 to-cyan-600/5 border border-blue-100 rounded-lg p-2 sm:p-3 md:p-4 lg:p-6">
                <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between md:space-x-3">
                  <div className="flex-1 md:max-w-md">
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-blue-500" />
                      <input
                        type="text"
                        placeholder="Search rooms..."
                        value={maleRoomSearchTerm}
                        onChange={(e) => setMaleRoomSearchTerm(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 md:py-2.5 border border-blue-200 rounded-md sm:rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base bg-white/50"
                      />
                      {maleRoomSearchTerm && (
                        <button
                          onClick={() => setMaleRoomSearchTerm('')}
                          className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-3 sm:h-4 w-3 sm:w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:space-x-2">
                    <div className="relative">
                      <Filter className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-blue-500" />
                      <select
                        value={maleRoomFilter}
                        onChange={(e) => setMaleRoomFilter(e.target.value as 'all' | 'active' | 'inactive' | 'full' | 'available')}
                        className="w-full md:w-auto pl-8 sm:pl-10 pr-6 sm:pr-8 py-2 sm:py-2.5 md:py-2.5 border border-blue-200 rounded-md sm:rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base bg-white/50"
                      >
                        <option value="all">All Rooms</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                        <option value="full">Full Rooms</option>
                        <option value="available">Available Rooms</option>
                      </select>
                    </div>


                  </div>
                </div>

                {/* Results count */}
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-100">
                  <p className="font-apercu-regular text-xs text-blue-700 text-center sm:text-left">
                    {formatNumber(filteredMaleRooms.length)} of {formatNumber(paginationInfo.male.originalTotal)} rooms
                    {maleRoomSearchTerm && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • &quot;{maleRoomSearchTerm}&quot;
                      </span>
                    )}
                    {maleRoomFilter !== 'all' && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • {maleRoomFilter.charAt(0).toUpperCase() + maleRoomFilter.slice(1)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Male Rooms Required Message - Mobile Optimized */}
              {unallocatedByGender.Male && unallocatedByGender.Male.length > 0 && (roomsByGender.Male?.length || 0) === 0 && (
                <div className="mb-4 sm:mb-6">
                  <div className="p-3 sm:p-4 rounded-lg border bg-white border-blue-200">
                    <div className="flex items-start sm:items-center space-x-3">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center bg-blue-100 flex-shrink-0">
                        <Home className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0 ">
                        <h3 className="font-apercu-bold text-xs sm:text-sm text-blue-800 leading-tight">
                          Male Rooms Required for Allocation
                        </h3>
                        <p className="font-apercu-regular text-xs mt-1 text-blue-600 leading-relaxed">
                          {unallocatedByGender.Male.length} Male Participants are Waiting for Room Allocation. Create Male rooms to Proceed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}



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
                  paginatedMaleRooms.map((room) => (
                    <RoomCard
                      key={`${room.id}-${roomUpdateTrigger[room.id] || 0}`}
                      room={room}
                      onEdit={handleEditRoom}
                      onRefresh={() => refreshSingleRoom(room.id)}
                      onPersonPreview={handlePersonPreview}
                      canEditRooms={permissions.canEditRooms}
                      canViewPersonDetails={permissions.canViewPersonDetails}
                      canRemoveAllocations={permissions.canRemoveAllocations}
                    />
                  ))
                )}
              </div>

              {paginationInfo.male.totalItems > malePagination.itemsPerPage && (
                <PaginationControls
                  currentPage={malePagination.currentPage}
                  totalPages={paginationInfo.male.totalPages}
                  onPageChange={(page: number) => handlePageChange('Male', page)}
                  totalItems={paginationInfo.male.totalItems}
                  itemsPerPage={malePagination.itemsPerPage}
                  className="pt-4 border-t border-blue-200"
                  theme="blue"
                />
              )}

              {/* No rooms exist at all for Male */}
              {(roomsByGender.Male?.length || 0) === 0 && !isLoading && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Home className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-xl text-blue-700 mb-3">No Male Rooms Created</h3>
                    <p className="font-apercu-regular text-blue-600 mb-6 leading-relaxed">
                      Create rooms to start allocating male participants. You can set capacity, add descriptions, and manage allocations.
                    </p>
                    {permissions.canCreateRooms ? (
                      <Button
                        onClick={() => {
                          setSelectedRoom(null)
                          setDefaultGender('Male')
                          setShowRoomModal(true)
                        }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-apercu-medium px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create First Male Room
                      </Button>
                    ) : (
                      <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                        <p className="font-apercu-medium text-blue-700 text-sm">
                          Contact an administrator to create rooms
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}



              {/* No results message for Male rooms (when rooms exist but filtered out) */}
              {filteredMaleRooms.length === 0 && (roomsByGender.Male?.length || 0) > 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                  <p className="font-apercu-medium text-blue-600">No rooms found</p>
                  <p className="font-apercu-regular text-sm text-blue-500">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              )}


            </GenderTabContent>
          )}

          {/* Female Rooms Tab Content */}
          {activeGenderTab === 'Female' && (
            <GenderTabContent gender="Female" className="space-y-6">
              {/* Female Unallocated Registrations - Optimized for Small Phones */}
              {unallocatedByGender.Female && unallocatedByGender.Female.length > 0 && (
                <div className="mb-3 sm:mb-6 pb-3 sm:pb-6 border-b border-pink-200">
                  <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-apercu-bold text-sm sm:text-lg lg:text-xl text-pink-900 leading-tight">Unallocated Female Participants</h3>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-apercu-medium text-xs">
                        {unallocatedByGender.Female.length} unallocated
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {permissions.canAutoAllocate && unallocatedByGender.Female.length > 0 && (roomsByGender.Female?.length || 0) > 0 && (
                        <Button
                          onClick={() => handleAutoAllocate('Female')}
                          size="sm"
                          className="font-apercu-medium bg-pink-600 hover:bg-pink-700 text-xs"
                        >
                          <Shuffle className="h-3 w-3 mr-1" />
                          Auto Allocate Females
                        </Button>
                      )}

                      {/* Empty All Female Rooms Button - Always visible, enabled only when participants allocated */}
                      {permissions.canEmptyAllRooms && (
                        <Button
                          onClick={() => handleEmptyAllRooms('Female')}
                          size="sm"
                          className="font-apercu-medium bg-red-600 text-white hover:bg-red-700 border-red-600 hover:border-red-700 transition-colors text-xs disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed"
                          disabled={emptyingAllRooms || isLoading || emptyAllButtonState.femaleDisabled}
                        >
                          <Trash2 className="h-3 w-3 mr-1 text-white" />
                          <span className="text-white">
                            {emptyAllButtonState.femaleDisabled ? 'All Empty' : 'Empty All'}
                          </span>
                        </Button>
                      )}

                    </div>
                  </div>

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
                      paginatedFemaleUnallocated.map((reg) => (
                        <Card key={reg.id} className="p-1.5 sm:p-3 md:p-4 bg-white border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:shadow-sm">
                          <div className="flex flex-col space-y-1 sm:space-y-2">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="h-3 w-3 sm:h-5 sm:w-5 md:h-6 md:w-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Users className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-white" />
                              </div>
                              <span className="font-apercu-medium text-xs sm:text-sm text-gray-900 truncate leading-tight">{capitalizeName(reg.fullName)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-apercu-regular text-xs text-gray-500 truncate">
                                {new Date().getFullYear() - new Date(reg.dateOfBirth).getFullYear()} yrs
                              </span>
                              {permissions.canViewPersonDetails && (
                                <button
                                  onClick={() => handlePersonPreview(reg.id)}
                                  className="font-apercu-medium text-xs text-pink-600 hover:text-pink-700 transition-colors flex-shrink-0 px-0.5"
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

                  {/* Pagination for Female Unallocated Participants - Mobile Optimized */}
                  {paginationInfo.femaleUnallocated.totalPages > 1 && (
                    <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-pink-100">
                      <div className="flex items-center justify-center sm:justify-start">
                        <span className="font-apercu-regular text-xs text-pink-700 text-center sm:text-left">
                          {((femaleUnallocatedPagination.currentPage - 1) * femaleUnallocatedPagination.itemsPerPage) + 1}-{Math.min(femaleUnallocatedPagination.currentPage * femaleUnallocatedPagination.itemsPerPage, paginationInfo.femaleUnallocated.totalItems)} of {paginationInfo.femaleUnallocated.totalItems}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setFemaleUnallocatedPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                          disabled={femaleUnallocatedPagination.currentPage === 1}
                          className="px-2 py-1 text-xs font-apercu-medium text-pink-600 bg-white border border-pink-200 rounded hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                        >
                          ‹ Prev
                        </button>
                        <span className="px-2 py-1 text-xs font-apercu-medium text-pink-900 bg-pink-100 border border-pink-200 rounded min-w-[40px] text-center">
                          {femaleUnallocatedPagination.currentPage}/{paginationInfo.femaleUnallocated.totalPages}
                        </span>
                        <button
                          onClick={() => setFemaleUnallocatedPagination(prev => ({ ...prev, currentPage: Math.min(paginationInfo.femaleUnallocated.totalPages, prev.currentPage + 1) }))}
                          disabled={femaleUnallocatedPagination.currentPage === paginationInfo.femaleUnallocated.totalPages}
                          className="px-2 py-1 text-xs font-apercu-medium text-pink-600 bg-white border border-pink-200 rounded hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[50px]"
                        >
                          Next ›
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Room Search and Filters - Mobile Optimized */}
              <div className="bg-gradient-to-r from-pink-500/5 to-rose-600/5 border border-pink-100 rounded-lg p-2 sm:p-3 md:p-4 lg:p-6">
                <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between md:space-x-3">
                  <div className="flex-1 md:max-w-md">
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-pink-500" />
                      <input
                        type="text"
                        placeholder="Search rooms..."
                        value={femaleRoomSearchTerm}
                        onChange={(e) => setFemaleRoomSearchTerm(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 md:py-2.5 border border-pink-200 rounded-md sm:rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm md:text-base bg-white/50"
                      />
                      {femaleRoomSearchTerm && (
                        <button
                          onClick={() => setFemaleRoomSearchTerm('')}
                          className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-pink-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-3 sm:h-4 w-3 sm:w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:space-x-2">
                    <div className="relative">
                      <Filter className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-pink-500" />
                      <select
                        value={femaleRoomFilter}
                        onChange={(e) => setFemaleRoomFilter(e.target.value as 'all' | 'active' | 'inactive' | 'full' | 'available')}
                        className="w-full md:w-auto pl-8 sm:pl-10 pr-6 sm:pr-8 py-2 sm:py-2.5 md:py-2.5 border border-pink-200 rounded-md sm:rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm md:text-base bg-white/50"
                      >
                        <option value="all">All Rooms</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                        <option value="full">Full Rooms</option>
                        <option value="available">Available Rooms</option>
                      </select>
                    </div>


                  </div>
                </div>

                {/* Results count */}
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-pink-100">
                  <p className="font-apercu-regular text-xs text-pink-700 text-center sm:text-left">
                    {formatNumber(filteredFemaleRooms.length)} of {formatNumber(paginationInfo.female.originalTotal)} rooms
                    {femaleRoomSearchTerm && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • &quot;{femaleRoomSearchTerm}&quot;
                      </span>
                    )}
                    {femaleRoomFilter !== 'all' && (
                      <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                        • {femaleRoomFilter.charAt(0).toUpperCase() + femaleRoomFilter.slice(1)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Female Rooms Required Message - Mobile Optimized */}
              {unallocatedByGender.Female && unallocatedByGender.Female.length > 0 && (roomsByGender.Female?.length || 0) === 0 && (
                <div className="mb-4 sm:mb-6 ">
                  <div className="p-3 sm:p-4 rounded-lg border bg-white border-pink-200">
                    <div className="flex items-start sm:items-center space-x-3">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center bg-pink-100 flex-shrink-0">
                        <Home className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-apercu-bold text-xs sm:text-sm text-pink-800 leading-tight">
                          Female Rooms Required for Allocation
                        </h3>
                        <p className="font-apercu-regular text-xs mt-1 text-pink-600 leading-relaxed">
                          {unallocatedByGender.Female.length} Female Participants are Waiting for Room Allocation. Create Female Rooms to Proceed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}



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
                  paginatedFemaleRooms.map((room) => (
                    <RoomCard
                      key={`${room.id}-${roomUpdateTrigger[room.id] || 0}`}
                      room={room}
                      onEdit={handleEditRoom}
                      onRefresh={() => refreshSingleRoom(room.id)}
                      onPersonPreview={handlePersonPreview}
                      canEditRooms={permissions.canEditRooms}
                      canViewPersonDetails={permissions.canViewPersonDetails}
                      canRemoveAllocations={permissions.canRemoveAllocations}
                    />
                  ))
                )}
              </div>

              {paginationInfo.female.totalItems > femalePagination.itemsPerPage && (
                <PaginationControls
                  currentPage={femalePagination.currentPage}
                  totalPages={paginationInfo.female.totalPages}
                  onPageChange={(page: number) => handlePageChange('Female', page)}
                  totalItems={paginationInfo.female.totalItems}
                  itemsPerPage={femalePagination.itemsPerPage}
                  className="pt-4 border-t border-pink-200"
                  theme="pink"
                />
              )}

              {/* No rooms exist at all for Female */}
              {(roomsByGender.Female?.length || 0) === 0 && !isLoading && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-dashed border-pink-200 rounded-xl p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="h-16 w-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Home className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-apercu-bold text-xl text-pink-700 mb-3">No Female Rooms Created</h3>
                    <p className="font-apercu-regular text-pink-600 mb-6 leading-relaxed">
                      Create rooms to start allocating female participants. You can set capacity, add descriptions, and manage allocations.
                    </p>
                    {permissions.canCreateRooms ? (
                      <Button
                        onClick={() => {
                          setSelectedRoom(null)
                          setDefaultGender('Female')
                          setShowRoomModal(true)
                        }}
                        className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-apercu-medium px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create First Female Room
                      </Button>
                    ) : (
                      <div className="bg-pink-100 border border-pink-200 rounded-lg p-4">
                        <p className="font-apercu-medium text-pink-700 text-sm">
                          Contact an administrator to create rooms
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}



              {/* No results message for Female rooms (when rooms exist but filtered out) */}
              {filteredFemaleRooms.length === 0 && (roomsByGender.Female?.length || 0) > 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-pink-300 mx-auto mb-4" />
                  <p className="font-apercu-medium text-pink-600">No rooms found</p>
                  <p className="font-apercu-regular text-sm text-pink-500">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              )}


            </GenderTabContent>
          )}
        </div>

        {/* Modals */}
        <RoomSetupModal
          isOpen={showRoomModal}
          onClose={() => {
            setShowRoomModal(false)
            setDefaultGender(null)
          }}
          onSave={handleRoomSaved}
          onError={handleRoomError}
          room={selectedRoom}
          defaultGender={defaultGender}
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

        {/* Settings modal removed */}

        {/* Person Preview Modal */}
        <PersonPreviewModal
          isOpen={showPersonPreview}
          onCloseAction={handlePersonPreviewClose}
          registrationId={selectedPersonId}
          onRemoveAllocationAction={handleRemoveAllocationFromPreview}
          canRemoveAllocations={permissions.canRemoveAllocations}
        />

        {/* Empty All Rooms Warning Modal */}
        <ConfirmationModal
          isOpen={showEmptyAllModal}
          onClose={() => setShowEmptyAllModal(false)}
          onConfirm={handleConfirmEmptyAllRooms}
          title={`Empty All ${emptyAllGender} Rooms?`}
          description={`Are you sure that you want to empty all ${emptyAllGender.toLowerCase()} rooms? This will remove ALL participants from ALL ${emptyAllGender.toLowerCase()} rooms and return them to the unallocated list. This action cannot be undone.`}
          confirmText="Yes, Empty All Rooms"
          cancelText="Cancel"
          variant="danger"
          loading={emptyingAllRooms}
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
export default function AccommodationsPage() {
  return (
    <AccommodationUpdatesProvider>
      <AccommodationsPageContent />
    </AccommodationUpdatesProvider>
  )
}

'use client'

import { useState, memo, useCallback, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { parseApiError } from '@/lib/error-messages'
import { useAccommodationUpdates } from '@/contexts/AccommodationUpdatesContext'
import { RoomParticipantsModal } from './RoomParticipantsModal'
import {
  Home,
  Users,
  Edit,
  Trash2,
  UserMinus,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react'

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

interface RoomCardProps {
  room: Room
  onEdit: (room: Room) => void
  onRefresh: () => void
  onPersonPreview?: (registrationId: string) => void
  canEditRooms?: boolean
  canViewPersonDetails?: boolean
  canRemoveAllocations?: boolean
}

const RoomCardComponent = function RoomCard({
  room,
  onEdit,
  onRefresh,
  onPersonPreview,
  canEditRooms = true,
  canViewPersonDetails = true,
  canRemoveAllocations = true
}: RoomCardProps) {
  const [showAllocations, setShowAllocations] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removingAll, setRemovingAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [progressAnimation, setProgressAnimation] = useState(false)
  const [previousOccupancy, setPreviousOccupancy] = useState(room.occupancy)

  const { success, error } = useToast()
  const { triggerDeallocationUpdate, triggerRoomUpdate, triggerStatsUpdate } = useAccommodationUpdates()

  // Animate progress bar when occupancy changes
  useEffect(() => {
    if (room.occupancy !== previousOccupancy) {
      setProgressAnimation(true)
      setPreviousOccupancy(room.occupancy)

      // Reset animation after completion
      const timer = setTimeout(() => {
        setProgressAnimation(false)
      }, 800)

      return () => clearTimeout(timer)
    }
    // Return undefined for the else case
    return undefined
  }, [room.occupancy, previousOccupancy])

  const showToast = useCallback((title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    } else if (type === 'warning') {
      error(title) // Use error for warning since useToast doesn't have warning
    } else if (type === 'info') {
      success(title) // Use success for info since useToast doesn't have info
    }
  }, [success, error])

  // Memoized calculations
  const roomStats = useMemo(() => {
    // Calculate age range for all allocated people
    const ages = room.allocations.map(allocation => {
      const birthDate = new Date(allocation.registration.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    })

    const ageRange = ages.length > 0 ? {
      min: Math.min(...ages),
      max: Math.max(...ages),
      average: Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length),
      display: ages.length === 1 ? `Age: ${ages[0]} yrs` :
               Math.min(...ages) === Math.max(...ages) ? `Age: ${Math.min(...ages)} yrs` :
               `Age: ${Math.min(...ages)}-${Math.max(...ages)} yrs (avg: ${Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)})`
    } : null

    return {
      occupancyColor: room.occupancyRate >= 100 ? 'text-red-800 bg-red-100' :
                     room.occupancyRate >= 90 ? 'text-red-700 bg-red-50' :
                     room.occupancyRate >= 80 ? 'text-amber-700 bg-amber-50' :
                     room.occupancyRate >= 70 ? 'text-yellow-700 bg-yellow-50' :
                     'text-green-700 bg-green-50',
      genderColor: room.gender === 'Male' ? 'text-blue-600 bg-blue-50' : 'text-pink-600 bg-pink-50',
      ageRange
    }
  }, [room.occupancyRate, room.gender, room.allocations])

  const handleRemoveAllocation = useCallback(async (registrationId: string) => {
    try {
      setRemoving(registrationId)

      const response = await fetch(`/api/admin/accommodations?registrationId=${registrationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove allocation')
      }

      // Trigger real-time updates
      const allocation = room.allocations.find(a => a.registration.id === registrationId)
      if (allocation) {
        triggerDeallocationUpdate(
          room.id,
          registrationId,
          allocation.registration.fullName,
          room.name
        )
      }
      triggerStatsUpdate()

      showToast('Allocation removed successfully', 'success')
      onRefresh()
    } catch (error) {
      console.error('Error removing allocation:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setRemoving(null)
    }
  }, [room.allocations, room.id, room.name, showToast, onRefresh, triggerDeallocationUpdate, triggerStatsUpdate])

  const handleRemoveAllFromRoom = useCallback(() => {
    if (room.occupancy === 0) {
      showToast('No allocations to remove from this room', 'error')
      return
    }
    setShowRemoveAllConfirm(true)
  }, [room.occupancy, showToast])

  const handleConfirmRemoveAll = useCallback(async () => {
    try {
      setRemovingAll(true)
      setShowRemoveAllConfirm(false)

      // Remove all allocations from this room
      const removePromises = room.allocations.map(allocation =>
        fetch(`/api/admin/accommodations?registrationId=${allocation.registration.id}`, {
          method: 'DELETE'
        })
      )

      const responses = await Promise.all(removePromises)

      // Check if all requests were successful
      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to remove some allocations')
        }
      }

      // Trigger real-time updates for all removed allocations
      room.allocations.forEach(allocation => {
        triggerDeallocationUpdate(
          room.id,
          allocation.registration.id,
          allocation.registration.fullName,
          room.name
        )
      })
      triggerStatsUpdate()

      showToast(`Successfully removed all ${room.allocations.length} registrants from ${room.name}`, 'success')
      onRefresh()
    } catch (error) {
      console.error('Error removing all allocations:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setRemovingAll(false)
    }
  }, [room.allocations, room.id, room.name, showToast, onRefresh, triggerDeallocationUpdate, triggerStatsUpdate])

  const handleDeleteRoom = useCallback(() => {
    if (room.occupancy > 0) {
      showToast('Cannot delete room with existing allocations', 'error')
      return
    }
    setShowDeleteConfirm(true)
  }, [room.occupancy, showToast])

  const handleConfirmDelete = useCallback(async () => {
    try {
      setDeleting(true)
      setShowDeleteConfirm(false)

      const response = await fetch(`/api/admin/rooms/${room.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete room')
      }

      showToast('Room deleted successfully', 'success')
      onRefresh()
    } catch (error) {
      console.error('Error deleting room:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setDeleting(false)
    }
  }, [room.id, showToast, onRefresh])

  return (
    <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200 bg-white">
      {/* Room Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Home className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-apercu-bold text-lg text-gray-900 truncate">{room.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`${roomStats.genderColor} border-0 font-apercu-medium text-xs`}>
                {room.gender}
              </Badge>
              <Badge className={`${roomStats.occupancyColor} border-0 font-apercu-medium text-xs`}>
                {room.occupancyRate}% occupied
              </Badge>
              {!room.isActive && (
                <Badge variant="secondary" className="font-apercu-medium text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            {roomStats.ageRange && (
              <div className="mt-2 w-full">
                <Badge className="text-purple-600 bg-purple-50 border-0 font-apercu-medium text-xs px-2 py-1 max-w-full truncate inline-block">
                  {roomStats.ageRange.display}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {canEditRooms && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(room)}
              className="font-apercu-medium"
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteRoom}
              disabled={room.occupancy > 0 || deleting}
              className="font-apercu-medium text-red-600 hover:text-red-700"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
          </div>
        )}
      </div>



      {/* Room Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
          <p className="font-apercu-bold text-lg sm:text-xl text-gray-900">{room.occupancy}</p>
          <p className="font-apercu-medium text-xs text-gray-600">Occupied</p>
        </div>
        <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
          <p className="font-apercu-bold text-lg sm:text-xl text-gray-900">{Math.max(0, room.capacity - room.occupancy)}</p>
          <p className="font-apercu-medium text-xs text-gray-600">Available</p>
        </div>
      </div>

      {/* Capacity Info */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="font-apercu-medium text-sm text-gray-700">
            {room.occupancy}/{room.capacity} persons
          </span>
        </div>

        {/* Room Description */}
        {room.description && (
          <div className="mb-4">
            <p className="font-apercu-regular text-sm text-gray-600 leading-relaxed">
              {room.description}
            </p>
          </div>
        )}

        {room.occupancy > 0 && (
          <div className="flex items-center justify-end mt-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllocations(!showAllocations)}
              className="font-apercu-medium text-xs w-fit"
            >
              {showAllocations ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowParticipantsModal(true)}
              className="font-apercu-medium text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              View All
            </Button>

            {canRemoveAllocations && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAllFromRoom}
                disabled={removingAll}
                className="font-apercu-medium text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-700 text-xs w-fit"
              >
                {removingAll ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Emptying...
                  </>
                ) : (
                  <>
                    <UserMinus className="h-3 w-3 mr-1" />
                    Empty
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>



      {/* Allocations List */}
      {showAllocations && room.allocations.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-apercu-bold text-sm text-gray-900 mb-3">Current Occupants</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {room.allocations.map((allocation) => {
              // Use the same age calculation logic as the main calculation
              const birthDate = new Date(allocation.registration.dateOfBirth)
              const today = new Date()
              let age = today.getFullYear() - birthDate.getFullYear()
              const monthDiff = today.getMonth() - birthDate.getMonth()
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--
              }
              return (
                <div key={allocation.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-apercu-medium text-sm text-gray-900 truncate">
                      {allocation.registration.fullName}
                    </p>
                    <p className="font-apercu-regular text-xs text-gray-500">
                      {age} years old • {allocation.registration.gender}
                    </p>
                    <p className="font-apercu-regular text-xs text-gray-400 truncate">
                      📞 {allocation.registration.phoneNumber}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {onPersonPreview && canViewPersonDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPersonPreview(allocation.registration.id)}
                        className="font-apercu-medium text-indigo-600 hover:text-indigo-700"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    {canRemoveAllocations && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAllocation(allocation.registration.id)}
                        disabled={removing === allocation.registration.id}
                        className="font-apercu-medium text-red-600 hover:text-red-700"
                      >
                        {removing === allocation.registration.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UserMinus className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Occupancy Progress Bar - Bottom of Card */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className={`font-apercu-medium text-xs ${
            room.occupancyRate >= 100 ? 'text-red-700' :
            room.occupancyRate >= 90 ? 'text-red-600' :
            room.occupancyRate >= 80 ? 'text-amber-600' :
            room.occupancyRate >= 70 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            Occupancy
          </span>
          <span className={`font-apercu-bold text-xs ${
            room.occupancyRate >= 100 ? 'text-red-700' :
            room.occupancyRate >= 90 ? 'text-red-600' :
            room.occupancyRate >= 80 ? 'text-amber-600' :
            room.occupancyRate >= 70 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {Math.round(room.occupancyRate)}%
          </span>
        </div>
        <div className={`w-full rounded-full h-3 shadow-inner relative overflow-hidden ${
          room.occupancyRate >= 100 ? 'bg-red-100' :
          room.occupancyRate >= 90 ? 'bg-red-50' :
          room.occupancyRate >= 80 ? 'bg-amber-50' :
          room.occupancyRate >= 70 ? 'bg-yellow-50' :
          'bg-green-50'
        }`}>
          <div
            className={`h-3 rounded-full transition-all duration-700 ease-out shadow-sm relative ${
              progressAnimation ? 'animate-pulse' : ''
            } ${
              room.occupancyRate >= 100 ? 'bg-gradient-to-r from-red-600 to-red-700' :
              room.occupancyRate >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
              room.occupancyRate >= 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              room.occupancyRate >= 70 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
              'bg-gradient-to-r from-green-500 to-emerald-500'
            }`}
            style={{ width: `${Math.min(room.occupancyRate, 100)}%` }}
          >
            {/* Shimmer effect when animating */}
            {progressAnimation && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-apercu-bold text-lg text-gray-900">Delete Room</h3>
                  <p className="font-apercu-regular text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="font-apercu-regular text-gray-700 mb-3">
                  Are you sure you want to delete <span className="font-apercu-bold text-gray-900">&quot;{room.name}&quot;</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-red-600 text-xs font-bold">!</span>
                    </div>
                    <div>
                      <p className="font-apercu-medium text-sm text-red-800">Warning</p>
                      <p className="font-apercu-regular text-xs text-red-700 mt-1">
                        This will permanently remove the room and all its configuration. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="font-apercu-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="font-apercu-medium bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Room
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Remove All Confirmation Modal */}
      {showRemoveAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <UserMinus className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-apercu-bold text-lg text-gray-900">Empty Room</h3>
                  <p className="font-apercu-regular text-sm text-gray-500">This will remove all registrants from this room</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="font-apercu-regular text-gray-700 mb-3">
                  Are you sure you want to remove all <span className="font-apercu-bold text-gray-900">{room.allocations.length} registrants</span> from <span className="font-apercu-bold text-gray-900">&quot;{room.name}&quot;</span>?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-amber-600 text-xs font-bold">!</span>
                    </div>
                    <div>
                      <p className="font-apercu-medium text-sm text-amber-800">Notice</p>
                      <p className="font-apercu-regular text-xs text-amber-700 mt-1">
                        Are you sure that you want to empty the room? All registrants will be moved back to the unallocated list. They can be reassigned to rooms later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRemoveAllConfirm(false)}
                  disabled={removingAll}
                  className="font-apercu-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmRemoveAll}
                  disabled={removingAll}
                  className="font-apercu-medium bg-red-600 hover:bg-red-700 text-white"
                >
                  {removingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Emptying Room...
                    </>
                  ) : (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Empty Room
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Room Participants Modal */}
      <RoomParticipantsModal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        room={room}
      />
    </Card>
  )
}

// Export memoized component for better performance
export const RoomCard = memo(RoomCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.room.id === nextProps.room.id &&
    prevProps.room.occupancy === nextProps.room.occupancy &&
    prevProps.room.occupancyRate === nextProps.room.occupancyRate &&
    prevProps.room.isActive === nextProps.room.isActive &&
    prevProps.canEditRooms === nextProps.canEditRooms &&
    prevProps.canViewPersonDetails === nextProps.canViewPersonDetails &&
    prevProps.canRemoveAllocations === nextProps.canRemoveAllocations
  )
})

'use client'

import React, { useState, memo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { useAccommodationUpdates } from '@/contexts/AccommodationUpdatesContext'
import { capitalizeName } from '@/lib/utils'
import { parseApiError } from '@/lib/error-messages'
import {
  Users,
  Edit,
  Trash2,
  RefreshCw,
  UserMinus,
  Eye,
  AlertTriangle
} from 'lucide-react'

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

interface PlatoonCardProps {
  platoon: Platoon
  onEdit: (platoon: Platoon) => void
  onRefresh: () => void
  onPersonPreview?: (registrationId: string) => void
  canEditPlatoons?: boolean
  canViewPersonDetails?: boolean
  canRemoveAllocations?: boolean
}

const PlatoonCardComponent = function PlatoonCard({
  platoon,
  onEdit,
  onRefresh,
  onPersonPreview,
  canEditPlatoons = true,
  canViewPersonDetails = true,
  canRemoveAllocations = true
}: PlatoonCardProps) {
  const [showAllocations, setShowAllocations] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removingAll, setRemovingAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false)

  const { success, error } = useToast()
  const { triggerDeallocationUpdate, triggerRoomUpdate, triggerStatsUpdate } = useAccommodationUpdates()

  const showToast = (title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    }
  }

  const handleRemoveAllocation = async (allocationId: string, personName: string) => {
    if (!canRemoveAllocations) return

    setRemoving(allocationId)
    try {
      const response = await fetch(`/api/admin/accommodations/allocations/${allocationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove allocation')
      }

      showToast(`${personName} removed from platoon successfully`, 'success')
      
      // Trigger updates
      triggerDeallocationUpdate()
      triggerRoomUpdate()
      triggerStatsUpdate()
      
      // Refresh this specific platoon
      onRefresh()
    } catch (error) {
      console.error('Error removing allocation:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage, 'error')
    } finally {
      setRemoving(null)
    }
  }

  const handleRemoveAllAllocations = async () => {
    if (!canRemoveAllocations || platoon.allocations.length === 0) return

    setRemovingAll(true)
    try {
      const response = await fetch(`/api/admin/accommodations/rooms/${platoon.id}/clear`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to clear platoon')
      }

      showToast(`All participants removed from ${platoon.name}`, 'success')
      
      // Trigger updates
      triggerDeallocationUpdate()
      triggerRoomUpdate()
      triggerStatsUpdate()
      
      // Refresh this specific platoon
      onRefresh()
      setShowRemoveAllConfirm(false)
    } catch (error) {
      console.error('Error clearing platoon:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage, 'error')
    } finally {
      setRemovingAll(false)
    }
  }

  const handleDeletePlatoon = async () => {
    if (!canEditPlatoons) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/accommodations/rooms/${platoon.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete platoon')
      }

      showToast(`Platoon "${platoon.name}" deleted successfully`, 'success')
      
      // Trigger updates
      triggerRoomUpdate()
      triggerStatsUpdate()
      
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting platoon:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const getOccupancyBadgeColor = () => {
    if (platoon.occupancyRate >= 90) return 'bg-red-100 text-red-700 border-red-200'
    if (platoon.occupancyRate >= 70) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const getGenderColor = () => {
    return platoon.gender === 'Male' 
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-pink-100 text-pink-700 border-pink-200'
  }

  return (
    <>
      <Card className="p-2 sm:p-3 md:p-4 lg:p-5 bg-white hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300">
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Users className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${platoon.gender === 'Male' ? 'text-blue-600' : 'text-pink-600'}`} />
              <h3 className="font-apercu-bold text-sm sm:text-base text-gray-900 truncate">
                {platoon.name}
              </h3>
            </div>
            <Badge className={`text-xs px-2 py-1 ${getGenderColor()}`}>
              {platoon.gender}
            </Badge>
          </div>

          {/* Description */}
          {platoon.description && (
            <p className="font-apercu-regular text-xs sm:text-sm text-gray-600 line-clamp-2">
              {platoon.description}
            </p>
          )}

          {/* Occupancy */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <span className="font-apercu-medium text-xs sm:text-sm text-gray-700">
              {platoon.occupancy}/{platoon.capacity}
            </span>
            <Badge className={`text-xs px-1.5 py-0.5 ${getOccupancyBadgeColor()}`}>
              {platoon.occupancyRate}%
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                platoon.occupancyRate >= 90 ? 'bg-red-500' :
                platoon.occupancyRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(platoon.occupancyRate, 100)}%` }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {canViewPersonDetails && platoon.occupancy > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAllocations(!showAllocations)}
                className="text-xs px-2 py-1 h-6 sm:h-7 font-apercu-medium"
              >
                <Eye className="h-3 w-3 mr-1" />
                {showAllocations ? 'Hide' : 'View'}
              </Button>
            )}

            {canEditPlatoons && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(platoon)}
                className="text-xs px-2 py-1 h-6 sm:h-7 font-apercu-medium"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="text-xs px-2 py-1 h-6 sm:h-7 font-apercu-medium"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>

            {canRemoveAllocations && platoon.occupancy > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRemoveAllConfirm(true)}
                className="text-xs px-2 py-1 h-6 sm:h-7 font-apercu-medium text-red-600 border-red-200 hover:bg-red-50"
              >
                <UserMinus className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}

            {canEditPlatoons && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs px-2 py-1 h-6 sm:h-7 font-apercu-medium text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  )
}

// Export memoized component for better performance
export const PlatoonCard = memo(PlatoonCardComponent)

PlatoonCard.displayName = 'PlatoonCard'

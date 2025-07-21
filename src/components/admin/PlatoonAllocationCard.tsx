'use client'

import React, { useState, memo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { capitalizeName } from '@/lib/utils'
import { parseApiError } from '@/lib/error-messages'
import {
  Users,
  Edit,
  Trash2,
  RefreshCw,
  UserMinus,
  Eye,
  AlertTriangle,
  Phone,
  User
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

interface PlatoonAllocationCardProps {
  platoon: PlatoonAllocation
  onEdit: (platoon: PlatoonAllocation) => void
  onRefresh: () => void
  onPersonPreview?: (registrationId: string) => void
  canEditPlatoons?: boolean
  canViewPersonDetails?: boolean
  canRemoveAllocations?: boolean
}

const PlatoonAllocationCardComponent = function PlatoonAllocationCard({
  platoon,
  onEdit,
  onRefresh,
  onPersonPreview,
  canEditPlatoons = true,
  canViewPersonDetails = true,
  canRemoveAllocations = true
}: PlatoonAllocationCardProps) {
  const [showParticipants, setShowParticipants] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removingAll, setRemovingAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false)

  const { success, error } = useToast()

  const showToast = (title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    }
  }

  const handleRemoveParticipant = async (participantId: string, personName: string) => {
    if (!canRemoveAllocations) return

    setRemoving(participantId)
    try {
      const response = await fetch(`/api/admin/platoon-allocations/participants/${participantId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove participant')
      }

      showToast(`${personName} removed from platoon successfully`, 'success')
      onRefresh()
    } catch (error) {
      console.error('Error removing participant:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage, 'error')
    } finally {
      setRemoving(null)
    }
  }

  const handleRemoveAllParticipants = async () => {
    if (!canRemoveAllocations || platoon.participants.length === 0) return

    setRemovingAll(true)
    try {
      const response = await fetch(`/api/admin/platoon-allocations/${platoon.id}/clear`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to clear platoon')
      }

      showToast(`All participants removed from ${platoon.name}`, 'success')
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
      const response = await fetch(`/api/admin/platoon-allocations/${platoon.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete platoon')
      }

      showToast(`Platoon "${platoon.name}" deleted successfully`, 'success')
      onRefresh()
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

  return (
    <>
      <Card className="p-2 sm:p-3 md:p-4 lg:p-5 bg-white hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300">
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-indigo-600" />
              <h3 className="font-apercu-bold text-sm sm:text-base text-gray-900 truncate">
                {platoon.name}
              </h3>
            </div>
            <Badge className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 border-indigo-200">
              {platoon.label}
            </Badge>
          </div>

          {/* Leader Info */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
              <span className="font-apercu-medium text-xs sm:text-sm text-gray-700">
                Leader: {platoon.leaderName}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
              <span className="font-apercu-regular text-xs sm:text-sm text-gray-600">
                {platoon.leaderPhone}
              </span>
            </div>
          </div>

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
                onClick={() => setShowParticipants(!showParticipants)}
                className="text-xs px-2 py-1 h-6 sm:h-7 font-apercu-medium"
              >
                <Eye className="h-3 w-3 mr-1" />
                {showParticipants ? 'Hide' : 'View'}
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

          {/* Participants List */}
          {showParticipants && platoon.participants.length > 0 && (
            <div className="border-t border-gray-200 pt-2 sm:pt-3 space-y-1 sm:space-y-2">
              <h4 className="font-apercu-medium text-xs sm:text-sm text-gray-700">
                Assigned Participants ({platoon.participants.length})
              </h4>
              <div className="space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
                {platoon.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 rounded text-xs sm:text-sm"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0 ${
                        participant.registration.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <span
                          className="font-apercu-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 block"
                          onClick={() => canViewPersonDetails && onPersonPreview?.(participant.registration.id)}
                        >
                          {capitalizeName(participant.registration.fullName)}
                        </span>
                        <span className="font-apercu-regular text-gray-500 text-xs truncate block">
                          {participant.registration.branch} • {participant.registration.gender}
                        </span>
                      </div>
                    </div>
                    {canRemoveAllocations && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveParticipant(participant.id, participant.registration.fullName)}
                        disabled={removing === participant.id}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-600 hover:bg-red-100"
                      >
                        {removing === participant.id ? (
                          <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
                        ) : (
                          <UserMinus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  )
}

// Export memoized component for better performance
export const PlatoonAllocationCard = memo(PlatoonAllocationCardComponent)

PlatoonAllocationCard.displayName = 'PlatoonAllocationCard'

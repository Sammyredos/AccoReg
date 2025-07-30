'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Edit, Phone, User, Trash2, Loader2 } from 'lucide-react'
import { PlatoonParticipantsModal } from './PlatoonParticipantsModal'

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
  onDelete: (platoon: PlatoonAllocation) => void
  onEmpty: (platoon: PlatoonAllocation) => void
  onRefresh: () => void
  canEditPlatoons: boolean
  canViewPersonDetails: boolean
  canRemoveAllocations: boolean
  isLoading?: boolean
  loadingAction?: string // 'edit' | 'delete' | 'empty'
}

export function PlatoonAllocationCard({
  platoon,
  onEdit,
  onDelete,
  onEmpty,
  onRefresh,
  canEditPlatoons,
  canViewPersonDetails,
  canRemoveAllocations,
  isLoading = false,
  loadingAction
}: PlatoonAllocationCardProps) {
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const participantCount = platoon.participants?.length || 0
  const capacityPercentage = platoon.capacity > 0 ? (participantCount / platoon.capacity) * 100 : 0

  return (
    <>
      <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200 bg-white">
        <div>
          <div className="flex flex-col space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="relative">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-apercu-bold text-lg sm:text-xl text-gray-900 truncate group-hover:text-indigo-900 transition-colors duration-200">{platoon.name}</h3>
                  <div className="space-y-1.5 mt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="h-4 w-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                        <User className="h-2.5 w-2.5 text-indigo-600" />
                      </div>
                      <span className="font-apercu-medium">{platoon.leaderName}</span>
                    </div>
                    {platoon.leaderPhone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="h-4 w-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                          <Phone className="h-2.5 w-2.5 text-emerald-600" />
                        </div>
                        <span className="font-apercu-regular">{platoon.leaderPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canEditPlatoons && (
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(platoon)}
                    disabled={isLoading}
                    className="font-apercu-medium h-8 w-8 p-0 border-indigo-200 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200"
                  >
                    {isLoading && loadingAction === 'edit' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(platoon)}
                    disabled={participantCount > 0 || isLoading}
                    className={`font-apercu-medium h-8 w-8 p-0 transition-all duration-200 ${
                      participantCount > 0 || isLoading
                        ? 'text-gray-400 cursor-not-allowed border-gray-200'
                        : 'text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300'
                    }`}
                    title={participantCount > 0 ? 'Cannot delete platoon with allocated participants' : 'Delete platoon'}
                  >
                    {isLoading && loadingAction === 'delete' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
          </div>

            {/* Participant Stats */}
            <div className="bg-gradient-to-r from-slate-50/50 to-blue-50/50 rounded-xl p-4 mb-4 border border-slate-100">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <span className="font-apercu-bold text-sm text-gray-900">
                    {participantCount}/{platoon.capacity} participants
                  </span>
                  <p className="font-apercu-regular text-xs text-gray-600 mt-0.5">
                    {platoon.capacity - participantCount} Open Slots
                  </p>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`font-apercu-medium text-xs ${
                    capacityPercentage >= 100 ? 'text-red-700' :
                    capacityPercentage >= 80 ? 'text-amber-700' :
                    'text-emerald-700'
                  }`}>
                    Capacity
                  </span>
                  <span className={`font-apercu-bold text-xs ${
                    capacityPercentage >= 100 ? 'text-red-700' :
                    capacityPercentage >= 80 ? 'text-amber-700' :
                    'text-emerald-700'
                  }`}>
                    {Math.round(capacityPercentage)}%
                  </span>
                </div>
                <div className={`w-full rounded-full h-3 shadow-inner ${
                  capacityPercentage >= 100 ? 'bg-red-100' :
                  capacityPercentage >= 80 ? 'bg-amber-100' :
                  'bg-emerald-100'
                }`}>
                  <div
                    className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                      capacityPercentage >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      capacityPercentage >= 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      'bg-gradient-to-r from-emerald-500 to-green-500'
                    }`}
                    style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-2.5 w-2.5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="font-apercu-medium text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                    Active
                  </span>
                </div>
                {platoon.label && (
                  <span className="font-apercu-regular text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {platoon.label}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                {participantCount > 0 && (
                  <Button
                    onClick={() => setShowParticipantsModal(true)}
                    variant="outline"
                    size="sm"
                    className="font-apercu-medium h-8 px-3 sm:px-4 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm w-full sm:w-auto"
                  >
                    <Users className="h-3 w-3 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">View All</span>
                    <span className="sm:hidden">View</span>
                  </Button>
                )}
                {participantCount > 0 && canEditPlatoons && (
                  <Button
                    onClick={() => onEmpty(platoon)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="font-apercu-medium h-8 px-3 sm:px-4 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300 disabled:text-gray-400 transition-all duration-200 shadow-sm w-full sm:w-auto"
                  >
                    {isLoading && loadingAction === 'empty' ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 sm:mr-1.5 animate-spin" />
                        <span className="hidden sm:inline">Emptying...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3 mr-1 sm:mr-1.5" />
                        <span className="hidden sm:inline">Empty</span>
                        <span className="sm:hidden">Clear</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Participants Modal */}
      <PlatoonParticipantsModal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        platoon={platoon}
      />
    </>
  )
}

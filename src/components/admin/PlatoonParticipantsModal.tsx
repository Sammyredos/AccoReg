'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Users, User, Phone, Mail, Calendar, UserMinus, Loader2 } from 'lucide-react'
import { PaginationControls } from './PaginationControls'
import { useToast } from '@/contexts/ToastContext'

interface PlatoonAllocation {
  id: string
  name: string
  leaderName: string
  label: string
  leaderPhone: string
  capacity: number
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

interface PlatoonParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  platoon: PlatoonAllocation | null
  onParticipantRemoved?: () => void
  canRemoveParticipants?: boolean
}

export function PlatoonParticipantsModal({
  isOpen,
  onClose,
  platoon,
  onParticipantRemoved,
  canRemoveParticipants = false
}: PlatoonParticipantsModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null)
  const participantsPerPage = 10
  const { success, error } = useToast()

  if (!platoon) return null

  const participantCount = platoon.participants?.length || 0

  // Calculate age from date of birth
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

  // Filter and paginate participants
  const filteredParticipants = useMemo(() => {
    return platoon.participants?.filter(participant => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        participant.registration.fullName.toLowerCase().includes(searchLower) ||
        participant.registration.branch.toLowerCase().includes(searchLower) ||
        participant.registration.gender.toLowerCase().includes(searchLower) ||
        participant.registration.emailAddress.toLowerCase().includes(searchLower)
      )
    }) || []
  }, [platoon.participants, searchTerm])

  const totalPages = Math.ceil(filteredParticipants.length / participantsPerPage)
  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * participantsPerPage
    return filteredParticipants.slice(startIndex, startIndex + participantsPerPage)
  }, [filteredParticipants, currentPage, participantsPerPage])

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Handle removing participant from platoon
  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!platoon || !canRemoveParticipants) return

    setRemovingParticipantId(participantId)

    try {
      const response = await fetch(`/api/admin/platoon-allocations/${platoon.id}/remove-participant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove participant')
      }

      success(`Successfully removed ${participantName} from platoon`)

      // Trigger refresh in parent component
      if (onParticipantRemoved) {
        onParticipantRemoved()
      }

    } catch (err) {
      console.error('Error removing participant:', err)
      error(err instanceof Error ? err.message : 'Failed to remove participant')
    } finally {
      setRemovingParticipantId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl w-full max-h-[90vh] p-0 bg-white flex flex-col shadow-2xl">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-4 sm:p-6 border-b border-gray-100 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full transform rotate-12 scale-150"></div>
          </div>

          <div className="relative z-10 flex items-center space-x-3 sm:space-x-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-apercu-bold text-xl sm:text-2xl text-gray-900 mb-1">
                {platoon.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span className="font-apercu-medium text-sm text-indigo-700">
                    {participantCount} of {platoon.capacity} participants
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-white/80 border-indigo-200 text-indigo-700">
                    Leader: {platoon.leaderName}
                  </Badge>
                  {platoon.label && (
                    <Badge variant="outline" className="bg-white/80 border-purple-200 text-purple-700">
                      {platoon.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="mt-3 w-full max-w-md">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-apercu-medium text-xs text-gray-600">Capacity</span>
                  <span className="font-apercu-bold text-xs text-gray-700">{Math.round((participantCount / platoon.capacity) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm ${
                      (participantCount / platoon.capacity) * 100 >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      (participantCount / platoon.capacity) * 100 >= 90 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                      (participantCount / platoon.capacity) * 100 >= 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      (participantCount / platoon.capacity) * 100 >= 70 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                      'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min((participantCount / platoon.capacity) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
            <Input
              type="text"
              placeholder="Search by name, branch, gender, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 font-apercu-regular border-blue-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {paginatedParticipants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {paginatedParticipants.map((participant, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-start space-x-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-apercu-medium ${
                      participant.registration.gender === 'Male'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : 'bg-gradient-to-r from-pink-500 to-rose-500'
                    }`}>
                      {participant.registration.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-apercu-medium text-gray-900 truncate">
                          {participant.registration.fullName}
                        </h3>
                        {canRemoveParticipants && (
                          <Button
                            onClick={() => handleRemoveParticipant(participant.registration.id, participant.registration.fullName)}
                            disabled={removingParticipantId === participant.registration.id}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 font-apercu-medium text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                            title={`Remove ${participant.registration.fullName} from platoon`}
                          >
                            {removingParticipantId === participant.registration.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserMinus className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {calculateAge(participant.registration.dateOfBirth)} years
                          </span>
                          <Badge className={`text-xs font-apercu-medium ${
                            participant.registration.gender === 'Male'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-pink-50 text-pink-700 border-pink-200'
                          }`}>
                            {participant.registration.gender}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate font-apercu-regular">
                          📍 {participant.registration.branch}
                        </p>
                        <p className="text-sm text-gray-600 truncate flex items-center font-apercu-regular">
                          <Mail className="h-3 w-3 mr-1.5 text-gray-400" />
                          {participant.registration.emailAddress}
                        </p>
                        {participant.registration.phoneNumber && (
                          <p className="text-sm text-gray-600 flex items-center font-apercu-regular">
                            <Phone className="h-3 w-3 mr-1.5 text-gray-400" />
                            {participant.registration.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="font-apercu-medium text-gray-900 mb-2">
                {searchTerm ? 'No participants found' : 'No participants allocated'}
              </h4>
              <p className="text-gray-600 font-apercu-regular text-sm">
                {searchTerm ? 'Try adjusting your search terms.' : 'No participants have been allocated to this platoon yet.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={participantsPerPage}
              totalItems={filteredParticipants.length}
              theme="blue"
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600 font-apercu-regular">
              Showing {paginatedParticipants.length} of {filteredParticipants.length} participants
              {searchTerm && ` (filtered from ${participantCount} total)`}
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className="font-apercu-medium border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
import { Search, Users, User, Phone, Mail, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import { PaginationControls } from './PaginationControls'

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

interface RoomParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  room: Room | null
}

export function RoomParticipantsModal({
  isOpen,
  onClose,
  room
}: RoomParticipantsModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const participantsPerPage = 10

  if (!room) return null

  const participantCount = room.allocations?.length || 0

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
    return room.allocations?.filter(allocation => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        allocation.registration.fullName.toLowerCase().includes(searchLower) ||
        allocation.registration.gender.toLowerCase().includes(searchLower) ||
        allocation.registration.emailAddress.toLowerCase().includes(searchLower) ||
        allocation.registration.phoneNumber.toLowerCase().includes(searchLower)
      )
    }) || []
  }, [room.allocations, searchTerm])

  const totalPages = Math.ceil(filteredParticipants.length / participantsPerPage)
  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * participantsPerPage
    return filteredParticipants.slice(startIndex, startIndex + participantsPerPage)
  }, [filteredParticipants, currentPage, participantsPerPage])

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl w-full max-h-[90vh] p-0 bg-white flex flex-col shadow-2xl">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 border-b border-gray-100 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full transform rotate-12 scale-150"></div>
          </div>

          <div className="relative z-10 flex items-center space-x-3 sm:space-x-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Home className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-apercu-bold text-xl sm:text-2xl text-gray-900 mb-1">
                {room.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-apercu-medium text-sm text-blue-700">
                    {participantCount} of {room.capacity} participants
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-white/80 border-blue-200 text-blue-700">
                    {room.type}
                  </Badge>
                  <Badge variant="outline" className={`bg-white/80 border-blue-200 ${
                    room.gender === 'Male' ? 'text-blue-700' : 'text-pink-700'
                  }`}>
                    {room.gender}
                  </Badge>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="mt-3 w-full max-w-md">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-apercu-medium text-xs text-gray-600">Occupancy</span>
                  <span className="font-apercu-bold text-xs text-gray-700">{Math.round((participantCount / room.capacity) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm ${
                      (participantCount / room.capacity) * 100 >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      (participantCount / room.capacity) * 100 >= 90 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                      (participantCount / room.capacity) * 100 >= 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      (participantCount / room.capacity) * 100 >= 70 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                      'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min((participantCount / room.capacity) * 100, 100)}%` }}
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
              placeholder="Search by name, gender, email, or phone..."
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
              {paginatedParticipants.map((allocation, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-start space-x-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-apercu-medium ${
                      allocation.registration.gender === 'Male' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-r from-pink-500 to-rose-500'
                    }`}>
                      {allocation.registration.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-apercu-medium text-gray-900 truncate">
                        {allocation.registration.fullName}
                      </h3>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {calculateAge(allocation.registration.dateOfBirth)} years
                          </span>
                          <Badge className={`text-xs font-apercu-medium ${
                            allocation.registration.gender === 'Male' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-pink-50 text-pink-700 border-pink-200'
                          }`}>
                            {allocation.registration.gender}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate flex items-center font-apercu-regular">
                          <Mail className="h-3 w-3 mr-1.5 text-gray-400" />
                          {allocation.registration.emailAddress}
                        </p>
                        {allocation.registration.phoneNumber && (
                          <p className="text-sm text-gray-600 flex items-center font-apercu-regular">
                            <Phone className="h-3 w-3 mr-1.5 text-gray-400" />
                            {allocation.registration.phoneNumber}
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
                {searchTerm ? 'Try adjusting your search terms.' : 'No participants have been allocated to this room yet.'}
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

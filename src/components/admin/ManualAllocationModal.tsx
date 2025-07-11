'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { useAccommodationUpdates } from '@/contexts/AccommodationUpdatesContext'
import { Search, Users, MapPin, User, Calendar, X, Check, AlertTriangle } from 'lucide-react'

interface Registration {
  id: string
  fullName: string
  gender: string
  dateOfBirth: string
  emailAddress: string
  phoneNumber: string
}

interface Room {
  id: string
  name: string
  gender: string
  capacity: number
  occupancy: number
  availableSpaces: number
  minAge?: number
  maxAge?: number
}

interface ManualAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ManualAllocationModal({ isOpen, onClose, onSuccess }: ManualAllocationModalProps) {
  const [step, setStep] = useState<'select-person' | 'select-room'>('select-person')
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [unallocatedRegistrations, setUnallocatedRegistrations] = useState<Registration[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [allocating, setAllocating] = useState(false)
  const [ageValidationError, setAgeValidationError] = useState<string | null>(null)
  const { success, error } = useToast()
  const { triggerAllocationUpdate, triggerStatsUpdate } = useAccommodationUpdates()

  useEffect(() => {
    if (isOpen) {
      fetchUnallocatedRegistrations()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedRegistration) {
      fetchAvailableRooms(selectedRegistration.gender)
    }
  }, [selectedRegistration])

  const fetchUnallocatedRegistrations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/accommodations')
      if (response.ok) {
        const data = await response.json()
        const allUnallocated = [
          ...(data.unallocatedByGender?.Male || []),
          ...(data.unallocatedByGender?.Female || [])
        ]
        setUnallocatedRegistrations(allUnallocated)
      }
    } catch (err) {
      console.error('Error fetching unallocated registrations:', err)
      error('Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableRooms = async (gender: string) => {
    try {
      const response = await fetch('/api/admin/accommodations')
      if (response.ok) {
        const data = await response.json()
        const genderRooms = data.roomsByGender?.[gender] || []
        const available = genderRooms.filter((room: Room) => room.availableSpaces > 0)
        setAvailableRooms(available)
      }
    } catch (err) {
      console.error('Error fetching available rooms:', err)
      error('Failed to load available rooms')
    }
  }

  const handlePersonSelect = (registration: Registration) => {
    setSelectedRegistration(registration)
    setStep('select-room')
    setSearchTerm('')
  }

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room)
    setAgeValidationError(null)

    // Validate age if room has age restrictions
    if (selectedRegistration && (room.minAge || room.maxAge)) {
      const personAge = calculateAge(selectedRegistration.dateOfBirth)
      const minAge = room.minAge || 0
      const maxAge = room.maxAge || 999

      if (personAge < minAge || personAge > maxAge) {
        setAgeValidationError(
          `Age ${personAge} is outside room's age range (${minAge}-${maxAge} years)`
        )
      }
    }
  }

  const handleAllocate = async () => {
    if (!selectedRegistration || !selectedRoom) return

    // Check for age validation error
    if (ageValidationError) {
      error('Cannot allocate', ageValidationError)
      return
    }

    try {
      setAllocating(true)
      const response = await fetch('/api/admin/accommodations/manual-allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: selectedRegistration.id,
          roomId: selectedRoom.id
        })
      })

      if (response.ok) {
        // Trigger real-time updates
        triggerAllocationUpdate(
          selectedRoom.id,
          selectedRegistration.id,
          selectedRegistration.fullName,
          selectedRoom.name
        )
        triggerStatsUpdate()

        success('Allocation successful', `${selectedRegistration.fullName} has been allocated to ${selectedRoom.name}`)
        onSuccess()
        handleClose()
      } else {
        const errorData = await response.json()
        error('Allocation failed', errorData.error || 'Unknown error occurred')
      }
    } catch (err) {
      console.error('Error allocating:', err)
      error('Allocation failed', 'Network error occurred')
    } finally {
      setAllocating(false)
    }
  }

  const handleClose = () => {
    setStep('select-person')
    setSelectedRegistration(null)
    setSelectedRoom(null)
    setSearchTerm('')
    setAgeValidationError(null)
    onClose()
  }

  const filteredRegistrations = unallocatedRegistrations.filter(reg =>
    reg.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.emailAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRooms = availableRooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-apercu-bold text-xl">
            Manual Room Allocation
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'select-person' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredRegistrations.map((registration) => (
                  <Card
                    key={registration.id}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handlePersonSelect(registration)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          registration.gender === 'Male' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-pink-100 text-pink-600'
                        }`}>
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-apercu-medium text-gray-900">{registration.fullName}</p>
                          <p className="text-sm text-gray-500">{registration.emailAddress}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${
                          registration.gender === 'Male' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-pink-100 text-pink-800'
                        }`}>
                          {registration.gender}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {calculateAge(registration.dateOfBirth)} years old
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 'select-room' && selectedRegistration && (
            <div className="space-y-4">
              <Card className="p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      selectedRegistration.gender === 'Male' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-pink-100 text-pink-600'
                    }`}>
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-apercu-medium text-gray-900">{selectedRegistration.fullName}</p>
                      <p className="text-sm text-gray-500">
                        {selectedRegistration.gender} • {calculateAge(selectedRegistration.dateOfBirth)} years old
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('select-person')}
                  >
                    Change Person
                  </Button>
                </div>
              </Card>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredRooms.map((room) => (
                  <Card
                    key={room.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedRoom?.id === room.id 
                        ? 'bg-indigo-50 border-indigo-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleRoomSelect(room)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          room.gender === 'Male' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-pink-100 text-pink-600'
                        }`}>
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-apercu-medium text-gray-900">{room.name}</p>
                          <p className="text-sm text-gray-500">
                            {room.occupancy}/{room.capacity} occupied • {room.availableSpaces} available
                          </p>
                          {(room.minAge || room.maxAge) && (
                            <p className="text-xs text-gray-400">
                              Age range: {room.minAge || 0}-{room.maxAge || '∞'} years
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedRoom?.id === room.id && (
                        <Check className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Age Validation Error */}
        {ageValidationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <p className="text-sm font-apercu-medium text-red-800">
                {ageValidationError}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === 'select-room' && selectedRegistration && selectedRoom && (
            <Button
              onClick={handleAllocate}
              disabled={allocating || !!ageValidationError}
              className={`${
                ageValidationError
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {allocating ? 'Allocating...' : 'Allocate Room'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

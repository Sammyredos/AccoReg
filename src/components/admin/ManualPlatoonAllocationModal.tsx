'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Users, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

interface UnallocatedParticipant {
  id: string
  fullName: string
  gender: string
  dateOfBirth: string
  phoneNumber: string
  emailAddress: string
  branch: string
}

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

interface ManualPlatoonAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  unallocatedParticipants: UnallocatedParticipant[]
  platoons: PlatoonAllocation[]
}

export function ManualPlatoonAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  unallocatedParticipants,
  platoons
}: ManualPlatoonAllocationModalProps) {
  const { showToast } = useToast()
  const [step, setStep] = useState<'select-participant' | 'select-platoon'>('select-participant')
  const [selectedParticipants, setSelectedParticipants] = useState<UnallocatedParticipant[]>([])
  const [selectedPlatoon, setSelectedPlatoon] = useState<PlatoonAllocation | null>(null)
  const [participantSearchTerm, setParticipantSearchTerm] = useState('')
  const [platoonSearchTerm, setPlatoonSearchTerm] = useState('')
  const [allocating, setAllocating] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select-participant')
      setSelectedParticipants([])
      setSelectedPlatoon(null)
      setParticipantSearchTerm('')
      setPlatoonSearchTerm('')
    }
  }, [isOpen])

  // Filter participants based on search
  const filteredParticipants = useMemo(() => {
    if (!participantSearchTerm) return unallocatedParticipants
    
    const searchLower = participantSearchTerm.toLowerCase()
    return unallocatedParticipants.filter(participant =>
      participant.fullName.toLowerCase().includes(searchLower) ||
      participant.emailAddress.toLowerCase().includes(searchLower) ||
      participant.branch.toLowerCase().includes(searchLower)
    )
  }, [unallocatedParticipants, participantSearchTerm])

  // Filter available platoons (not at capacity)
  const availablePlatoons = useMemo(() => {
    const filtered = platoons.filter(platoon => {
      const currentCount = platoon.participants?.length || 0
      const hasSpace = currentCount < platoon.capacity
      
      if (!platoonSearchTerm) return hasSpace
      
      const searchLower = platoonSearchTerm.toLowerCase()
      return hasSpace && (
        platoon.name.toLowerCase().includes(searchLower) ||
        platoon.leaderName.toLowerCase().includes(searchLower) ||
        platoon.label.toLowerCase().includes(searchLower)
      )
    })
    
    return filtered
  }, [platoons, platoonSearchTerm])

  const handleParticipantToggle = (participant: UnallocatedParticipant) => {
    setSelectedParticipants(prev => {
      const isSelected = prev.some(p => p.id === participant.id)
      if (isSelected) {
        return prev.filter(p => p.id !== participant.id)
      } else {
        return [...prev, participant]
      }
    })
  }

  const handleContinueToSelectPlatoon = () => {
    if (selectedParticipants.length > 0) {
      setStep('select-platoon')
    }
  }

  const handlePlatoonSelect = (platoon: PlatoonAllocation) => {
    setSelectedPlatoon(platoon)
  }

  const handleSelectAll = () => {
    setSelectedParticipants(filteredParticipants)
  }

  const handleDeselectAll = () => {
    setSelectedParticipants([])
  }

  const handleAllocate = async () => {
    if (selectedParticipants.length === 0 || !selectedPlatoon) return

    setAllocating(true)
    try {
      // Check if platoon has enough capacity
      const currentCount = selectedPlatoon.participants?.length || 0
      const availableSpaces = selectedPlatoon.capacity - currentCount

      if (selectedParticipants.length > availableSpaces) {
        showToast('Platoon only has ' + availableSpaces + ' available spaces, but you selected ' + selectedParticipants.length + ' participants', 'error')
        setAllocating(false)
        return
      }

      // Allocate all selected participants
      const allocationPromises = selectedParticipants.map(participant =>
        fetch('/api/admin/platoon-allocations/manual-allocate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participantId: participant.id,
            platoonId: selectedPlatoon.id,
          }),
        })
      )

      const responses = await Promise.all(allocationPromises)

      // Check if all allocations were successful
      const failedAllocations: Array<{participant: UnallocatedParticipant, error: string}> = []
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const errorData = await responses[i].json()
          failedAllocations.push({
            participant: selectedParticipants[i],
            error: errorData.error || 'Failed to allocate'
          })
        }
      }

      if (failedAllocations.length > 0) {
        const failedNames = failedAllocations.map(f => f.participant.fullName).join(', ')
        showToast('Failed to allocate: ' + failedNames, 'error')
      }

      const successCount = selectedParticipants.length - failedAllocations.length
      if (successCount > 0) {
        showToast('Successfully allocated ' + successCount + ' participant' + (successCount > 1 ? 's' : '') + ' to ' + selectedPlatoon.name, 'success')
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error('Error allocating participants:', error)
      showToast(error instanceof Error ? error.message : 'Failed to allocate participants', 'error')
    } finally {
      setAllocating(false)
    }
  }

  const handleClose = () => {
    if (!allocating) {
      onClose()
    }
  }

  const handleBack = () => {
    setStep('select-participant')
    setSelectedPlatoon(null)
    setPlatoonSearchTerm('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] p-0 bg-white flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="font-apercu-bold text-lg sm:text-xl text-gray-900">
                Manual Platoon Allocation
              </DialogTitle>
              <DialogDescription className="font-apercu-regular text-sm text-gray-600">
                {step === 'select-participant' 
                  ? 'Select a participant to allocate to a platoon'
                  : `Allocating ${selectedParticipant?.fullName} - Select a platoon`
                }
              </DialogDescription>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center space-x-2 mt-4">
            <div className={`flex items-center space-x-2 ${step === 'select-participant' ? 'text-indigo-600' : 'text-green-600'}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'select-participant' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
              }`}>
                {step === 'select-participant' ? '1' : <CheckCircle className="h-4 w-4" />}
              </div>
              <span className="font-apercu-medium text-sm">Select Participant</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center space-x-2 ${step === 'select-platoon' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'select-platoon' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <span className="font-apercu-medium text-sm">Select Platoon</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6">
          {step === 'select-participant' && (
            <div className="h-full flex flex-col">
              {/* Search and Selection Controls */}
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search participants by name, email, or branch..."
                    value={participantSearchTerm}
                    onChange={(e) => setParticipantSearchTerm(e.target.value)}
                    className="pl-10 font-apercu-regular"
                  />
                </div>

                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-apercu-medium text-gray-700">
                      {selectedParticipants.length} selected
                    </span>
                    {selectedParticipants.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedParticipants.length} participant{selectedParticipants.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="text-xs"
                      disabled={selectedParticipants.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* Participants List */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredParticipants.map((participant) => {
                    const isSelected = selectedParticipants.some(p => p.id === participant.id)
                    return (
                      <Card
                        key={participant.id}
                        onClick={() => handleParticipantToggle(participant)}
                        className={`p-4 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                            : 'hover:bg-blue-50 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-apercu-bold text-sm ${
                              participant.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                            }`}>
                              {participant.fullName.charAt(0)}
                            </div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-apercu-medium text-sm text-gray-900 truncate">
                              {participant.fullName}
                            </h4>
                            <p className="font-apercu-regular text-xs text-gray-500 truncate">
                              {participant.branch}
                            </p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {participant.gender}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {filteredParticipants.length === 0 && (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-apercu-medium text-gray-500">
                      {participantSearchTerm ? 'No participants found' : 'No unallocated participants'}
                    </p>
                    {participantSearchTerm && (
                      <p className="font-apercu-regular text-sm text-gray-400 mt-1">
                        Try adjusting your search terms
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'select-platoon' && (
            <div className="h-full flex flex-col">
              {/* Selected participant info */}
              {selectedParticipant && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-apercu-bold text-xs ${
                      selectedParticipant.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}>
                      {selectedParticipant.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-apercu-medium text-sm text-blue-900">
                        {selectedParticipant.fullName}
                      </h4>
                      <p className="font-apercu-regular text-xs text-blue-600">
                        {selectedParticipant.branch} • {selectedParticipant.gender}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search platoons by name, leader, or label..."
                    value={platoonSearchTerm}
                    onChange={(e) => setPlatoonSearchTerm(e.target.value)}
                    className="pl-10 font-apercu-regular"
                  />
                </div>
              </div>

              {/* Platoons List */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePlatoons.map((platoon) => {
                    const currentCount = platoon.participants?.length || 0
                    const isSelected = selectedPlatoon?.id === platoon.id
                    
                    return (
                      <Card
                        key={platoon.id}
                        onClick={() => handlePlatoonSelect(platoon)}
                        className={`p-4 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' 
                            : 'hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-apercu-bold text-sm text-gray-900">
                              {platoon.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {currentCount}/{platoon.capacity}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="font-apercu-regular text-xs text-gray-600">
                              Leader: {platoon.leaderName}
                            </p>
                            {platoon.label && (
                              <p className="font-apercu-regular text-xs text-gray-500">
                                {platoon.label}
                              </p>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(currentCount / platoon.capacity) * 100}%` }}
                            />
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>

                {availablePlatoons.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-apercu-medium text-gray-500">
                      {platoonSearchTerm ? 'No platoons found' : 'No available platoons'}
                    </p>
                    <p className="font-apercu-regular text-sm text-gray-400 mt-1">
                      {platoonSearchTerm 
                        ? 'Try adjusting your search terms'
                        : 'All platoons are at capacity or no platoons exist'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} disabled={allocating}>
              Cancel
            </Button>
            {step === 'select-platoon' && (
              <Button variant="outline" onClick={() => setStep('select-participant')} disabled={allocating}>
                Back
              </Button>
            )}
          </div>

          {step === 'select-participant' && selectedParticipants.length > 0 && (
            <Button
              onClick={handleContinueToSelectPlatoon}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Continue ({selectedParticipants.length} selected)
            </Button>
          )}

          {step === 'select-platoon' && selectedParticipants.length > 0 && selectedPlatoon && (
            <Button
              onClick={handleAllocate}
              disabled={allocating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {allocating ? 'Allocating...' : `Allocate ${selectedParticipants.length} Participant${selectedParticipants.length > 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

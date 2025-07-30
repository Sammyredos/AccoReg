'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/contexts/ToastContext'
import { parseApiError } from '@/lib/error-messages'
import { useAccommodationUpdates } from '@/contexts/AccommodationUpdatesContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Shuffle, Users, Info } from 'lucide-react'

interface AllocationSetupModalProps {
  isOpen: boolean
  onCloseAction: () => void
  onCompleteAction: (result: any) => void
  unallocatedCount: number
  gender?: 'Male' | 'Female' | 'All'
}



export function AllocationSetupModal({ isOpen, onCloseAction, onCompleteAction, unallocatedCount, gender = 'All' }: AllocationSetupModalProps) {
  const [ageRangeYears, setAgeRangeYears] = useState('5')
  const [allocationType, setAllocationType] = useState<'age-based' | 'random'>('age-based')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')

  const { success, error } = useToast()
  const { triggerStatsUpdate } = useAccommodationUpdates()

  const showToast = (title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate age range only for age-based allocation
    if (allocationType === 'age-based') {
      const ageRange = parseInt(ageRangeYears)
      if (isNaN(ageRange) || ageRange < 1) {
        showToast('Age range must be a positive number', 'error')
        return
      }
    }

    try {
      setLoading(true)
      setProgress('Initializing allocation...')

      // Choose API endpoint based on allocation type
      const endpoint = allocationType === 'random'
        ? '/api/admin/accommodations/random-allocate'
        : '/api/admin/accommodations/allocate'

      const body = allocationType === 'random'
        ? { gender: gender !== 'All' ? gender : undefined }
        : { ageRangeYears: parseInt(ageRangeYears), gender: gender !== 'All' ? gender : undefined }

      setProgress('Allocating participants to rooms...')

      // Add timeout protection (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 30000)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to allocate rooms')
      }

      setProgress('Processing allocation results...')
      const data = await response.json()

      if (data.totalAllocated > 0) {
        // Show immediate success message
        const emailStatus = data.emailResults?.status === 'sending'
          ? ' Allocation emails are being sent in the background.'
          : ''

        showToast(
          `Successfully allocated ${data.totalAllocated} participants to rooms.${emailStatus}`,
          'success'
        )

        // Trigger real-time stats update after successful allocation
        triggerStatsUpdate()
        onCompleteAction(data)
        onCloseAction()
      } else {
        showToast('No allocations were made. Please check room availability.', 'warning')
      }
    } catch (error) {
      console.error('Error allocating rooms:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        showToast('Allocation request timed out. Please try again or contact support.', 'error')
      } else {
        const errorMessage = parseApiError(error)
        showToast(errorMessage.description, 'error')
      }
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleClose = () => {
    if (!loading) {
      onCloseAction()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Shuffle className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-apercu-bold text-lg">
                Auto Allocate {gender && gender !== 'All' ? `${gender} ` : ''}Rooms
              </DialogTitle>
              <DialogDescription className="font-apercu-regular">
                Automatically assign {gender && gender !== 'All' ? `${gender.toLowerCase()} ` : ''}participants to rooms based on age groups and gender
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Allocation Type Selection */}
            <div className="space-y-3">
              <Label className="font-apercu-medium text-sm text-gray-700">
                Allocation Method *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAllocationType('age-based')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    allocationType === 'age-based'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      allocationType === 'age-based' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {allocationType === 'age-based' && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <span className="font-apercu-bold text-sm">Age-Based</span>
                  </div>
                  <p className="font-apercu-regular text-xs text-gray-600">
                    Group participants by age ranges for appropriate mixing
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAllocationType('random')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    allocationType === 'random'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      allocationType === 'random' ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                    }`}>
                      {allocationType === 'random' && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <span className="font-apercu-bold text-sm">Random</span>
                  </div>
                  <p className="font-apercu-regular text-xs text-gray-600">
                    Randomly distribute participants ignoring age differences
                  </p>
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className={`border rounded-lg p-4 ${
              allocationType === 'age-based'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-start space-x-3">
                <Info className={`h-5 w-5 mt-0.5 ${
                  allocationType === 'age-based' ? 'text-blue-600' : 'text-orange-600'
                }`} />
                <div>
                  <h4 className={`font-apercu-bold text-sm mb-1 ${
                    allocationType === 'age-based' ? 'text-blue-900' : 'text-orange-900'
                  }`}>
                    {allocationType === 'age-based' ? 'Age-Based Allocation' : 'Random Allocation'}
                  </h4>
                  <ul className={`font-apercu-regular text-sm space-y-1 ${
                    allocationType === 'age-based' ? 'text-blue-800' : 'text-orange-800'
                  }`}>
                    {allocationType === 'age-based' ? (
                      <>
                        <li>• Participants are grouped by gender and age range</li>
                        <li>• Rooms are assigned based on gender matching</li>
                        <li>• Age groups help keep similar ages together</li>
                        <li>• Existing allocations are preserved</li>
                      </>
                    ) : (
                      <>
                        <li>• Participants are randomly distributed to available rooms</li>
                        <li>• Gender separation is still maintained</li>
                        <li>• Age differences are completely ignored</li>
                        <li>• Useful for mixed-age programs or testing</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <p className="font-apercu-bold text-xl text-gray-900">{unallocatedCount}</p>
                <p className="font-apercu-medium text-sm text-gray-600">Unallocated</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Shuffle className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="font-apercu-bold text-xl text-indigo-900">Auto</p>
                <p className="font-apercu-medium text-sm text-indigo-600">Allocation</p>
              </div>
            </div>

            {/* Age Range Input - Only show for age-based allocation */}
            {allocationType === 'age-based' && (
              <div className="space-y-2">
                <Label htmlFor="ageRange" className="font-apercu-medium text-sm text-gray-700">
                  Age Range for Grouping (Years) *
                </Label>
                <Input
                  id="ageRange"
                  type="number"
                  min="1"
                  max="20"
                  value={ageRangeYears}
                  onChange={(e) => setAgeRangeYears(e.target.value)}
                  placeholder="e.g., 4"
                  className="font-apercu-regular"
                  disabled={loading}
                />
                <p className="font-apercu-regular text-xs text-gray-500">
                  Participants will be grouped within {ageRangeYears || 'X'} year age ranges (e.g., 14-18, 19-23)
                </p>
              </div>
            )}

            {/* Random Allocation Info - Only show for random allocation */}
            {allocationType === 'random' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Shuffle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  </div>
                  <div>
                    <h4 className="font-apercu-bold text-sm text-yellow-900 mb-1">
                      Random Allocation Warning
                    </h4>
                    <p className="font-apercu-regular text-sm text-yellow-800">
                      This will randomly distribute participants without considering age compatibility.
                      Use this option only when age mixing is acceptable for your program.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="font-apercu-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || unallocatedCount === 0}
                className={`font-apercu-medium ${
                  allocationType === 'random'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span className="truncate text-white">
                      {progress || (allocationType === 'random' ? 'Randomly Allocating...' : 'Allocating...')}
                    </span>
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4 mr-2" />
                    {allocationType === 'random' ? 'Start Random Allocation' : 'Start Age-Based Allocation'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  )
}

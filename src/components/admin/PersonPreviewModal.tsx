'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { ModalSkeleton } from '@/components/ui/skeleton'
import { parseApiError } from '@/lib/error-messages'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Shield,
  Home,
  UserMinus,
  Loader2,
  Copy,
  CheckCircle
} from 'lucide-react'
import { calculateAge } from '@/lib/age-calculator'
import { capitalizeName } from '@/lib/utils'

interface Registration {
  id: string
  fullName: string
  dateOfBirth: string
  gender: string
  address: string
  phoneNumber: string
  emailAddress: string
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
  parentGuardianName?: string
  parentGuardianPhone?: string
  parentGuardianEmail?: string

  createdAt: string
}

interface RoomAllocation {
  id: string
  roomId: string
  allocatedAt: string
  room: {
    id: string
    name: string
    gender: string
    capacity: number
  }
}

interface PersonPreviewModalProps {
  isOpen: boolean
  onCloseAction: () => void
  registrationId: string | null
  onRemoveAllocationAction?: () => void
  canRemoveAllocations?: boolean
}

export function PersonPreviewModal({ isOpen, onCloseAction, registrationId, onRemoveAllocationAction, canRemoveAllocations = true }: PersonPreviewModalProps) {
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [allocation, setAllocation] = useState<RoomAllocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showConfirmRemoval, setShowConfirmRemoval] = useState(false)

  const { success, error } = useToast()

  const showToast = (title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    }
  }

  useEffect(() => {
    if (isOpen && registrationId) {
      fetchRegistrationDetails()
    }
  }, [isOpen, registrationId])

  const fetchRegistrationDetails = async () => {
    if (!registrationId) return

    try {
      setLoading(true)

      // Fetch registration details
      const regResponse = await fetch(`/api/admin/registrations/${registrationId}`)
      if (!regResponse.ok) {
        throw new Error('Failed to fetch registration details')
      }
      const regData = await regResponse.json()
      setRegistration(regData.registration)

      // Fetch allocation details
      const allocResponse = await fetch(`/api/admin/accommodations/allocation/${registrationId}`)
      if (allocResponse.ok) {
        const allocData = await allocResponse.json()
        setAllocation(allocData.allocation)
      }
    } catch (error) {
      console.error('Error fetching registration details:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAllocation = () => {
    setShowConfirmRemoval(true)
  }

  const handleConfirmRemoval = async () => {
    if (!registrationId || !allocation) return

    try {
      setRemoving(true)
      setShowConfirmRemoval(false)

      const response = await fetch(`/api/admin/accommodations?registrationId=${registrationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove allocation')
      }

      showToast('Person removed from room successfully', 'success')
      setAllocation(null)
      if (onRemoveAllocationAction) {
        onRemoveAllocationAction()
      }

      // Close the modal after successful removal
      onCloseAction()
    } catch (error) {
      console.error('Error removing allocation:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setRemoving(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      showToast('Copied to clipboard', 'success')
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      showToast('Failed to copy to clipboard', 'error')
    }
  }

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-apercu-bold text-lg sm:text-xl truncate">
                {loading ? 'Loading...' : registration?.fullName || 'Person Details'}
              </DialogTitle>
              <DialogDescription className="font-apercu-regular text-sm">
                Complete registration and accommodation information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <ModalSkeleton />
        ) : registration ? (
          <div className="space-y-6">
            {/* Room Allocation Info */}
            {allocation && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Home className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h4 className="font-apercu-bold text-sm text-indigo-900">Current Room Assignment</h4>
                      <p className="font-apercu-regular text-sm text-indigo-700">
                        {allocation.room.name} • {allocation.room.gender} • Capacity: {allocation.room.capacity}
                      </p>
                      <p className="font-apercu-regular text-xs text-indigo-600">
                        Allocated on {formatDate(allocation.allocatedAt)}
                      </p>
                    </div>
                  </div>
                  {canRemoveAllocations && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAllocation}
                      disabled={removing}
                      className="font-apercu-medium text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      {removing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Personal Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-apercu-bold text-lg text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-600" />
                  Personal Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="font-apercu-medium text-sm text-gray-600">Full Name</label>
                    <p className="font-apercu-regular text-sm text-gray-900 break-words">{capitalizeName(registration.fullName)}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Age</label>
                      <p className="font-apercu-regular text-sm text-gray-900">
                        {calculateAge(registration.dateOfBirth)} years old
                      </p>
                    </div>
                    <div>
                      <label className="font-apercu-medium text-sm text-gray-600">Gender</label>
                      <div>
                        <Badge className={`${registration.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'} border-0`}>
                          {registration.gender}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-apercu-medium text-sm text-gray-600">Date of Birth</label>
                    <p className="font-apercu-regular text-sm text-gray-900">{formatDate(registration.dateOfBirth)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-apercu-bold text-lg text-gray-900 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-gray-600" />
                  Contact Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="font-apercu-medium text-sm text-gray-600">Email Address</label>
                    <div className="flex items-center space-x-2">
                      <p className="font-apercu-regular text-sm text-gray-900 flex-1 break-all">{registration.emailAddress}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(registration.emailAddress, 'email')}
                        className="p-1 flex-shrink-0"
                      >
                        {copied === 'email' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="font-apercu-medium text-sm text-gray-600">Phone Number</label>
                    <div className="flex items-center space-x-2">
                      <p className="font-apercu-regular text-sm text-gray-900 flex-1">{registration.phoneNumber}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(registration.phoneNumber, 'phone')}
                        className="p-1 flex-shrink-0"
                      >
                        {copied === 'phone' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="font-apercu-medium text-sm text-gray-600">Address</label>
                    <p className="font-apercu-regular text-sm text-gray-900 break-words">{registration.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-apercu-bold text-lg text-gray-900 flex items-center mb-4">
                <Shield className="h-5 w-5 mr-2 text-gray-600" />
                Emergency Contact
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="font-apercu-medium text-sm text-gray-600">Name</label>
                  <p className="font-apercu-regular text-sm text-gray-900 break-words">{registration.emergencyContactName}</p>
                </div>
                <div>
                  <label className="font-apercu-medium text-sm text-gray-600">Relationship</label>
                  <p className="font-apercu-regular text-sm text-gray-900">{registration.emergencyContactRelationship}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="font-apercu-medium text-sm text-gray-600">Phone</label>
                  <div className="flex items-center space-x-2">
                    <p className="font-apercu-regular text-sm text-gray-900 flex-1">{registration.emergencyContactPhone}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(registration.emergencyContactPhone, 'emergency')}
                      className="p-1 flex-shrink-0"
                    >
                      {copied === 'emergency' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent/Guardian Information */}
            {registration.parentGuardianName && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-apercu-bold text-lg text-gray-900 flex items-center mb-4">
                  <Heart className="h-5 w-5 mr-2 text-gray-600" />
                  Parent/Guardian Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="font-apercu-medium text-sm text-gray-600">Name</label>
                    <p className="font-apercu-regular text-sm text-gray-900 break-words">{registration.parentGuardianName}</p>
                  </div>
                  <div>
                    <label className="font-apercu-medium text-sm text-gray-600">Phone</label>
                    <p className="font-apercu-regular text-sm text-gray-900">{registration.parentGuardianPhone}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="font-apercu-medium text-sm text-gray-600">Email</label>
                    <p className="font-apercu-regular text-sm text-gray-900 break-all">{registration.parentGuardianEmail}</p>
                  </div>
                </div>
              </div>
            )}



            {/* Registration Date */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-2" />
                Registered on {formatDate(registration.createdAt)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="font-apercu-regular text-gray-500">Failed to load registration details</p>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={onCloseAction}
            className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Modal for Removing Allocation */}
      <ConfirmationModal
        isOpen={showConfirmRemoval}
        onClose={() => setShowConfirmRemoval(false)}
        onConfirm={handleConfirmRemoval}
        title="Remove Registrant from Room"
        description="Are you sure you want to remove this person from their room? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        loading={removing}
      />
    </Dialog>
  )
}

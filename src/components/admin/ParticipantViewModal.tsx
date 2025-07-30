'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Users,
  X,
  Copy,
  Check
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

interface UnallocatedParticipant {
  id: string
  fullName: string
  dateOfBirth: string
  gender: 'Male' | 'Female'
  emailAddress: string
  phoneNumber: string
  branch: string
}

interface ParticipantViewModalProps {
  participant: UnallocatedParticipant | null
  isOpen: boolean
  onCloseAction: () => void
}

export function ParticipantViewModal({ participant, isOpen, onCloseAction }: ParticipantViewModalProps) {
  const { success, error } = useToast()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!participant) return null

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      success(`${fieldName} copied to clipboard`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      error('Failed to copy to clipboard')
    }
  }

  const CopyButton = ({ text, fieldName }: { text: string; fieldName: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, fieldName)}
      className="h-6 w-6 p-0 hover:bg-gray-100"
    >
      {copiedField === fieldName ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-gray-400" />
      )}
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-apercu-bold text-lg text-gray-900">
              Participant Details
            </DialogTitle>
            
          </div>
          <DialogDescription className="font-apercu-regular text-sm text-gray-600">
            View detailed information about this participant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-apercu-bold ${
              participant.gender === 'Male' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-pink-500 to-pink-600'
            }`}>
              {participant.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-apercu-bold text-lg text-gray-900">
                {participant.fullName}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className={`text-xs ${
                  participant.gender === 'Male' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-pink-100 text-pink-700 border-pink-200'
                }`}>
                  {participant.gender}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Age {calculateAge(participant.dateOfBirth)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Date of Birth */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-apercu-medium text-sm text-gray-900">Date of Birth</p>
                  <p className="font-apercu-regular text-xs text-gray-600">
                    {formatDate(participant.dateOfBirth)}
                  </p>
                </div>
              </div>
              <CopyButton text={formatDate(participant.dateOfBirth)} fieldName="Date of Birth" />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-apercu-medium text-sm text-gray-900">Email Address</p>
                  <p className="font-apercu-regular text-xs text-gray-600 truncate">
                    {participant.emailAddress}
                  </p>
                </div>
              </div>
              <CopyButton text={participant.emailAddress} fieldName="Email" />
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-apercu-medium text-sm text-gray-900">Phone Number</p>
                  <p className="font-apercu-regular text-xs text-gray-600">
                    {participant.phoneNumber}
                  </p>
                </div>
              </div>
              <CopyButton text={participant.phoneNumber} fieldName="Phone" />
            </div>

            {/* Branch */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-apercu-medium text-sm text-gray-900">Branch</p>
                  <p className="font-apercu-regular text-xs text-gray-600">
                    {participant.branch}
                  </p>
                </div>
              </div>
              <CopyButton text={participant.branch} fieldName="Branch" />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-3">
                <Users className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="font-apercu-medium text-sm text-orange-900">Allocation Status</p>
                  <p className="font-apercu-regular text-xs text-orange-600">
                    Unallocated - Waiting for platoon assignment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

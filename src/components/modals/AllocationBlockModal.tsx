'use client'

import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Home, 
  User, 
  MapPin, 
  Users, 
  AlertTriangle,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

interface AllocationInfo {
  roomName: string
  roomId: string
  roomGender: string
  roomCapacity: number
  roomOccupancy: number
  allocationDate: string
}

interface AllocationBlockModalProps {
  isOpen: boolean
  onCloseAction: () => void
  participantName: string
  participantEmail: string
  allocationInfo: AllocationInfo
}

export function AllocationBlockModal({
  isOpen,
  onCloseAction,
  participantName,
  participantEmail,
  allocationInfo
}: AllocationBlockModalProps) {
  const handleGoToAccommodations = () => {
    // Open accommodations page in new tab
    window.open('/admin/accommodations', '_blank')
    onCloseAction()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 border-b border-amber-200">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-lg sm:text-xl text-gray-900">Cannot Unverify Participant</h3>
              <p className="font-apercu-regular text-sm text-amber-600">
                Participant is currently allocated to a room
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Participant Information */}
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-apercu-bold text-blue-900 text-sm">
                  {participantName}
                </h3>
                <p className="font-apercu-regular text-blue-700 text-xs mt-1 truncate">
                  {participantEmail}
                </p>
                <Badge variant="secondary" className="mt-2 text-xs bg-blue-100 text-blue-800 font-apercu-medium">
                  Verified Participant
                </Badge>
              </div>
            </div>
          </Card>

          {/* Room Allocation Information */}
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Home className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-apercu-bold text-green-900 text-sm">
                  {allocationInfo.roomName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-3 w-3 text-green-600" />
                  <span className="font-apercu-regular text-green-700 text-xs">
                    {allocationInfo.roomGender} Room
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Users className="h-3 w-3 text-green-600" />
                  <span className="font-apercu-regular text-green-700 text-xs">
                    {allocationInfo.roomOccupancy}/{allocationInfo.roomCapacity} occupied
                  </span>
                </div>
                <Badge variant="secondary" className="mt-2 text-xs bg-green-100 text-green-800 font-apercu-medium">
                  Allocated {new Date(allocationInfo.allocationDate).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Steps to Unverify */}
          <Card className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
            <h3 className="font-apercu-bold text-gray-900 text-sm mb-3 flex items-center">
              <CheckCircle className="h-4 w-4 text-gray-600 mr-2" />
              Steps to Unverify Participant
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-apercu-regular text-gray-700 text-sm">
                    Go to <strong>Accommodations</strong> page
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-apercu-bold">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-apercu-regular text-gray-700 text-sm">
                    Find <strong>{allocationInfo.roomName}</strong> and remove <strong>{participantName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-apercu-bold">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-apercu-regular text-gray-700 text-sm">
                    Return here to unverify the participant
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleGoToAccommodations}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-apercu-medium"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Accommodations
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button
              variant="outline"
              onClick={onCloseAction}
              className="flex-1 border-gray-300 hover:bg-gray-50 font-apercu-medium"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

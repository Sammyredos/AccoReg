'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX, User, Mail, Calendar, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

interface VerificationConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  registration: {
    id: string
    fullName: string
    emailAddress: string
    createdAt: string
    isVerified?: boolean
  }
  action: 'verify' | 'unverify'
  loading?: boolean
}

export function VerificationConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  registration,
  action,
  loading = false
}: VerificationConfirmModalProps) {
  const isVerify = action === 'verify'

  // Capitalize name function
  const capitalizeName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionConfig = () => {
    if (isVerify) {
      return {
        title: 'Verify Registration',
        description: 'Mark this participant as verified and present',
        icon: UserCheck,
        iconBg: 'from-green-500 to-green-600',
        headerBg: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-100',
        buttonBg: 'bg-green-600 hover:bg-green-700',
        statusBg: 'bg-green-50 border-green-200',
        statusText: 'text-green-700',
        statusIcon: CheckCircle,
        statusIconColor: 'text-green-600',
        confirmText: 'Verify Participant',
        loadingText: 'Verifying...',
        actionDescription: 'This participant will be marked as verified and present at the event.'
      }
    } else {
      return {
        title: 'Unverify Registration',
        description: 'Remove verification status from this participant',
        icon: UserX,
        iconBg: 'from-red-500 to-red-600',
        headerBg: 'from-red-50 to-orange-50',
        borderColor: 'border-red-100',
        buttonBg: 'bg-red-600 hover:bg-red-700',
        statusBg: 'bg-amber-50 border-amber-200',
        statusText: 'text-amber-700',
        statusIcon: AlertTriangle,
        statusIconColor: 'text-amber-600',
        confirmText: 'Unverify Participant',
        loadingText: 'Unverifying...',
        actionDescription: 'This participant will need to be verified again to attend the event.'
      }
    }
  }

  const config = getActionConfig()
  const IconComponent = config.icon
  const StatusIconComponent = config.statusIcon

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-br ${config.headerBg} p-4 sm:p-6 border-b ${config.borderColor}`}>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br ${config.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
              <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-lg sm:text-xl text-gray-900">{config.title}</h3>
              <p className="font-apercu-regular text-sm text-gray-600">
                {config.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Participant Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-apercu-bold text-sm text-gray-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-600" />
              Participant Information
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-apercu-medium text-gray-900">{capitalizeName(registration.fullName)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  Email:
                </span>
                <span className="font-apercu-medium text-gray-900 text-xs sm:text-sm break-all">
                  {registration.emailAddress}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Registered:
                </span>
                <span className="font-apercu-medium text-gray-900 text-xs sm:text-sm">
                  {formatDate(registration.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Status */}
          <div className={`${config.statusBg} border ${config.borderColor} rounded-lg p-4`}>
            <div className="flex items-start space-x-3">
              <StatusIconComponent className={`h-5 w-5 ${config.statusIconColor} mt-0.5 flex-shrink-0`} />
              <div>
                <h4 className={`font-apercu-bold text-sm ${config.statusText}`}>
                  {isVerify ? 'Verification Action' : 'Unverification Warning'}
                </h4>
                <p className={`font-apercu-regular text-sm ${config.statusText} mt-1`}>
                  {config.actionDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 font-apercu-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 ${config.buttonBg} font-apercu-medium text-white`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {config.loadingText}
                </>
              ) : (
                <>
                  <IconComponent className="h-4 w-4 mr-2" />
                  {config.confirmText}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  Loader2,
  ArrowRight
} from 'lucide-react'

type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface MessageModalProps {
  isOpen: boolean
  onClose: () => void
  type: MessageType
  title: string
  message: string
  details?: string
  primaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  }
  showCloseButton?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function MessageModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  primaryAction,
  secondaryAction,
  showCloseButton = true,
  size = 'md'
}: MessageModalProps) {
  
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconBg: 'from-green-500 to-emerald-600',
          headerBg: 'from-green-50 to-emerald-50',
          borderColor: 'border-green-200',
          titleColor: 'text-gray-900',
          messageColor: 'text-green-700',
          detailsBg: 'bg-green-50',
          detailsBorder: 'border-green-200',
          detailsText: 'text-green-700'
        }
      case 'error':
        return {
          icon: XCircle,
          iconBg: 'from-red-500 to-red-600',
          headerBg: 'from-red-50 to-orange-50',
          borderColor: 'border-red-200',
          titleColor: 'text-gray-900',
          messageColor: 'text-red-700',
          detailsBg: 'bg-red-50',
          detailsBorder: 'border-red-200',
          detailsText: 'text-red-700'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'from-amber-500 to-orange-600',
          headerBg: 'from-amber-50 to-orange-50',
          borderColor: 'border-amber-200',
          titleColor: 'text-gray-900',
          messageColor: 'text-amber-700',
          detailsBg: 'bg-amber-50',
          detailsBorder: 'border-amber-200',
          detailsText: 'text-amber-700'
        }
      case 'info':
        return {
          icon: Info,
          iconBg: 'from-blue-500 to-indigo-600',
          headerBg: 'from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          titleColor: 'text-gray-900',
          messageColor: 'text-blue-700',
          detailsBg: 'bg-blue-50',
          detailsBorder: 'border-blue-200',
          detailsText: 'text-blue-700'
        }
      case 'loading':
        return {
          icon: Loader2,
          iconBg: 'from-gray-500 to-gray-600',
          headerBg: 'from-gray-50 to-slate-50',
          borderColor: 'border-gray-200',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-700',
          detailsBg: 'bg-gray-50',
          detailsBorder: 'border-gray-200',
          detailsText: 'text-gray-700'
        }
    }
  }

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-lg'
      default:
        return 'max-w-md'
    }
  }

  const config = getTypeConfig()
  const IconComponent = config.icon

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${getSizeClass()} mx-auto p-0 overflow-hidden`}>
        <DialogHeader className="relative">
          {/* Header */}
          <div className={`bg-gradient-to-br ${config.headerBg} p-4 sm:p-6 border-b ${config.borderColor}`}>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`h-10 w-10 bg-gradient-to-r ${config.iconBg} rounded-xl flex items-center justify-center`}>
                <IconComponent 
                  className={`h-5 w-5 text-white ${type === 'loading' ? 'animate-spin' : ''}`} 
                />
              </div>
              <div className="flex-1">
                <DialogTitle className={`text-lg font-bold ${config.titleColor}`}>
                  {title}
                </DialogTitle>
                <p className={`text-sm ${config.messageColor} mt-1`}>
                  {message}
                </p>
              </div>
            </div>
            
            {/* Close Button */}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Details Section */}
          {details && (
            <Card className={`p-4 ${config.detailsBg} border ${config.detailsBorder}`}>
              <p className={`text-sm ${config.detailsText}`}>
                {details}
              </p>
            </Card>
          )}

          {/* Action Buttons */}
          {(primaryAction || secondaryAction) && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  variant={primaryAction.variant || 'default'}
                  className="flex-1"
                >
                  {primaryAction.label}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {secondaryAction && (
                <Button
                  onClick={secondaryAction.onClick}
                  variant={secondaryAction.variant || 'outline'}
                  className="flex-1"
                >
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}

          {/* Default Close Button if no actions */}
          {!primaryAction && !secondaryAction && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="px-6"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Convenience components for specific message types
export function SuccessModal(props: Omit<MessageModalProps, 'type'>) {
  return <MessageModal {...props} type="success" />
}

export function ErrorModal(props: Omit<MessageModalProps, 'type'>) {
  return <MessageModal {...props} type="error" />
}

export function WarningModal(props: Omit<MessageModalProps, 'type'>) {
  return <MessageModal {...props} type="warning" />
}

export function InfoModal(props: Omit<MessageModalProps, 'type'>) {
  return <MessageModal {...props} type="info" />
}

export function LoadingModal(props: Omit<MessageModalProps, 'type'>) {
  return <MessageModal {...props} type="loading" showCloseButton={false} />
}

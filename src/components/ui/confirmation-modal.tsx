'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  loading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}: ConfirmationModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: AlertCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          buttonBg: 'bg-amber-600 hover:bg-amber-700',
          borderColor: 'border-amber-200'
        }
      case 'info':
        return {
          icon: Info,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-200'
        }
      case 'success':
        return {
          icon: CheckCircle,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          buttonBg: 'bg-green-600 hover:bg-green-700',
          borderColor: 'border-green-200'
        }
      default:
        return {
          icon: AlertCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200'
        }
    }
  }

  const styles = getVariantStyles()
  const IconComponent = styles.icon

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 touch-manipulation select-none">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${styles.iconBg}`}>
              <IconComponent className={`h-5 w-5 ${styles.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-apercu-bold text-lg text-gray-900">
                {title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="font-apercu-regular text-sm text-gray-600 pl-13">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="font-apercu-medium order-2 sm:order-1 h-11 sm:h-10 touch-manipulation select-none"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={`font-apercu-medium text-white order-1 sm:order-2 h-11 sm:h-10 touch-manipulation select-none ${styles.buttonBg}`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

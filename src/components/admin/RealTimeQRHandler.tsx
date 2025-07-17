'use client'

import { useEffect } from 'react'
import { useRealTimeAttendance } from '@/hooks/useRealTimeAttendance'
import { useToast } from '@/contexts/ToastContext'

interface RealTimeQRHandlerProps {
  isQRScannerOpen: boolean
  onCloseQRScanner: () => void
  isConfirmModalOpen: boolean
  onCloseConfirmModal: () => void
  currentScanTarget?: string | null
  onDataRefresh?: () => void
}

export function RealTimeQRHandler({
  isQRScannerOpen,
  onCloseQRScanner,
  isConfirmModalOpen,
  onCloseConfirmModal,
  currentScanTarget,
  onDataRefresh
}: RealTimeQRHandlerProps) {
  const { success, info } = useToast()

  const { isConnected, lastEvent } = useRealTimeAttendance({
    onVerification: (event) => {
      const { registrationId, fullName, scannerName } = event.data

      // Auto-close QR scanner if it's open
      if (isQRScannerOpen) {
        onCloseQRScanner()
        info(`📱 QR Scanner closed - ${fullName} verified by ${scannerName}`)
      }

      // Auto-close confirmation modal if it matches the current target
      if (isConfirmModalOpen && currentScanTarget === registrationId) {
        onCloseConfirmModal()
      }

      // Refresh data
      if (onDataRefresh) {
        onDataRefresh()
      }

      // Show success notification with scanner info
      success(`✅ ${fullName} verified successfully${scannerName ? ` by ${scannerName}` : ''}`)
    },

    onStatusChange: (event) => {
      // Refresh data on any status change
      if (onDataRefresh) {
        onDataRefresh()
      }
    },

    onNewScan: (event) => {
      // Handle new scan events
      if (event.data.fullName) {
        info(`🔍 New scan detected: ${event.data.fullName}`)
      }
    }
  })

  // Show connection status changes
  useEffect(() => {
    if (isConnected) {
      console.log('🔄 Real-time attendance updates connected')
    }
  }, [isConnected])

  // This component doesn't render anything visible
  return null
}

// Hook version for easier integration
export function useRealTimeQRHandler({
  isQRScannerOpen,
  onCloseQRScanner,
  isConfirmModalOpen,
  onCloseConfirmModal,
  currentScanTarget,
  onDataRefresh
}: RealTimeQRHandlerProps) {
  const { success, info } = useToast()

  const realTimeData = useRealTimeAttendance({
    onVerification: (event) => {
      const { registrationId, fullName, scannerName } = event.data

      // Auto-close QR scanner if it's open
      if (isQRScannerOpen) {
        onCloseQRScanner()
        info(`📱 QR Scanner closed - ${fullName} verified by ${scannerName}`)
      }

      // Auto-close confirmation modal if it matches the current target
      if (isConfirmModalOpen && currentScanTarget === registrationId) {
        onCloseConfirmModal()
      }

      // Refresh data
      if (onDataRefresh) {
        onDataRefresh()
      }

      // Show success notification with scanner info
      success(`✅ ${fullName} verified successfully${scannerName ? ` by ${scannerName}` : ''}`)
    },

    onStatusChange: (event) => {
      // Refresh data on any status change
      if (onDataRefresh) {
        onDataRefresh()
      }
    },

    onNewScan: (event) => {
      // Handle new scan events
      if (event.data.fullName) {
        info(`🔍 New scan detected: ${event.data.fullName}`)
      }
    }
  })

  return realTimeData
}

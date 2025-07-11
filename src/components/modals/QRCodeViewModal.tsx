'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'
import { Download, Copy, QrCode, User, Calendar, Mail } from 'lucide-react'
import { useState } from 'react'

interface QRCodeViewModalProps {
  isOpen: boolean
  onClose: () => void
  registration: {
    id: string
    fullName: string
    emailAddress: string
    qrCode: string
    createdAt: string
  }
}

export function QRCodeViewModal({ isOpen, onClose, registration }: QRCodeViewModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyQRData = async () => {
    try {
      await navigator.clipboard.writeText(registration.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy QR data:', error)
    }
  }

  const handleDownloadQR = () => {
    // Create a canvas to generate the QR code image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // This would need to be implemented with the QR code library
      // For now, we'll just trigger a download of the QR data
      const blob = new Blob([registration.qrCode], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-code-${registration.fullName.replace(/\s+/g, '-').toLowerCase()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg md:max-w-xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 sm:p-4 md:p-6 border-b border-indigo-100 flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-apercu-bold text-base sm:text-lg md:text-xl text-gray-900 truncate">QR Code</h3>
              <p className="font-apercu-regular text-xs sm:text-sm text-indigo-600 truncate">
                {registration.fullName}
              </p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Participant Info */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
            <h4 className="font-apercu-bold text-xs sm:text-sm text-gray-900 mb-2 sm:mb-3 flex items-center">
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-gray-600 flex-shrink-0" />
              Participant Information
            </h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-600 flex-shrink-0">Name:</span>
                <span className="font-apercu-medium text-gray-900 text-right break-words">{registration.fullName}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-600 flex items-center flex-shrink-0">
                  <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                  Email:
                </span>
                <span className="font-apercu-medium text-gray-900 text-right break-all text-xs sm:text-sm">
                  {registration.emailAddress}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-600 flex items-center flex-shrink-0">
                  <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                  Registered:
                </span>
                <span className="font-apercu-medium text-gray-900 text-right text-xs sm:text-sm">
                  {formatDate(registration.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Display - Responsive */}
          <div className="text-center">
            <h4 className="font-apercu-bold text-xs sm:text-sm text-gray-900 mb-3 sm:mb-4">
              Scan QR Code for Verification
            </h4>
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="bg-white p-2 sm:p-3 md:p-4 rounded-lg border-2 border-gray-200 shadow-sm max-w-full">
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-52 lg:h-52 mx-auto">
                  <QRCodeDisplay
                    qrData={registration.qrCode}
                    size={150} // Will be responsive via CSS
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3 sm:mb-4 px-2">
              📱 Use any QR scanner or the attendance verification system to scan this code
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
              <p className="text-xs text-green-700 font-apercu-medium">
                ✅ This QR code remains valid until scanned for verification
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons - Fixed Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 p-3 sm:p-4 md:p-6 bg-white">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleCopyQRData}
              className="flex-1 font-apercu-medium text-xs sm:text-sm py-2 sm:py-3"
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {copied ? 'Copied!' : 'Copy QR Data'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="flex-1 font-apercu-medium text-xs sm:text-sm py-2 sm:py-3"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-6 border-b border-indigo-100">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-lg sm:text-xl text-gray-900">QR Code</h3>
              <p className="font-apercu-regular text-sm text-indigo-600">
                {registration.fullName}
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
                <span className="font-apercu-medium text-gray-900">{registration.fullName}</span>
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

          {/* QR Code Display */}
          <div className="text-center">
            <h4 className="font-apercu-bold text-sm text-gray-900 mb-4">
              Scan QR Code for Verification
            </h4>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                <QRCodeDisplay 
                  qrData={registration.qrCode} 
                  size={200}
                  className="mx-auto"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              📱 Use any QR scanner or the attendance verification system to scan this code
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700 font-apercu-medium">
                ✅ This QR code remains valid until scanned for verification
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleCopyQRData}
              className="flex-1 font-apercu-medium text-sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy QR Data'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="flex-1 font-apercu-medium text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

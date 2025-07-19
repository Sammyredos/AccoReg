'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Loader2, AlertCircle } from 'lucide-react'

interface QRCodeDisplayProps {
  qrData: string
  size?: number
  className?: string
}

export function QRCodeDisplay({ qrData, size = 200, className = '' }: QRCodeDisplayProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateQRImage = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const imageUrl = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'H', // High error correction for better scanning
          margin: 3, // Increased margin for better detection
          color: {
            dark: '#000000', // Pure black for better contrast
            light: '#ffffff'
          },
          width: size,
          scale: 8 // Higher scale for crisp rendering
        })
        
        setQrImageUrl(imageUrl)
      } catch (err) {
        console.error('Error generating QR code image:', err)
        setError('Failed to generate QR code image')
      } finally {
        setLoading(false)
      }
    }

    if (qrData) {
      generateQRImage()
    }
  }, [qrData, size])

  if (loading) {
    return (
      <div className={`flex items-center justify-center aspect-square ${className}`}>
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-indigo-600" />
          <p className="text-xs text-gray-500">Generating QR code...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg aspect-square ${className}`}>
        <div className="flex flex-col items-center space-y-2 p-2 sm:p-4">
          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          <p className="text-xs text-red-600 text-center">{error}</p>
        </div>
      </div>
    )
  }

  if (!qrImageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg aspect-square ${className}`}>
        <p className="text-xs text-gray-500">No QR code available</p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <img
        src={qrImageUrl}
        alt="QR Code for Registration"
        className="w-full h-full object-contain rounded-lg border border-gray-200 shadow-sm"
      />
    </div>
  )
}

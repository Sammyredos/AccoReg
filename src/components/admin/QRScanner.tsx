'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Camera,
  Upload,
  Scan,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

// QR Code result interface
interface QRCodeResult {
  data: string
  location?: {
    topLeftCorner: { x: number; y: number }
    topRightCorner: { x: number; y: number }
    bottomLeftCorner: { x: number; y: number }
    bottomRightCorner: { x: number; y: number }
  }
}

// Component props interface
interface QRScannerProps {
  isOpen: boolean
  onCloseAction: () => void
  onScanAction: (qrData: string) => Promise<void>
}



export function QRScanner({ isOpen, onCloseAction, onScanAction }: QRScannerProps) {
  // State management
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastScannedId, setLastScannedId] = useState<string | null>(null)
  const [autoScanActive, setAutoScanActive] = useState(false)
  const [jsQRLoaded, setJsQRLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{
    cameraSupported: boolean
    videoReady: boolean
    canvasReady: boolean
    lastScanAttempt: string | null
    scanAttempts: number
  }>({
    cameraSupported: false,
    videoReady: false,
    canvasReady: false,
    lastScanAttempt: null,
    scanAttempts: 0
  })
  
  // Refs for DOM elements and streams
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const jsQRRef = useRef<any>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccess(null)
      setLastScannedId(null)
      setProcessing(false)
      loadJsQR()
    } else {
      cleanup()
    }
  }, [isOpen])

  // Load jsQR library dynamically
  const loadJsQR = async () => {
    if (jsQRRef.current) {
      setJsQRLoaded(true)
      return
    }

    try {
      const jsQRModule = await import('jsqr')
      jsQRRef.current = jsQRModule.default
      setJsQRLoaded(true)
      console.log('✅ jsQR library loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load jsQR library:', error)
      setJsQRLoaded(false)
    }
  }

  // Cleanup function
  const cleanup = () => {
    stopCamera()
    stopAutoScan()
    setScanning(false)
    setAutoScanActive(false)
  }

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Stop auto-scanning
  const stopAutoScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setAutoScanActive(false)
  }

  // Start camera for scanning
  const startCamera = async () => {
    try {
      setError(null)
      setScanning(true)

      // Check if camera is supported
      const cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      setDebugInfo(prev => ({ ...prev, cameraSupported }))

      if (!cameraSupported) {
        throw new Error('Camera not supported in this browser')
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        setDebugInfo(prev => ({ ...prev, videoReady: true }))

        // Start auto-scanning after video is ready
        setTimeout(() => {
          if (jsQRLoaded) {
            startAutoScan()
          }
        }, 1000)
      }

    } catch (error: any) {
      console.error('Camera error:', error)
      setScanning(false)

      if (error.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access and try again.')
      } else if (error.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.')
      } else {
        setError(`Camera error: ${error.message}`)
      }
    }
  }

  // Start auto-scanning
  const startAutoScan = () => {
    if (!jsQRLoaded || !jsQRRef.current) {
      console.log('jsQR not loaded, cannot start auto-scan')
      return
    }

    setAutoScanActive(true)
    
    scanIntervalRef.current = setInterval(() => {
      scanFrame()
    }, 500) // Scan every 500ms for better performance
  }

  // Scan current video frame
  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !jsQRRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    try {
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        canvasReady: true,
        lastScanAttempt: new Date().toLocaleTimeString(),
        scanAttempts: prev.scanAttempts + 1
      }))

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      if (!imageData || imageData.data.length === 0) return

      // Scan for QR code with multiple attempts
      const scanOptions = [
        { inversionAttempts: 'attemptBoth' as const },
        { inversionAttempts: 'onlyInvert' as const },
        { inversionAttempts: 'dontInvert' as const }
      ]

      let qrCode: QRCodeResult | null = null
      for (const options of scanOptions) {
        try {
          qrCode = jsQRRef.current(imageData.data, imageData.width, imageData.height, options) as QRCodeResult | null
          if (qrCode && qrCode.data) break
        } catch (scanError) {
          // Continue to next option
        }
      }

      if (qrCode && qrCode.data) {
        console.log('🎯 QR Code detected:', qrCode.data.substring(0, 50) + '...')
        stopAutoScan()
        await processDetectedQR(qrCode.data)
      }

    } catch (error) {
      // Silent error for auto-scan
      console.log('Scan frame error:', error)
    }
  }

  // Process detected QR code
  const processDetectedQR = async (qrData: string) => {
    if (processing || qrData === lastScannedId) return

    try {
      setProcessing(true)
      setError(null)
      setLastScannedId(qrData)

      console.log('🔄 Processing QR code:', qrData.substring(0, 50) + '...')

      await onScanAction(qrData)

      setSuccess('Participant has just been verified with QR code!')

      // Auto-close after success (optional)
      setTimeout(() => {
        handleClose()
      }, 3000) // Increased to 3 seconds to read the name

    } catch (error: any) {
      console.error('QR processing error:', error)
      setError(error.message || 'Failed to process QR code')
    } finally {
      setProcessing(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      setProcessing(true)

      if (!jsQRLoaded || !jsQRRef.current) {
        throw new Error('QR scanner not ready. Please wait and try again.')
      }

      // Create image from file
      const img = new Image()
      const canvas = canvasRef.current

      if (!canvas) throw new Error('Canvas not available')

      img.onload = async () => {
        try {
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Canvas context not available')

          // Set canvas size and draw image
          canvas.width = img.width
          canvas.height = img.height
          context.drawImage(img, 0, 0)

          // Get image data and scan
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const qrCode = jsQRRef.current(imageData.data, imageData.width, imageData.height) as QRCodeResult | null

          if (qrCode && qrCode.data) {
            await processDetectedQR(qrCode.data)
          } else {
            setError('No QR code found in the uploaded image')
          }
        } catch (error: any) {
          setError(`Failed to scan uploaded image: ${error.message}`)
        } finally {
          setProcessing(false)
        }
      }

      img.onerror = () => {
        setError('Failed to load uploaded image')
        setProcessing(false)
      }

      img.src = URL.createObjectURL(file)

    } catch (error: any) {
      setError(error.message)
      setProcessing(false)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }



  // Handle modal close
  const handleClose = () => {
    cleanup()
    setError(null)
    setSuccess(null)
    onCloseAction()
  }

  // Don't render if modal is closed
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[95vh] overflow-y-auto">
        <div className="p-3 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-base sm:text-lg text-gray-900 truncate">QR Code Scanner</h2>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Scan attendee QR codes for verification</p>
                <p className="text-xs text-gray-600 sm:hidden">Scan QR codes</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Loading State */}
          {!jsQRLoaded && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
              <span className="text-sm text-blue-700">Loading QR scanner...</span>
            </div>
          )}

          {/* Scanner Status */}
          {scanning && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Camera className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Camera Active</span>
                {autoScanActive && (
                  <Badge variant="secondary" className="text-xs">
                    Auto-scanning
                  </Badge>
                )}
              </div>
              <p className="text-xs text-yellow-700">
                Position QR code in front of camera. Scanner will automatically detect codes.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {/* Camera Scan Button */}
            <Button
              onClick={startCamera}
              disabled={scanning || processing || !jsQRLoaded}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              {scanning ? 'Camera Active' : 'Scan with Camera'}
            </Button>

            {/* File Upload Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing || !jsQRLoaded}
              variant="outline"
              className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload QR Image
            </Button>
          </div>



          {/* Camera Controls */}
          {scanning && (
            <div className="mb-6 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1"
                >
                  Stop Camera
                </Button>
                {jsQRLoaded && !autoScanActive && (
                  <Button
                    onClick={startAutoScan}
                    variant="outline"
                    className="flex-1"
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Start Auto-Scan
                  </Button>
                )}
                {autoScanActive && (
                  <Button
                    onClick={stopAutoScan}
                    variant="outline"
                    className="flex-1"
                  >
                    Stop Auto-Scan
                  </Button>
                )}
              </div>

              {/* Manual Scan Button */}
              <Button
                onClick={scanFrame}
                disabled={processing || !jsQRLoaded}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                <Scan className="h-4 w-4 mr-2" />
                {processing ? 'Scanning...' : 'Scan Now'}
              </Button>
            </div>
          )}

          {/* Video and Canvas Elements */}
          <div className="relative">
            {scanning && (
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 sm:h-80 object-cover"
                  playsInline
                  muted
                />
                {autoScanActive && (
                  <div className="absolute inset-0 border-2 border-green-400 rounded-lg">
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                      Scanning...
                    </div>
                  </div>
                )}
              </div>
            )}

            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Processing Overlay */}
          {processing && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-green-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Processing QR code...</p>
              </div>
            </div>
          )}

          {/* Debug Information Panel */}
          {scanning && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Scanner Status:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div>Camera: {debugInfo.cameraSupported ? '✅ Supported' : '❌ Not Supported'}</div>
                <div>Video: {debugInfo.videoReady ? '✅ Ready' : '⏳ Loading'}</div>
                <div>Canvas: {debugInfo.canvasReady ? '✅ Ready' : '⏳ Waiting'}</div>
                <div>jsQR: {jsQRLoaded ? '✅ Loaded' : '⏳ Loading'}</div>
                <div className="col-span-2">Scan Attempts: {debugInfo.scanAttempts}</div>
                {debugInfo.lastScanAttempt && (
                  <div className="col-span-2">Last Scan: {debugInfo.lastScanAttempt}</div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">How to use:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Click "Scan with Camera" to use your device camera</li>
              <li>• Click "Upload QR Image" to scan from a saved image</li>
              <li>• Use "Scan Now" button for manual scanning</li>
              <li>• Position QR code clearly in view for best results</li>
              <li>• Scanner will automatically detect and process QR codes</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

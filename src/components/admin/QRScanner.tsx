'use client'

// QR Code type definition
interface QRCodeResult {
  data: string
  location: {
    topLeftCorner: { x: number; y: number }
    topRightCorner: { x: number; y: number }
    bottomLeftCorner: { x: number; y: number }
    bottomRightCorner: { x: number; y: number }
  }
}

import { useState, useRef, useEffect } from 'react'
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

interface QRScannerProps {
  isOpen: boolean
  onCloseAction: () => void
  onScanAction: (qrData: string) => Promise<void>
}

export function QRScanner({ isOpen, onCloseAction, onScanAction }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastScannedId, setLastScannedId] = useState<string | null>(null)
  const [autoScanActive, setAutoScanActive] = useState(false)
  const [scanAttempts, setScanAttempts] = useState(0)
  const [scanFeedback, setScanFeedback] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastScanAttemptRef = useRef<number>(0)

  const streamRef = useRef<MediaStream | null>(null)

  // Helper function to refresh the page
  const refreshPage = () => {
    window.location.reload()
  }

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 QR Scanner opened, resetting state...')
      setLastScannedId(null)
      setError(null)
      setSuccess(null)
      setProcessing(false)
    }
  }, [isOpen])

  // Cleanup camera stream and auto-scan when component unmounts or closes
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      stopAutoScan()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      setScanning(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Set up event listeners for video
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 Video metadata loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
        }

        videoRef.current.oncanplay = () => {
          console.log('📹 Video can play, starting auto-scan...')
          // Start auto-scan when video is ready to play
          setTimeout(() => {
            startAutoScan()
          }, 500) // Small delay to ensure video is fully ready
        }

        videoRef.current.onplaying = () => {
          console.log('📹 Video is playing, ensuring auto-scan is active...')
          // Backup trigger for auto-scan
          setTimeout(() => {
            if (!scanIntervalRef.current) {
              console.log('🔄 Auto-scan not active, starting now...')
              startAutoScan()
            }
          }, 1000)
        }

        // Start playing the video
        await videoRef.current.play()
        console.log('📹 Video started playing')

        // Additional fallback to ensure auto-scan starts
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !scanIntervalRef.current) {
            console.log('🔄 Fallback: Starting auto-scan after 2 seconds...')
            startAutoScan()
          }
        }, 2000)
      }
    } catch (err) {
      console.error('Camera access error:', err)
      setError('Unable to access camera. Please check permissions, refresh the page, or try uploading an image instead.')
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    stopAutoScan()
    setScanning(false)
  }

  // Start automatic QR code scanning
  const startAutoScan = () => {
    if (scanIntervalRef.current) {
      console.log('🔍 Auto-scan already active')
      return // Already scanning
    }

    setAutoScanActive(true)
    setScanAttempts(0)
    setScanFeedback('')
    console.log('🔍 Starting automatic QR detection...')

    scanIntervalRef.current = setInterval(() => {
      // More lenient readiness check
      if (!processing && scanning && videoRef.current) {
        const video = videoRef.current
        // Check if video has valid dimensions and is ready
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          performAutoScan()
        } else {
          console.log('⏳ Video not ready yet - readyState:', video.readyState, 'dimensions:', video.videoWidth, 'x', video.videoHeight)
        }
      }
    }, 100) // Scan every 100ms for fast, responsive detection
  }

  // Stop automatic scanning
  const stopAutoScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setAutoScanActive(false)
    setScanFeedback('')
    console.log('🛑 Stopped automatic QR detection')
  }

  // Perform automatic QR scan
  const performAutoScan = async () => {
    if (!videoRef.current || !canvasRef.current || processing) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.log('❌ Canvas context not available')
      return
    }

    // Check video dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('⏳ Video dimensions not ready:', video.videoWidth, 'x', video.videoHeight)
      return
    }

    try {
      // Increment scan attempts for user feedback
      const currentAttempts = scanAttempts + 1
      setScanAttempts(currentAttempts)

      // Provide progressive feedback to guide users
      if (currentAttempts === 5) {
        setScanFeedback('🔍 Scanning for QR code...')
      } else if (currentAttempts === 20) {
        setScanFeedback('📱 Center QR code in frame')
      } else if (currentAttempts === 40) {
        setScanFeedback('💡 Ensure good lighting')
      } else if (currentAttempts === 80) {
        setScanFeedback('⚠️ Try manual "Scan Now" if needed')
      }

      // Optimize canvas size for faster processing (half resolution)
      const scale = 0.6 // Process at 60% resolution for speed vs accuracy balance
      canvas.width = video.videoWidth * scale
      canvas.height = video.videoHeight * scale

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data for QR scanning
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      // Validate image data
      if (!imageData || imageData.data.length === 0) {
        console.log('❌ No image data captured')
        return
      }

      // Try to scan QR code using jsQR library with multiple attempts
      let jsQR: any
      try {
        jsQR = (await import('jsqr')).default
      } catch (importError) {
        console.error('Failed to import jsQR:', importError)
        setError('QR scanning library not available. Please refresh the page to reload the scanner.')
        return
      }

      // Fast scanning - try normal first, then inverted if needed
      let qrCode: QRCodeResult | null = null

      // First attempt: Normal scan (fastest)
      qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      }) as QRCodeResult | null

      // If no QR found and we've tried enough times, try inverted
      if (!qrCode && currentAttempts > 30) {
        qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'onlyInvert'
        }) as QRCodeResult | null
      }

      // Last resort: try both (slower but thorough)
      if (!qrCode && currentAttempts > 60) {
        qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        }) as QRCodeResult | null
      }

      if (qrCode && qrCode.data) {
        console.log('🎯 QR Code automatically detected!', qrCode.data.substring(0, 50) + '...')

        // Stop auto-scanning to prevent multiple detections
        stopAutoScan()

        // Process the detected QR code
        await processDetectedQR(qrCode.data)
      } else {
        // Log every 20th attempt to avoid spam
        if (Math.random() < 0.05) {
          console.log('🔍 Auto-scan attempt - no QR code found (canvas:', canvas.width, 'x', canvas.height, ')')
        }
      }
    } catch (error) {
      // Log errors but don't show to user for auto-scan
      console.error('Auto-scan error:', error)
    }
  }

  // Process detected QR code data
  const processDetectedQR = async (qrData: string) => {
    try {
      setProcessing(true)
      setError(null)
      setSuccess(null)

      console.log('🔍 Processing detected QR code:', qrData.substring(0, 100) + '...')

      // Validate QR data format
      if (qrData.startsWith('{') && qrData.endsWith('}')) {
        try {
          // Verify it's valid JSON
          const parsedData = JSON.parse(qrData)

          // Validate required fields
          if (parsedData.id && parsedData.fullName && parsedData.checksum) {
            console.log('✅ Valid QR data detected for:', parsedData.fullName)

            // Prevent duplicate scans of the same QR code
            if (parsedData.id === lastScannedId) {
              setError('This QR code was already scanned recently')
              setProcessing(false)
              // Restart auto-scan after error
              setTimeout(() => {
                if (scanning) startAutoScan()
              }, 2000)
              return
            }

            // Set the scanned ID for tracking
            setLastScannedId(parsedData.id)

            // Process the QR code
            await onScanAction(qrData)
            setSuccess(`QR code detected for ${parsedData.fullName}!`)

          } else {
            setError('QR code missing required registration data')
          }
        } catch (parseError) {
          setError('Invalid QR code format - not valid JSON')
        }
      } else {
        setError('QR code does not contain registration data')
      }
    } catch (err) {
      console.error('QR processing error:', err)
      setError('Failed to process QR code. Please try again.')
    } finally {
      setProcessing(false)

      // Restart auto-scan after processing (success or error)
      setTimeout(() => {
        if (scanning && !processing) {
          startAutoScan()
        }
      }, 2000) // Wait 2 seconds before restarting auto-scan
    }
  }



  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await processQRFromBlob(file)
  }

  const processQRFromBlob = async (blob: Blob) => {
    try {
      setProcessing(true)
      setError(null)
      setSuccess(null)

      // Convert blob to image for QR code scanning
      const imageUrl = URL.createObjectURL(blob)
      const img = new Image()

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Create canvas to process the image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Get image data for QR scanning
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Try to scan QR code using jsQR library
      let qrCode: QRCodeResult | null = null
      try {
        // Import jsQR dynamically
        const jsQR = (await import('jsqr')).default
        qrCode = jsQR(imageData.data, imageData.width, imageData.height) as QRCodeResult | null
      } catch (importError) {
        console.warn('jsQR library not available, using fallback method')

        // Fallback: Try to extract QR data from a test scenario
        // This is for development/testing when jsQR is not available
        await handleFallbackQRScan()
        return
      }

      // Clean up
      URL.revokeObjectURL(imageUrl)

      if (qrCode && qrCode.data) {
        console.log('🔍 QR Code detected:', qrCode.data.substring(0, 100) + '...')

        // Validate QR data format
        if (qrCode.data.startsWith('{') && qrCode.data.endsWith('}')) {
          try {
            // Verify it's valid JSON
            JSON.parse(qrCode.data)

            // Process the actual scanned QR code
            await onScanAction(qrCode.data)
            setSuccess('QR code scanned successfully!')

            // Prevent duplicate scans of the same QR code
            const qrData = JSON.parse(qrCode.data)
            if (qrData.id && qrData.id === lastScannedId) {
              setError('This QR code was already scanned recently')
              return
            }
            setLastScannedId(qrData.id)

          } catch (parseError) {
            setError('Invalid QR code format - not valid JSON')
          }
        } else {
          setError('QR code does not contain registration data')
        }
      } else {
        setError('No QR code detected in image. Please ensure the QR code is clearly visible and try again.')
      }

    } catch (err) {
      console.error('QR processing error:', err)
      setError('Failed to process image. Please try again or use manual verification.')
    } finally {
      setProcessing(false)
    }
  }

  // Fallback method for testing when jsQR is not available
  const handleFallbackQRScan = async () => {
    try {
      // In development, allow testing with a sample QR code
      if (process.env.NODE_ENV === 'development') {
        // Fetch a random registration for testing
        const response = await fetch('/api/admin/attendance/registrations?limit=10')
        const data = await response.json()

        if (data.registrations && data.registrations.length > 0) {
          // Get a random registration with QR code
          const registrationsWithQR = data.registrations.filter((r: any) => r.qrCode)
          if (registrationsWithQR.length > 0) {
            const randomIndex = Math.floor(Math.random() * registrationsWithQR.length)
            const registration = registrationsWithQR[randomIndex]

            console.log('🧪 Development mode: Using random QR code for testing')
            await onScanAction(registration.qrCode)
            setSuccess(`Development test: Scanned QR for ${registration.fullName}`)
            return
          }
        }
      }

      // If no real QR codes available, show helpful error
      setError('QR scanning library not available. Please refresh the page to reload the scanner or use manual verification.')

    } catch (fallbackError) {
      console.error('Fallback QR scan error:', fallbackError)
      setError('Unable to process QR code. Please use manual verification.')
    }
  }

  const handleClose = () => {
    console.log('🔄 Closing QR Scanner, cleaning up...')
    stopCamera()
    stopAutoScan()
    setError(null)
    setSuccess(null)
    setLastScannedId(null)
    setProcessing(false)
    onCloseAction()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[95vh] overflow-y-auto">
        <div className="p-3 sm:p-6">
          {/* Header - Mobile Responsive */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-apercu-bold text-base sm:text-lg text-gray-900 truncate">QR Code Scanner</h2>
                <p className="font-apercu-regular text-xs sm:text-sm text-gray-600 hidden sm:block">Scan attendee QR codes for verification</p>
                <p className="font-apercu-regular text-xs text-gray-600 sm:hidden">Scan QR codes</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClose} className="flex-shrink-0 ml-2">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-apercu-regular text-sm text-red-700">{error}</span>
              </div>
              {(error.includes('library not available') || error.includes('refresh the page')) && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={refreshPage}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                  <span className="text-xs text-red-600">
                    {error.includes('library not available')
                      ? 'This will reload the QR scanner library'
                      : 'This may help resolve camera or scanner issues'
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-apercu-regular text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Scanner Interface */}
          <div className="space-y-4">
            {/* Camera View - Mobile Responsive */}
            {scanning && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-48 sm:h-64 bg-gray-900 rounded-lg object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scan Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-green-500 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Controls - Mobile Responsive */}
            <div className="flex flex-col space-y-3">
              {!scanning ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <Button
                    onClick={startCamera}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 w-full text-sm sm:text-base py-2 sm:py-3"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline text-white">Start Camera</span>
                    <span className="sm:hidden text-white">Camera</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-sm sm:text-base py-2 sm:py-3"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Upload Image</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Auto-scan status */}
                  <div className={`border rounded-lg p-3 ${
                    autoScanActive
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {autoScanActive ? (
                          <>
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-700 font-medium">
                              🔍 Auto-scanning active (every 100ms)
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm text-gray-600">
                              Auto-scan paused
                            </span>
                          </>
                        )}
                      </div>
                      {autoScanActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={stopAutoScan}
                          className="text-xs"
                        >
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Scan feedback */}
                  {scanFeedback && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="font-apercu-regular text-sm text-blue-700">
                          {scanFeedback}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Control buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-sm sm:text-base py-2 sm:py-3"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Upload Image</span>
                      <span className="sm:hidden">Upload</span>
                    </Button>

                    {/* Manual scan button */}
                    <Button
                      onClick={async () => {
                        try {
                          await performAutoScan()
                        } catch (scanError) {
                          console.error('Manual scan failed:', scanError)
                          setError('QR scanning failed. Please refresh the page to reload the scanner.')
                        }
                      }}
                      disabled={processing}
                      className="bg-blue-500 hover:bg-blue-600 w-full text-sm sm:text-base py-2 sm:py-3"
                    >
                      {processing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Scan className="h-4 w-4 mr-2" />
                      )}
                      <span className="hidden sm:inline text-white">Scan Now</span>
                      <span className="sm:hidden text-white">Scan</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={stopCamera}
                      className="w-full text-sm sm:text-base py-2 sm:py-3"
                    >
                      <X className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Stop Camera</span>
                      <span className="sm:hidden">Stop</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions - Mobile Responsive */}
            <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-apercu-bold text-sm text-green-900">QR Scanner Ready</p>
                  <p className="font-apercu-regular text-xs sm:text-sm text-green-700 mt-1">
                    <span className="hidden sm:inline">Point your camera at a QR code or upload an image to scan. The system will automatically verify the attendee.</span>
                    <span className="sm:hidden">Scan QR codes to verify attendees automatically.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </Card>
    </div>
  )
}

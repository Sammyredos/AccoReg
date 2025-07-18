'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'
import { QRScanner } from '@/components/admin/QRScanner'
import { Card } from '@/components/ui/card'
import { QrCode, User, Scan, RefreshCw, Eye, Download } from 'lucide-react'

interface Registration {
  id: string
  fullName: string
  emailAddress: string
  phoneNumber: string
  gender: string
  dateOfBirth: string
  qrCode: string | null
  isVerified: boolean
  createdAt: string
}

export default function QRIndividualTestPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)

  // Fetch registrations
  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/registrations?limit=10')
      if (response.ok) {
        const data = await response.json()
        setRegistrations(data.registrations || [])
      }
    } catch (error) {
      console.error('Error fetching registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async (registrationId: string) => {
    try {
      setGenerating(registrationId)
      const response = await fetch(`/api/admin/registrations/${registrationId}/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('QR Generation Result:', result)
        
        // Update the registration in state
        setRegistrations(prev => prev.map(reg => 
          reg.id === registrationId 
            ? { ...reg, qrCode: result.qrCode }
            : reg
        ))

        if (selectedRegistration?.id === registrationId) {
          setSelectedRegistration(prev => prev ? { ...prev, qrCode: result.qrCode } : null)
        }
      } else {
        const error = await response.json()
        console.error('QR Generation Error:', error)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setGenerating(null)
    }
  }

  const handleScanAction = async (qrData: string) => {
    console.log('Scanned QR Data:', qrData)
    setScanResult(qrData)
    
    try {
      // Try to parse the QR data
      const parsed = JSON.parse(qrData)
      console.log('Parsed QR Data:', parsed)
      
      // Try to verify the QR code using test endpoint
      const response = await fetch('/api/test/qr-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData })
      })
      
      const result = await response.json()
      console.log('Verification Result:', result)
      
    } catch (error) {
      console.error('Error processing scanned QR:', error)
    }
  }

  const downloadQRCode = (registration: Registration) => {
    if (!registration.qrCode) return
    
    // Create a canvas to generate the QR code image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // For now, just download the QR data as text
    const blob = new Blob([registration.qrCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-code-${registration.fullName.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading registrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code Individual Test</h1>
          <p className="text-gray-600">Test individual QR code generation, display, and scanning functionality</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registrations List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Registrations</h2>
            <div className="space-y-4">
              {registrations.map((registration) => (
                <Card key={registration.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{registration.fullName}</h3>
                      <p className="text-sm text-gray-600">{registration.emailAddress}</p>
                      <p className="text-xs text-gray-500">
                        QR: {registration.qrCode ? '✅ Generated' : '❌ Not Generated'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRegistration(registration)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {!registration.qrCode ? (
                        <Button
                          size="sm"
                          onClick={() => generateQRCode(registration.id)}
                          disabled={generating === registration.id}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          {generating === registration.id ? 'Generating...' : 'Generate QR'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQRCode(registration)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* QR Code Display and Scanner */}
          <div>
            <div className="space-y-6">
              {/* Selected Registration QR Display */}
              {selectedRegistration && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    QR Code for {selectedRegistration.fullName}
                  </h3>
                  
                  {selectedRegistration.qrCode ? (
                    <div className="space-y-4">
                      {/* Visual QR Code */}
                      <div className="text-center">
                        <QRCodeDisplay 
                          qrData={selectedRegistration.qrCode} 
                          size={200}
                          className="mx-auto"
                        />
                      </div>
                      
                      {/* QR Data */}
                      <div>
                        <h4 className="font-medium mb-2">QR Data:</h4>
                        <div className="bg-gray-100 p-3 rounded text-xs font-mono break-all">
                          {selectedRegistration.qrCode}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => generateQRCode(selectedRegistration.id)}
                          disabled={generating === selectedRegistration.id}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Regenerate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQRCode(selectedRegistration)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-4">No QR code generated</p>
                      <Button
                        onClick={() => generateQRCode(selectedRegistration.id)}
                        disabled={generating === selectedRegistration.id}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        {generating === selectedRegistration.id ? 'Generating...' : 'Generate QR Code'}
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {/* QR Scanner */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">QR Code Scanner Test</h3>
                
                {!showScanner ? (
                  <div className="text-center py-8">
                    <Scan className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">Test QR code scanning</p>
                    <Button onClick={() => setShowScanner(true)}>
                      <Scan className="h-4 w-4 mr-2" />
                      Open Scanner
                    </Button>
                  </div>
                ) : (
                  <div>
                    <QRScanner
                      isOpen={showScanner}
                      onClose={() => setShowScanner(false)}
                      onScanAction={handleScanAction}
                    />
                  </div>
                )}

                {/* Scan Result */}
                {scanResult && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                    <h4 className="font-medium text-green-800 mb-2">Last Scan Result:</h4>
                    <div className="text-xs font-mono text-green-700 break-all">
                      {scanResult}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'
import { Card } from '@/components/ui/card'
import { QrCode, Copy, Download, Eye, EyeOff } from 'lucide-react'

export default function QRAnalyzePage() {
  const [qrInput, setQrInput] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [showRawData, setShowRawData] = useState(false)
  const [testQRs, setTestQRs] = useState<any[]>([])

  const analyzeQR = async () => {
    if (!qrInput.trim()) return

    try {
      // Try to parse as JSON
      let parsedData = null
      let isValidJSON = false
      
      try {
        parsedData = JSON.parse(qrInput)
        isValidJSON = true
      } catch (e) {
        isValidJSON = false
      }

      // Test verification
      const verifyResponse = await fetch('/api/test/qr-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: qrInput })
      })
      
      const verifyResult = await verifyResponse.json()

      setAnalysis({
        input: qrInput,
        length: qrInput.length,
        isValidJSON,
        parsedData,
        verification: verifyResult,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Analysis error:', error)
      setAnalysis({
        input: qrInput,
        length: qrInput.length,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }

  const generateTestQRs = async () => {
    try {
      // Generate simple format
      const simpleResponse = await fetch('/api/test/qr-generate?format=simple&id=test-simple-123')
      const simpleData = await simpleResponse.json()

      // Generate JSON format
      const jsonResponse = await fetch('/api/test/qr-generate?format=json&id=test-json-456')
      const jsonData = await jsonResponse.json()

      setTestQRs([
        { name: 'Simple Format', ...simpleData },
        { name: 'JSON Format', ...jsonData }
      ])

    } catch (error) {
      console.error('Error generating test QRs:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code Analyzer</h1>
          <p className="text-gray-600">Analyze and debug QR code data and formats</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input and Analysis */}
          <div className="space-y-6">
            {/* QR Input */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">QR Data Input</h2>
              <div className="space-y-4">
                <textarea
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste QR code data here..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={analyzeQR} disabled={!qrInput.trim()}>
                    <Eye className="h-4 w-4 mr-2" />
                    Analyze QR
                  </Button>
                  <Button variant="outline" onClick={() => setQrInput('')}>
                    Clear
                  </Button>
                </div>
              </div>
            </Card>

            {/* Analysis Results */}
            {analysis && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Length:</span> {analysis.length}
                    </div>
                    <div>
                      <span className="font-medium">Valid JSON:</span> {analysis.isValidJSON ? '✅ Yes' : '❌ No'}
                    </div>
                  </div>

                  {/* Parsed Data */}
                  {analysis.parsedData && (
                    <div>
                      <h3 className="font-medium mb-2">Parsed JSON Data:</h3>
                      <div className="bg-gray-100 p-3 rounded text-xs font-mono">
                        <pre>{JSON.stringify(analysis.parsedData, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Verification Result */}
                  {analysis.verification && (
                    <div>
                      <h3 className="font-medium mb-2">Verification Result:</h3>
                      <div className="bg-blue-50 p-3 rounded text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>Success: {analysis.verification.success ? '✅' : '❌'}</div>
                          <div>Valid: {analysis.verification.verification?.isValid ? '✅' : '❌'}</div>
                        </div>
                        {analysis.verification.verification?.error && (
                          <div className="mt-2 text-red-600">
                            Error: {analysis.verification.verification.error}
                          </div>
                        )}
                        {analysis.verification.verification?.registration && (
                          <div className="mt-2">
                            <strong>Registration Found:</strong> {analysis.verification.verification.registration.fullName}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Data Toggle */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRawData(!showRawData)}
                    >
                      {showRawData ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showRawData ? 'Hide' : 'Show'} Raw Data
                    </Button>
                    
                    {showRawData && (
                      <div className="mt-2 bg-gray-100 p-3 rounded text-xs font-mono break-all">
                        {analysis.input}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Test QR Generation */}
          <div className="space-y-6">
            {/* Generate Test QRs */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Test QR Generation</h2>
              <div className="space-y-4">
                <Button onClick={generateTestQRs}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate Test QR Codes
                </Button>

                {testQRs.map((qr, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium mb-2">{qr.name}</h3>
                    
                    {/* QR Image */}
                    {qr.qrDataUrl && (
                      <div className="text-center mb-3">
                        <img 
                          src={qr.qrDataUrl} 
                          alt={`${qr.name} QR Code`}
                          className="mx-auto w-32 h-32 border border-gray-300 rounded"
                        />
                      </div>
                    )}

                    {/* QR Data */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Data:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(qr.qrData)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQrInput(qr.qrData)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Analyze
                        </Button>
                      </div>
                      <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all max-h-20 overflow-y-auto">
                        {qr.qrData}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* QR Display Test */}
            {qrInput && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">QR Display Test</h2>
                <div className="text-center">
                  <QRCodeDisplay qrData={qrInput} size={200} className="mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">
                    Generated QR code from input data
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Mail, Settings } from 'lucide-react'

interface EmailStatus {
  configured: boolean
  envConfigured: boolean
  dbConfigured: boolean
  missingVars: string[]
  canSendEmail: boolean
}

export function EmailStatusChecker() {
  const [status, setStatus] = useState<EmailStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)

  const checkEmailStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings/email/debug')
      if (response.ok) {
        const data = await response.json()
        setStatus({
          configured: data.configuration.environment.configured && data.configuration.database.configured,
          envConfigured: data.configuration.environment.configured,
          dbConfigured: data.configuration.database.configured,
          missingVars: data.configuration.environment.missing || [],
          canSendEmail: data.configuration.environment.configured
        })
      }
    } catch (error) {
      console.error('Failed to check email status:', error)
    } finally {
      setLoading(false)
    }
  }

  const testEmailSending = async () => {
    if (!testEmail) return
    
    setTesting(true)
    try {
      const response = await fetch('/api/admin/communications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testEmail: testEmail
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        const isDevelopmentMode = data.details?.mode === 'development'
        if (isDevelopmentMode) {
          alert(`🔧 Development Mode: Email test simulated successfully for ${testEmail}. No actual email sent in development mode.`)
        } else {
          alert(`✅ Test email sent successfully to ${testEmail}`)
        }
        setTestEmail('')
      } else {
        alert(`❌ Test failed: ${data.message || data.error}`)
      }
    } catch (error) {
      alert(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    checkEmailStatus()
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-blue-200 rounded animate-pulse"></div>
          <span>Checking email configuration...</span>
        </div>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span>Unable to check email configuration</span>
          </div>
          <Button onClick={checkEmailStatus} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Configuration Status</span>
          </h3>
          <Button onClick={checkEmailStatus} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {status.envConfigured ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Environment Variables</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {status.dbConfigured ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm">Database Settings</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {status.canSendEmail ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Ready to Send</span>
            </div>
          </div>
        </div>

        {status.missingVars.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800 mb-1">Missing Configuration:</p>
            <ul className="text-xs text-yellow-700 space-y-1">
              {status.missingVars.map(varName => (
                <li key={varName}>• {varName}</li>
              ))}
            </ul>
          </div>
        )}

        {status.canSendEmail && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Test Email Sending:</p>
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="Enter test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <Button
                onClick={testEmailSending}
                disabled={!testEmail || testing}
                size="sm"
              >
                {testing ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        )}

        {!status.configured && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Quick Setup:</strong> Go to Settings → Email Configuration to set up SMTP settings.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

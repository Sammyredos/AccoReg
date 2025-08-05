'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle, XCircle, Settings, Shield, Bell } from 'lucide-react'
import { useAppSettings } from '@/hooks/useAppSettings'

export function SettingsTestComponent() {
  const { settings, loading, error, refreshSettings } = useAppSettings()
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const runNotificationTests = () => {
    const tests = {
      emailOnRegistration: settings.emailOnRegistration,
      emailOnVerification: settings.emailOnVerification,
      emailOnAllocation: settings.emailOnAllocation,
      smsOnRegistration: settings.smsOnRegistration,
      smsOnVerification: settings.smsOnVerification,
      notificationDelay: settings.notificationDelay,
      reminderAdvance: settings.reminderAdvance,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd
    }
    
    setTestResults(prev => ({ ...prev, notifications: tests }))
    console.log('🔔 Notification Settings Test Results:', tests)
  }

  const runSecurityTests = () => {
    const tests = {
      sessionTimeout: settings.sessionTimeout,
      maxLoginAttempts: settings.maxLoginAttempts,
      passwordMinLength: settings.passwordMinLength,
      requireStrongPassword: settings.requireStrongPassword,
      twoFactorAuth: settings.twoFactorAuth,
      encryptSensitiveData: settings.encryptSensitiveData,
      enableAuditLog: settings.enableAuditLog,
      apiRateLimit: settings.apiRateLimit,
      corsEnabled: settings.corsEnabled
    }
    
    setTestResults(prev => ({ ...prev, security: tests }))
    console.log('🔒 Security Settings Test Results:', tests)
  }

  const testEmailNotification = async () => {
    try {
      const response = await fetch('/api/admin/communications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: 'test@example.com' })
      })
      
      const result = await response.json()
      setTestResults(prev => ({ 
        ...prev, 
        emailTest: { 
          success: response.ok, 
          message: result.message,
          actualEmailSent: result.details?.actualEmailSent || false
        }
      }))
      console.log('📧 Email Test Result:', result)
    } catch (error) {
      console.error('Email test failed:', error)
      setTestResults(prev => ({ 
        ...prev, 
        emailTest: { success: false, message: 'Test failed', error: error.message }
      }))
    }
  }

  useEffect(() => {
    if (!loading && Object.keys(settings).length > 0) {
      runNotificationTests()
      runSecurityTests()
    }
  }, [settings, loading])

  const renderTestResult = (key: string, value: any) => {
    const isBoolean = typeof value === 'boolean'
    const isNumber = typeof value === 'number'
    const isString = typeof value === 'string'
    
    let variant: 'default' | 'secondary' | 'destructive' = 'secondary'
    let icon = <XCircle className="h-3 w-3 mr-1" />
    
    if (isBoolean && value) {
      variant = 'default'
      icon = <CheckCircle className="h-3 w-3 mr-1" />
    } else if (isNumber && value > 0) {
      variant = 'default'
      icon = <CheckCircle className="h-3 w-3 mr-1" />
    } else if (isString && value) {
      variant = 'default'
      icon = <CheckCircle className="h-3 w-3 mr-1" />
    }
    
    return (
      <Badge variant={variant} className="text-xs">
        {icon}
        {String(value)}
      </Badge>
    )
  }

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-apercu-bold text-lg text-gray-900">Settings Integration Test</h3>
            <p className="font-apercu-regular text-sm text-gray-600">
              Test if notification and security settings are working across the app
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={refreshSettings}
            disabled={loading}
            variant="outline"
            size="sm"
            className="font-apercu-medium"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
          <Button
            onClick={testEmailNotification}
            variant="outline"
            size="sm"
            className="font-apercu-medium"
          >
            Test Email
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-blue-500 mr-2" />
            <h4 className="font-apercu-medium text-base text-gray-900">Notification Settings</h4>
          </div>
          
          {testResults.notifications && (
            <div className="space-y-2">
              {Object.entries(testResults.notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  {renderTestResult(key, value)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="space-y-4">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-green-500 mr-2" />
            <h4 className="font-apercu-medium text-base text-gray-900">Security Settings</h4>
          </div>
          
          {testResults.security && (
            <div className="space-y-2">
              {Object.entries(testResults.security).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  {renderTestResult(key, value)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Test Results */}
      {testResults.emailTest && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-apercu-medium text-sm text-gray-900 mb-2">Email Test Results</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge variant={testResults.emailTest.success ? 'default' : 'destructive'}>
              {testResults.emailTest.success ? 'Success' : 'Failed'}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mt-2">{testResults.emailTest.message}</p>
          {testResults.emailTest.actualEmailSent !== undefined && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">Real Email Sent:</span>
              <Badge variant={testResults.emailTest.actualEmailSent ? 'default' : 'secondary'}>
                {testResults.emailTest.actualEmailSent ? 'Yes' : 'Simulated'}
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-apercu-medium text-sm text-gray-900 mb-2">Integration Status</h4>
        <p className="text-xs text-gray-600">
          Settings are loaded via the useAppSettings hook and are available throughout the application.
          Changes made in the Settings page should be reflected here immediately after refresh.
        </p>
      </div>
    </Card>
  )
}

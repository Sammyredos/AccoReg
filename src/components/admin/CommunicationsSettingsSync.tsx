'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react'
import {
  validateSettingsSync,
  settingsToEmailConfig,
  settingsToSMSConfig,
  type SettingsStructure,
  type EmailConfig,
  type SMSConfig
} from '@/lib/communications-mapping'

interface SyncStatus {
  isValid: boolean
  emailMismatches: string[]
  smsMismatches: string[]
  lastChecked: Date
}

export function CommunicationsSettingsSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [settings, setSettings] = useState<SettingsStructure | null>(null)
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null)
  const [smsConfig, setSmsConfig] = useState<SMSConfig | null>(null)

  useEffect(() => {
    checkSync()
  }, [])

  const checkSync = async () => {
    setLoading(true)
    try {
      // Fetch settings
      const settingsResponse = await fetch('/api/admin/settings')
      const settingsData = await settingsResponse.json()
      
      // Fetch email config
      const emailResponse = await fetch('/api/admin/email-config')
      const emailData = await emailResponse.json()
      
      // Fetch SMS config
      const smsResponse = await fetch('/api/admin/sms-config')
      const smsData = await smsResponse.json()

      if (settingsData.success && emailData.config && smsData.config) {
        const settingsStructure = settingsData.settings
        const emailConfiguration = emailData.config
        const smsConfiguration = smsData.config

        setSettings(settingsStructure)
        setEmailConfig(emailConfiguration)
        setSmsConfig(smsConfiguration)

        // Validate sync
        const validation = validateSettingsSync(
          settingsStructure.email || [],
          emailConfiguration,
          settingsStructure.sms || [],
          smsConfiguration
        )

        setSyncStatus({
          ...validation,
          lastChecked: new Date()
        })
      }
    } catch (error) {
      console.error('Failed to check sync status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
            <div className="h-6 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (!syncStatus) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="font-apercu-bold text-lg text-red-900">Sync Check Failed</h3>
              <p className="font-apercu-regular text-sm text-red-700">
                Unable to verify settings synchronization
              </p>
            </div>
          </div>
          <Button onClick={checkSync} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${syncStatus.isValid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {syncStatus.isValid ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          )}
          <div>
            <h3 className="font-apercu-bold text-lg text-gray-900">
              Settings Synchronization
            </h3>
            <p className="font-apercu-regular text-sm text-gray-600">
              {syncStatus.isValid 
                ? 'Settings and communications are synchronized'
                : 'Settings and communications have mismatches'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="ghost"
            size="sm"
          >
            {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
          <Button onClick={checkSync} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-green-600" />
            <span className="font-apercu-medium text-sm">Email Settings</span>
          </div>
          <Badge 
            variant={syncStatus.emailMismatches.length === 0 ? 'success' : 'destructive'}
            className="font-apercu-medium text-xs"
          >
            {syncStatus.emailMismatches.length === 0 ? 'Synced' : `${syncStatus.emailMismatches.length} Issues`}
          </Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-purple-600" />
            <span className="font-apercu-medium text-sm">SMS Settings</span>
          </div>
          <Badge 
            variant={syncStatus.smsMismatches.length === 0 ? 'success' : 'destructive'}
            className="font-apercu-medium text-xs"
          >
            {syncStatus.smsMismatches.length === 0 ? 'Synced' : `${syncStatus.smsMismatches.length} Issues`}
          </Badge>
        </div>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-4">
          {/* Email Mismatches */}
          {syncStatus.emailMismatches.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-apercu-bold text-sm text-red-800 mb-2">Email Configuration Mismatches</h4>
              <div className="space-y-2">
                {syncStatus.emailMismatches.map((mismatch, index) => (
                  <div key={index} className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                    {mismatch}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SMS Mismatches */}
          {syncStatus.smsMismatches.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-apercu-bold text-sm text-red-800 mb-2">SMS Configuration Mismatches</h4>
              <div className="space-y-2">
                {syncStatus.smsMismatches.map((mismatch, index) => (
                  <div key={index} className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                    {mismatch}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Flow Explanation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-apercu-bold text-sm text-blue-800 mb-3">Data Flow</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs text-blue-700">
                <Settings className="h-4 w-4" />
                <span>Settings Page</span>
                <ArrowRight className="h-3 w-3" />
                <span>/api/admin/settings</span>
                <ArrowRight className="h-3 w-3" />
                <span>Database (settings table)</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-blue-700">
                <Mail className="h-4 w-4" />
                <span>Communications Page</span>
                <ArrowRight className="h-3 w-3" />
                <span>/api/admin/email-config</span>
                <ArrowRight className="h-3 w-3" />
                <span>Processed Configuration</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-blue-700">
                <Phone className="h-4 w-4" />
                <span>Communications Page</span>
                <ArrowRight className="h-3 w-3" />
                <span>/api/admin/sms-config</span>
                <ArrowRight className="h-3 w-3" />
                <span>Processed Configuration</span>
              </div>
            </div>
          </div>

          {/* Last Checked */}
          <div className="text-xs text-gray-500 text-center">
            Last checked: {syncStatus.lastChecked.toLocaleString()}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!syncStatus.isValid && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => window.location.href = '/admin/settings?tab=communications'}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Open Settings
            </Button>
            <Button
              onClick={checkSync}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recheck Sync
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

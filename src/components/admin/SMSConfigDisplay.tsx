'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  Server, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Copy,
  Eye,
  EyeOff,
  Settings,
  RefreshCw
} from 'lucide-react'

interface SMSConfig {
  smsEnabled: boolean
  smsProvider: string
  smsFromNumber: string
  isConfigured: boolean
  environment: string
  source?: string
  smsApiKey?: string
  smsUsername?: string
}

export function SMSConfigDisplay() {
  const [smsConfig, setSmsConfig] = useState<SMSConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSmsConfig()
  }, [])

  const fetchSmsConfig = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    
    try {
      const response = await fetch('/api/admin/sms-config')
      if (response.ok) {
        const data = await response.json()
        setSmsConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch SMS config:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchSmsConfig(true)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getProviderDisplayName = (provider: string) => {
    const providerNames: Record<string, string> = {
      'mock': 'Mock (Development)',
      'twilio': 'Twilio',
      'aws-sns': 'AWS SNS',
      'local-gateway': 'Local Gateway',
      'kudisms': 'KudiSMS',
      'termii': 'Termii',
      'bulk-sms-nigeria': 'Bulk SMS Nigeria',
      'smart-sms': 'Smart SMS'
    }
    return providerNames[provider] || provider
  }

  if (loading) {
    return (
      <Card className="p-3 sm:p-4">
        <div className="animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 sm:h-5 sm:w-5 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-5 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-full sm:w-24"></div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <div className="h-3 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-40"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!smsConfig) {
    return (
      <Card className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm border-red-200 shadow-lg shadow-red-500/10">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <span className="font-apercu-medium text-xs sm:text-sm text-red-800 truncate">
              SMS configuration unavailable
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/admin/settings?tab=communications'}
            className="font-apercu-medium text-xs text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 self-start sm:self-center flex-shrink-0"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">Configure</span>
            <span className="sm:hidden">Setup</span>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg shadow-purple-500/10">
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900 truncate">SMS Configuration</h3>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Badge
              variant={smsConfig.isConfigured && smsConfig.smsEnabled ? 'success' : 'destructive'}
              className={`font-apercu-medium text-xs flex-shrink-0 ${
                smsConfig.isConfigured && smsConfig.smsEnabled
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-red-100 text-red-800 border-red-300'
              }`}
            >
              {smsConfig.isConfigured && smsConfig.smsEnabled ? 'Active' : 'Not Configured'}
            </Badge>
            {smsConfig.source && (
              <Badge
                variant="secondary"
                className="font-apercu-medium text-xs flex-shrink-0 bg-purple-50 text-purple-700 border-purple-200"
              >
                {smsConfig.source}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 self-start sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-apercu-medium text-xs flex-shrink-0 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="font-apercu-medium text-xs flex-shrink-0 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
          >
            {showDetails ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
            <span className="hidden sm:inline">{showDetails ? 'Hide' : 'Show'} Details</span>
            <span className="sm:hidden">{showDetails ? 'Hide' : 'Show'}</span>
          </Button>
          {(!smsConfig.isConfigured || !smsConfig.smsEnabled) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/admin/settings?tab=communications'}
              className="font-apercu-medium text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 border border-purple-200 flex-shrink-0"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Configure</span>
              <span className="sm:hidden">Setup</span>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <span className="font-apercu-regular text-xs text-gray-600 flex-shrink-0">Provider:</span>
          <span className="font-apercu-medium text-xs text-gray-900 truncate">
            {getProviderDisplayName(smsConfig.smsProvider)}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <span className="font-apercu-regular text-xs text-gray-600 flex-shrink-0">From Number:</span>
          <div className="flex items-center space-x-1 min-w-0">
            <span className="font-apercu-medium text-xs text-gray-900 truncate">
              {smsConfig.smsFromNumber || 'Not set'}
            </span>
            {smsConfig.smsFromNumber && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(smsConfig.smsFromNumber)}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {showDetails && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <span className="font-apercu-regular text-xs text-gray-600 flex-shrink-0">Status:</span>
              <span className="font-apercu-medium text-xs text-gray-900 truncate">
                {smsConfig.smsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {smsConfig.smsApiKey && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-apercu-regular text-xs text-gray-600 flex-shrink-0">API Key:</span>
                <span className="font-apercu-medium text-xs text-gray-900 truncate">
                  {smsConfig.smsApiKey.substring(0, 8)}...
                </span>
              </div>
            )}

            {smsConfig.smsUsername && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-apercu-regular text-xs text-gray-600 flex-shrink-0">Username:</span>
                <span className="font-apercu-medium text-xs text-gray-900 truncate">
                  {smsConfig.smsUsername}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <span className="font-apercu-regular text-xs text-gray-600 flex-shrink-0">Environment:</span>
              <Badge
                variant={smsConfig.environment === 'production' ? 'default' : 'secondary'}
                className="font-apercu-medium text-xs flex-shrink-0"
              >
                {smsConfig.environment}
              </Badge>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        {smsConfig.isConfigured && smsConfig.smsEnabled ? (
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
              <span className="font-apercu-regular text-xs text-green-800">
                Ready to send SMS to registrants
              </span>
            </div>
            {smsConfig.source === 'database' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/admin/settings?tab=communications'}
                className="font-apercu-medium text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 self-start sm:self-center"
              >
                <Settings className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Edit Settings</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
              <span className="font-apercu-regular text-xs text-amber-800">
                Configure SMS settings to send notifications
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/admin/settings?tab=communications'}
              className="font-apercu-medium text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 border border-purple-200 self-start sm:self-center"
            >
              <Settings className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Configure Now</span>
              <span className="sm:hidden">Setup</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

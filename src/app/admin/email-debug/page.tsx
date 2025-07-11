'use client'

import { useState, useEffect } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'
import { 
  Mail, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Server
} from 'lucide-react'

interface DebugInfo {
  status: string
  timestamp: string
  user: {
    id: string
    email: string
    role: string
  }
  configuration: {
    database: {
      configured: boolean
      settings: Record<string, any>
      missing: string[]
      count: number
    }
    environment: {
      configured: boolean
      variables: Record<string, any>
      missing: string[]
    }
  }
  recommendations: string[]
}

export default function EmailDebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [configuring, setConfiguring] = useState(false)
  const { currentUser } = useUser()
  const { success, error } = useToast()

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/admin/settings/email/debug')
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
      } else {
        throw new Error('Failed to fetch debug info')
      }
    } catch (err) {
      error('Debug Failed', 'Could not fetch email configuration debug information')
    } finally {
      setLoading(false)
    }
  }

  const configureEmail = async () => {
    setConfiguring(true)
    try {
      const response = await fetch('/api/admin/settings/email/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        success('Email Configured', `Successfully configured ${data.summary.total} email settings`)
        await fetchDebugInfo() // Refresh debug info
      } else {
        throw new Error(data.message || 'Configuration failed')
      }
    } catch (err) {
      error('Configuration Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setConfiguring(false)
    }
  }

  if (loading) {
    return (
      <AdminLayoutNew title="Email Debug" description="Email configuration debugging">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 bg-indigo-200 rounded animate-pulse" />
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew title="Email Debug" description="Email configuration debugging and diagnostics">
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Email Configuration Debug</h1>
              <p className="text-sm text-gray-600">Diagnose and fix email configuration issues</p>
            </div>
          </div>
        </Card>

        {debugInfo && (
          <>
            {/* Configuration Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Configuration */}
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Database className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Database Settings</h3>
                  <Badge className={debugInfo.configuration.database.configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {debugInfo.configuration.database.configured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p><strong>Settings Count:</strong> {debugInfo.configuration.database.count}</p>
                  {debugInfo.configuration.database.missing.length > 0 && (
                    <div>
                      <p className="text-red-600"><strong>Missing:</strong></p>
                      <ul className="list-disc list-inside text-red-600 ml-4">
                        {debugInfo.configuration.database.missing.map(setting => (
                          <li key={setting}>{setting}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>

              {/* Environment Variables */}
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Server className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Environment Variables</h3>
                  <Badge className={debugInfo.configuration.environment.configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {debugInfo.configuration.environment.configured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  {Object.entries(debugInfo.configuration.environment.variables).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-mono text-xs">{key}:</span>
                      <span className={value ? 'text-green-600' : 'text-red-600'}>
                        {value || 'Not set'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recommendations */}
            {debugInfo.recommendations.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">Recommendations</h3>
                </div>
                
                <ul className="space-y-2">
                  {debugInfo.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Actions */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="flex space-x-4">
                <Button onClick={fetchDebugInfo} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Debug Info
                </Button>
                
                {currentUser?.role?.name === 'Super Admin' && (
                  <Button 
                    onClick={configureEmail} 
                    disabled={configuring}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {configuring ? 'Configuring...' : 'Auto-Configure Email'}
                  </Button>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminLayoutNew>
  )
}

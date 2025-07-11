'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Database,
  Mail,
  Settings,
  Upload
} from 'lucide-react'

interface BackupIntegrationGuideProps {
  isEmailConfigured?: boolean
  onRestoreBackup?: () => void
  loading?: boolean
}

export const BackupIntegrationGuide: React.FC<BackupIntegrationGuideProps> = ({
  isEmailConfigured = false,
  onRestoreBackup,
  loading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!isEmailConfigured)

  const steps = [
    {
      id: 1,
      title: 'System Backup Available',
      description: 'Your complete system backup with SMTP password is ready to restore',
      icon: Database,
      status: 'ready' as const,
      details: [
        'Contains all system settings including email configuration',
        'Includes SMTP password: mlre wwdl wnvr vimd',
        'Pre-configured for samuel.obadina93@gmail.com',
        'Ready for one-click restoration'
      ]
    },
    {
      id: 2,
      title: 'Email Configuration',
      description: isEmailConfigured ? 'Email is fully configured' : 'Email needs configuration',
      icon: Mail,
      status: isEmailConfigured ? 'complete' : 'pending' as const,
      details: isEmailConfigured ? [
        'SMTP Host: smtp.gmail.com',
        'SMTP Port: 587',
        'SMTP User: samuel.obadina93@gmail.com',
        'SMTP Password: Configured',
        'From Name: Mopgomyouth'
      ] : [
        'SMTP password field missing',
        'Email configuration incomplete',
        'Restore backup to fix this issue'
      ]
    },
    {
      id: 3,
      title: 'Quick Restoration',
      description: 'One-click restore to complete setup',
      icon: Settings,
      status: isEmailConfigured ? 'complete' : 'action' as const,
      details: [
        'Click "Restore System Backup" button',
        'Confirms before making changes',
        'Updates all settings automatically',
        'Reloads page to show changes'
      ]
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'action':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return CheckCircle
      case 'pending':
        return AlertCircle
      case 'action':
        return Upload
      default:
        return Info
    }
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-apercu-bold text-lg text-gray-900">System Backup Integration</h3>
            <p className="font-apercu-regular text-sm text-gray-600">
              {isEmailConfigured ? 'System fully configured' : 'Quick setup available'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {!isEmailConfigured && onRestoreBackup && (
            <Button
              onClick={onRestoreBackup}
              disabled={loading}
              size="sm"
              className="bg-green-600 hover:bg-green-700 font-apercu-medium"
            >
              {loading ? 'Restoring...' : 'Restore System Backup'}
            </Button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {steps.map((step) => {
            const StatusIcon = getStatusIcon(step.status)
            return (
              <div key={step.id} className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className={`p-2 rounded-lg ${getStatusColor(step.status)}`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-apercu-bold text-sm text-gray-900">{step.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-apercu-medium ${getStatusColor(step.status)}`}>
                      {step.status === 'complete' ? 'Complete' : 
                       step.status === 'pending' ? 'Pending' : 
                       step.status === 'action' ? 'Action Required' : 'Ready'}
                    </span>
                  </div>
                  <p className="font-apercu-regular text-sm text-gray-600 mb-3">{step.description}</p>
                  <ul className="space-y-1">
                    {step.details.map((detail, index) => (
                      <li key={index} className="flex items-center text-xs text-gray-500">
                        <div className="h-1 w-1 bg-gray-400 rounded-full mr-2" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}

          {!isEmailConfigured && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-apercu-bold text-sm text-yellow-800 mb-1">Action Required</h4>
                  <p className="font-apercu-regular text-sm text-yellow-700 mb-3">
                    Your email configuration is incomplete. The SMTP password field is missing, which will cause email functionality to fail.
                  </p>
                  <p className="font-apercu-regular text-xs text-yellow-600">
                    Click "Restore System Backup" above to automatically configure all email settings including the SMTP password.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isEmailConfigured && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-apercu-bold text-sm text-green-800 mb-1">System Ready</h4>
                  <p className="font-apercu-regular text-sm text-green-700 mb-2">
                    Your system is fully configured with email functionality. All settings have been restored from the backup.
                  </p>
                  <p className="font-apercu-regular text-xs text-green-600">
                    You can now send emails, test the configuration, and use all system features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

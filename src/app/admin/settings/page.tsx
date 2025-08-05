'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { FormSkeleton } from '@/components/ui/skeleton' // Commented out as unused
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'
import { ErrorModal } from '@/components/ui/error-modal'
// import { getErrorMessage, parseApiError } from '@/lib/error-messages' // Commented out as unused (using local parseApiError)
import { useBranding } from '@/contexts/BrandingContext'
import { SystemBranding } from '@/components/admin/SystemBranding'
import { EmailConfigDisplay } from '@/components/admin/EmailConfigDisplay'
import { useTranslation } from '@/contexts/LanguageContext'
import { LogoManager } from '@/lib/logo-manager'
import { RolesPermissionsManager } from '@/components/admin/RolesPermissionsManager'
import { SettingsTestComponent } from '@/components/admin/SettingsTestComponent'

import {
  SettingsPageSkeleton,
  SettingsTabSkeleton,
  SettingsCardSkeleton,
  NotificationCardSkeleton,
  SecurityCardSkeleton
} from '@/components/admin/SettingsSkeletons'
import {
  getDefaultSettingsByCategory,
  mergeWithDefaults,
  SettingDefinition
} from '@/lib/default-settings'

// import { BackupIntegrationGuide } from '@/components/admin/BackupIntegrationGuide'
import {
  Settings,
  Shield,
  Users,
  Database,
  Bell,
  Mail,
  Phone,
  Download,
  Upload,
  Save,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Check,
  AlertCircle,
  Image,
  RefreshCw,
  Trash2,
  Edit,
  Plus,
  Clock,
  Zap,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'
import '@/styles/settings-responsive.css'

interface SettingItem {
  key: string
  name: string
  value: string | boolean
  type: 'text' | 'email' | 'select' | 'toggle' | 'number'
  options?: string[]
  description?: string
}

interface SettingsState {
  [key: string]: SettingItem[]
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { currentUser, loading: userLoading } = useUser()
  const { branding, updateSystemName, updateLogo, refreshBranding } = useBranding()
  const [settings, setSettings] = useState<SettingsState>({})
  const [loading, setLoading] = useState(false) // Start with false for instant display
  const [saving, setSaving] = useState(false)
  // Removed legacy message state - now using useToast consistently
  const [editingCategories, setEditingCategories] = useState<Record<string, boolean>>({})
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({})
  const [userRole, setUserRole] = useState<string>('')
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingSms, setTestingSms] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  const [rateLimits, setRateLimits] = useState({
    apiRequests: { limit: 100, window: 'minute' },
    registrations: { limit: 5, window: 'minute' },
    loginAttempts: { limit: 10, window: 'minute' },
    messaging: { limit: 20, window: 'hour' },
    enabled: true,
    whitelistAdminIPs: true,
    burstAllowance: 150
  })
  const [savingRateLimits, setSavingRateLimits] = useState(false)

  // Helper function to determine write access
  const hasWriteAccess = (tabId: string) => {
    if (!currentUser?.role?.name) {
      return false
    }

    // Super Admin has write access to everything
    if (currentUser.role.name === 'Super Admin') {
      return true
    }

    // Admin has read-only access to security and notifications
    if (currentUser.role.name === 'Admin') {
      if (tabId.startsWith('security') || tabId.startsWith('notifications')) {
        return false // Read-only for Admin
      }
      return true // Write access to other tabs
    }

    return false
  }

  const toggleEdit = (category: string) => {
    setEditingCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const toggleSectionEdit = (sectionId: string) => {
    setEditingSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Helper function to show read-only warning
  const isReadOnly = (tabId: string) => {
    return !hasWriteAccess(tabId)
  }
  const [registrationSettings, setRegistrationSettings] = useState({
    formClosureDate: '',
    minimumAge: 13
  })
  const [savingRegistrationSettings, setSavingRegistrationSettings] = useState(false)
  const [editingRegistrationSettings, setEditingRegistrationSettings] = useState(false)

  const [activeTab, setActiveTab] = useState('general')
  const [isInitialized, setIsInitialized] = useState(false) // Track if tab has been initialized from URL
  const [importingData, setImportingData] = useState(false)
  const [viewingLogs, setViewingLogs] = useState(false)
  const [systemLogs, setSystemLogs] = useState<Array<{ id: string; message: string; timestamp: string; level: string }>>([])
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    type: 'error' | 'warning' | 'info' | 'success'
    title: string
    description: string
    details?: string
    errorCode?: string
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    description: ''
  })

  const { success, error, warning } = useToast()

  const parseApiError = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unknown error occurred'
  }

  const getCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.user?.role?.name || '')
      }
    } catch {
      // Silently handle user fetch error - not critical for settings page
      warning('User Information Unavailable', 'Unable to load user information. Some features may be limited.')
    }
  }, [warning])

  // Initialize tab from URL on component mount
  useEffect(() => {
    if (!isInitialized) {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')

      if (tabParam && ['general', 'communications', 'security', 'notifications', 'data', 'roles', 'ratelimits'].includes(tabParam)) {
        setActiveTab(tabParam)
      } else {
        // If no valid tab in URL, set default and update URL
        const url = new URL(window.location.href)
        url.searchParams.set('tab', 'general')
        window.history.replaceState({}, '', url.toString())
      }

      setIsInitialized(true)
    }
  }, [isInitialized])

  // Load data and handle role-based access
  useEffect(() => {
    loadSettings()
    getCurrentUser()
    loadCurrentLogo()
    loadRateLimits()
    loadRegistrationSettings()
  }, [])

  // Function to handle tab changes and update URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)

    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabId)
    window.history.pushState({}, '', url.toString())
  }

  // Handle role-based tab access after user is loaded
  useEffect(() => {
    console.log('🔍 SETTINGS DEBUG: User effect triggered', {
      hasCurrentUser: !!currentUser,
      userRole: currentUser?.role?.name,
      userEmail: currentUser?.email,
      isInitialized,
      activeTab,
      userLoading
    })

    if (currentUser && isInitialized) {
      // Check if user has access to roles tab
      if (activeTab === 'roles' && !['Super Admin', 'Admin'].includes(currentUser?.role?.name || '')) {
        handleTabChange('general') // Redirect to general tab if no access
      }
    }
  }, [currentUser, activeTab, isInitialized])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')

      if (tabParam && ['general', 'communications', 'security', 'notifications', 'data', 'roles', 'ratelimits'].includes(tabParam)) {
        setActiveTab(tabParam)
      } else {
        setActiveTab('general')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])



  const loadCurrentLogo = async () => {
    try {
      console.log('Loading current logo...')
      const response = await fetch('/api/admin/settings/logo')
      console.log('Logo API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Logo API response data:', data)

        if (data.logoUrl) {
          console.log('Setting current logo to:', data.logoUrl)
          setCurrentLogo(data.logoUrl)
        } else {
          console.log('No logo URL in response')
        }
      } else {
        console.error('Logo API response not ok:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load current logo:', error)
    }
  }



  const loadRateLimits = async () => {
    try {
      const response = await fetch('/api/admin/settings/rate-limits')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.rateLimits) {
          setRateLimits(data.rateLimits)
        }
      }
    } catch (error) {
      console.error('Failed to load rate limits:', error)
    }
  }

  const saveRateLimits = async () => {
    setSavingRateLimits(true)
    try {
      const response = await fetch('/api/admin/settings/rate-limits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rateLimits),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save rate limits')
      }

      success('Rate Limits Saved', 'Rate limiting configuration has been updated successfully.')
    } catch (error) {
      const errorMessage = parseApiError(error)
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Save Rate Limits',
        description: 'Unable to save the rate limiting configuration.',
        details: `Error: ${errorMessage}\nTime: ${new Date().toISOString()}`,
        errorCode: 'RATE_LIMITS_SAVE_ERROR'
      })
    } finally {
      setSavingRateLimits(false)
    }
  }



  const loadSettings = async () => {
    try {
      // Load main settings
      const response = await fetch('/api/admin/settings')

      if (response.status === 403) {
        // User doesn't have permission to access settings
        setErrorModal({
          isOpen: true,
          type: 'warning',
          title: 'Access Restricted',
          description: 'You do not have permission to view or modify system settings. Please contact your administrator if you need access.',
          details: 'Only Super Admin and Admin users can access system settings.',
          errorCode: 'SETTINGS_ACCESS_DENIED'
        })
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Transform the API response to match the component's expected format
        const transformedSettings: SettingsState = {}

        Object.keys(data.settings).forEach(category => {
          transformedSettings[category] = data.settings[category].map((setting: { key: string; name: string; value: string | boolean; type: string; options?: string[]; description?: string }) => ({
            key: setting.key,
            name: setting.name,
            value: setting.value,
            type: setting.type,
            options: setting.options,
            description: setting.description
          }))
        })

        // Load additional settings (email, sms, notifications and security)
        try {
          const [emailRes, smsRes, notificationsRes, securityRes] = await Promise.all([
            fetch('/api/admin/settings/email'),
            fetch('/api/admin/settings/sms'),
            fetch('/api/admin/settings/notifications'),
            fetch('/api/admin/settings/security')
          ])

          // Load email settings
          if (emailRes.ok) {
            const emailData = await emailRes.json()
            if (emailData.success) {
              const emailMappings = {
                smtpHost: { name: 'SMTP Host', description: 'SMTP server hostname' },
                smtpPort: { name: 'SMTP Port', description: 'SMTP server port (587 for TLS, 465 for SSL)' },
                smtpUser: { name: 'SMTP Username', description: 'SMTP authentication username' },
                smtpPass: { name: 'SMTP Password', description: 'SMTP authentication password' },
                smtpSecure: { name: 'Use SSL/TLS', description: 'Enable secure connection' },
                emailFromName: { name: 'From Name', description: 'Display name for outgoing emails' },
                emailReplyTo: { name: 'Reply To Email', description: 'Reply-to email address' },
                adminEmails: { name: 'Admin Emails', description: 'Comma-separated admin email addresses' }
              }

              transformedSettings.email = Object.entries(emailData.settings).map(([key, value]) => {
                const mapping = emailMappings[key as keyof typeof emailMappings] || { name: key, description: `Email setting: ${key}` }
                let inputType = 'text'
                if (typeof value === 'boolean') {
                  inputType = 'boolean'
                } else if (typeof value === 'number') {
                  inputType = 'number'
                } else if (key.includes('Pass')) {
                  inputType = 'password'
                } else if (key.includes('Email')) {
                  inputType = 'email'
                }

                return {
                  key,
                  name: mapping.name,
                  value,
                  type: inputType,
                  description: mapping.description
                }
              })
            }
          }

          // Load SMS settings
          if (smsRes.ok) {
            const smsData = await smsRes.json()
            if (smsData.success) {
              const smsMappings = {
                smsEnabled: { name: 'Enable SMS', description: 'Enable SMS notifications' },
                smsProvider: { name: 'SMS Provider', description: 'SMS service provider' },
                smsApiKey: { name: 'API Key', description: 'SMS provider API key' },
                smsApiSecret: { name: 'API Secret', description: 'SMS provider API secret' },
                smsFromNumber: { name: 'From Number/Name', description: 'Sender ID or phone number' },
                smsRegion: { name: 'Region', description: 'SMS service region' },
                smsGatewayUrl: { name: 'Gateway URL', description: 'Custom SMS gateway URL (if applicable)' },
                smsUsername: { name: 'Username', description: 'SMS provider username (if required)' }
              }

              transformedSettings.sms = Object.entries(smsData.settings).map(([key, value]) => {
                const mapping = smsMappings[key as keyof typeof smsMappings] || { name: key, description: `SMS setting: ${key}` }
                let inputType = 'text'
                if (typeof value === 'boolean') {
                  inputType = 'boolean'
                } else if (key.includes('Api') || key.includes('Secret')) {
                  inputType = 'password'
                } else if (key === 'smsProvider') {
                  inputType = 'select'
                }

                const setting: any = {
                  key,
                  name: mapping.name,
                  value,
                  type: inputType,
                  description: mapping.description
                }

                // Add options for SMS provider
                if (key === 'smsProvider') {
                  setting.options = [
                    { value: 'twilio', label: 'Twilio' },
                    { value: 'aws-sns', label: 'AWS SNS' },
                    { value: 'termii', label: 'Termii' },
                    { value: 'kudisms', label: 'KudiSMS' },
                    { value: 'bulk-sms-nigeria', label: 'Bulk SMS Nigeria' },
                    { value: 'smart-sms', label: 'Smart SMS' }
                  ]
                }

                return setting
              })
            }
          }

          // Load notification settings
          if (notificationsRes.ok) {
            const notificationsData = await notificationsRes.json()
            if (notificationsData.success) {
              // Create proper notification settings with correct names and descriptions
              const notificationMappings = {
                emailOnRegistration: { name: 'New Registration', description: 'Send email when someone registers' },
                emailOnVerification: { name: 'Verification Complete', description: 'Send email when registration is verified' },
                emailOnAllocation: { name: 'Room Allocation', description: 'Send email when room is allocated' },
                emailOnPlatoonAssignment: { name: 'Platoon Assignment', description: 'Send email when assigned to platoon' },
                emailDailyReport: { name: 'Daily Reports', description: 'Send daily summary reports to admins' },
                emailWeeklyReport: { name: 'Weekly Reports', description: 'Send weekly summary reports to admins' },
                smsOnRegistration: { name: 'Registration Confirmation', description: 'Send SMS confirmation when someone registers' },
                smsOnVerification: { name: 'Verification Complete', description: 'Send SMS when registration is verified' },
                smsOnAllocation: { name: 'Room Allocation', description: 'Send SMS when room is allocated' },
                smsReminders: { name: 'Event Reminders', description: 'Send SMS reminders before events' },
                smsUrgentAlerts: { name: 'Urgent Alerts', description: 'Send SMS for urgent notifications only' },
                notificationDelay: { name: 'Notification Delay', description: 'Minutes to wait before sending notifications' },
                reminderAdvance: { name: 'Reminder Advance Time', description: 'Hours before event to send reminders' },
                quietHoursStart: { name: 'Quiet Hours Start', description: 'Time to stop sending notifications (24h format)' },
                quietHoursEnd: { name: 'Quiet Hours End', description: 'Time to resume sending notifications (24h format)' }
              }

              transformedSettings.notifications = Object.entries(notificationsData.settings).map(([key, value]) => {
                const mapping = notificationMappings[key as keyof typeof notificationMappings] || { name: key, description: `Notification setting: ${key}` }

                // Determine the correct input type based on key patterns and value type
                let inputType = 'text'
                if (typeof value === 'boolean' || key.startsWith('email') || key.startsWith('sms')) {
                  inputType = 'boolean'
                } else if (typeof value === 'number' || key.includes('Delay') || key.includes('Advance')) {
                  inputType = 'number'
                } else if (key.includes('quiet') && key.includes('Hours')) {
                  inputType = 'time'
                }

                return {
                  key,
                  name: mapping.name,
                  value,
                  type: inputType,
                  description: mapping.description
                }
              })
            }
          }

          // Load security settings
          if (securityRes.ok) {
            const securityData = await securityRes.json()
            if (securityData.success) {
              const securityMappings = {
                sessionTimeout: { name: 'Session Timeout', description: 'Minutes before auto-logout' },
                maxLoginAttempts: { name: 'Max Login Attempts', description: 'Failed attempts before lockout' },
                lockoutDuration: { name: 'Lockout Duration', description: 'Minutes to lock account after failed attempts' },
                passwordMinLength: { name: 'Minimum Password Length', description: 'Minimum characters required' },
                requireStrongPassword: { name: 'Require Strong Passwords', description: 'Enforce uppercase, lowercase, numbers, symbols' },
                twoFactorAuth: { name: 'Two-Factor Authentication', description: 'Enable 2FA for admin accounts' },
                encryptSensitiveData: { name: 'Encrypt Sensitive Data', description: 'Encrypt personal information in database' },
                enableAuditLog: { name: 'Enable Audit Logging', description: 'Log all admin actions for security auditing' },
                anonymizeData: { name: 'Data Anonymization', description: 'Anonymize data for analytics and reporting' },
                gdprCompliance: { name: 'GDPR Compliance Mode', description: 'Enable GDPR compliance features' },
                dataRetentionPolicy: { name: 'Data Retention Policy', description: 'Automatically delete old data based on policy' },
                apiRateLimit: { name: 'API Rate Limit', description: 'Requests per minute per IP' },
                apiKeyRequired: { name: 'Require API Keys', description: 'Require API keys for external access' },
                corsEnabled: { name: 'Enable CORS', description: 'Allow cross-origin requests' },
                ipWhitelist: { name: 'IP Whitelist', description: 'Comma-separated list of allowed IPs' }
              }

              transformedSettings.security = Object.entries(securityData.settings).map(([key, value]) => {
                const mapping = securityMappings[key as keyof typeof securityMappings] || { name: key, description: `Security setting: ${key}` }
                return {
                  key,
                  name: mapping.name,
                  value,
                  type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text',
                  description: mapping.description
                }
              })
            }
          }
        } catch (additionalError) {
          console.warn('Failed to load additional settings:', additionalError)
        }

        setSettings(transformedSettings)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Load Settings',
        description: 'Unable to load system settings from the server. This could be due to insufficient permissions or a server issue.',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\nTime: ${new Date().toISOString()}`,
        errorCode: 'SETTINGS_LOAD_ERROR'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (category: string, settingId: string, newValue: string | boolean) => {
    try {
      // Check if user has write access to this category
      if (!hasWriteAccess(category)) {
        console.warn(`User does not have write access to category: ${category}`)
        error('Access Denied', 'You do not have permission to edit these settings. Contact a Super Admin for assistance.')
        return
      }

      setSettings(prev => {
        // Validate previous settings exist
        if (!prev || typeof prev !== 'object') {
          console.error('Settings object is invalid:', prev)
          error('Data Error', 'Settings data is not properly loaded. Please refresh the page.')
          return prev
        }

        // Validate category exists and is an array
        if (!prev[category]) {
          console.error(`Category ${category} does not exist in settings:`, Object.keys(prev))
          error('Category Error', `Settings category "${category}" not found. Please refresh the page.`)
          return prev
        }

        if (!Array.isArray(prev[category])) {
          console.error(`Category ${category} is not a valid array:`, prev[category])
          error('Data Structure Error', `Settings for "${category}" are not properly formatted. Please refresh the page.`)
          return prev
        }

        return {
          ...prev,
          [category]: prev[category].map(setting => {
            // Validate setting object
            if (!setting || typeof setting !== 'object' || !setting.key) {
              console.warn('Invalid setting object:', setting)
              return setting
            }

            if (setting.key === settingId) {
              // Convert the value to the correct type based on setting type
              let convertedValue = newValue

              if (setting.type === 'number') {
                convertedValue = Number(newValue) || 0
              } else if (setting.type === 'boolean' || setting.type === 'toggle') {
                convertedValue = newValue === true || newValue === 'true' || newValue === 1 || newValue === '1'
              }

              return { ...setting, value: convertedValue }
            }
            return setting
          })
        }
      })

      // Trigger real-time updates for system name
      if (category === 'branding' && settingId === 'systemName' && typeof newValue === 'string') {
        updateSystemName(newValue)
        // Refresh branding context to ensure all components update
        setTimeout(() => refreshBranding(), 100)
        console.log('System name updated:', newValue)
      }
    } catch (err) {
      console.error('Error updating setting:', err)
      error('Update Failed', 'Failed to update setting. Please refresh the page.')
    }
  }

  const saveSettings = async (category: string) => {
    setSaving(true)
    try {
      // Use specialized API endpoints for different categories
      if (category === 'email') {
        await saveEmailSettings()
      } else if (category === 'sms') {
        await saveSmsSettings()
      } else if (category.startsWith('notifications')) {
        await saveNotificationSettings()
      } else if (category.startsWith('security')) {
        await saveSecuritySettings()
      } else {
        // Use general settings API for other categories
        // Validate settings object exists
        if (!settings || typeof settings !== 'object') {
          throw new Error('Settings not loaded. Please refresh the page.')
        }

        const categorySettings = settings[category] || []

        // Validate category settings array
        if (!Array.isArray(categorySettings)) {
          throw new Error(`${category} settings data is corrupted. Please refresh the page.`)
        }

        const settingsToSave = categorySettings
          .filter(setting => setting && setting.key) // Filter out invalid settings
          .map(setting => ({
            category,
            key: setting.key,
            value: setting.value ?? ''
          }))

        const response = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            settings: settingsToSave
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save settings')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error('Invalid response format')
        }
      }

      // Check if system name was updated and trigger global update
      if (category === 'branding') {
        const systemNameSetting = settings.branding?.find(s => s.key === 'systemName')
        if (systemNameSetting) {
          updateSystemName(systemNameSetting.value as string)
          // Force immediate refresh and then another after delay
          await refreshBranding()
          setTimeout(() => refreshBranding(), 500)
          console.log('System name setting saved:', systemNameSetting.value)
        }
      }

      // Show success toast
      success('Settings Saved Successfully', `${getCategoryDisplayName(category)} settings have been saved and are now in effect across the system.`)

      // Exit editing mode for both category and all sections
      setEditingCategories(prev => ({ ...prev, [category]: false }))

      // Reset all section editing states for this category
      setEditingSections(prev => {
        const newState = { ...prev }
        // Reset all sections that belong to this category
        Object.keys(newState).forEach(sectionId => {
          if (sectionId.startsWith(category)) {
            newState[sectionId] = false
          }
        })
        return newState
      })
    } catch (error) {
      const errorMessage = parseApiError(error)
      console.error('Settings save error:', {
        error,
        errorMessage,
        category,
        currentUser: currentUser?.email,
        userRole: currentUser?.role?.name
      })

      setErrorModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Save Settings',
        description: 'Unable to save the settings changes. This could be due to validation errors or insufficient permissions.',
        details: `Error: ${errorMessage}\nCategory: ${getCategoryDisplayName(category)}\nUser: ${currentUser?.email}\nRole: ${currentUser?.role?.name}\nTime: ${new Date().toISOString()}`,
        errorCode: 'SETTINGS_SAVE_ERROR'
      })
    } finally {
      setSaving(false)
    }
  }

  const saveEmailSettings = async () => {
    // Validate settings object exists
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings not loaded. Please refresh the page.')
    }

    const emailSettings = settings.email || []

    // Validate email settings array
    if (!Array.isArray(emailSettings)) {
      throw new Error('Email settings data is corrupted. Please refresh the page.')
    }

    const emailData = emailSettings.reduce((acc, setting) => {
      // Validate setting object
      if (!setting || typeof setting !== 'object' || !setting.key) {
        console.warn('Invalid email setting object:', setting)
        return acc
      }

      // Map the setting keys to the expected API field names
      const fieldMap: Record<string, string> = {
        'smtpHost': 'smtpHost',
        'smtpPort': 'smtpPort',
        'smtpUser': 'smtpUser',
        'smtpPass': 'smtpPass',
        'smtpSecure': 'smtpSecure',
        'emailFromName': 'emailFromName',
        'emailReplyTo': 'emailReplyTo',
        'adminEmails': 'adminEmails'
      }

      const fieldName = fieldMap[setting.key] || setting.key
      acc[fieldName] = setting.value ?? ''
      return acc
    }, {} as Record<string, string | boolean>)

    console.log('Saving email settings:', emailData) // Debug log

    const response = await fetch('/api/admin/settings/email', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Email settings save error response:', errorText) // Debug log

      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: `HTTP ${response.status}: ${errorText}` }
      }

      console.error('Email settings save error:', errorData) // Debug log

      // Handle specific error cases
      if (response.status === 403) {
        throw new Error('Only Super Admin can modify email settings. Please contact your administrator.')
      } else if (response.status === 400) {
        const details = errorData.details || []
        const errorMessages = details.map((d: { path?: string[]; message: string }) => `${d.path?.join('.')}: ${d.message}`).join(', ')
        throw new Error(errorData.message || errorData.error || `Validation failed: ${errorMessages}` || 'Invalid email settings data')
      } else {
        throw new Error(errorData.message || errorData.error || 'Failed to save email settings')
      }
    }

    const result = await response.json()
    console.log('Email settings save result:', result) // Debug log
  }

  const saveSmsSettings = async () => {
    // Validate settings object exists
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings not loaded. Please refresh the page.')
    }

    const smsSettings = settings.sms || []

    // Validate SMS settings array
    if (!Array.isArray(smsSettings)) {
      throw new Error('SMS settings data is corrupted. Please refresh the page.')
    }

    const smsData = smsSettings.reduce((acc, setting) => {
      // Validate setting object
      if (!setting || typeof setting !== 'object' || !setting.key) {
        console.warn('Invalid SMS setting object:', setting)
        return acc
      }

      // Map the setting keys to the expected API field names
      const fieldMap: Record<string, string> = {
        'smsEnabled': 'smsEnabled',
        'smsProvider': 'smsProvider',
        'smsApiKey': 'smsApiKey',
        'smsApiSecret': 'smsApiSecret',
        'smsFromNumber': 'smsFromNumber',
        'smsRegion': 'smsRegion',
        'smsGatewayUrl': 'smsGatewayUrl',
        'smsUsername': 'smsUsername'
      }

      const fieldName = fieldMap[setting.key] || setting.key
      acc[fieldName] = setting.value ?? ''
      return acc
    }, {} as Record<string, string | boolean>)

    console.log('Saving SMS settings:', smsData) // Debug log

    const response = await fetch('/api/admin/settings/sms', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smsData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SMS settings save error response:', errorText) // Debug log

      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: `HTTP ${response.status}: ${errorText}` }
      }

      console.error('SMS settings save error:', errorData) // Debug log

      // Handle specific error cases
      if (response.status === 403) {
        throw new Error('Only Super Admin can modify SMS settings. Please contact your administrator.')
      } else if (response.status === 400) {
        const details = errorData.details || []
        const errorMessages = details.map((d: { path?: string[]; message: string }) => `${d.path?.join('.')}: ${d.message}`).join(', ')
        throw new Error(errorData.message || errorData.error || `Validation failed: ${errorMessages}` || 'Invalid SMS settings data')
      } else {
        throw new Error(errorData.message || errorData.error || 'Failed to save SMS settings')
      }
    }

    const result = await response.json()
    console.log('SMS settings save result:', result) // Debug log
  }

  const saveNotificationSettings = async () => {

    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings not loaded. Please refresh the page.')
    }

    const notificationSettings = settings.notifications || []

    // Use mergeWithDefaults to get settings with proper type information
    const mergedNotificationSettings = mergeWithDefaults(notificationSettings, 'notifications')

    if (!Array.isArray(mergedNotificationSettings) || mergedNotificationSettings.length === 0) {
      throw new Error('No notification settings found. Please refresh the page and try again.')
    }

    // Collect all notification settings from the merged state (which has type info)
    const notificationData = mergedNotificationSettings.reduce((acc, setting) => {
      if (!setting || typeof setting !== 'object' || !setting.key) {
        console.warn('Invalid setting object:', setting)
        return acc
      }

      // Values should already be properly typed from updateSetting function
      let value = setting.value

      acc[setting.key] = value
      return acc
    }, {} as Record<string, any>)



    if (Object.keys(notificationData).length === 0) {
      throw new Error('No valid notification settings to save. Please check the settings data.')
    }

    const response = await fetch('/api/admin/settings/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    })

    if (!response.ok) {
      const errorData = await response.json()

      throw new Error(errorData.error || 'Failed to save notification settings')
    }

    const result = await response.json()
    console.log('Notification settings save result:', result)
  }

  const saveSecuritySettings = async () => {

    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings not loaded. Please refresh the page.')
    }

    const securitySettings = settings.security || []

    // Use mergeWithDefaults to get settings with proper type information
    const mergedSecuritySettings = mergeWithDefaults(securitySettings, 'security')

    if (!Array.isArray(mergedSecuritySettings) || mergedSecuritySettings.length === 0) {
      throw new Error('No security settings found. Please refresh the page and try again.')
    }

    const securityData = mergedSecuritySettings.reduce((acc, setting) => {
      if (!setting || typeof setting !== 'object' || !setting.key) {
        console.warn('Invalid setting object:', setting)
        return acc
      }

      // Values should already be properly typed from updateSetting function
      let value = setting.value

      acc[setting.key] = value
      return acc
    }, {} as Record<string, any>)



    if (Object.keys(securityData).length === 0) {
      throw new Error('No valid security settings to save. Please check the settings data.')
    }

    const response = await fetch('/api/admin/settings/security', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(securityData),
    })

    if (!response.ok) {
      const errorData = await response.json()

      throw new Error(errorData.error || 'Failed to save security settings')
    }

    const result = await response.json()
    console.log('Security settings save result:', result)
  }

  const testEmailConfiguration = async () => {
    if (!testEmail) {
      error('Missing Email', 'Please enter an email address to send the test email to.')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      error('Invalid Email', 'Please enter a valid email address.')
      return
    }

    // Validate settings object exists
    if (!settings || typeof settings !== 'object') {
      error('Settings Error', 'Settings not loaded. Please refresh the page.')
      return
    }

    // Check if email settings exist and are configured
    const emailSettings = settings.email
    if (!emailSettings || !Array.isArray(emailSettings) || emailSettings.length === 0) {
      error('Email Not Configured', 'Please configure email settings before testing.')
      return
    }

    // Check if required email settings are present
    const requiredSettings = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass']
    const missingSettings = requiredSettings.filter(setting => {
      const settingObj = emailSettings.find(s => s && s.key === setting)
      return !settingObj || !settingObj.value
    })

    if (missingSettings.length > 0) {
      error('Incomplete Email Configuration', `Please configure the following settings: ${missingSettings.join(', ')}`)
      return
    }

    setTestingEmail(true)
    try {
      const response = await fetch('/api/admin/settings/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test',
          testEmail: testEmail || 'admin@example.com'
        })
      })

      const data = await response.json()

      if (response.ok) {
        success('Test Email Sent', data.message || 'Test email sent successfully')
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (err) {
      console.error('Email test error:', err)
      error('Test Email Failed', err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setTestingEmail(false)
    }
  }

  const testSmsConfiguration = async () => {
    if (!testPhone) {
      error('Missing Phone Number', 'Please enter a phone number to send the test SMS to.')
      return
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
    if (!phoneRegex.test(testPhone)) {
      error('Invalid Phone Number', 'Please enter a valid phone number (e.g., +1234567890).')
      return
    }

    // Validate settings object exists
    if (!settings || typeof settings !== 'object') {
      error('Settings Error', 'Settings not loaded. Please refresh the page.')
      return
    }

    // Check if SMS settings exist and are configured
    const smsSettings = settings.sms
    if (!smsSettings || !Array.isArray(smsSettings) || smsSettings.length === 0) {
      error('SMS Not Configured', 'Please configure SMS settings before testing.')
      return
    }

    // Check if required SMS settings are present
    const requiredSettings = ['smsProvider', 'smsApiKey']
    const missingSettings = requiredSettings.filter(setting => {
      const settingObj = smsSettings.find(s => s && s.key === setting)
      return !settingObj || !settingObj.value
    })

    if (missingSettings.length > 0) {
      error('Incomplete SMS Configuration', `Please configure the following settings: ${missingSettings.join(', ')}`)
      return
    }

    setTestingSms(true)
    try {
      // Test SMS functionality has been removed
      throw new Error('SMS testing functionality is not available')
    } catch (err) {
      console.error('SMS test error:', err)
      error('Test SMS Failed', err instanceof Error ? err.message : 'Failed to send test SMS')
    } finally {
      setTestingSms(false)
    }
  }

  const togglePasswordVisibility = (settingId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }))
  }

  const configureEmailFromEnv = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings/email/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        success('Email Configured', `Successfully configured ${data.summary.total} email settings from environment variables.`)
        // Reload settings to show the new configuration
        await loadSettings()
      } else {
        throw new Error(data.message || data.error || 'Failed to configure email settings')
      }
    } catch (err) {
      console.error('Email configuration error:', err)
      error('Configuration Failed', err instanceof Error ? err.message : 'Failed to configure email settings from environment variables')
    } finally {
      setLoading(false)
    }
  }

  const initializeEmailSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings/email/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        success('Email Settings Initialized', `Successfully initialized ${data.summary.created} new email settings. You can now configure SMTP password and other settings.`)
        // Reload settings to show the new fields
        await loadSettings()
      } else {
        throw new Error(data.message || data.error || 'Failed to initialize email settings')
      }
    } catch (err) {
      console.error('Email initialization error:', err)
      error('Initialization Failed', err instanceof Error ? err.message : 'Failed to initialize email settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      error('Invalid File Type', 'Please select a JSON backup file.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/settings/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        success(
          'Settings Imported Successfully',
          `Imported ${data.summary.imported} new settings and updated ${data.summary.updated} existing settings.${data.email_status.configured ? ' Email configuration is now complete!' : ''}`
        )
        // Reload settings to show the imported data
        await loadSettings()
      } else {
        throw new Error(data.error || 'Failed to import settings')
      }
    } catch (err) {
      console.error('Settings import error:', err)
      error('Import Failed', err instanceof Error ? err.message : 'Failed to import settings')
    } finally {
      setLoading(false)
      // Reset the file input
      event.target.value = ''
    }
  }



  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log('Starting logo upload:', file.name, file.type, file.size)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Invalid File Type', 'Please select an image file (PNG, JPG, SVG).')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      error('File Too Large', 'Please select an image smaller than 5MB.')
      return
    }

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      console.log('Sending upload request...')
      const response = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status)
      const data = await response.json()
      console.log('Upload response data:', data)

      if (response.ok) {
        setCurrentLogo(data.logoUrl)
        success('Logo Updated', 'System logo and favicon have been updated successfully. Old logo files have been automatically cleaned up.')

        // Update favicon immediately
        updateFavicon(data.logoUrl)

        // Update logo in branding context
        updateLogo(data.logoUrl)

        // Update global logo manager immediately
        LogoManager.updateGlobalLogo(data.logoUrl, true)

        // Force immediate refresh and then another after delay
        await refreshBranding()
        setTimeout(() => {
          refreshBranding()
          LogoManager.forceRefresh()
        }, 500)

        console.log('Logo uploaded and propagated globally:', data.logoUrl)
      } else {
        throw new Error(data.error || data.message || 'Failed to upload logo')
      }
    } catch (err) {
      console.error('Logo upload error:', err)
      error('Logo Upload Failed', err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const updateFavicon = (logoUrl: string) => {
    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = logoUrl
    } else {
      const newFavicon = document.createElement('link')
      newFavicon.rel = 'icon'
      newFavicon.href = logoUrl
      document.head.appendChild(newFavicon)
    }

    // Update apple-touch-icon
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
    if (appleTouchIcon) {
      appleTouchIcon.href = logoUrl
    } else {
      const newAppleTouchIcon = document.createElement('link')
      newAppleTouchIcon.rel = 'apple-touch-icon'
      newAppleTouchIcon.href = logoUrl
      document.head.appendChild(newAppleTouchIcon)
    }
  }





  // Data Management Functions
  const handleBackupData = async () => {
    try {
      success('Creating Backup', 'Preparing system backup...')

      console.log('Starting backup request...')
      const response = await fetch('/api/admin/settings/backup', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      })

      console.log('Backup response status:', response.status)
      console.log('Backup response headers:', response.headers)

      if (response.ok) {
        const blob = await response.blob()
        console.log('Backup blob size:', blob.size)

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `system-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        success('Backup Created', 'System backup has been downloaded successfully.')
      } else {
        const errorText = await response.text()
        console.error('Backup error response:', errorText)

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText}` }
        }

        throw new Error(errorData.error || `Failed to create backup (${response.status})`)
      }
    } catch (err) {
      console.error('Backup error:', err)
      error('Backup Failed', err instanceof Error ? err.message : 'Failed to create backup')
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.json')) {
      error('Invalid File', 'Please select a valid JSON backup file.')
      event.target.value = ''
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      error('File Too Large', 'Backup file must be smaller than 10MB.')
      event.target.value = ''
      return
    }

    setImportingData(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/settings/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        success('Import Successful', 'Data has been imported successfully. Settings will be refreshed automatically.')
        // Reload settings to reflect changes
        setTimeout(() => {
          loadSettings()
          // Update branding context
          updateSystemName(data.systemName || 'MopgomYouth')
          console.log('Data imported, system name:', data.systemName || 'MopgomYouth')
        }, 1000)
      } else {
        throw new Error(data.error || 'Failed to import data')
      }
    } catch (err) {
      console.error('Import error:', err)
      error('Import Failed', err instanceof Error ? err.message : 'Failed to import data')
    } finally {
      setImportingData(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleViewLogs = async () => {
    setViewingLogs(true)
    try {
      const response = await fetch('/api/admin/settings/logs?limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSystemLogs(data.logs || [])
        setShowLogsModal(true)
      } else {
        throw new Error(data.error || 'Failed to load logs')
      }
    } catch (err) {
      console.error('Logs error:', err)
      error('Logs Failed', err instanceof Error ? err.message : 'Failed to load system logs')
    } finally {
      setViewingLogs(false)
    }
  }

  // Load registration settings
  const loadRegistrationSettings = async () => {
    try {
      const [closureDateResponse, minAgeResponse] = await Promise.all([
        fetch('/api/admin/settings/registration/closure-date'),
        fetch('/api/admin/settings/registration/minimum-age')
      ])

      // Handle closure date response
      if (closureDateResponse.ok) {
        try {
          const closureData = await closureDateResponse.json()
          setRegistrationSettings(prev => ({ ...prev, formClosureDate: closureData.formClosureDate || '' }))
        } catch (jsonError) {
          console.error('Error parsing closure date response:', jsonError)
          setRegistrationSettings(prev => ({ ...prev, formClosureDate: '' }))
        }
      } else {
        console.error('Failed to load closure date:', closureDateResponse.status)
        setRegistrationSettings(prev => ({ ...prev, formClosureDate: '' }))
      }

      // Handle minimum age response
      if (minAgeResponse.ok) {
        try {
          const ageData = await minAgeResponse.json()
          setRegistrationSettings(prev => ({ ...prev, minimumAge: ageData.minimumAge || 13 }))
        } catch (jsonError) {
          console.error('Error parsing minimum age response:', jsonError)
          setRegistrationSettings(prev => ({ ...prev, minimumAge: 13 }))
        }
      } else {
        console.error('Failed to load minimum age:', minAgeResponse.status)
        setRegistrationSettings(prev => ({ ...prev, minimumAge: 13 }))
      }
    } catch (error) {
      console.error('Error loading registration settings:', error)
      // Set default values on error
      setRegistrationSettings(prev => ({ ...prev, formClosureDate: '', minimumAge: 13 }))
    }
  }

  // Save registration settings
  const saveRegistrationSettings = async () => {
    setSavingRegistrationSettings(true)
    try {
      const [closureDateResponse, minAgeResponse] = await Promise.all([
        fetch('/api/admin/settings/registration/closure-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formClosureDate: registrationSettings.formClosureDate })
        }),
        fetch('/api/admin/settings/registration/minimum-age', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minimumAge: registrationSettings.minimumAge })
        })
      ])

      // Handle closure date response
      if (!closureDateResponse.ok) {
        let errorMessage = 'Failed to save form closure date'
        try {
          const errorData = await closureDateResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If JSON parsing fails, use default message
          errorMessage = `Failed to save form closure date (${closureDateResponse.status})`
        }
        throw new Error(errorMessage)
      }

      // Handle minimum age response
      if (!minAgeResponse.ok) {
        let errorMessage = 'Failed to save minimum age'
        try {
          const errorData = await minAgeResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If JSON parsing fails, use default message
          errorMessage = `Failed to save minimum age (${minAgeResponse.status})`
        }
        throw new Error(errorMessage)
      }

      // Both requests succeeded
      success('Settings Saved', 'Registration settings updated successfully')
      setEditingRegistrationSettings(false)
    } catch (err) {
      console.error('Registration settings save error:', err)
      error('Save Failed', err instanceof Error ? err.message : 'Failed to save registration settings')
    } finally {
      setSavingRegistrationSettings(false)
    }
  }

  const getCategoryDisplayName = (category: string) => {
    const categoryMap: Record<string, string> = {
      branding: 'System Branding',
      userManagement: 'User Management',
      security: 'Security',
      email: 'Email Configuration',
      sms: 'SMS Configuration',
      notifications: 'Notifications',
      system: 'System'
    }
    return categoryMap[category] || category
  }

  // Tab configuration
  const settingsTabs = [
    {
      id: 'general',
      name: 'General',
      icon: Settings,
      description: 'Basic system settings and branding',
      categories: ['branding']
    },
    {
      id: 'communications',
      name: 'Communications',
      icon: Mail,
      description: 'Email and SMS configuration',
      categories: ['email', 'sms']
    },
    {
      id: 'roles',
      name: 'Roles & Permissions',
      icon: Users,
      description: 'Manage user roles and permissions (Admin/Super Admin only)',
      categories: []
    },
    {
      id: 'security',
      name: 'Security',
      icon: Shield,
      description: 'Security and user management',
      categories: ['security', 'userManagement']
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: Bell,
      description: 'Notification preferences',
      categories: ['notifications']
    },
    {
      id: 'ratelimits',
      name: 'Rate Limits',
      icon: Zap,
      description: 'Configure API rate limiting and request throttling',
      categories: ['rateLimits']
    },
    {
      id: 'data',
      name: 'Data Management',
      icon: Database,
      description: 'Backup, import, and export data',
      categories: []
    }
  ]

  // Render tab content based on active tab
  const renderTabContent = () => {
    const currentTab = settingsTabs.find(tab => tab.id === activeTab)
    if (!currentTab) return null

    switch (activeTab) {
      case 'general':
        return renderGeneralTab()
      case 'communications':
        return renderCommunicationsTab()
      case 'security':
        return renderSecurityTab()
      case 'notifications':
        return renderNotificationsTab()
      case 'ratelimits':
        return renderRateLimitsTab()
      case 'data':
        return renderDataManagementTab()
      case 'roles':
        return <RolesPermissionsManager />
      default:
        return null
    }
  }

  // Helper function to render edit buttons
  const renderEditButtons = (categoryId: string) => {
    const isEditing = editingCategories[categoryId] || false
    const canEdit = hasWriteAccess(categoryId)

    // Show read-only indicator for Admin users on restricted tabs
    if (!canEdit && currentUser?.role?.name === 'Admin') {
      return (
        <div className="flex items-center text-amber-600">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Read Only</span>
        </div>
      )
    }

    if (!isEditing && canEdit) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingCategories(prev => ({ ...prev, [categoryId]: true }))}
          className="font-apercu-medium"
        >
          <Settings className="h-4 w-4 mr-1" />
          Edit
        </Button>
      )
    } else if (canEdit && isEditing) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingCategories(prev => ({ ...prev, [categoryId]: false }))}
            className="font-apercu-medium"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => saveSettings(categoryId)}
            disabled={saving}
            className="font-apercu-medium"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      )
    }

    return null
  }

  // Helper function to render section-specific edit buttons
  const renderSectionEditButtons = (sectionId: string, category: string) => {
    const isEditing = editingSections[sectionId] || false
    const canEdit = hasWriteAccess(category)

    // Show read-only indicator for Admin users on restricted tabs
    if (!canEdit && currentUser?.role?.name === 'Admin') {
      return (
        <div className="flex items-center text-amber-600">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Read Only</span>
        </div>
      )
    }

    if (!isEditing && canEdit) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingSections(prev => ({ ...prev, [sectionId]: true }))}
          className="font-apercu-medium"
        >
          <Settings className="h-4 w-4 mr-1" />
          Edit
        </Button>
      )
    } else if (canEdit && isEditing) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingSections(prev => ({ ...prev, [sectionId]: false }))}
            className="font-apercu-medium"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => saveSettings(category)}
            disabled={saving}
            className="font-apercu-medium"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      )
    }

    return null
  }

  // General Tab Content
  const renderGeneralTab = () => (
    <div className="space-y-6">
      {/* Registration Settings */}
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-lg text-gray-900">Registration Settings</h3>
              <p className="font-apercu-regular text-sm text-gray-600">Form closure date and age requirements</p>
            </div>
          </div>
          {/* Edit/Save Buttons */}
          {!editingRegistrationSettings && userRole === 'Super Admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRegistrationSettings(true)}
              className="font-apercu-medium"
            >
              <Settings className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {editingRegistrationSettings && userRole === 'Super Admin' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingRegistrationSettings(false)}
                className="font-apercu-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveRegistrationSettings}
                disabled={savingRegistrationSettings}
                className="font-apercu-medium"
              >
                {savingRegistrationSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
          {userRole === 'Admin' && (
            <Badge variant="secondary" className="font-apercu-medium text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Read Only
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Closure Date */}
          <div className="space-y-3">
            <label className="block text-sm font-apercu-medium text-gray-700">
              Form Closure Date
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Month Dropdown */}
              <select
                value={registrationSettings.formClosureDate ? new Date(registrationSettings.formClosureDate).getMonth() + 1 : ''}
                onChange={(e) => {
                  const month = e.target.value
                  if (!month) {
                    setRegistrationSettings(prev => ({ ...prev, formClosureDate: '' }))
                    return
                  }
                  const currentDate = registrationSettings.formClosureDate ? new Date(registrationSettings.formClosureDate) : new Date()
                  const year = currentDate.getFullYear()
                  const day = Math.min(currentDate.getDate(), new Date(year, parseInt(month), 0).getDate())
                  const newDate = new Date(year, parseInt(month) - 1, day)
                  setRegistrationSettings(prev => ({ ...prev, formClosureDate: newDate.toISOString().split('T')[0] }))
                }}
                disabled={!editingRegistrationSettings}
                className={`block w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!editingRegistrationSettings ? 'bg-gray-50 text-gray-500' : ''}`}
              >
                <option value="">Month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              {/* Day Dropdown */}
              <select
                value={registrationSettings.formClosureDate ? new Date(registrationSettings.formClosureDate).getDate() : ''}
                onChange={(e) => {
                  const day = e.target.value
                  if (!day || !registrationSettings.formClosureDate) return
                  const currentDate = new Date(registrationSettings.formClosureDate)
                  const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(day))
                  setRegistrationSettings(prev => ({ ...prev, formClosureDate: newDate.toISOString().split('T')[0] }))
                }}
                className={`block w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!editingRegistrationSettings ? 'bg-gray-50 text-gray-500' : ''}`}
                disabled={!editingRegistrationSettings || !registrationSettings.formClosureDate}
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={registrationSettings.formClosureDate ? new Date(registrationSettings.formClosureDate).getFullYear() : ''}
                onChange={(e) => {
                  const year = e.target.value
                  if (!year || !registrationSettings.formClosureDate) return
                  const currentDate = new Date(registrationSettings.formClosureDate)
                  const newDate = new Date(parseInt(year), currentDate.getMonth(), currentDate.getDate())
                  setRegistrationSettings(prev => ({ ...prev, formClosureDate: newDate.toISOString().split('T')[0] }))
                }}
                className={`block w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!editingRegistrationSettings ? 'bg-gray-50 text-gray-500' : ''}`}
                disabled={!editingRegistrationSettings || !registrationSettings.formClosureDate}
              >
                <option value="">Year</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Clear Date Button */}
            {registrationSettings.formClosureDate && editingRegistrationSettings && (
              <button
                type="button"
                onClick={() => setRegistrationSettings(prev => ({ ...prev, formClosureDate: '' }))}
                className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 font-apercu-medium border border-red-200 rounded-md transition-colors duration-200 decoration-red-400 hover:decoration-red-600"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Clear date & keep form open indefinitely
              </button>
            )}

            <p className="font-apercu-regular text-xs text-gray-500">
              Date when registration form will be automatically closed. Leave empty to keep form open indefinitely.
            </p>
          </div>

          {/* Minimum Age */}
          <div className="space-y-3">
            <label className="block text-sm font-apercu-medium text-gray-700">
              Minimum Age Required
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={registrationSettings.minimumAge || ''}
              onChange={(e) => setRegistrationSettings(prev => ({ ...prev, minimumAge: parseInt(e.target.value) || 13 }))}
              disabled={!editingRegistrationSettings}
              className={`block w-full px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!editingRegistrationSettings ? 'bg-gray-50 text-gray-500' : ''}`}
              placeholder="13"
            />
            <p className="font-apercu-regular text-xs text-gray-500">
              Minimum age required to complete registration. Default is 13 years.
            </p>
          </div>
        </div>
      </Card>

      {/* System Branding - Language & Theme */}
      <SystemBranding />

      {/* System Branding Card */}
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
              <Image className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-lg text-gray-900">System Branding</h3>
              <p className="font-apercu-regular text-sm text-gray-600">Logo, favicon, and visual identity settings</p>
            </div>
          </div>
          {renderEditButtons('branding')}
        </div>

        {/* Branding Settings List */}
        {settings.branding && Array.isArray(settings.branding) && settings.branding.length > 0 && (
          <div className="space-y-4 mb-6">
            {settings.branding.filter(setting => setting && setting.key).map((setting) => (
              <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                <div className="flex-1 min-w-0 lg:pr-4">
                  <p className="font-apercu-medium text-sm text-gray-900">{setting.name || 'Unknown Setting'}</p>
                  {setting.description && (
                    <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                  {renderSettingInput('branding', setting)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logo Upload Section */}
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-apercu-bold text-sm text-orange-800 mb-3">System Logo & Favicon</h4>
          <p className="font-apercu-regular text-xs text-orange-700 mb-4">
            Upload a logo that will be used throughout the system and as the favicon. Recommended size: 512x512px, PNG or SVG format.
          </p>
          <div className="space-y-4">
            {/* Current Logo Preview */}
            <div className="flex items-center space-x-4">
              {(currentLogo || branding.logoUrl) ? (
                <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 bg-white">
                  <img
                    src={currentLogo || branding.logoUrl || ''}
                    alt="Current Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error('Logo failed to load:', currentLogo || branding.logoUrl)
                      // Replace with error message
                      const errorDiv = document.createElement('div')
                      errorDiv.className = 'w-full h-full bg-red-100 flex items-center justify-center'
                      errorDiv.innerHTML = '<span class="text-red-500 text-xs">Failed to load</span>'
                      e.currentTarget.parentElement!.replaceChild(errorDiv, e.currentTarget)
                    }}
                    onLoad={() => {
                      console.log('Logo loaded successfully:', currentLogo || branding.logoUrl)
                    }}
                  />
                </div>
              ) : (
                <div className="h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Image className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <p className="font-apercu-medium text-sm text-gray-900">Current Logo</p>
                <p className="font-apercu-regular text-xs text-gray-500">
                  {(currentLogo || branding.logoUrl) ? 'Custom logo uploaded' : 'Default system icon'}
                </p>
                {(currentLogo || branding.logoUrl) && (
                  <p className="font-apercu-regular text-xs text-gray-400 mt-1">
                    Path: {currentLogo || branding.logoUrl}
                  </p>
                )}
              </div>
            </div>

            {/* Upload Section */}
            <div className={`border-2 border-dashed border-orange-300 rounded-lg p-6 text-center ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="logo-upload"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                {uploadingLogo ? (
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-orange-500" />
                )}
                <span className="font-apercu-medium text-sm text-orange-700">
                  {uploadingLogo ? 'Uploading logo...' : 'Click to upload new logo'}
                </span>
                <span className="font-apercu-regular text-xs text-orange-600">
                  PNG, JPG, SVG up to 5MB
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Automatic Cleanup Info */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-apercu-bold text-sm text-green-800 mb-2 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Automatic Cleanup Enabled
          </h4>
          <p className="font-apercu-regular text-xs text-green-700">
            When you upload a new logo, old logo files are automatically deleted from the server to save storage space.
          </p>
        </div>
      </Card>


    </div>
  )

  // Communications Tab Content
  const renderCommunicationsTab = () => {
    // Get email and SMS settings from loaded settings
    const emailSettings = settings?.email || []
    const smsSettings = settings?.sms || []

    return (
      <div className="space-y-6">
        {/* Email Configuration Section */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">Email Configuration</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure SMTP settings for email notifications</p>
              </div>
            </div>
            {renderEditButtons('email')}
          </div>

          {/* Email Settings List */}
          {loading ? (
            <div className="space-y-4 mb-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                  <div className="flex-1 min-w-0 lg:pr-4">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : emailSettings && Array.isArray(emailSettings) && emailSettings.length > 0 ? (
            <div className="space-y-4 mb-6">
              {emailSettings.filter(setting => setting && setting.key).map((setting) => (
                <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                  <div className="flex-1 min-w-0 lg:pr-4">
                    <p className="font-apercu-medium text-sm text-gray-900">{setting.name || 'Unknown Setting'}</p>
                    {setting.description && (
                      <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                    {renderSettingInput('email', setting)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Show default settings if none loaded */}
          {(!emailSettings || emailSettings.length === 0) &&
            getDefaultSettingsByCategory('email').map((setting) => (
              <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                <div className="flex-1 min-w-0 lg:pr-4">
                  <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                  <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                </div>
                <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                  {renderSettingInput('email', setting)}
                </div>
              </div>
            ))}
        </Card>

        {/* SMS Configuration Section */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">SMS Configuration</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure SMS provider settings for text notifications</p>
              </div>
            </div>
            {renderEditButtons('sms')}
          </div>

          {/* SMS Settings List */}
          {smsSettings && Array.isArray(smsSettings) && smsSettings.length > 0 && (
            <div className="space-y-4 mb-6">
              {smsSettings.filter(setting => setting && setting.key).map((setting) => (
                <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                  <div className="flex-1 min-w-0 lg:pr-4">
                    <p className="font-apercu-medium text-sm text-gray-900">{setting.name || 'Unknown Setting'}</p>
                    {setting.description && (
                      <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                    {renderSettingInput('sms', setting)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show default settings if none loaded */}
          {(!smsSettings || smsSettings.length === 0) &&
            getDefaultSettingsByCategory('sms').map((setting) => (
              <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                <div className="flex-1 min-w-0 lg:pr-4">
                  <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                  <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                </div>
                <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                  {renderSettingInput('sms', setting)}
                </div>
              </div>
            ))}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-apercu-bold text-lg text-gray-900">Quick Actions</h3>
              <p className="font-apercu-regular text-sm text-gray-600">Test and manage communication settings</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => window.location.href = '/admin/communications'}
                variant="outline"
                className="font-apercu-medium"
              >
                <Mail className="h-4 w-4 mr-2" />
                Full Communications Page
              </Button>
              <Button
                onClick={testEmailConfiguration}
                disabled={testingEmail}
                className="font-apercu-medium"
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Test Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Security Tab Content
  const renderSecurityTab = () => {
    const securitySettings = settings?.security || []

    return (
      <div className="space-y-6">
        {/* Authentication Settings */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">Authentication & Access</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure login and access security settings</p>
              </div>
            </div>
            {renderSectionEditButtons('security-auth', 'security')}
          </div>

          {/* Authentication Settings List */}
          <div className="space-y-4 mb-6">
            {mergeWithDefaults(securitySettings, 'security')
              .filter(setting => ['sessionTimeout', 'maxLoginAttempts', 'lockoutDuration', 'passwordMinLength', 'requireStrongPassword', 'twoFactorAuth'].includes(setting.key))
              .map((setting) => (
                <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                  <div className="flex-1 min-w-0 lg:pr-4">
                    <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                    <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                  </div>
                  <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                    {renderSettingInput('security', setting, 'security-auth')}
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Data Protection */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">Data Protection</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure data encryption and privacy settings</p>
              </div>
            </div>
            {renderSectionEditButtons('security-data', 'security')}
          </div>

          {/* Data Protection Settings List */}
          <div className="space-y-4 mb-6">
            {mergeWithDefaults(securitySettings, 'security')
              .filter(setting => ['encryptSensitiveData', 'enableAuditLog', 'anonymizeData', 'gdprCompliance', 'dataRetentionPolicy'].includes(setting.key))
              .map((setting) => (
                <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                  <div className="flex-1 min-w-0 lg:pr-4">
                    <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                    <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                  </div>
                  <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                    {renderSettingInput('security', setting, 'security-data')}
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* API Security */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">API Security</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure API access and rate limiting</p>
              </div>
            </div>
            {renderSectionEditButtons('security-api', 'security')}
          </div>

          {/* API Security Settings List */}
          <div className="space-y-4 mb-6">
            {mergeWithDefaults(securitySettings, 'security')
              .filter(setting => ['apiRateLimit', 'apiKeyRequired', 'corsEnabled', 'ipWhitelist'].includes(setting.key))
              .map((setting) => (
                <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                  <div className="flex-1 min-w-0 lg:pr-4">
                    <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                    <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                  </div>
                  <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                    {renderSettingInput('security', setting, 'security-api')}
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Security Actions */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-apercu-bold text-lg text-gray-900">Security Actions</h3>
              <p className="font-apercu-regular text-sm text-gray-600">Manage security-related actions</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => window.location.href = '/admin/users'}
                variant="outline"
                className="font-apercu-medium"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button
                onClick={() => window.location.href = '/admin/settings?tab=roles'}
                variant="outline"
                className="font-apercu-medium"
              >
                <Shield className="h-4 w-4 mr-2" />
                Roles & Permissions
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Notifications Tab Content
  const renderNotificationsTab = () => {
    // Use mergeWithDefaults to ensure we always have the default settings
    const notificationSettings = settings?.notifications || []
    const mergedNotificationSettings = mergeWithDefaults(notificationSettings, 'notifications')

    return (
      <div className="space-y-6">
        {/* Email Notifications */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">Email Notifications</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure when to send email notifications</p>
              </div>
            </div>
            {renderSectionEditButtons('notifications-email', 'notifications')}
          </div>

          {/* Email Notification Settings List */}
          <div className="space-y-4 mb-6">
            {mergedNotificationSettings.filter(setting =>
              setting && setting.key && setting.key.startsWith('email')
            ).map((setting) => (
              <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                <div className="flex-1 min-w-0 lg:pr-4">
                  <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                  <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                </div>
                <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                  {renderSettingInput('notifications', setting, 'notifications-email')}
                </div>
              </div>
            ))}

            {/* Show default settings if none loaded */}
            {(!mergedNotificationSettings || mergedNotificationSettings.filter(s => s.key?.startsWith('email')).length === 0) &&
              getDefaultSettingsByCategory('notifications')
                .filter(setting => setting.key.startsWith('email'))
                .map((setting) => (
                  <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                    <div className="flex-1 min-w-0 lg:pr-4">
                      <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                      <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                    </div>
                    <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                      {renderSettingInput('notifications', setting, 'notifications-email')}
                    </div>
                  </div>
                ))}
          </div>
        </Card>

        {/* SMS Notifications */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">SMS Notifications</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure when to send SMS notifications</p>
              </div>
            </div>
            {renderSectionEditButtons('notifications-sms', 'notifications')}
          </div>

          {/* SMS Notification Settings List */}
          <div className="space-y-4 mb-6">
            {mergedNotificationSettings.filter(setting =>
              setting && setting.key && setting.key.startsWith('sms')
            ).map((setting) => (
              <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                <div className="flex-1 min-w-0 lg:pr-4">
                  <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                  <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                </div>
                <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                  {renderSettingInput('notifications', setting, 'notifications-sms')}
                </div>
              </div>
            ))}

            {/* Show default settings if none loaded */}
            {(!mergedNotificationSettings || mergedNotificationSettings.filter(s => s.key?.startsWith('sms')).length === 0) &&
              getDefaultSettingsByCategory('notifications')
                .filter(setting => setting.key.startsWith('sms'))
                .map((setting) => (
                  <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                    <div className="flex-1 min-w-0 lg:pr-4">
                      <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                      <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                    </div>
                    <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                      {renderSettingInput('notifications', setting, 'notifications-sms')}
                    </div>
                  </div>
                ))}
          </div>
        </Card>

        {/* Notification Timing */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-lg text-gray-900">Notification Timing</h3>
                <p className="font-apercu-regular text-sm text-gray-600">Configure when notifications are sent</p>
              </div>
            </div>
            {renderSectionEditButtons('notifications-timing', 'notifications')}
          </div>

          {/* Notification Timing Settings List */}
          <div className="space-y-4 mb-6">
            {mergedNotificationSettings.filter(setting =>
              setting && setting.key && (
                setting.key.includes('notification') ||
                setting.key.includes('reminder') ||
                setting.key.includes('quiet')
              )
            ).map((setting) => (
              <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                <div className="flex-1 min-w-0 lg:pr-4">
                  <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                  <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                </div>
                <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                  {renderSettingInput('notifications', setting, 'notifications-timing')}
                </div>
              </div>
            ))}

            {/* Show default settings if none loaded */}
            {(!mergedNotificationSettings || mergedNotificationSettings.filter(s => s.key && (s.key.includes('notification') || s.key.includes('reminder') || s.key.includes('quiet'))).length === 0) &&
              getDefaultSettingsByCategory('notifications')
                .filter(setting => setting.key.includes('notification') || setting.key.includes('reminder') || setting.key.includes('quiet'))
                .map((setting) => (
                  <div key={setting.key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
                    <div className="flex-1 min-w-0 lg:pr-4">
                      <p className="font-apercu-medium text-sm text-gray-900">{setting.name}</p>
                      <p className="font-apercu-regular text-xs text-gray-500 mt-1 break-words">{setting.description}</p>
                    </div>
                    <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
                      {renderSettingInput('notifications', setting, 'notifications-timing')}
                    </div>
                  </div>
                ))}
          </div>
        </Card>

        {/* Settings Integration Test */}
        <SettingsTestComponent />
      </div>
    )
  }

  // Rate Limits Tab Content
  const renderRateLimitsTab = () => (
    <div className="space-y-6">
      {/* Rate Limiting Overview */}
      <Card className="p-3 sm:p-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center mb-6 space-y-3 sm:space-y-0">
          <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center sm:mr-4">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-apercu-bold text-lg text-gray-900">Rate Limiting Configuration</h3>
            <p className="font-apercu-regular text-sm text-gray-600">Control API request rates and prevent abuse</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start">
            <Clock className="h-5 w-5 text-blue-600 mb-2 sm:mb-0 sm:mt-0.5 sm:mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-apercu-bold text-sm text-blue-900 mb-2">How Rate Limiting Works</h4>
              <div className="font-apercu-regular text-sm text-blue-800 space-y-2">
                <p>Rate limiting controls how many requests users can make to your API within a specific time window. This helps:</p>
                <ul className="list-disc list-inside ml-0 sm:ml-4 space-y-1">
                  <li><strong>Prevent abuse:</strong> Stop malicious users from overwhelming your server</li>
                  <li><strong>Ensure fair usage:</strong> Distribute resources fairly among all users</li>
                  <li><strong>Maintain performance:</strong> Keep your application responsive under load</li>
                  <li><strong>Control costs:</strong> Manage server resources and bandwidth usage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Global Rate Limits */}
        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 mb-6">
          <h4 className="font-apercu-bold text-base text-gray-900 mb-4">Global Rate Limits</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                  General API Requests
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="number"
                    value={rateLimits.apiRequests.limit}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      apiRequests: { ...prev.apiRequests, limit: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <span className="font-apercu-regular text-sm text-gray-600 text-center sm:text-left">requests per</span>
                  <select
                    value={rateLimits.apiRequests.window}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      apiRequests: { ...prev.apiRequests, window: e.target.value as 'minute' | 'hour' | 'day' }
                    }))}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="minute">minute</option>
                    <option value="hour">hour</option>
                    <option value="day">day</option>
                  </select>
                </div>
                <p className="font-apercu-regular text-xs text-gray-500 mt-1">
                  Maximum requests for general API endpoints
                </p>
              </div>

              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                  Registration Submissions
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="number"
                    value={rateLimits.registrations.limit}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      registrations: { ...prev.registrations, limit: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <span className="font-apercu-regular text-sm text-gray-600 text-center sm:text-left">submissions per</span>
                  <select
                    value={rateLimits.registrations.window}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      registrations: { ...prev.registrations, window: e.target.value as 'minute' | 'hour' | 'day' }
                    }))}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="minute">minute</option>
                    <option value="hour">hour</option>
                    <option value="day">day</option>
                  </select>
                </div>
                <p className="font-apercu-regular text-xs text-gray-500 mt-1">
                  Prevent spam registrations from same IP
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                  Login Attempts
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="number"
                    value={rateLimits.loginAttempts.limit}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      loginAttempts: { ...prev.loginAttempts, limit: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <span className="font-apercu-regular text-sm text-gray-600 text-center sm:text-left">attempts per</span>
                  <select
                    value={rateLimits.loginAttempts.window}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      loginAttempts: { ...prev.loginAttempts, window: e.target.value as 'minute' | 'hour' | 'day' }
                    }))}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="minute">minute</option>
                    <option value="hour">hour</option>
                    <option value="day">day</option>
                  </select>
                </div>
                <p className="font-apercu-regular text-xs text-gray-500 mt-1">
                  Prevent brute force login attacks
                </p>
              </div>

              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                  Email/SMS Sending
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="number"
                    value={rateLimits.messaging.limit}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      messaging: { ...prev.messaging, limit: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <span className="font-apercu-regular text-sm text-gray-600 text-center sm:text-left">messages per</span>
                  <select
                    value={rateLimits.messaging.window}
                    onChange={(e) => setRateLimits(prev => ({
                      ...prev,
                      messaging: { ...prev.messaging, window: e.target.value as 'minute' | 'hour' | 'day' }
                    }))}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="minute">minute</option>
                    <option value="hour">hour</option>
                    <option value="day">day</option>
                  </select>
                </div>
                <p className="font-apercu-regular text-xs text-gray-500 mt-1">
                  Control communication volume and costs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
          <h4 className="font-apercu-bold text-base text-gray-900 mb-4">Advanced Settings</h4>
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <label className="font-apercu-medium text-sm text-gray-700">Enable Rate Limiting</label>
                <p className="font-apercu-regular text-xs text-gray-500">Turn on/off global rate limiting</p>
              </div>
              <select
                value={rateLimits.enabled ? 'true' : 'false'}
                onChange={(e) => setRateLimits(prev => ({ ...prev, enabled: e.target.value === 'true' }))}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex-1">
                <label className="font-apercu-medium text-sm text-gray-700">Whitelist Admin IPs</label>
                <p className="font-apercu-regular text-xs text-gray-500">Exempt admin IP addresses from rate limits</p>
              </div>
              <select
                value={rateLimits.whitelistAdminIPs ? 'true' : 'false'}
                onChange={(e) => setRateLimits(prev => ({ ...prev, whitelistAdminIPs: e.target.value === 'true' }))}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            <div>
              <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                Burst Allowance
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  type="number"
                  value={rateLimits.burstAllowance}
                  onChange={(e) => setRateLimits(prev => ({ ...prev, burstAllowance: parseInt(e.target.value) || 100 }))}
                  min="100"
                  max="500"
                  className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <span className="font-apercu-regular text-sm text-gray-600 text-center sm:text-left">% of normal limit</span>
              </div>
              <p className="font-apercu-regular text-xs text-gray-500 mt-1">
                Allow temporary bursts above normal limits (e.g., 150% = 50% extra requests)
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row justify-center sm:justify-end mt-6">
          <Button
            onClick={saveRateLimits}
            disabled={savingRateLimits}
            className="font-apercu-medium w-full sm:w-auto"
          >
            {savingRateLimits ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Rate Limit Settings
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Rate Limiting Examples */}
      <Card className="p-3 sm:p-6 bg-white">
        <h3 className="font-apercu-bold text-lg text-gray-900 mb-4">Configuration Examples</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Conservative Settings */}
          <div className="border border-green-200 rounded-lg p-3 sm:p-4 bg-green-50">
            <h4 className="font-apercu-bold text-sm sm:text-base text-green-900 mb-3">🛡️ Conservative (High Security)</h4>
            <div className="space-y-1 sm:space-y-2 font-apercu-regular text-xs sm:text-sm text-green-800">
              <p><strong>API Requests:</strong> 50 per minute</p>
              <p><strong>Registrations:</strong> 2 per hour</p>
              <p><strong>Login Attempts:</strong> 5 per minute</p>
              <p><strong>Messages:</strong> 10 per hour</p>
              <p className="text-xs text-green-700 mt-2">
                Best for: Small events, high-security requirements
              </p>
            </div>
          </div>

          {/* Balanced Settings */}
          <div className="border border-blue-200 rounded-lg p-3 sm:p-4 bg-blue-50">
            <h4 className="font-apercu-bold text-sm sm:text-base text-blue-900 mb-3">⚖️ Balanced (Recommended)</h4>
            <div className="space-y-1 sm:space-y-2 font-apercu-regular text-xs sm:text-sm text-blue-800">
              <p><strong>API Requests:</strong> 100 per minute</p>
              <p><strong>Registrations:</strong> 5 per minute</p>
              <p><strong>Login Attempts:</strong> 10 per minute</p>
              <p><strong>Messages:</strong> 20 per hour</p>
              <p className="text-xs text-blue-700 mt-2">
                Best for: Most events, good balance of security and usability
              </p>
            </div>
          </div>

          {/* Permissive Settings */}
          <div className="border border-orange-200 rounded-lg p-3 sm:p-4 bg-orange-50">
            <h4 className="font-apercu-bold text-sm sm:text-base text-orange-900 mb-3">🚀 Permissive (High Volume)</h4>
            <div className="space-y-1 sm:space-y-2 font-apercu-regular text-xs sm:text-sm text-orange-800">
              <p><strong>API Requests:</strong> 200 per minute</p>
              <p><strong>Registrations:</strong> 10 per minute</p>
              <p><strong>Login Attempts:</strong> 20 per minute</p>
              <p><strong>Messages:</strong> 50 per hour</p>
              <p className="text-xs text-orange-700 mt-2">
                Best for: Large events, high registration volume expected
              </p>
            </div>
          </div>

          {/* Custom Settings */}
          <div className="border border-purple-200 rounded-lg p-3 sm:p-4 bg-purple-50">
            <h4 className="font-apercu-bold text-sm sm:text-base text-purple-900 mb-3">🎯 Custom Configuration</h4>
            <div className="space-y-1 sm:space-y-2 font-apercu-regular text-xs sm:text-sm text-purple-800">
              <p>Configure limits based on your specific needs:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Monitor your traffic patterns</li>
                <li>Start conservative and increase as needed</li>
                <li>Consider peak registration times</li>
                <li>Account for legitimate user behavior</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )

  // Data Management Tab Content
  const renderDataManagementTab = () => (
    <div className="space-y-6">
      {/* Data Operations Card */}
      <Card className="p-6 bg-white">
        <div className="flex items-center mb-6">
          <div className="h-12 w-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-apercu-bold text-lg text-gray-900">Data Management</h3>
            <p className="font-apercu-regular text-sm text-gray-600">Backup, import, and export system data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Backup Data */}
          <div className="p-4 border border-blue-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-apercu-bold text-sm text-gray-900">Backup Data</h4>
                  <p className="font-apercu-bold text-xs text-gray-500">Export system data</p>
                </div>
              </div>
            </div>
            <p className="font-apercu-bold text-xs text-gray-600 mb-3">
              Download a complete backup of your system data including settings, users, and configurations.
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={handleBackupData}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </Button>
          </div>

          {/* Import Data */}
          <div className="p-4 border border-green-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-apercu-bold text-sm text-gray-900">Import Data</h4>
                  <p className="font-apercu-bold text-xs text-gray-500">Import configurations</p>
                </div>
              </div>
            </div>
            <p className="font-apercu-bold text-xs text-gray-600 mb-3">
              Import system data from a backup file or migrate from another system.
            </p>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
                id="import-file"
                disabled={importingData}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('import-file')?.click()}
                disabled={importingData}
              >
                {importingData ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* System Logs */}
          <div className="p-4 border border-purple-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-apercu-bold text-sm text-gray-900">System Logs</h4>
                  <p className="font-apercu-bold text-xs text-gray-500">View activity logs</p>
                </div>
              </div>
            </div>
            <p className="font-apercu-bold text-xs text-gray-600 mb-3">
              View and download system activity logs for troubleshooting and monitoring.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleViewLogs}
              disabled={viewingLogs}
            >
              {viewingLogs ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  View Logs
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card className="p-6 bg-white">
        <h3 className="font-apercu-bold text-lg text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="font-apercu-medium text-sm text-gray-600 mb-1">Version</p>
            <p className="font-apercu-regular text-lg text-gray-900">v1.0.0</p>
          </div>
          <div>
            <p className="font-apercu-medium text-sm text-gray-600 mb-1">Last Updated</p>
            <p className="font-apercu-regular text-lg text-gray-900">Today</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-apercu-medium text-sm text-gray-600 mb-1">Environment</p>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-apercu-medium">
              Production
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  )

  // Removed settingsCategories as it's not used in the current implementation


  const renderSettingInput = (category: string, setting: SettingItem, sectionId?: string) => {
    // Validate inputs to prevent runtime errors
    if (!setting || !setting.key || !setting.type) {
      console.warn('Invalid setting object:', setting)
      return (
        <Badge variant="secondary" className="font-apercu-medium text-xs">
          Invalid Setting
        </Badge>
      )
    }

    const isEditing = sectionId ? (editingSections[sectionId] || false) : (editingCategories[category] || false)
    const canEdit = hasWriteAccess(category)
    const settingValue = setting.value ?? ''

    // Show read-only state for restricted categories
    if (!canEdit && currentUser?.role?.name === 'Admin') {
      return (
        <div className="flex items-center space-x-2">
          {(setting.type === 'toggle' || setting.type === 'boolean') ? (
            <div className="flex items-center space-x-2">
              <Badge
                className={`font-apercu-medium text-xs ${
                  (settingValue === true || settingValue === 'true' || settingValue === 1 || settingValue === '1')
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {(settingValue === true || settingValue === 'true' || settingValue === 1 || settingValue === '1') ? 'Enabled' : 'Disabled'}
              </Badge>
              <Badge variant="outline" className="font-apercu-medium text-xs text-amber-600 border-amber-200">
                Read Only
              </Badge>
            </div>
          ) : setting.type === 'password' ? (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="font-apercu-medium text-xs">
                {settingValue ? '••••••••' : 'Not set'}
              </Badge>
              <Badge variant="outline" className="font-apercu-medium text-xs text-amber-600 border-amber-200">
                Read Only
              </Badge>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="font-apercu-medium text-xs">
                {settingValue ? settingValue.toString() : 'Not set'}
              </Badge>
              <Badge variant="outline" className="font-apercu-medium text-xs text-amber-600 border-amber-200">
                Read Only
              </Badge>
            </div>
          )}
        </div>
      )
    }

    if (!isEditing) {
      return (
        <div className="flex items-center space-x-2">
          {(setting.type === 'toggle' || setting.type === 'boolean') ? (
            <Badge
              className={`font-apercu-medium text-xs ${
                (settingValue === true || settingValue === 'true' || settingValue === 1 || settingValue === '1')
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}
            >
              {(settingValue === true || settingValue === 'true' || settingValue === 1 || settingValue === '1') ? 'Enabled' : 'Disabled'}
            </Badge>
          ) : setting.type === 'password' ? (
            <Badge variant="secondary" className="font-apercu-medium text-xs">
              {settingValue ? '••••••••' : 'Not set'}
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-apercu-medium text-xs">
              {settingValue ? settingValue.toString() : 'Not set'}
            </Badge>
          )}
        </div>
      )
    }

    switch (setting.type) {
      case 'toggle':
        // Improved boolean value detection
        const toggleValue = settingValue === true || settingValue === 'true' || settingValue === 1 || settingValue === '1'
        return (
          <select
            value={toggleValue ? 'true' : 'false'}
            onChange={(e) => updateSetting(category, setting.key, e.target.value === 'true')}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        )

      case 'select':
        const options = setting.options || []
        return (
          <select
            value={settingValue as string || ''}
            onChange={(e) => updateSetting(category, setting.key, e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            {options.length === 0 && (
              <option value="">No options available</option>
            )}
            {options.map((option, index) => {
              // Handle both string options and object options with value/label
              const optionValue = typeof option === 'object' ? option.value : option
              const optionLabel = typeof option === 'object' ? option.label : option
              return (
                <option key={`${optionValue}-${index}`} value={optionValue}>
                  {optionLabel}
                </option>
              )
            })}
          </select>
        )

      case 'boolean':
        // Improved boolean value detection
        const boolValue = settingValue === true || settingValue === 'true' || settingValue === 1 || settingValue === '1'
        return (
          <select
            value={boolValue ? 'true' : 'false'}
            onChange={(e) => updateSetting(category, setting.key, e.target.value === 'true')}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        )

      case 'number':
        return (
          <input
            type="number"
            value={settingValue as string || ''}
            onChange={(e) => updateSetting(category, setting.key, e.target.value)}
            className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        )

      case 'password':
        return (
          <input
            type="password"
            value={settingValue as string || ''}
            onChange={(e) => updateSetting(category, setting.key, e.target.value)}
            placeholder="Enter SMTP password"
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-w-0"
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={settingValue as string || ''}
            onChange={(e) => updateSetting(category, setting.key, e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        )

      default:
        return (
          <input
            type={setting.type === 'password' ? 'password' : setting.type}
            value={settingValue as string || ''}
            onChange={(e) => updateSetting(category, setting.key, e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-w-0"
          />
        )
    }
  }



  // Validate settings object before rendering
  if (!settings && !loading) {
    return (
      <AdminLayoutNew title="Settings" description="Configure system settings and preferences">
        <div className="space-y-6">
          <Card className="p-6 bg-white">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="font-apercu-bold text-lg text-gray-900 mb-2">Settings Not Available</h3>
              <p className="font-apercu-bold text-sm text-gray-600 mb-4">
                Unable to load system settings. This could be due to a network issue or server error.
              </p>
              <Button onClick={loadSettings} className="font-apercu-medium">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading Settings
              </Button>
            </div>
          </Card>
        </div>
      </AdminLayoutNew>
    )
  }

  // Show loading state while user data is being fetched
  if (userLoading || loading) {
    return (
      <AdminLayoutNew title={t('page.settings.title')} description={t('page.settings.description')}>
        <SettingsPageSkeleton />
      </AdminLayoutNew>
    )
  }



  // Check permissions - Allow Super Admin and Admin roles only
  const allowedRoles = ['Super Admin', 'Admin']
  if (currentUser && !allowedRoles.includes(currentUser.role?.name || '')) {
    return (
      <AdminLayoutNew title={t('page.settings.title')} description={t('page.settings.description')}>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew
      title={t('page.settings.title')}
      description={t('page.settings.description')}
    >
      {/* Legacy message div removed - now using consistent toast notifications */}

      {/* Backup Integration Guide - Temporarily disabled for debugging */}
      {/* {currentUser?.role?.name === 'Super Admin' && (
        <div className="mb-6">
          <BackupIntegrationGuide
            isEmailConfigured={(() => {
              if (!settings?.email) return false
              const emailSettings = settings.email
              const emailMap = emailSettings.reduce((acc, setting) => {
                if (setting && setting.key) {
                  try {
                    acc[setting.key] = JSON.parse(setting.value || '""')
                  } catch {
                    acc[setting.key] = setting.value
                  }
                }
                return acc
              }, {} as Record<string, any>)
              return !!(emailMap.smtpHost && emailMap.smtpUser && emailMap.smtpPass)
            })()}
            onRestoreBackup={restoreSystemBackup}
            loading={loading}
          />
        </div>
      )} */}





      {/* Tab Navigation - Highly Responsive */}
      <div className="mb-6 sm:mb-8">
        {/* Mobile Dropdown for Small Screens */}
        <div className="block sm:hidden mb-4">
          <label htmlFor="tab-select" className="sr-only">Choose a tab</label>
          <select
            id="tab-select"
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value)}
            className="mobile-dropdown w-full px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-apercu-medium text-sm transition-all duration-200 h-9"
          >
            {settingsTabs
              .filter(tab => {
                // If no current user, only show general tab
                if (!currentUser) {
                  return tab.id === 'general'
                }
                // FORCE ALL TABS FOR SUPER ADMIN - PERIOD!
                if (currentUser.role?.name === 'Super Admin') {
                  return true
                }
                // FORCE ALL TABS FOR ADMIN - PERIOD!
                if (currentUser.role?.name === 'Admin') {
                  return true
                }
                // For other roles, only show general tab
                return tab.id === 'general'
              })
              .map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
          </select>
        </div>

        {/* Desktop/Tablet Tab Buttons */}
        <div className="hidden sm:block xl:hidden">
          {/* Horizontal Scrollable Container for Medium Screens */}
          <div className="overflow-x-auto scrollbar-hide tab-scroll-container">
            <div className="flex gap-2 md:gap-3 lg:gap-4 min-w-max sm:min-w-0 pb-2 sm:pb-0">
              {settingsTabs
                .filter(tab => {
                  // If no current user, only show general tab
                  if (!currentUser) {
                    return tab.id === 'general'
                  }
                  // FORCE ALL TABS FOR SUPER ADMIN - PERIOD!
                  if (currentUser.role?.name === 'Super Admin') {
                    return true
                  }
                  // FORCE ALL TABS FOR ADMIN - PERIOD!
                  if (currentUser.role?.name === 'Admin') {
                    return true
                  }
                  // For other roles, only show general tab
                  return tab.id === 'general'
                })
                .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`tab-button flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-3 rounded-lg font-apercu-bold text-xs sm:text-sm md:text-base transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-105 gradient-tab'
                      : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <span className={`font-apercu-medium responsive-text-xs ${activeTab === tab.id ? 'text-white' : ''}`}>
                    {tab.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Layout for Large Screens */}
        <div className="hidden xl:block">
          <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3 lg:gap-4">
            {settingsTabs
              .filter(tab => {
                // If no current user, only show general tab
                if (!currentUser) {
                  return tab.id === 'general'
                }
                // FORCE ALL TABS FOR SUPER ADMIN - PERIOD!
                if (currentUser.role?.name === 'Super Admin') {
                  return true
                }
                // FORCE ALL TABS FOR ADMIN - PERIOD!
                if (currentUser.role?.name === 'Admin') {
                  return true
                }
                // For other roles, only show general tab
                return tab.id === 'general'
              })
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`tab-grid-item flex flex-col items-center justify-center space-y-2 p-4 lg:p-5 rounded-xl font-apercu-bold text-sm lg:text-base transition-all duration-300 transform hover:scale-105 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/25 scale-105 gradient-tab'
                      : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-gray-50 hover:to-indigo-50 hover:shadow-lg border border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <tab.icon className="h-6 w-6 lg:h-7 lg:w-7 flex-shrink-0" />
                  <span className={`text-center font-apercu-medium responsive-text-xs ${activeTab === tab.id ? 'text-white' : ''}`}>
                    {tab.name}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Tab Description - Responsive */}
      <div className="p-3 sm:p-4 md:p-5 lg:p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-sm">
          <div className="flex items-start space-x-3">
            {/* Icon for current tab */}
            <div className="flex-shrink-0 mt-0.5">
              {(() => {
                const currentTab = settingsTabs
                  .filter(tab => {
                    // FORCE ALL TABS FOR SUPER ADMIN AND ADMIN - NO EXCEPTIONS!
                    if (currentUser?.role?.name === 'Super Admin') {
                      return true
                    }
                    // FORCE ALL TABS FOR ADMIN - NO EXCEPTIONS!
                    if (currentUser?.role?.name === 'Admin') {
                      return true
                    }
                    // For other roles, only show general tab
                    return tab.id === 'general'
                  })
                  .find(tab => tab.id === activeTab)

                if (currentTab) {
                  const IconComponent = currentTab.icon
                  return <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                }
                return null
              })()}
            </div>

            {/* Description text */}
            <div className="flex-1 min-w-0">
              <h3 className="font-apercu-bold text-sm sm:text-base md:text-lg text-indigo-900 mb-1">
                {settingsTabs
                  .filter(tab => {
                    // FORCE ALL TABS FOR SUPER ADMIN AND ADMIN - NO EXCEPTIONS!
                    if (currentUser?.role?.name === 'Super Admin') {
                      return true
                    }
                    // FORCE ALL TABS FOR ADMIN - NO EXCEPTIONS!
                    if (currentUser?.role?.name === 'Admin') {
                      return true
                    }
                    // For other roles, only show general tab
                    return tab.id === 'general'
                  })
                  .find(tab => tab.id === activeTab)?.name}
              </h3>
              <p className="font-apercu-regular text-xs sm:text-sm md:text-base text-indigo-700 leading-relaxed">
                {settingsTabs
                  .filter(tab => {
                    // FORCE ALL TABS FOR SUPER ADMIN AND ADMIN - NO EXCEPTIONS!
                    if (currentUser?.role?.name === 'Super Admin') {
                      return true
                    }
                    // FORCE ALL TABS FOR ADMIN - NO EXCEPTIONS!
                    if (currentUser?.role?.name === 'Admin') {
                      return true
                    }
                    // For other roles, only show general tab
                    return tab.id === 'general'
                  })
                  .find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>
      {/* Tab Content - Responsive Container */}
      <div className="min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
        <div className="w-full max-w-none overflow-hidden tab-content-enter">
          {renderTabContent()}
        </div>
      </div>

      {/* System Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="font-apercu-bold text-lg text-gray-900">System Logs</h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <AlertCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {systemLogs.map((log) => (
                  <div key={log.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={`text-xs ${
                            log.level === 'ERROR' ? 'bg-red-100 text-red-800 border-red-200' :
                            log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-green-100 text-green-800 border-green-200'
                          }`}
                        >
                          {log.level}
                        </Badge>
                        <span className="font-apercu-medium text-sm text-gray-900">{log.message}</span>
                      </div>
                      <span className="font-apercu-regular text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1">
                      {(log as any).user && <p><strong>User:</strong> {(log as any).user}</p>}
                      {(log as any).ip && <p><strong>IP:</strong> {(log as any).ip}</p>}
                      {(log as any).details && <p><strong>Details:</strong> {(log as any).details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowLogsModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        type={errorModal.type}
        title={errorModal.title}
        description={errorModal.description}
        details={errorModal.details}
        errorCode={errorModal.errorCode}
        showRetry={errorModal.type === 'error'}
        onRetry={() => {
          setErrorModal(prev => ({ ...prev, isOpen: false }))
          loadSettings()
        }}
        showContactSupport={errorModal.type === 'error'}
        actions={undefined}
      />
      </AdminLayoutNew>
  )
}

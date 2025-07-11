import { useState, useEffect } from 'react'

interface SystemSettings {
  systemName: string
  timezone: string
  dateFormat: string
  language: string
  maintenanceMode: boolean
  debugMode: boolean
}

interface UserManagementSettings {
  defaultRole: string
  selfRegistration: boolean
  passwordRequirements: string
  sessionTimeout: number
  maxUsers: number
}

interface SecuritySettings {
  twoFactor: string
  loginAttempts: number
  lockoutDuration: number
  passwordExpiry: number
  ipWhitelist: boolean
}

interface NotificationSettings {
  newRegistrationAlerts: boolean
  dailySummary: boolean
  maintenanceAlerts: boolean
  emailNotifications: string
  slackWebhook: string
}

interface AllSettings {
  system: SystemSettings
  userManagement: UserManagementSettings
  security: SecuritySettings
  notifications: NotificationSettings
}

export function useSettings() {
  const [settings, setSettings] = useState<Partial<AllSettings>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')

      if (response.status === 403) {
        // User doesn't have permission to access settings, use defaults
        console.log('User does not have permission to access settings, using defaults')
        setSettings({})
        setError(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        console.error(`Settings API error: ${response.status} ${response.statusText}`)
        // For other errors, use defaults and don't show error to user
        setSettings({})
        setError(null)
        setLoading(false)
        return
      }

      const data = await response.json()

      if (data.success) {
        // Transform the API response to a more usable format
        const transformedSettings: Partial<AllSettings> = {}

        Object.keys(data.settings).forEach(category => {
          const categorySettings = data.settings[category]
          const settingsObject: any = {}

          categorySettings.forEach((setting: any) => {
            settingsObject[setting.key] = setting.value
          })

          transformedSettings[category as keyof AllSettings] = settingsObject
        })

        setSettings(transformedSettings)
        setError(null)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Settings fetch error:', err)
      // For any fetch errors (network issues, etc.), use defaults and don't show error
      // This ensures the app continues to work even if settings can't be loaded
      setSettings({})
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const getSetting = (category: keyof AllSettings, key: string, defaultValue: any = null) => {
    return settings[category]?.[key as keyof any] ?? defaultValue
  }

  const getSystemName = () => getSetting('branding', 'systemName', 'Mopgomglobal')
  const getLogoUrl = () => getSetting('branding', 'logoUrl', null)
  const getTimezone = () => getSetting('system', 'timezone', 'UTC-5 (EST)')
  const getDateFormat = () => getSetting('system', 'dateFormat', 'MM/DD/YYYY')
  const isMaintenanceMode = () => getSetting('system', 'maintenanceMode', false)
  const isDebugMode = () => getSetting('system', 'debugMode', false)

  const getDefaultRole = () => getSetting('userManagement', 'defaultRole', 'Viewer')
  const isSelfRegistrationEnabled = () => getSetting('userManagement', 'selfRegistration', false)
  const getPasswordRequirements = () => getSetting('userManagement', 'passwordRequirements', 'Medium')
  const getSessionTimeout = () => getSetting('userManagement', 'sessionTimeout', 24)

  const getTwoFactorSetting = () => getSetting('security', 'twoFactor', 'Optional')
  const getLoginAttemptsLimit = () => getSetting('security', 'loginAttempts', 5)
  const getLockoutDuration = () => getSetting('security', 'lockoutDuration', 30)

  const areNewRegistrationAlertsEnabled = () => getSetting('notifications', 'newRegistrationAlerts', true)
  const isDailySummaryEnabled = () => getSetting('notifications', 'dailySummary', true)
  const getEmailNotifications = () => getSetting('notifications', 'emailNotifications', 'admin@youth.com')

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    getSetting,
    
    // System settings
    getSystemName,
    getLogoUrl,
    getTimezone,
    getDateFormat,
    isMaintenanceMode,
    isDebugMode,
    
    // User management settings
    getDefaultRole,
    isSelfRegistrationEnabled,
    getPasswordRequirements,
    getSessionTimeout,
    
    // Security settings
    getTwoFactorSetting,
    getLoginAttemptsLimit,
    getLockoutDuration,
    
    // Notification settings
    areNewRegistrationAlertsEnabled,
    isDailySummaryEnabled,
    getEmailNotifications
  }
}


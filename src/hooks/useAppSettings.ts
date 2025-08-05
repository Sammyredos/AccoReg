/**
 * React Hook for accessing app settings
 */

import { useState, useEffect, useCallback } from 'react'

interface AppSettings {
  // Notification settings
  emailOnRegistration: boolean
  emailOnVerification: boolean
  emailOnAllocation: boolean
  emailOnPlatoonAssignment: boolean
  emailDailyReport: boolean
  emailWeeklyReport: boolean
  smsOnRegistration: boolean
  smsOnVerification: boolean
  smsOnAllocation: boolean
  smsReminders: boolean
  smsUrgentAlerts: boolean
  notificationDelay: number
  reminderAdvance: number
  quietHoursStart: string
  quietHoursEnd: string

  // Security settings
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  passwordMinLength: number
  requireStrongPassword: boolean
  twoFactorAuth: boolean
  encryptSensitiveData: boolean
  enableAuditLog: boolean
  anonymizeData: boolean
  gdprCompliance: boolean
  dataRetentionPolicy: boolean
  apiRateLimit: number
  apiKeyRequired: boolean
  corsEnabled: boolean
  ipWhitelist: string
}

interface UseAppSettingsReturn {
  settings: Partial<AppSettings>
  loading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
  getSetting: (key: keyof AppSettings, defaultValue?: any) => any
}

export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<Partial<AppSettings>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load notification and security settings
      const [notificationsRes, securityRes] = await Promise.all([
        fetch('/api/admin/settings/notifications'),
        fetch('/api/admin/settings/security')
      ])

      const newSettings: Partial<AppSettings> = {}

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json()
        if (notificationsData.success) {
          Object.assign(newSettings, notificationsData.settings)
        }
      }

      if (securityRes.ok) {
        const securityData = await securityRes.json()
        if (securityData.success) {
          Object.assign(newSettings, securityData.settings)
        }
      }

      setSettings(newSettings)
    } catch (err) {
      console.error('Failed to load app settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSettings = useCallback(async () => {
    await loadSettings()
  }, [loadSettings])

  const getSetting = useCallback((key: keyof AppSettings, defaultValue?: any) => {
    return settings[key] ?? defaultValue
  }, [settings])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    loading,
    error,
    refreshSettings,
    getSetting
  }
}

// Hook for specific setting categories
export function useNotificationSettings() {
  const { settings, loading, error, refreshSettings } = useAppSettings()
  
  const notificationKeys: (keyof AppSettings)[] = [
    'emailOnRegistration', 'emailOnVerification', 'emailOnAllocation', 'emailOnPlatoonAssignment',
    'emailDailyReport', 'emailWeeklyReport', 'smsOnRegistration', 'smsOnVerification',
    'smsOnAllocation', 'smsReminders', 'smsUrgentAlerts', 'notificationDelay',
    'reminderAdvance', 'quietHoursStart', 'quietHoursEnd'
  ]

  const notificationSettings = Object.fromEntries(
    notificationKeys.map(key => [key, settings[key]])
  )

  return {
    settings: notificationSettings,
    loading,
    error,
    refreshSettings
  }
}

export function useSecuritySettings() {
  const { settings, loading, error, refreshSettings } = useAppSettings()
  
  const securityKeys: (keyof AppSettings)[] = [
    'sessionTimeout', 'maxLoginAttempts', 'lockoutDuration', 'passwordMinLength',
    'requireStrongPassword', 'twoFactorAuth', 'encryptSensitiveData', 'enableAuditLog',
    'anonymizeData', 'gdprCompliance', 'dataRetentionPolicy', 'apiRateLimit',
    'apiKeyRequired', 'corsEnabled', 'ipWhitelist'
  ]

  const securitySettings = Object.fromEntries(
    securityKeys.map(key => [key, settings[key]])
  )

  return {
    settings: securitySettings,
    loading,
    error,
    refreshSettings
  }
}

// Hook for checking if notifications should be sent
export function useNotificationCheck() {
  const { getSetting } = useAppSettings()

  const shouldSendEmail = useCallback((type: 'registration' | 'verification' | 'allocation' | 'platoon' | 'daily' | 'weekly') => {
    const settingMap = {
      registration: 'emailOnRegistration',
      verification: 'emailOnVerification',
      allocation: 'emailOnAllocation',
      platoon: 'emailOnPlatoonAssignment',
      daily: 'emailDailyReport',
      weekly: 'emailWeeklyReport'
    }
    return getSetting(settingMap[type] as keyof AppSettings, false)
  }, [getSetting])

  const shouldSendSMS = useCallback((type: 'registration' | 'verification' | 'allocation' | 'reminders' | 'urgent') => {
    const settingMap = {
      registration: 'smsOnRegistration',
      verification: 'smsOnVerification',
      allocation: 'smsOnAllocation',
      reminders: 'smsReminders',
      urgent: 'smsUrgentAlerts'
    }
    return getSetting(settingMap[type] as keyof AppSettings, false)
  }, [getSetting])

  const isQuietHours = useCallback(() => {
    const quietStart = getSetting('quietHoursStart', '22:00')
    const quietEnd = getSetting('quietHoursEnd', '08:00')
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMin] = quietStart.split(':').map(Number)
    const [endHour, endMin] = quietEnd.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      return currentTime >= startTime || currentTime <= endTime
    }
  }, [getSetting])

  return {
    shouldSendEmail,
    shouldSendSMS,
    isQuietHours
  }
}

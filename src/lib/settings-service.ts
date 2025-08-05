/**
 * Settings Service - Centralized settings management across the app
 */

import { prisma } from './db'

export interface SettingValue {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'json'
  category: string
  description?: string
}

export class SettingsService {
  private static instance: SettingsService
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private constructor() {}

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService()
    }
    return SettingsService.instance
  }

  /**
   * Get a setting value with caching
   */
  async getSetting(key: string, defaultValue?: any): Promise<any> {
    // Check cache first
    if (this.cache.has(key) && this.cacheExpiry.get(key)! > Date.now()) {
      return this.cache.get(key)
    }

    try {
      const setting = await prisma.systemConfig.findUnique({
        where: { key }
      })

      let value = defaultValue
      if (setting) {
        value = this.parseValue(setting.value, setting.key)
      }

      // Cache the value
      this.cache.set(key, value)
      this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL)

      return value
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error)
      return defaultValue
    }
  }

  /**
   * Set a setting value
   */
  async setSetting(key: string, value: any, description?: string): Promise<void> {
    try {
      const stringValue = this.stringifyValue(value)
      
      await prisma.systemConfig.upsert({
        where: { key },
        update: { 
          value: stringValue,
          updatedAt: new Date()
        },
        create: {
          key,
          value: stringValue,
          description: description || `Setting: ${key}`
        }
      })

      // Update cache
      this.cache.set(key, value)
      this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL)
    } catch (error) {
      console.error(`Failed to set setting ${key}:`, error)
      throw error
    }
  }

  /**
   * Get multiple settings by category
   */
  async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    try {
      const settings = await prisma.systemConfig.findMany({
        where: {
          key: {
            startsWith: category
          }
        }
      })

      const result: Record<string, any> = {}
      settings.forEach(setting => {
        result[setting.key] = this.parseValue(setting.value, setting.key)
        // Cache individual settings
        this.cache.set(setting.key, result[setting.key])
        this.cacheExpiry.set(setting.key, Date.now() + this.CACHE_TTL)
      })

      return result
    } catch (error) {
      console.error(`Failed to get settings for category ${category}:`, error)
      return {}
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<Record<string, any>> {
    const keys = [
      'emailOnRegistration', 'emailOnVerification', 'emailOnAllocation', 'emailOnPlatoonAssignment',
      'emailDailyReport', 'emailWeeklyReport', 'smsOnRegistration', 'smsOnVerification',
      'smsOnAllocation', 'smsReminders', 'smsUrgentAlerts', 'notificationDelay',
      'reminderAdvance', 'quietHoursStart', 'quietHoursEnd'
    ]

    const settings: Record<string, any> = {}
    for (const key of keys) {
      settings[key] = await this.getSetting(key, this.getDefaultValue(key))
    }

    return settings
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<Record<string, any>> {
    const keys = [
      'sessionTimeout', 'maxLoginAttempts', 'lockoutDuration', 'passwordMinLength',
      'requireStrongPassword', 'twoFactorAuth', 'encryptSensitiveData', 'enableAuditLog',
      'anonymizeData', 'gdprCompliance', 'dataRetentionPolicy', 'apiRateLimit',
      'apiKeyRequired', 'corsEnabled', 'ipWhitelist'
    ]

    const settings: Record<string, any> = {}
    for (const key of keys) {
      settings[key] = await this.getSetting(key, this.getDefaultValue(key))
    }

    return settings
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key)
      this.cacheExpiry.delete(key)
    } else {
      this.cache.clear()
      this.cacheExpiry.clear()
    }
  }

  /**
   * Parse string value to appropriate type
   */
  private parseValue(value: string, key: string): any {
    // Boolean settings
    if (value === 'true') return true
    if (value === 'false') return false

    // Number settings
    if (!isNaN(Number(value)) && value !== '') {
      return Number(value)
    }

    // JSON settings
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }

    return value
  }

  /**
   * Convert value to string for storage
   */
  private stringifyValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  /**
   * Get default values for settings
   */
  private getDefaultValue(key: string): any {
    const defaults: Record<string, any> = {
      // Notification settings
      emailOnRegistration: false,
      emailOnVerification: false,
      emailOnAllocation: false,
      emailOnPlatoonAssignment: false,
      emailDailyReport: false,
      emailWeeklyReport: false,
      smsOnRegistration: false,
      smsOnVerification: false,
      smsOnAllocation: false,
      smsReminders: false,
      smsUrgentAlerts: false,
      notificationDelay: 5,
      reminderAdvance: 24,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',

      // Security settings
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      requireStrongPassword: true,
      twoFactorAuth: false,
      encryptSensitiveData: false,
      enableAuditLog: false,
      anonymizeData: false,
      gdprCompliance: false,
      dataRetentionPolicy: false,
      apiRateLimit: 100,
      apiKeyRequired: true,
      corsEnabled: false,
      ipWhitelist: ''
    }

    return defaults[key] || null
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance()

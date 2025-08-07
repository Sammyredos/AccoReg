import { prisma } from './db'

// Cache for settings to avoid database calls
let settingsCache: Record<string, any> = {}
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getSetting(category: string, key: string, defaultValue: any = null) {
  try {
    // Check cache first
    const cacheKey = `${category}.${key}`
    const now = Date.now()

    if (settingsCache[cacheKey] && (now - cacheTimestamp) < CACHE_DURATION) {
      return settingsCache[cacheKey]
    }

    // Fetch from database
    const setting = await prisma.setting.findUnique({
      where: {
        category_key: {
          category,
          key
        }
      }
    })

    if (!setting) {
      return defaultValue
    }

    // Parse JSON value
    let parsedValue
    try {
      parsedValue = JSON.parse(setting.value)
    } catch {
      parsedValue = setting.value
    }

    // Update cache
    settingsCache[cacheKey] = parsedValue
    cacheTimestamp = now

    return parsedValue
  } catch (error) {
    console.error(`Error getting setting ${category}.${key}:`, error)
    return defaultValue
  }
}

export async function getSettings(category?: string) {
  try {
    const where = category ? { category } : {}

    const settings = await prisma.setting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Group by category and parse values
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {}
      }

      // Parse JSON value
      let parsedValue
      try {
        parsedValue = JSON.parse(setting.value)
      } catch {
        parsedValue = setting.value
      }

      acc[setting.category][setting.key] = parsedValue
      return acc
    }, {} as Record<string, Record<string, any>>)

    return groupedSettings
  } catch (error) {
    console.error('Error getting settings:', error)
    return {}
  }
}

export async function updateSetting(category: string, key: string, value: any) {
  try {
    // Generate a display name from the key
    const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())

    const setting = await prisma.setting.upsert({
      where: {
        category_key: {
          category,
          key
        }
      },
      update: {
        value: JSON.stringify(value),
        updatedAt: new Date()
      },
      create: {
        category,
        key,
        value: JSON.stringify(value),
        type: typeof value === 'boolean' ? 'toggle' : typeof value === 'number' ? 'number' : 'text',
        name: displayName,
        description: `${displayName} setting for ${category}`,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Clear cache
    const cacheKey = `${category}.${key}`
    delete settingsCache[cacheKey]

    return setting
  } catch (error) {
    console.error(`Failed to update setting ${category}.${key}:`, error)
    throw new Error(`Failed to update setting ${category}.${key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function clearSettingsCache() {
  settingsCache = {}
  cacheTimestamp = 0
}

// Specific helper functions for common settings
export async function getDefaultUserRole() {
  return await getSetting('userManagement', 'defaultRole', 'Viewer')
}

export async function isSelfRegistrationEnabled() {
  return await getSetting('userManagement', 'selfRegistration', false)
}

export async function getPasswordRequirements() {
  return await getSetting('userManagement', 'passwordRequirements', 'Medium')
}

export async function getSessionTimeout() {
  return await getSetting('userManagement', 'sessionTimeout', 24)
}

export async function getMaxUsers() {
  return await getSetting('userManagement', 'maxUsers', 1000)
}

export async function getEmailNotifications() {
  return await getSetting('notifications', 'emailNotifications', 'admin@youth.com')
}

export async function getTwoFactorSetting() {
  return await getSetting('security', 'twoFactor', 'Optional')
}

export async function getLoginAttemptsLimit() {
  return await getSetting('security', 'loginAttempts', 5)
}

export async function getLockoutDuration() {
  return await getSetting('security', 'lockoutDuration', 30)
}

export async function areNewRegistrationAlertsEnabled() {
  return await getSetting('notifications', 'newRegistrationAlerts', true)
}

export async function isDailySummaryEnabled() {
  return await getSetting('notifications', 'dailySummary', true)
}

export async function getSystemName() {
  return await getSetting('branding', 'systemName', 'Mopgomglobal')
}

export async function getTimezone() {
  return await getSetting('system', 'timezone', 'UTC-5 (EST)')
}

export async function isMaintenanceMode() {
  return await getSetting('system', 'maintenanceMode', false)
}

export async function isDebugMode() {
  return await getSetting('system', 'debugMode', false)
}

/**
 * Communications Settings Mapping
 * Maps between Settings Page structure and Communications Page structure
 */

// Email field mappings between settings and communications
export const EMAIL_FIELD_MAPPING = {
  // Settings Page ID -> Communications Page Field
  'smtpHost': 'smtpHost',
  'smtpPort': 'smtpPort', 
  'smtpUser': 'fromEmail',
  'smtpPass': 'smtpPassword',
  'smtpSecure': 'isSecure',
  'emailFromName': 'fromName',
  'emailReplyTo': 'replyTo',
  'adminEmails': 'adminEmails'
} as const

// SMS field mappings between settings and communications
export const SMS_FIELD_MAPPING = {
  // Settings Page ID -> Communications Page Field
  'smsEnabled': 'smsEnabled',
  'smsProvider': 'smsProvider',
  'smsApiKey': 'smsApiKey',
  'smsApiSecret': 'smsApiSecret',
  'smsFromNumber': 'smsFromNumber',
  'smsRegion': 'smsRegion',
  'smsGatewayUrl': 'smsGatewayUrl',
  'smsUsername': 'smsUsername'
} as const

// Reverse mappings for communications -> settings
export const EMAIL_REVERSE_MAPPING = Object.fromEntries(
  Object.entries(EMAIL_FIELD_MAPPING).map(([k, v]) => [v, k])
)

export const SMS_REVERSE_MAPPING = Object.fromEntries(
  Object.entries(SMS_FIELD_MAPPING).map(([k, v]) => [v, k])
)

// Settings structure types
export interface SettingItem {
  id: string
  name: string
  value: any
  type: string
  description?: string
  options?: any
}

export interface SettingsStructure {
  email?: SettingItem[]
  sms?: SettingItem[]
  [key: string]: SettingItem[] | undefined
}

// Communications structure types
export interface EmailConfig {
  fromName: string
  fromEmail: string
  replyTo: string
  smtpHost: string
  smtpPort: string
  isSecure: boolean
  isConfigured: boolean
  environment: string
  source?: string
  adminEmails?: string[]
}

export interface SMSConfig {
  smsEnabled: boolean
  smsProvider: string
  smsFromNumber: string
  isConfigured: boolean
  environment: string
  source?: string
  smsApiKey?: string
  smsUsername?: string
}

/**
 * Convert settings structure to email config
 */
export function settingsToEmailConfig(emailSettings: SettingItem[]): Partial<EmailConfig> {
  const config: Partial<EmailConfig> = {}
  
  emailSettings.forEach(setting => {
    const configField = EMAIL_FIELD_MAPPING[setting.id as keyof typeof EMAIL_FIELD_MAPPING]
    if (configField) {
      (config as any)[configField] = setting.value
    }
  })
  
  return config
}

/**
 * Convert settings structure to SMS config
 */
export function settingsToSMSConfig(smsSettings: SettingItem[]): Partial<SMSConfig> {
  const config: Partial<SMSConfig> = {}
  
  smsSettings.forEach(setting => {
    const configField = SMS_FIELD_MAPPING[setting.id as keyof typeof SMS_FIELD_MAPPING]
    if (configField) {
      (config as any)[configField] = setting.value
    }
  })
  
  return config
}

/**
 * Convert email config back to settings structure
 */
export function emailConfigToSettings(config: Partial<EmailConfig>): SettingItem[] {
  const settings: SettingItem[] = []
  
  Object.entries(config).forEach(([field, value]) => {
    const settingId = EMAIL_REVERSE_MAPPING[field as keyof typeof EMAIL_REVERSE_MAPPING]
    if (settingId && value !== undefined) {
      settings.push({
        id: settingId,
        name: getFieldDisplayName(settingId),
        value: value,
        type: getFieldType(settingId),
        description: getFieldDescription(settingId)
      })
    }
  })
  
  return settings
}

/**
 * Convert SMS config back to settings structure
 */
export function smsConfigToSettings(config: Partial<SMSConfig>): SettingItem[] {
  const settings: SettingItem[] = []
  
  Object.entries(config).forEach(([field, value]) => {
    const settingId = SMS_REVERSE_MAPPING[field as keyof typeof SMS_REVERSE_MAPPING]
    if (settingId && value !== undefined) {
      settings.push({
        id: settingId,
        name: getFieldDisplayName(settingId),
        value: value,
        type: getFieldType(settingId),
        description: getFieldDescription(settingId)
      })
    }
  })
  
  return settings
}

/**
 * Get display name for a setting field
 */
function getFieldDisplayName(fieldId: string): string {
  const displayNames: Record<string, string> = {
    'smtpHost': 'SMTP Host',
    'smtpPort': 'SMTP Port',
    'smtpUser': 'SMTP Username',
    'smtpPass': 'SMTP Password',
    'smtpSecure': 'Secure Connection',
    'emailFromName': 'From Name',
    'emailReplyTo': 'Reply To',
    'adminEmails': 'Admin Emails',
    'smsEnabled': 'SMS Enabled',
    'smsProvider': 'SMS Provider',
    'smsApiKey': 'API Key',
    'smsApiSecret': 'API Secret',
    'smsFromNumber': 'From Number',
    'smsRegion': 'Region',
    'smsGatewayUrl': 'Gateway URL',
    'smsUsername': 'Username'
  }
  
  return displayNames[fieldId] || fieldId
}

/**
 * Get field type for a setting
 */
function getFieldType(fieldId: string): string {
  const fieldTypes: Record<string, string> = {
    'smtpHost': 'text',
    'smtpPort': 'number',
    'smtpUser': 'email',
    'smtpPass': 'password',
    'smtpSecure': 'toggle',
    'emailFromName': 'text',
    'emailReplyTo': 'email',
    'adminEmails': 'text',
    'smsEnabled': 'toggle',
    'smsProvider': 'select',
    'smsApiKey': 'password',
    'smsApiSecret': 'password',
    'smsFromNumber': 'text',
    'smsRegion': 'text',
    'smsGatewayUrl': 'url',
    'smsUsername': 'text'
  }
  
  return fieldTypes[fieldId] || 'text'
}

/**
 * Get field description for a setting
 */
function getFieldDescription(fieldId: string): string {
  const descriptions: Record<string, string> = {
    'smtpHost': 'SMTP server hostname (e.g., smtp.gmail.com)',
    'smtpPort': 'SMTP server port (587 for TLS, 465 for SSL)',
    'smtpUser': 'SMTP username/email address',
    'smtpPass': 'SMTP password or app-specific password',
    'smtpSecure': 'Use secure connection (TLS/SSL)',
    'emailFromName': 'Display name for outgoing emails',
    'emailReplyTo': 'Reply-to email address',
    'adminEmails': 'Comma-separated list of admin email addresses',
    'smsEnabled': 'Enable SMS functionality',
    'smsProvider': 'SMS service provider',
    'smsApiKey': 'API key for SMS provider',
    'smsApiSecret': 'API secret for SMS provider',
    'smsFromNumber': 'Sender phone number or ID',
    'smsRegion': 'SMS service region',
    'smsGatewayUrl': 'Custom SMS gateway URL',
    'smsUsername': 'Username for SMS provider'
  }
  
  return descriptions[fieldId] || `Configuration for ${fieldId}`
}

// ============================================================================
// INCREMENTAL UPDATE/MERGE SYSTEM
// ============================================================================

/**
 * Change tracking types for incremental updates
 */
export interface ChangeRecord {
  field: string
  oldValue: any
  newValue: any
  timestamp: number
  source: 'settings' | 'communications' | 'api' | 'import'
  userId?: string
}

export interface MergeResult<T> {
  merged: T
  changes: ChangeRecord[]
  conflicts: ConflictRecord[]
  applied: number
  skipped: number
}

export interface ConflictRecord {
  field: string
  settingsValue: any
  communicationsValue: any
  timestamp: number
  resolution?: 'settings' | 'communications' | 'manual'
}

export interface MergeOptions {
  strategy: 'settings-priority' | 'communications-priority' | 'timestamp-priority' | 'manual'
  conflictResolution?: (conflict: ConflictRecord) => 'settings' | 'communications' | 'manual'
  preserveTimestamps?: boolean
  validateChanges?: boolean
  dryRun?: boolean
}

/**
 * Incremental merge of email configurations
 */
export function mergeEmailConfigs(
  settingsConfig: Partial<EmailConfig>,
  communicationsConfig: Partial<EmailConfig>,
  options: MergeOptions = { strategy: 'communications-priority' }
): MergeResult<EmailConfig> {
  const changes: ChangeRecord[] = []
  const conflicts: ConflictRecord[] = []
  let applied = 0
  let skipped = 0

  // Start with a base configuration
  const merged: Partial<EmailConfig> = {}

  // Get all unique fields from both configs
  const allFields = new Set([
    ...Object.keys(settingsConfig),
    ...Object.keys(communicationsConfig)
  ])

  for (const field of allFields) {
    const settingsValue = (settingsConfig as any)[field]
    const communicationsValue = (communicationsConfig as any)[field]

    // No conflict - only one source has the value
    if (settingsValue === undefined && communicationsValue !== undefined) {
      (merged as any)[field] = communicationsValue
      changes.push({
        field,
        oldValue: undefined,
        newValue: communicationsValue,
        timestamp: Date.now(),
        source: 'communications'
      })
      applied++
    } else if (communicationsValue === undefined && settingsValue !== undefined) {
      (merged as any)[field] = settingsValue
      changes.push({
        field,
        oldValue: undefined,
        newValue: settingsValue,
        timestamp: Date.now(),
        source: 'settings'
      })
      applied++
    } else if (settingsValue === communicationsValue) {
      // Values are the same - no conflict
      (merged as any)[field] = settingsValue
      skipped++
    } else if (settingsValue !== undefined && communicationsValue !== undefined) {
      // Conflict - both sources have different values
      const conflict: ConflictRecord = {
        field,
        settingsValue,
        communicationsValue,
        timestamp: Date.now()
      }

      // Apply conflict resolution strategy
      let resolvedValue: any
      let source: 'settings' | 'communications'

      switch (options.strategy) {
        case 'settings-priority':
          resolvedValue = settingsValue
          source = 'settings'
          conflict.resolution = 'settings'
          break
        case 'communications-priority':
          resolvedValue = communicationsValue
          source = 'communications'
          conflict.resolution = 'communications'
          break
        case 'manual':
          if (options.conflictResolution) {
            const resolution = options.conflictResolution(conflict)
            if (resolution === 'manual') {
              // Skip this field for manual resolution later
              skipped++
              continue
            }
            resolvedValue = resolution === 'settings' ? settingsValue : communicationsValue
            source = resolution
            conflict.resolution = resolution
          } else {
            // Default to communications if no manual resolution provided
            resolvedValue = communicationsValue
            source = 'communications'
            conflict.resolution = 'communications'
          }
          break
        default:
          resolvedValue = communicationsValue
          source = 'communications'
          conflict.resolution = 'communications'
      }

      (merged as any)[field] = resolvedValue
      conflicts.push(conflict)
      changes.push({
        field,
        oldValue: source === 'settings' ? communicationsValue : settingsValue,
        newValue: resolvedValue,
        timestamp: Date.now(),
        source
      })
      applied++
    }
  }

  return {
    merged: merged as EmailConfig,
    changes,
    conflicts,
    applied,
    skipped
  }
}

/**
 * Incremental merge of SMS configurations
 */
export function mergeSMSConfigs(
  settingsConfig: Partial<SMSConfig>,
  communicationsConfig: Partial<SMSConfig>,
  options: MergeOptions = { strategy: 'communications-priority' }
): MergeResult<SMSConfig> {
  const changes: ChangeRecord[] = []
  const conflicts: ConflictRecord[] = []
  let applied = 0
  let skipped = 0

  const merged: Partial<SMSConfig> = {}

  const allFields = new Set([
    ...Object.keys(settingsConfig),
    ...Object.keys(communicationsConfig)
  ])

  for (const field of allFields) {
    const settingsValue = (settingsConfig as any)[field]
    const communicationsValue = (communicationsConfig as any)[field]

    if (settingsValue === undefined && communicationsValue !== undefined) {
      (merged as any)[field] = communicationsValue
      changes.push({
        field,
        oldValue: undefined,
        newValue: communicationsValue,
        timestamp: Date.now(),
        source: 'communications'
      })
      applied++
    } else if (communicationsValue === undefined && settingsValue !== undefined) {
      (merged as any)[field] = settingsValue
      changes.push({
        field,
        oldValue: undefined,
        newValue: settingsValue,
        timestamp: Date.now(),
        source: 'settings'
      })
      applied++
    } else if (settingsValue === communicationsValue) {
      (merged as any)[field] = settingsValue
      skipped++
    } else if (settingsValue !== undefined && communicationsValue !== undefined) {
      const conflict: ConflictRecord = {
        field,
        settingsValue,
        communicationsValue,
        timestamp: Date.now()
      }

      let resolvedValue: any
      let source: 'settings' | 'communications'

      switch (options.strategy) {
        case 'settings-priority':
          resolvedValue = settingsValue
          source = 'settings'
          conflict.resolution = 'settings'
          break
        case 'communications-priority':
          resolvedValue = communicationsValue
          source = 'communications'
          conflict.resolution = 'communications'
          break
        case 'manual':
          if (options.conflictResolution) {
            const resolution = options.conflictResolution(conflict)
            if (resolution === 'manual') {
              // Skip this field for manual resolution later
              skipped++
              continue
            }
            resolvedValue = resolution === 'settings' ? settingsValue : communicationsValue
            source = resolution
            conflict.resolution = resolution
          } else {
            resolvedValue = communicationsValue
            source = 'communications'
            conflict.resolution = 'communications'
          }
          break
        default:
          resolvedValue = communicationsValue
          source = 'communications'
          conflict.resolution = 'communications'
      }

      (merged as any)[field] = resolvedValue
      conflicts.push(conflict)
      changes.push({
        field,
        oldValue: source === 'settings' ? communicationsValue : settingsValue,
        newValue: resolvedValue,
        timestamp: Date.now(),
        source
      })
      applied++
    }
  }

  return {
    merged: merged as SMSConfig,
    changes,
    conflicts,
    applied,
    skipped
  }
}

/**
 * Apply incremental updates to settings from communications changes
 */
export function applyIncrementalEmailUpdate(
  currentSettings: SettingItem[],
  updates: Partial<EmailConfig>,
  options: { userId?: string; source?: 'settings' | 'communications' | 'api' | 'import' } = {}
): {
  updatedSettings: SettingItem[]
  changes: ChangeRecord[]
  newSettings: SettingItem[]
} {
  const changes: ChangeRecord[] = []
  const newSettings: SettingItem[] = []
  const settingsMap = new Map(currentSettings.map(s => [s.id, s]))

  Object.entries(updates).forEach(([field, value]) => {
    const settingId = EMAIL_REVERSE_MAPPING[field as keyof typeof EMAIL_REVERSE_MAPPING]
    if (settingId && value !== undefined) {
      const existingSetting = settingsMap.get(settingId)

      if (existingSetting) {
        // Update existing setting
        if (existingSetting.value !== value) {
          changes.push({
            field: settingId,
            oldValue: existingSetting.value,
            newValue: value,
            timestamp: Date.now(),
            source: options.source || 'communications',
            userId: options.userId
          })
          existingSetting.value = value
        }
      } else {
        // Create new setting
        const newSetting: SettingItem = {
          id: settingId,
          name: getFieldDisplayName(settingId),
          value: value,
          type: getFieldType(settingId),
          description: getFieldDescription(settingId)
        }
        newSettings.push(newSetting)
        settingsMap.set(settingId, newSetting)

        changes.push({
          field: settingId,
          oldValue: undefined,
          newValue: value,
          timestamp: Date.now(),
          source: options.source || 'communications',
          userId: options.userId
        })
      }
    }
  })

  return {
    updatedSettings: Array.from(settingsMap.values()),
    changes,
    newSettings
  }
}

/**
 * Apply incremental updates to settings from SMS changes
 */
export function applyIncrementalSMSUpdate(
  currentSettings: SettingItem[],
  updates: Partial<SMSConfig>,
  options: { userId?: string; source?: 'settings' | 'communications' | 'api' | 'import' } = {}
): {
  updatedSettings: SettingItem[]
  changes: ChangeRecord[]
  newSettings: SettingItem[]
} {
  const changes: ChangeRecord[] = []
  const newSettings: SettingItem[] = []
  const settingsMap = new Map(currentSettings.map(s => [s.id, s]))

  Object.entries(updates).forEach(([field, value]) => {
    const settingId = SMS_REVERSE_MAPPING[field as keyof typeof SMS_REVERSE_MAPPING]
    if (settingId && value !== undefined) {
      const existingSetting = settingsMap.get(settingId)

      if (existingSetting) {
        if (existingSetting.value !== value) {
          changes.push({
            field: settingId,
            oldValue: existingSetting.value,
            newValue: value,
            timestamp: Date.now(),
            source: options.source || 'communications',
            userId: options.userId
          })
          existingSetting.value = value
        }
      } else {
        const newSetting: SettingItem = {
          id: settingId,
          name: getFieldDisplayName(settingId),
          value: value,
          type: getFieldType(settingId),
          description: getFieldDescription(settingId)
        }
        newSettings.push(newSetting)
        settingsMap.set(settingId, newSetting)

        changes.push({
          field: settingId,
          oldValue: undefined,
          newValue: value,
          timestamp: Date.now(),
          source: options.source || 'communications',
          userId: options.userId
        })
      }
    }
  })

  return {
    updatedSettings: Array.from(settingsMap.values()),
    changes,
    newSettings
  }
}

/**
 * Detect changes between two configurations
 */
export function detectEmailConfigChanges(
  oldConfig: Partial<EmailConfig>,
  newConfig: Partial<EmailConfig>
): ChangeRecord[] {
  const changes: ChangeRecord[] = []

  const allFields = new Set([
    ...Object.keys(oldConfig),
    ...Object.keys(newConfig)
  ])

  for (const field of allFields) {
    const oldValue = (oldConfig as any)[field]
    const newValue = (newConfig as any)[field]

    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue,
        timestamp: Date.now(),
        source: 'communications'
      })
    }
  }

  return changes
}

/**
 * Detect changes between two SMS configurations
 */
export function detectSMSConfigChanges(
  oldConfig: Partial<SMSConfig>,
  newConfig: Partial<SMSConfig>
): ChangeRecord[] {
  const changes: ChangeRecord[] = []

  const allFields = new Set([
    ...Object.keys(oldConfig),
    ...Object.keys(newConfig)
  ])

  for (const field of allFields) {
    const oldValue = (oldConfig as any)[field]
    const newValue = (newConfig as any)[field]

    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue,
        timestamp: Date.now(),
        source: 'communications'
      })
    }
  }

  return changes
}

/**
 * Create a patch object with only changed fields
 */
export function createEmailConfigPatch(
  baseConfig: Partial<EmailConfig>,
  updatedConfig: Partial<EmailConfig>
): Partial<EmailConfig> {
  const patch: Partial<EmailConfig> = {}

  Object.entries(updatedConfig).forEach(([field, value]) => {
    if ((baseConfig as any)[field] !== value) {
      (patch as any)[field] = value
    }
  })

  return patch
}

/**
 * Create a patch object with only changed SMS fields
 */
export function createSMSConfigPatch(
  baseConfig: Partial<SMSConfig>,
  updatedConfig: Partial<SMSConfig>
): Partial<SMSConfig> {
  const patch: Partial<SMSConfig> = {}

  Object.entries(updatedConfig).forEach(([field, value]) => {
    if ((baseConfig as any)[field] !== value) {
      (patch as any)[field] = value
    }
  })

  return patch
}

/**
 * Validate that settings and communications are in sync
 */
export function validateSettingsSync(
  emailSettings: SettingItem[],
  emailConfig: EmailConfig,
  smsSettings: SettingItem[],
  smsConfig: SMSConfig
): {
  isValid: boolean
  emailMismatches: string[]
  smsMismatches: string[]
} {
  const emailMismatches: string[] = []
  const smsMismatches: string[] = []

  // Check email settings
  emailSettings.forEach(setting => {
    const configField = EMAIL_FIELD_MAPPING[setting.id as keyof typeof EMAIL_FIELD_MAPPING]
    if (configField && (emailConfig as any)[configField] !== setting.value) {
      emailMismatches.push(`${setting.id}: settings=${setting.value}, config=${(emailConfig as any)[configField]}`)
    }
  })

  // Check SMS settings
  smsSettings.forEach(setting => {
    const configField = SMS_FIELD_MAPPING[setting.id as keyof typeof SMS_FIELD_MAPPING]
    if (configField && (smsConfig as any)[configField] !== setting.value) {
      smsMismatches.push(`${setting.id}: settings=${setting.value}, config=${(smsConfig as any)[configField]}`)
    }
  })

  return {
    isValid: emailMismatches.length === 0 && smsMismatches.length === 0,
    emailMismatches,
    smsMismatches
  }
}

/**
 * Merge multiple change records and deduplicate
 */
export function mergeChangeRecords(
  ...changeArrays: ChangeRecord[][]
): ChangeRecord[] {
  const allChanges = changeArrays.flat()
  const changeMap = new Map<string, ChangeRecord>()

  // Keep the latest change for each field
  allChanges.forEach(change => {
    const existing = changeMap.get(change.field)
    if (!existing || change.timestamp > existing.timestamp) {
      changeMap.set(change.field, change)
    }
  })

  return Array.from(changeMap.values()).sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Generate a summary of changes for logging/display
 */
export function generateChangeSummary(changes: ChangeRecord[]): {
  total: number
  bySource: Record<string, number>
  byField: Record<string, number>
  summary: string
} {
  const bySource: Record<string, number> = {}
  const byField: Record<string, number> = {}

  changes.forEach(change => {
    bySource[change.source] = (bySource[change.source] || 0) + 1
    byField[change.field] = (byField[change.field] || 0) + 1
  })

  const summary = `${changes.length} changes: ${Object.entries(bySource)
    .map(([source, count]) => `${count} from ${source}`)
    .join(', ')}`

  return {
    total: changes.length,
    bySource,
    byField,
    summary
  }
}

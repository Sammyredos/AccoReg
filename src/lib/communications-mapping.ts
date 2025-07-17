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

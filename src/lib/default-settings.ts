/**
 * Default Settings Configuration
 * Centralized default values for all settings categories
 */

export interface SettingDefinition {
  id: string
  key: string
  name: string
  description: string
  type: 'text' | 'email' | 'password' | 'number' | 'boolean' | 'select' | 'time'
  value: any
  options?: Array<{ value: string; label: string }>
  category: string
  required?: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export const DEFAULT_EMAIL_SETTINGS: SettingDefinition[] = [
  {
    id: 'smtpHost',
    key: 'smtpHost',
    name: 'SMTP Host',
    description: 'SMTP server hostname (e.g., smtp.gmail.com)',
    type: 'text',
    value: '',
    category: 'email',
    required: true
  },
  {
    id: 'smtpPort',
    key: 'smtpPort',
    name: 'SMTP Port',
    description: 'SMTP server port (587 for TLS, 465 for SSL, 25 for non-secure)',
    type: 'number',
    value: 587,
    category: 'email',
    required: true,
    validation: { min: 1, max: 65535 }
  },
  {
    id: 'smtpUser',
    key: 'smtpUser',
    name: 'SMTP Username',
    description: 'SMTP authentication username (usually your email address)',
    type: 'email',
    value: '',
    category: 'email',
    required: true
  },
  {
    id: 'smtpPass',
    key: 'smtpPass',
    name: 'SMTP Password',
    description: 'SMTP authentication password or app-specific password',
    type: 'password',
    value: '',
    category: 'email',
    required: true
  },
  {
    id: 'smtpSecure',
    key: 'smtpSecure',
    name: 'Use SSL/TLS',
    description: 'Enable secure connection (recommended for production)',
    type: 'boolean',
    value: true,
    category: 'email'
  },
  {
    id: 'emailFromName',
    key: 'emailFromName',
    name: 'From Name',
    description: 'Display name for outgoing emails',
    type: 'text',
    value: 'AccoReg System',
    category: 'email',
    required: true
  },
  {
    id: 'emailReplyTo',
    key: 'emailReplyTo',
    name: 'Reply To Email',
    description: 'Reply-to email address for responses',
    type: 'email',
    value: '',
    category: 'email'
  },
  {
    id: 'adminEmails',
    key: 'adminEmails',
    name: 'Admin Emails',
    description: 'Comma-separated admin email addresses for notifications',
    type: 'text',
    value: '',
    category: 'email'
  }
]

export const DEFAULT_SMS_SETTINGS: SettingDefinition[] = [
  {
    id: 'smsEnabled',
    key: 'smsEnabled',
    name: 'Enable SMS',
    description: 'Enable SMS notifications system-wide',
    type: 'boolean',
    value: false,
    category: 'sms'
  },
  {
    id: 'smsProvider',
    key: 'smsProvider',
    name: 'SMS Provider',
    description: 'SMS service provider for sending messages',
    type: 'select',
    value: 'twilio',
    category: 'sms',
    options: [
      { value: 'twilio', label: 'Twilio' },
      { value: 'aws-sns', label: 'AWS SNS' },
      { value: 'termii', label: 'Termii' },
      { value: 'kudisms', label: 'KudiSMS' },
      { value: 'bulk-sms-nigeria', label: 'Bulk SMS Nigeria' },
      { value: 'smart-sms', label: 'Smart SMS' }
    ]
  },
  {
    id: 'smsApiKey',
    key: 'smsApiKey',
    name: 'API Key',
    description: 'SMS provider API key or account SID',
    type: 'password',
    value: '',
    category: 'sms'
  },
  {
    id: 'smsApiSecret',
    key: 'smsApiSecret',
    name: 'API Secret',
    description: 'SMS provider API secret or auth token',
    type: 'password',
    value: '',
    category: 'sms'
  },
  {
    id: 'smsFromNumber',
    key: 'smsFromNumber',
    name: 'From Number/Name',
    description: 'Sender ID or phone number for outgoing SMS',
    type: 'text',
    value: 'AccoReg',
    category: 'sms'
  },
  {
    id: 'smsRegion',
    key: 'smsRegion',
    name: 'Region',
    description: 'SMS service region (for AWS SNS and similar services)',
    type: 'text',
    value: 'us-east-1',
    category: 'sms'
  },
  {
    id: 'smsGatewayUrl',
    key: 'smsGatewayUrl',
    name: 'Gateway URL',
    description: 'Custom SMS gateway URL (if using custom provider)',
    type: 'text',
    value: '',
    category: 'sms'
  },
  {
    id: 'smsUsername',
    key: 'smsUsername',
    name: 'Username',
    description: 'SMS provider username (if required by provider)',
    type: 'text',
    value: '',
    category: 'sms'
  }
]

export const DEFAULT_NOTIFICATION_SETTINGS: SettingDefinition[] = [
  // Email Notifications
  {
    id: 'emailOnRegistration',
    key: 'emailOnRegistration',
    name: 'New Registration',
    description: 'Send email notification when someone registers',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'emailOnVerification',
    key: 'emailOnVerification',
    name: 'Verification Complete',
    description: 'Send email when registration is verified',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'emailOnAllocation',
    key: 'emailOnAllocation',
    name: 'Room Allocation',
    description: 'Send email when room is allocated',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'emailOnPlatoonAssignment',
    key: 'emailOnPlatoonAssignment',
    name: 'Platoon Assignment',
    description: 'Send email when assigned to platoon',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'emailDailyReport',
    key: 'emailDailyReport',
    name: 'Daily Reports',
    description: 'Send daily summary reports to admins',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'emailWeeklyReport',
    key: 'emailWeeklyReport',
    name: 'Weekly Reports',
    description: 'Send weekly summary reports to admins',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  // SMS Notifications
  {
    id: 'smsOnRegistration',
    key: 'smsOnRegistration',
    name: 'Registration Confirmation',
    description: 'Send SMS confirmation when someone registers',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'smsOnVerification',
    key: 'smsOnVerification',
    name: 'Verification Complete',
    description: 'Send SMS when registration is verified',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'smsOnAllocation',
    key: 'smsOnAllocation',
    name: 'Room Allocation',
    description: 'Send SMS when room is allocated',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'smsReminders',
    key: 'smsReminders',
    name: 'Event Reminders',
    description: 'Send SMS reminders before events',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  {
    id: 'smsUrgentAlerts',
    key: 'smsUrgentAlerts',
    name: 'Urgent Alerts',
    description: 'Send SMS for urgent notifications only',
    type: 'boolean',
    value: false,
    category: 'notifications'
  },
  // Timing Settings
  {
    id: 'notificationDelay',
    key: 'notificationDelay',
    name: 'Notification Delay',
    description: 'Minutes to wait before sending notifications',
    type: 'number',
    value: 5,
    category: 'notifications',
    validation: { min: 0, max: 60 }
  },
  {
    id: 'reminderAdvance',
    key: 'reminderAdvance',
    name: 'Reminder Advance Time',
    description: 'Hours before event to send reminders',
    type: 'number',
    value: 24,
    category: 'notifications',
    validation: { min: 1, max: 168 }
  },
  {
    id: 'quietHoursStart',
    key: 'quietHoursStart',
    name: 'Quiet Hours Start',
    description: 'Time to stop sending notifications (24h format)',
    type: 'time',
    value: '22:00',
    category: 'notifications'
  },
  {
    id: 'quietHoursEnd',
    key: 'quietHoursEnd',
    name: 'Quiet Hours End',
    description: 'Time to resume sending notifications (24h format)',
    type: 'time',
    value: '08:00',
    category: 'notifications'
  }
]

export const DEFAULT_SECURITY_SETTINGS: SettingDefinition[] = [
  // Authentication Settings
  {
    id: 'sessionTimeout',
    key: 'sessionTimeout',
    name: 'Session Timeout',
    description: 'Minutes before automatic logout due to inactivity',
    type: 'number',
    value: 60,
    category: 'security',
    validation: { min: 5, max: 1440 }
  },
  {
    id: 'maxLoginAttempts',
    key: 'maxLoginAttempts',
    name: 'Max Login Attempts',
    description: 'Failed login attempts before account lockout',
    type: 'number',
    value: 5,
    category: 'security',
    validation: { min: 1, max: 20 }
  },
  {
    id: 'lockoutDuration',
    key: 'lockoutDuration',
    name: 'Lockout Duration',
    description: 'Minutes to lock account after failed attempts',
    type: 'number',
    value: 15,
    category: 'security',
    validation: { min: 1, max: 1440 }
  },
  {
    id: 'passwordMinLength',
    key: 'passwordMinLength',
    name: 'Minimum Password Length',
    description: 'Minimum characters required for passwords',
    type: 'number',
    value: 8,
    category: 'security',
    validation: { min: 4, max: 50 }
  },
  {
    id: 'requireStrongPassword',
    key: 'requireStrongPassword',
    name: 'Require Strong Passwords',
    description: 'Enforce uppercase, lowercase, numbers, and symbols',
    type: 'boolean',
    value: true,
    category: 'security'
  },
  {
    id: 'twoFactorAuth',
    key: 'twoFactorAuth',
    name: 'Two-Factor Authentication',
    description: 'Enable 2FA requirement for admin accounts',
    type: 'boolean',
    value: false,
    category: 'security'
  },
  // Data Protection Settings
  {
    id: 'encryptSensitiveData',
    key: 'encryptSensitiveData',
    name: 'Encrypt Sensitive Data',
    description: 'Encrypt personal information in database',
    type: 'boolean',
    value: false,
    category: 'security'
  },
  {
    id: 'enableAuditLog',
    key: 'enableAuditLog',
    name: 'Enable Audit Logging',
    description: 'Log all admin actions for security auditing',
    type: 'boolean',
    value: false,
    category: 'security'
  },
  {
    id: 'anonymizeData',
    key: 'anonymizeData',
    name: 'Data Anonymization',
    description: 'Anonymize data for analytics and reporting',
    type: 'boolean',
    value: false,
    category: 'security'
  },
  {
    id: 'gdprCompliance',
    key: 'gdprCompliance',
    name: 'GDPR Compliance Mode',
    description: 'Enable GDPR compliance features',
    type: 'boolean',
    value: false,
    category: 'security'
  },
  {
    id: 'dataRetentionPolicy',
    key: 'dataRetentionPolicy',
    name: 'Data Retention Policy',
    description: 'Automatically delete old data based on policy',
    type: 'boolean',
    value: false,
    category: 'security'
  },
  // API Security Settings
  {
    id: 'apiRateLimit',
    key: 'apiRateLimit',
    name: 'API Rate Limit',
    description: 'Maximum requests per minute per IP address',
    type: 'number',
    value: 100,
    category: 'security',
    validation: { min: 10, max: 10000 }
  },
  {
    id: 'apiKeyRequired',
    key: 'apiKeyRequired',
    name: 'Require API Keys',
    description: 'Require API keys for external access',
    type: 'boolean',
    value: true,
    category: 'security'
  },
  {
    id: 'corsEnabled',
    key: 'corsEnabled',
    name: 'Enable CORS',
    description: 'Allow cross-origin requests (use with caution)',
    type: 'boolean',
    value: false,
    category: 'security'
  },
  {
    id: 'ipWhitelist',
    key: 'ipWhitelist',
    name: 'IP Whitelist',
    description: 'Comma-separated list of allowed IP addresses',
    type: 'text',
    value: '',
    category: 'security'
  }
]

// Helper functions
export function getDefaultSettingsByCategory(category: string): SettingDefinition[] {
  switch (category) {
    case 'email':
      return DEFAULT_EMAIL_SETTINGS
    case 'sms':
      return DEFAULT_SMS_SETTINGS
    case 'notifications':
      return DEFAULT_NOTIFICATION_SETTINGS
    case 'security':
      return DEFAULT_SECURITY_SETTINGS
    default:
      return []
  }
}

export function getDefaultSettingValue(key: string): any {
  const allSettings = [
    ...DEFAULT_EMAIL_SETTINGS,
    ...DEFAULT_SMS_SETTINGS,
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...DEFAULT_SECURITY_SETTINGS
  ]

  const setting = allSettings.find(s => s.key === key)
  return setting?.value || null
}

export function getSettingDefinition(key: string): SettingDefinition | null {
  const allSettings = [
    ...DEFAULT_EMAIL_SETTINGS,
    ...DEFAULT_SMS_SETTINGS,
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...DEFAULT_SECURITY_SETTINGS
  ]

  return allSettings.find(s => s.key === key) || null
}

export function mergeWithDefaults(loadedSettings: any[], category: string): SettingDefinition[] {
  const defaults = getDefaultSettingsByCategory(category)

  return defaults.map(defaultSetting => {
    const loadedSetting = loadedSettings.find(s => s.key === defaultSetting.key)

    if (loadedSetting) {
      return {
        ...defaultSetting,
        value: loadedSetting.value
      }
    }

    return defaultSetting
  })
}

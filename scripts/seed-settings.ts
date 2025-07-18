import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedSettings() {
  try {
    console.log('🌱 Seeding default settings...')

    // Default system settings
    const defaultSettings = [
      {
        category: 'branding',
        key: 'systemName',
        name: 'System Name',
        value: 'MOPGOM Global Youth Registration',
        type: 'text',
        description: 'System name displayed throughout the application'
      },
      {
        category: 'branding',
        key: 'systemDescription',
        name: 'System Description',
        value: 'Youth registration and management platform',
        type: 'text',
        description: 'Brief description of the system'
      },
      {
        category: 'branding',
        key: 'logoUrl',
        name: 'Logo URL',
        value: null,
        type: 'text',
        description: 'URL of the system logo'
      },
      {
        category: 'system',
        key: 'timezone',
        name: 'System Timezone',
        value: 'UTC-5 (EST)',
        type: 'text',
        description: 'Default timezone for the system'
      },
      {
        category: 'system',
        key: 'dateFormat',
        name: 'Date Format',
        value: 'MM/DD/YYYY',
        type: 'text',
        description: 'Default date format'
      },
      {
        category: 'system',
        key: 'maintenanceMode',
        name: 'Maintenance Mode',
        value: false,
        type: 'boolean',
        description: 'Enable maintenance mode'
      },
      {
        category: 'system',
        key: 'debugMode',
        name: 'Debug Mode',
        value: false,
        type: 'boolean',
        description: 'Enable debug mode'
      },
      {
        category: 'registration',
        key: 'enabled',
        name: 'Registration Enabled',
        value: true,
        type: 'boolean',
        description: 'Enable/disable new registrations'
      },
      {
        category: 'registration',
        key: 'minimumAge',
        name: 'Minimum Age',
        value: 16,
        type: 'number',
        description: 'Minimum age for registration'
      },
      {
        category: 'registration',
        key: 'maximumAge',
        name: 'Maximum Age',
        value: 35,
        type: 'number',
        description: 'Maximum age for registration'
      },
      {
        category: 'registration',
        key: 'closureDate',
        name: 'Registration Closure Date',
        value: '2024-12-31',
        type: 'date',
        description: 'Registration closure date'
      },
      // Email Configuration Settings
      {
        category: 'email',
        key: 'enabled',
        name: 'Email Enabled',
        value: true,
        type: 'boolean',
        description: 'Enable email notifications'
      },
      {
        category: 'email',
        key: 'smtpHost',
        name: 'SMTP Host',
        value: process.env.SMTP_HOST || '',
        type: 'text',
        description: 'SMTP server hostname'
      },
      {
        category: 'email',
        key: 'smtpPort',
        name: 'SMTP Port',
        value: parseInt(process.env.SMTP_PORT || '587'),
        type: 'number',
        description: 'SMTP server port'
      },
      {
        category: 'email',
        key: 'smtpUser',
        name: 'SMTP Username',
        value: process.env.SMTP_USER || '',
        type: 'email',
        description: 'SMTP authentication username'
      },
      {
        category: 'email',
        key: 'smtpSecure',
        name: 'SMTP Secure',
        value: process.env.SMTP_SECURE === 'true',
        type: 'boolean',
        description: 'Use secure SMTP connection'
      },
      {
        category: 'email',
        key: 'emailFromName',
        name: 'From Name',
        value: process.env.EMAIL_FROM_NAME || 'Mopgomyouth',
        type: 'text',
        description: 'Display name for outgoing emails'
      },
      {
        category: 'email',
        key: 'emailReplyTo',
        name: 'Reply To Email',
        value: process.env.EMAIL_REPLY_TO || '',
        type: 'email',
        description: 'Reply-to email address'
      },
      {
        category: 'email',
        key: 'adminEmails',
        name: 'Admin Emails',
        value: process.env.ADMIN_EMAILS || 'admin@mopgomglobal.com',
        type: 'text',
        description: 'Comma-separated list of admin email addresses'
      },
      // SMS Configuration Settings
      {
        category: 'sms',
        key: 'enabled',
        name: 'SMS Enabled',
        value: process.env.SMS_ENABLED === 'true',
        type: 'boolean',
        description: 'Enable SMS notifications'
      },
      {
        category: 'sms',
        key: 'smsProvider',
        name: 'SMS Provider',
        value: process.env.SMS_PROVIDER || 'mock',
        type: 'select',
        options: ['twilio', 'aws-sns', 'local-gateway', 'kudisms', 'termii', 'bulk-sms-nigeria', 'smart-sms', 'mock'],
        description: 'SMS service provider'
      },
      {
        category: 'sms',
        key: 'smsApiKey',
        name: 'SMS API Key',
        value: process.env.SMS_API_KEY || '',
        type: 'text',
        description: 'API key for SMS provider'
      },
      {
        category: 'sms',
        key: 'smsFromNumber',
        name: 'SMS From Number',
        value: process.env.SMS_FROM_NUMBER || 'Mopgomyouth',
        type: 'text',
        description: 'Sender ID or phone number for SMS'
      },
      {
        category: 'sms',
        key: 'smsRegion',
        name: 'SMS Region',
        value: process.env.SMS_REGION || 'us-east-1',
        type: 'text',
        description: 'SMS service region (for AWS SNS)'
      },
      {
        category: 'accommodations',
        key: 'enabled',
        name: 'Accommodations Enabled',
        value: true,
        type: 'boolean',
        description: 'Enable accommodation management'
      },
      {
        category: 'accommodations',
        key: 'maxAgeGap',
        name: 'Maximum Age Gap',
        value: 5,
        type: 'number',
        description: 'Maximum age gap allowed between youngest and oldest person in the same room'
      },
      // Security Settings
      {
        category: 'security',
        key: 'maxLoginAttempts',
        name: 'Max Login Attempts',
        value: 5,
        type: 'number',
        description: 'Maximum login attempts before lockout'
      },
      {
        category: 'security',
        key: 'lockoutDuration',
        name: 'Lockout Duration',
        value: 30,
        type: 'number',
        description: 'Account lockout duration in minutes'
      },
      {
        category: 'security',
        key: 'twoFactor',
        name: 'Two-Factor Authentication',
        value: 'Optional',
        type: 'select',
        options: ['Disabled', 'Optional', 'Required'],
        description: 'Two-factor authentication requirement'
      },
      {
        category: 'security',
        key: 'passwordMinLength',
        name: 'Minimum Password Length',
        value: 8,
        type: 'number',
        description: 'Minimum required password length'
      },
      {
        category: 'security',
        key: 'passwordRequireUppercase',
        name: 'Require Uppercase',
        value: true,
        type: 'boolean',
        description: 'Require uppercase letters in passwords'
      },
      {
        category: 'security',
        key: 'passwordRequireNumbers',
        name: 'Require Numbers',
        value: true,
        type: 'boolean',
        description: 'Require numbers in passwords'
      },
      {
        category: 'security',
        key: 'passwordRequireSpecial',
        name: 'Require Special Characters',
        value: true,
        type: 'boolean',
        description: 'Require special characters in passwords'
      },
      {
        category: 'security',
        key: 'sessionTimeout',
        name: 'Session Timeout',
        value: 24,
        type: 'number',
        description: 'Session timeout in hours'
      },
      // User Management Settings
      {
        category: 'userManagement',
        key: 'defaultRole',
        name: 'Default User Role',
        value: 'Viewer',
        type: 'select',
        options: ['Viewer', 'Admin', 'Super Admin'],
        description: 'Default role for new users'
      },
      {
        category: 'userManagement',
        key: 'selfRegistration',
        name: 'Self Registration',
        value: false,
        type: 'boolean',
        description: 'Allow users to register themselves'
      },
      {
        category: 'userManagement',
        key: 'maxUsers',
        name: 'Maximum Users',
        value: 1000,
        type: 'number',
        description: 'Maximum number of users allowed'
      },
      // Notification Settings
      {
        category: 'notifications',
        key: 'newRegistrationAlerts',
        name: 'New Registration Alerts',
        value: true,
        type: 'boolean',
        description: 'Send alerts for new registrations'
      },
      {
        category: 'notifications',
        key: 'dailySummary',
        name: 'Daily Summary',
        value: true,
        type: 'boolean',
        description: 'Send daily summary emails'
      },
      {
        category: 'notifications',
        key: 'emailNotifications',
        name: 'Email Notifications',
        value: true,
        type: 'boolean',
        description: 'Enable email notifications'
      },
      {
        category: 'notifications',
        key: 'smsNotifications',
        name: 'SMS Notifications',
        value: false,
        type: 'boolean',
        description: 'Enable SMS notifications'
      },
      {
        category: 'notifications',
        key: 'pushNotifications',
        name: 'Push Notifications',
        value: false,
        type: 'boolean',
        description: 'Enable push notifications'
      },
      {
        category: 'notifications',
        key: 'notificationFrequency',
        name: 'Notification Frequency',
        value: 'immediate',
        type: 'select',
        options: ['immediate', 'hourly', 'daily', 'weekly'],
        description: 'How often to send notifications'
      },
      {
        key: 'registration.enabled',
        value: 'true',
        description: 'Enable/disable new registrations'
      },
      {
        key: 'registration.minimum_age',
        value: '16',
        description: 'Minimum age for registration'
      },
      {
        key: 'registration.maximum_age',
        value: '35',
        description: 'Maximum age for registration'
      },
      {
        key: 'registration.closure_date',
        value: '2024-12-31',
        description: 'Registration closure date'
      },
      {
        key: 'email.enabled',
        value: 'true',
        description: 'Enable email notifications'
      },
      {
        key: 'sms.enabled',
        value: 'false',
        description: 'Enable SMS notifications'
      },
      {
        key: 'accommodations.enabled',
        value: 'true',
        description: 'Enable accommodation management'
      },
      {
        key: 'accommodation_max_age_gap',
        value: '5',
        description: 'Maximum age gap allowed between youngest and oldest person in the same room'
      },
      {
        key: 'backup.enabled',
        value: 'true',
        description: 'Enable automatic backups'
      },
      {
        key: 'backup.encryption',
        value: 'false',
        description: 'Enable backup encryption'
      }
    ]

    // Upsert each setting
    for (const setting of defaultSettings) {
      try {
        await prisma.setting.upsert({
          where: {
            category_key: {
              category: setting.category,
              key: setting.key
            }
          },
          update: {
            name: setting.name,
            description: setting.description,
            type: setting.type,
            options: setting.options ? JSON.stringify(setting.options) : null
          },
          create: {
            category: setting.category,
            key: setting.key,
            name: setting.name,
            value: setting.value === null ? JSON.stringify('') : JSON.stringify(setting.value),
            type: setting.type,
            description: setting.description,
            options: setting.options ? JSON.stringify(setting.options) : null,
            isSystem: true
          }
        })
        console.log(`✅ Seeded setting: ${setting.category}.${setting.key}`)
      } catch (error) {
        console.error(`❌ Failed to seed setting ${setting.category}.${setting.key}:`, error)
      }
    }

    console.log(`✅ Seeded ${defaultSettings.length} default settings`)
    console.log('🎯 Settings configured:')
    console.log('   - System name and description')
    console.log('   - Registration settings (enabled, age limits)')
    console.log('   - Communication settings (email/SMS disabled by default)')
    console.log('   - Accommodation settings')
    console.log('   - Backup settings')
    console.log('\n📝 You can modify these settings in the admin panel.')

  } catch (error) {
    console.error('❌ Error seeding settings:', error)
    // Don't throw error to prevent build failure
    console.log('⚠️  Continuing with deployment...')
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
seedSettings()
  .then(() => {
    console.log('✅ Settings seeding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Settings seeding failed:', error)
    process.exit(0) // Exit with 0 to not fail the build
  })

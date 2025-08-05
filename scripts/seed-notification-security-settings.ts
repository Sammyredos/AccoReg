/**
 * Seed default notification and security settings
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedNotificationSecuritySettings() {
  try {
    console.log('🌱 Seeding notification and security settings...')

    // Default notification settings
    const notificationSettings = [
      { key: 'emailOnRegistration', value: 'true', description: 'Send email when someone registers' },
      { key: 'emailOnVerification', value: 'true', description: 'Send email when registration is verified' },
      { key: 'emailOnAllocation', value: 'true', description: 'Send email when room is allocated' },
      { key: 'emailOnPlatoonAssignment', value: 'true', description: 'Send email when assigned to platoon' },
      { key: 'emailDailyReport', value: 'false', description: 'Send daily summary reports to admins' },
      { key: 'emailWeeklyReport', value: 'false', description: 'Send weekly summary reports to admins' },
      { key: 'smsOnRegistration', value: 'false', description: 'Send SMS confirmation when someone registers' },
      { key: 'smsOnVerification', value: 'false', description: 'Send SMS when registration is verified' },
      { key: 'smsOnAllocation', value: 'false', description: 'Send SMS when room is allocated' },
      { key: 'smsReminders', value: 'false', description: 'Send SMS reminders before events' },
      { key: 'smsUrgentAlerts', value: 'true', description: 'Send SMS for urgent notifications only' },
      { key: 'notificationDelay', value: '5', description: 'Minutes to wait before sending notifications' },
      { key: 'reminderAdvance', value: '24', description: 'Hours before event to send reminders' },
      { key: 'quietHoursStart', value: '22:00', description: 'Time to stop sending notifications (24h format)' },
      { key: 'quietHoursEnd', value: '08:00', description: 'Time to resume sending notifications (24h format)' }
    ]

    // Default security settings
    const securitySettings = [
      { key: 'sessionTimeout', value: '60', description: 'Minutes before auto-logout' },
      { key: 'maxLoginAttempts', value: '5', description: 'Failed attempts before lockout' },
      { key: 'lockoutDuration', value: '15', description: 'Minutes to lock account after failed attempts' },
      { key: 'passwordMinLength', value: '8', description: 'Minimum characters required' },
      { key: 'requireStrongPassword', value: 'true', description: 'Enforce uppercase, lowercase, numbers, symbols' },
      { key: 'twoFactorAuth', value: 'false', description: 'Enable 2FA for admin accounts' },
      { key: 'encryptSensitiveData', value: 'false', description: 'Encrypt personal information in database' },
      { key: 'enableAuditLog', value: 'false', description: 'Log all admin actions for security auditing' },
      { key: 'anonymizeData', value: 'false', description: 'Anonymize data for analytics and reporting' },
      { key: 'gdprCompliance', value: 'false', description: 'Enable GDPR compliance features' },
      { key: 'dataRetentionPolicy', value: 'false', description: 'Automatically delete old data based on policy' },
      { key: 'apiRateLimit', value: '100', description: 'Requests per minute per IP' },
      { key: 'apiKeyRequired', value: 'true', description: 'Require API keys for external access' },
      { key: 'corsEnabled', value: 'false', description: 'Allow cross-origin requests' },
      { key: 'ipWhitelist', value: '', description: 'Comma-separated list of allowed IPs' }
    ]

    // Seed notification settings
    console.log('📧 Creating notification settings...')
    for (const setting of notificationSettings) {
      await prisma.systemConfig.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          updatedAt: new Date()
        },
        create: {
          key: setting.key,
          value: setting.value,
          description: setting.description
        }
      })
    }
    console.log(`✅ Created ${notificationSettings.length} notification settings`)

    // Seed security settings
    console.log('🔒 Creating security settings...')
    for (const setting of securitySettings) {
      await prisma.systemConfig.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          updatedAt: new Date()
        },
        create: {
          key: setting.key,
          value: setting.value,
          description: setting.description
        }
      })
    }
    console.log(`✅ Created ${securitySettings.length} security settings`)

    console.log('🎉 Notification and security settings seeded successfully!')

  } catch (error) {
    console.error('❌ Error seeding settings:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
seedNotificationSecuritySettings()
  .then(() => {
    console.log('✅ Seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })

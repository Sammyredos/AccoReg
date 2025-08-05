import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth-helpers'
import { z } from 'zod'

const notificationSettingsSchema = z.object({
  emailOnRegistration: z.boolean().default(false),
  emailOnVerification: z.boolean().default(false),
  emailOnAllocation: z.boolean().default(false),
  emailOnPlatoonAssignment: z.boolean().default(false),
  emailDailyReport: z.boolean().default(false),
  emailWeeklyReport: z.boolean().default(false),
  smsOnRegistration: z.boolean().default(false),
  smsOnVerification: z.boolean().default(false),
  smsOnAllocation: z.boolean().default(false),
  smsReminders: z.boolean().default(false),
  smsUrgentAlerts: z.boolean().default(false),
  notificationDelay: z.number().min(0).max(60).default(5),
  reminderAdvance: z.number().min(1).max(168).default(24),
  quietHoursStart: z.string().default('22:00'),
  quietHoursEnd: z.string().default('08:00')
})

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    // Get notification settings from database
    const notificationSettings = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'emailOnRegistration', 'emailOnVerification', 'emailOnAllocation', 'emailOnPlatoonAssignment',
            'emailDailyReport', 'emailWeeklyReport', 'smsOnRegistration', 'smsOnVerification',
            'smsOnAllocation', 'smsReminders', 'smsUrgentAlerts', 'notificationDelay',
            'reminderAdvance', 'quietHoursStart', 'quietHoursEnd'
          ]
        }
      }
    })

    // Convert to object format
    const settings: Record<string, any> = {}
    notificationSettings.forEach(setting => {
      let value = setting.value

      // Convert string booleans to actual booleans FIRST (before number conversion)
      if (value === 'true') {
        value = true
      } else if (value === 'false') {
        value = false
      } else if (!isNaN(Number(value)) && value !== '' && value !== 'true' && value !== 'false') {
        // Only convert to number if it's not a boolean string
        value = Number(value)
      }

      settings[setting.key] = value
    })

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Notification settings GET error:', error)
    return NextResponse.json({
      error: 'Failed to fetch notification settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const currentUser = authResult.user!

    // Check permissions - only Super Admin and Admin can modify notification settings
    if (!['Super Admin', 'Admin'].includes(currentUser.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    // Validate settings
    const validatedSettings = notificationSettingsSchema.parse(body)

    // Save each setting to database
    const updatePromises = Object.entries(validatedSettings).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { 
          value: String(value),
          updatedAt: new Date()
        },
        create: {
          key,
          value: String(value),
          description: getSettingDescription(key)
        }
      })
    )

    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: validatedSettings
    })

  } catch (error) {
    console.error('Notification settings POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid notification settings',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to update notification settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    emailOnRegistration: 'Send email when someone registers',
    emailOnVerification: 'Send email when registration is verified',
    emailOnAllocation: 'Send email when room is allocated',
    emailOnPlatoonAssignment: 'Send email when assigned to platoon',
    emailDailyReport: 'Send daily summary reports to admins',
    emailWeeklyReport: 'Send weekly summary reports to admins',
    smsOnRegistration: 'Send SMS confirmation when someone registers',
    smsOnVerification: 'Send SMS when registration is verified',
    smsOnAllocation: 'Send SMS when room is allocated',
    smsReminders: 'Send SMS reminders before events',
    smsUrgentAlerts: 'Send SMS for urgent notifications only',
    notificationDelay: 'Minutes to wait before sending notifications',
    reminderAdvance: 'Hours before event to send reminders',
    quietHoursStart: 'Time to stop sending notifications (24h format)',
    quietHoursEnd: 'Time to resume sending notifications (24h format)'
  }
  return descriptions[key] || 'Notification setting'
}

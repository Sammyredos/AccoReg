import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get SMS settings from the Setting model
    const smsSettings = await prisma.setting.findMany({
      where: {
        category: 'sms',
        key: {
          in: ['smsEnabled', 'smsProvider', 'smsApiKey', 'smsFromNumber']
        }
      }
    })

    if (smsSettings.length === 0) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'SMS service not configured',
        timestamp: new Date().toISOString()
      })
    }

    // Parse settings
    const settings: Record<string, any> = {}
    smsSettings.forEach(setting => {
      try {
        settings[setting.key] = JSON.parse(setting.value)
      } catch {
        settings[setting.key] = setting.value
      }
    })

    const { smsEnabled, smsProvider, smsApiKey, smsFromNumber } = settings

    // Check if SMS is disabled
    if (smsEnabled === false) {
      return NextResponse.json({
        status: 'inactive',
        message: 'SMS service is disabled',
        timestamp: new Date().toISOString()
      })
    }

    // Check if using mock provider (development)
    if (smsProvider === 'mock') {
      return NextResponse.json({
        status: 'active',
        message: 'SMS service using mock provider (development)',
        timestamp: new Date().toISOString(),
        config: {
          provider: smsProvider,
          fromNumber: smsFromNumber || 'YouthReg',
          configuredAt: smsSettings[0]?.createdAt
        }
      })
    }

    // Check if all required fields are present for real providers
    if (!smsProvider || (smsProvider !== 'mock' && !smsApiKey)) {
      return NextResponse.json({
        status: 'incomplete',
        message: 'SMS configuration incomplete - missing API key',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      status: 'active',
      message: 'SMS service configured and active',
      timestamp: new Date().toISOString(),
      config: {
        provider: smsProvider,
        apiKey: smsApiKey ? smsApiKey.substring(0, 8) + '...' : 'Not set',
        fromNumber: smsFromNumber || 'Not set',
        configuredAt: smsSettings[0]?.createdAt
      }
    })

  } catch (error) {
    console.error('SMS health check failed:', error)

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to check SMS configuration',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

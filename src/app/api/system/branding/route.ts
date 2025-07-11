import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Public API - no authentication required for system branding
export async function GET() {
  try {
    // Get system name and logo from settings
    const brandingSettings = await prisma.setting.findMany({
      where: {
        category: 'branding',
        key: {
          in: ['systemName', 'logoUrl']
        }
      }
    })

    // Debug logging removed for production

    const systemNameSetting = brandingSettings.find(s => s.key === 'systemName')
    const logoUrlSetting = brandingSettings.find(s => s.key === 'logoUrl')

    let systemName = 'Mopgomglobal' // Default fallback
    let logoUrl: string | null = null

    if (systemNameSetting) {
      try {
        systemName = JSON.parse(systemNameSetting.value)
        console.log('✅ System name from JSON:', systemName)
      } catch {
        systemName = systemNameSetting.value
        console.log('✅ System name from raw value:', systemName)
      }
    } else {
      console.log('⚠️ No system name setting found, using default:', systemName)
    }

    if (logoUrlSetting) {
      try {
        logoUrl = JSON.parse(logoUrlSetting.value)
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Logo URL from JSON:', logoUrl)
        }
      } catch {
        logoUrl = logoUrlSetting.value
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Logo URL from raw value:', logoUrl)
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ No logo URL setting found')
    }

    // Add cache-busting parameter to logo URL
    const logoUrlWithCacheBust = logoUrl ? `${logoUrl}?v=${Date.now()}` : null

    return NextResponse.json({
      success: true,
      systemName,
      logoUrl: logoUrlWithCacheBust,
      timestamp: Date.now() // Add timestamp for cache invalidation
    }, {
      headers: {
        'Cache-Control': 'public, max-age=30', // Reduced cache time for faster updates
      }
    })

  } catch (error) {
    console.error('Error fetching system branding:', error)
    
    // Return default values on error
    return NextResponse.json({
      success: true,
      systemName: 'Mopgomglobal',
      logoUrl: null
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      }
    })
  }
}

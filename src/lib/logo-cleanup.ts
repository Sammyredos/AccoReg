/**
 * Logo cleanup utilities to prevent 404 errors in production
 */

import { PrismaClient } from '@prisma/client'
import { existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

/**
 * Clean up orphaned logo references that point to non-existent files
 */
export async function cleanupOrphanedLogoReferences() {
  try {
    console.log('🧹 Starting logo cleanup...')
    
    // Get all logo URL settings
    const logoSettings = await prisma.setting.findMany({
      where: {
        category: 'branding',
        key: 'logoUrl'
      }
    })
    
    let cleanedCount = 0
    
    for (const setting of logoSettings) {
      let logoUrl: string | null = null
      
      try {
        logoUrl = JSON.parse(setting.value)
      } catch {
        logoUrl = setting.value
      }
      
      if (logoUrl) {
        const logoPath = join(process.cwd(), 'public', logoUrl)
        
        if (!existsSync(logoPath)) {
          console.log(`🗑️ Removing orphaned logo reference: ${logoUrl}`)
          
          await prisma.setting.delete({
            where: { id: setting.id }
          })
          
          cleanedCount++
        }
      }
    }
    
    // Clear localStorage cache if we're in browser
    if (typeof window !== 'undefined') {
      localStorage.removeItem('system-logo-url')
      localStorage.removeItem('last-logo-cache-invalidation')
    }
    
    console.log(`✅ Logo cleanup completed. Removed ${cleanedCount} orphaned references.`)
    
    return { success: true, cleanedCount }
  } catch (error) {
    console.error('❌ Error during logo cleanup:', error)
    return { success: false, error }
  }
}

/**
 * Validate if a logo URL points to an existing file
 */
export function validateLogoUrl(logoUrl: string | null): boolean {
  if (!logoUrl) return false
  
  try {
    const logoPath = join(process.cwd(), 'public', logoUrl)
    return existsSync(logoPath)
  } catch {
    return false
  }
}

/**
 * Get a safe logo URL that's guaranteed to exist or return null
 */
export async function getSafeLogoUrl(): Promise<string | null> {
  try {
    const logoSetting = await prisma.setting.findFirst({
      where: {
        category: 'branding',
        key: 'logoUrl'
      }
    })
    
    if (!logoSetting) return null
    
    let logoUrl: string | null = null
    
    try {
      logoUrl = JSON.parse(logoSetting.value)
    } catch {
      logoUrl = logoSetting.value
    }
    
    if (logoUrl && validateLogoUrl(logoUrl)) {
      return logoUrl
    } else {
      // Clean up invalid reference
      await prisma.setting.delete({
        where: { id: logoSetting.id }
      })
      return null
    }
  } catch (error) {
    console.error('Error getting safe logo URL:', error)
    return null
  }
}

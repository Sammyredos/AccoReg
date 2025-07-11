'use client'

import { useEffect } from 'react'
import { updateGlobalSystemName } from './reactive-system-name'

export function SystemNamePreloader() {
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return

    // Try to load from localStorage first for instant display
    const cachedName = localStorage.getItem('system-name')
    if (cachedName) {
      updateGlobalSystemName(cachedName)
    }

    // Preload system name immediately when app starts
    const preloadSystemName = async () => {
      try {
        const response = await fetch('/api/admin/settings')
        if (response.ok) {
          const data = await response.json()
          const brandingSettings = data.settings?.branding || []
          const systemNameSetting = brandingSettings.find((s: any) => s.key === 'systemName')
          const systemName = systemNameSetting?.value || 'Mopgomglobal'

          // Cache the system name in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('system-name', systemName)
          }

          updateGlobalSystemName(systemName)
        } else {
          // If fetch fails, mark as loaded with cached value or default
          updateGlobalSystemName(cachedName || 'Mopgomglobal')
        }
      } catch (error) {
        console.error('Failed to preload system name:', error)
        // Mark as loaded with cached value or default
        updateGlobalSystemName(cachedName || 'Mopgomglobal')
      }
    }

    preloadSystemName()
  }, [])

  // This component doesn't render anything
  return null
}

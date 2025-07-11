'use client'

import { useEffect } from 'react'
import { updateGlobalLogo } from './reactive-logo'

export function LogoPreloader() {
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return

    // Try to load from localStorage first for instant display
    const cachedLogo = localStorage.getItem('system-logo-url')
    if (cachedLogo) {
      const logoUrl = cachedLogo === 'null' ? null : cachedLogo
      updateGlobalLogo(logoUrl)
    }

    // Preload logo immediately when app starts
    const preloadLogo = async () => {
      try {
        const response = await fetch('/api/admin/settings/logo')
        if (response.ok) {
          const data = await response.json()
          const logoUrl = data.logoUrl || null

          // Cache the logo URL in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('system-logo-url', logoUrl || 'null')
          }

          updateGlobalLogo(logoUrl)
        } else {
          // If fetch fails, mark as loaded with cached value or null
          updateGlobalLogo(cachedLogo ? (cachedLogo === 'null' ? null : cachedLogo) : null)
        }
      } catch (error) {
        console.error('Failed to preload logo:', error)
        // Mark as loaded with cached value or null
        updateGlobalLogo(cachedLogo ? (cachedLogo === 'null' ? null : cachedLogo) : null)
      }
    }

    preloadLogo()
  }, [])

  // This component doesn't render anything
  return null
}

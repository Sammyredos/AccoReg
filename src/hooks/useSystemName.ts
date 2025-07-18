'use client'

import { useState, useEffect } from 'react'

interface SystemBranding {
  systemName: string
  logoUrl: string | null
}

// Global system name hook - works without authentication
export function useSystemName() {
  const [systemName, setSystemName] = useState('Mopgomglobal')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadSystemBranding = async () => {
    try {
      const response = await fetch('/api/system/branding', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSystemName(data.systemName || 'Mopgomglobal')
        setLogoUrl(data.logoUrl || null)

        // Update document title immediately (only in browser)
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          document.title = `${data.systemName || 'Mopgomglobal'} - Admin Panel`
        }
      }
    } catch (error) {
      console.error('Failed to load system branding:', error)
      // Keep default values on error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSystemBranding()

    // Poll for updates every 5 seconds to catch changes
    const pollInterval = setInterval(() => {
      loadSystemBranding()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [])

  return {
    systemName,
    logoUrl,
    isLoading,
    refresh: loadSystemBranding
  }
}

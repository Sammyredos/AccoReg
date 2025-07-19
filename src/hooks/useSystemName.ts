'use client'

import { useState, useEffect } from 'react'
import { systemCache } from '@/lib/system-cache'

interface SystemBranding {
  systemName: string
  logoUrl: string | null
}

// Global system name hook - works without authentication, uses caching
export function useSystemName() {
  const [systemName, setSystemName] = useState(() => systemCache.getCachedSystemName())
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadSystemBranding = async () => {
    if (isLoading) return // Prevent multiple simultaneous calls

    setIsLoading(true)
    try {
      const systemData = await systemCache.getSystemData()
      setSystemName(systemData.systemName)
      setLogoUrl(systemData.logoUrl)

      // Update document title immediately (only in browser)
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        document.title = `${systemData.systemName} - Admin Panel`
      }
    } catch (error) {
      console.error('Failed to load system branding:', error)
      // Keep default values on error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      await loadSystemBranding()
    }

    if (mounted) {
      load()
    }

    return () => {
      mounted = false
    }
  }, [])

  return {
    systemName,
    logoUrl,
    isLoading,
    refresh: loadSystemBranding
  }
}

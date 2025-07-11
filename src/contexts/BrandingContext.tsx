'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LogoManager } from '@/lib/logo-manager'

interface BrandingState {
  systemName: string
  logoUrl: string | null
}

interface BrandingContextType {
  branding: BrandingState
  isLoading: boolean
  updateSystemName: (name: string) => void
  updateLogo: (url: string | null) => void
  refreshBranding: () => Promise<void>
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

interface BrandingProviderProps {
  children: ReactNode
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingState>({
    systemName: 'Mopgomglobal',
    logoUrl: null
  })
  const [isLoading, setIsLoading] = useState(true) // Start with true to show skeleton until branding loads

  // Load initial branding data using dedicated API endpoint
  const loadBranding = async () => {
    try {
      // Use dedicated branding API to avoid conflicts with settings page
      const response = await fetch('/api/system/branding', {
        cache: 'no-store', // Always get fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()

        const newSystemName = data.systemName || 'Mopgomglobal'
        const newLogoUrl = data.logoUrl || null

        // Update both values at once
        setBranding(prev => ({
          ...prev,
          systemName: newSystemName,
          logoUrl: newLogoUrl
        }))

        // Cache system name immediately for instant future loads
        if (typeof window !== 'undefined') {
          localStorage.setItem('system-name', newSystemName)
          document.title = `${newSystemName} - Admin Panel`
        }

        // Update favicon immediately and globally
        if (typeof window !== 'undefined') {
          updateFavicon(newLogoUrl)
          // Dispatch global favicon update event
          window.dispatchEvent(new CustomEvent('favicon-update', {
            detail: { logoUrl: newLogoUrl }
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load branding:', error)
      // Fallback to cached values if available
      if (typeof window !== 'undefined') {
        const cachedName = localStorage.getItem('system-name')
        if (cachedName) {
          setBranding(prev => ({ ...prev, systemName: cachedName }))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Update system name
  const updateSystemName = (name: string) => {
    setBranding(prev => ({ ...prev, systemName: name }))

    // Cache system name immediately for instant future loads
    if (typeof window !== 'undefined') {
      localStorage.setItem('system-name', name)
      document.title = `${name} - Admin Panel`
    }

    // Force refresh from server to ensure all components sync
    setTimeout(() => loadBranding(), 100)
  }

  // Update logo
  const updateLogo = (url: string | null) => {
    setBranding(prev => ({ ...prev, logoUrl: url }))

    // Update global logo manager
    LogoManager.updateGlobalLogo(url, true)

    // Update favicon immediately and globally
    if (typeof window !== 'undefined') {
      updateFavicon(url)
      // Dispatch global favicon update event
      window.dispatchEvent(new CustomEvent('favicon-update', {
        detail: { logoUrl: url }
      }))
    }

    // Force refresh from server to ensure all components sync
    setTimeout(() => {
      LogoManager.forceRefresh()
    }, 100)
  }

  // Update favicon function
  const updateFavicon = (logoUrl: string | null) => {
    const faviconUrl = logoUrl || '/globe.svg' // Fallback to default
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = faviconUrl
    } else {
      const newFavicon = document.createElement('link')
      newFavicon.rel = 'icon'
      newFavicon.type = 'image/svg+xml'
      newFavicon.href = faviconUrl
      document.head.appendChild(newFavicon)
    }
  }

  // Refresh branding data
  const refreshBranding = async () => {
    try {
      setIsLoading(true)
      await loadBranding()
    } catch (error) {
      console.error('Failed to refresh branding:', error)
      setIsLoading(false)
    }
  }

  // Load branding on mount only (no polling to prevent conflicts)
  useEffect(() => {
    loadBranding()
  }, [])

  const value: BrandingContextType = {
    branding,
    isLoading,
    updateSystemName,
    updateLogo,
    refreshBranding
  }

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
}

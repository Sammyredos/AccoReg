'use client'

import { useState, useEffect } from 'react'

interface ReactiveLogoProps {
  className?: string
  fallbackIcon?: React.ReactNode
  alt?: string
  onLogoUpdate?: (logoUrl: string | null) => void
}

// Global logo state to share across components
let globalLogoUrl: string | null = null
let globalLogoLoaded = false
const logoListeners: Set<(logoUrl: string | null) => void> = new Set()

// Function to update logo globally
export const updateGlobalLogo = (logoUrl: string | null) => {
  globalLogoUrl = logoUrl
  globalLogoLoaded = true
  logoListeners.forEach(listener => listener(logoUrl))
}

// Function to get current logo
export const getCurrentLogo = () => globalLogoUrl

// Function to check if logo is loaded
export const isLogoLoaded = () => globalLogoLoaded

export function ReactiveLogo({ className, fallbackIcon, alt = "Logo", onLogoUpdate }: ReactiveLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(globalLogoUrl)
  const [loading, setLoading] = useState(!globalLogoLoaded)

  useEffect(() => {
    // Load initial logo
    const loadLogo = async () => {
      try {
        const response = await fetch('/api/admin/settings/logo')
        if (response.ok) {
          const data = await response.json()
          const newLogoUrl = data.logoUrl || null
          setLogoUrl(newLogoUrl)
          updateGlobalLogo(newLogoUrl)
          onLogoUpdate?.(newLogoUrl)
        }
      } catch (error) {
        console.error('Failed to load logo:', error)
        // Set as loaded even on error to prevent infinite loading
        globalLogoLoaded = true
      } finally {
        setLoading(false)
      }
    }

    // Only load if we haven't loaded the logo globally yet
    if (!globalLogoLoaded) {
      loadLogo()
    } else {
      setLogoUrl(globalLogoUrl)
      setLoading(false)
    }

    // Listen for logo updates
    const handleLogoUpdate = (newLogoUrl: string | null) => {
      setLogoUrl(newLogoUrl)
      setLoading(false)
      onLogoUpdate?.(newLogoUrl)
    }

    logoListeners.add(handleLogoUpdate)

    // Cleanup listener on unmount
    return () => {
      logoListeners.delete(handleLogoUpdate)
    }
  }, [onLogoUpdate])

  // Always show fallback during loading to prevent flash
  if (loading) {
    return (
      <div className={`${className} transition-opacity duration-200`}>
        {fallbackIcon}
      </div>
    )
  }

  if (logoUrl) {
    return (
      <div className={`${className} transition-opacity duration-200`}>
        <img
          src={logoUrl}
          alt={alt}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.warn('Logo failed to load, falling back to default', { logoUrl });

            // Clear problematic logo from cache
            if (typeof window !== 'undefined') {
              localStorage.removeItem('system-logo-url')
            }

            // Update global state to prevent further attempts
            setLogoUrl(null);
            updateGlobalLogo(null);
          }}
        />
      </div>
    )
  }

  return (
    <div className={`${className} transition-opacity duration-200`}>
      {fallbackIcon}
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { LogoManager } from '@/lib/logo-manager'
import { Logger } from '@/lib/logger'

const logger = Logger('UniversalLogo')

interface UniversalLogoProps {
  className?: string
  alt?: string
  fallbackText?: string
  width?: number
  height?: number
  priority?: boolean
  componentName?: string
  style?: React.CSSProperties
}

export function UniversalLogo({
  className = '',
  alt = 'System Logo',
  fallbackText = 'M',
  width,
  height,
  priority = false,
  componentName = 'UniversalLogo',
  style = {}
}: UniversalLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    logger.debug(`Initializing UniversalLogo for ${componentName}`)
    
    // Get initial logo
    const currentLogo = LogoManager.getLogoForComponent(componentName)
    if (currentLogo) {
      setLogoUrl(currentLogo)
      setLoading(false)
    }

    // Subscribe to logo updates
    const unsubscribe = LogoManager.subscribe((newLogoUrl) => {
      logger.debug(`Logo updated for ${componentName}`, { newLogoUrl })
      setLogoUrl(newLogoUrl)
      setError(false)
      setRetryCount(0)
      setLoading(false)
    })

    // Force load logo if not available
    if (!currentLogo) {
      LogoManager.loadLogoFromAPI().then((loadedLogo) => {
        if (loadedLogo) {
          setLogoUrl(loadedLogo)
        }
        setLoading(false)
      }).catch((err) => {
        logger.error(`Failed to load logo for ${componentName}`, err)
        setError(true)
        setLoading(false)
      })
    }

    return unsubscribe
  }, [componentName])

  const handleImageError = () => {
    logger.warn(`Logo failed to load for ${componentName}`, { logoUrl, retryCount })

    // Immediately set error state to prevent infinite loading attempts
    setError(true)

    // Clear the problematic logo URL from cache to prevent future attempts
    if (typeof window !== 'undefined') {
      localStorage.removeItem('system-logo-url')
    }

    // Update global logo manager to null to stop further attempts
    LogoManager.updateGlobalLogo(null, true)

    // Only retry once after a longer delay, not multiple times
    if (retryCount === 0) {
      setRetryCount(1)
      setTimeout(() => {
        // Try to reload logo from API one more time
        LogoManager.loadLogoFromAPI().then((newLogoUrl) => {
          if (newLogoUrl && newLogoUrl !== logoUrl) {
            setError(false)
            setRetryCount(0)
          }
        })
      }, 5000) // Wait 5 seconds before retry
    }
  }

  const handleImageLoad = () => {
    logger.debug(`Logo loaded successfully for ${componentName}`, { logoUrl })
    setError(false)
    setRetryCount(0)
  }

  // Show loading state
  if (loading) {
    return (
      <span
        className={`inline-block flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded ${className}`}
        style={{ width: width || 40, height: height || 40, ...style }}
      >
        <span className="animate-pulse">
          {fallbackText}
        </span>
      </span>
    )
  }

  // Show logo if available and no error
  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        alt={alt}
        className={`object-contain ${className}`}
        style={{ width, height, ...style }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading={priority ? 'eager' : 'lazy'}
      />
    )
  }

  // Show fallback
  return (
    <span
      className={`inline-block flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded ${className}`}
      style={{ width: width || 40, height: height || 40, ...style }}
      title={`${alt} (Fallback)`}
    >
      {fallbackText}
    </span>
  )
}

// Specialized logo components for different use cases
export function SidebarLogo({ className = '', ...props }: Omit<UniversalLogoProps, 'componentName'>) {
  return (
    <UniversalLogo
      className={`h-8 w-8 ${className}`}
      componentName="SidebarLogo"
      fallbackText="M"
      priority={true}
      {...props}
    />
  )
}

export function HeaderLogo({ className = '', ...props }: Omit<UniversalLogoProps, 'componentName'>) {
  return (
    <UniversalLogo
      className={`h-10 w-10 ${className}`}
      componentName="HeaderLogo"
      fallbackText="M"
      priority={true}
      {...props}
    />
  )
}

export function LoginLogo({ className = '', ...props }: Omit<UniversalLogoProps, 'componentName'>) {
  return (
    <UniversalLogo
      className={`h-16 w-16 ${className}`}
      componentName="LoginLogo"
      fallbackText="M"
      priority={true}
      {...props}
    />
  )
}

export function FaviconLogo({ className = '', ...props }: Omit<UniversalLogoProps, 'componentName'>) {
  return (
    <UniversalLogo
      className={`h-6 w-6 ${className}`}
      componentName="FaviconLogo"
      fallbackText="M"
      priority={true}
      {...props}
    />
  )
}

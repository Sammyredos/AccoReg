'use client'

import { useState, useEffect } from 'react'

interface DynamicLogoProps {
  className?: string
  fallbackIcon?: React.ReactNode
  alt?: string
}

export function DynamicLogo({ className, fallbackIcon, alt = "Logo" }: DynamicLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Check localStorage first for instant loading
        const cachedLogo = localStorage.getItem('system-logo-url')
        if (cachedLogo && cachedLogo !== 'null') {
          setLogoUrl(cachedLogo)
          updateFavicon(cachedLogo)
          setLoading(false)
        }

        // Always fetch fresh data in background
        const response = await fetch('/api/admin/settings/logo')
        if (response.ok) {
          const data = await response.json()
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl)
            // Update favicon when logo is loaded
            updateFavicon(data.logoUrl)
            // Cache the logo URL
            localStorage.setItem('system-logo-url', data.logoUrl)
          } else {
            // No logo set, cache null
            localStorage.setItem('system-logo-url', 'null')
          }
        }
      } catch (error) {
        console.error('Failed to load logo:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLogo()
  }, [])

  const updateFavicon = (logoUrl: string) => {
    try {
      // Update favicon
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = logoUrl
      } else {
        favicon = document.createElement('link')
        favicon.rel = 'icon'
        favicon.href = logoUrl
        document.head.appendChild(favicon)
      }

      // Update apple-touch-icon
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
      if (appleTouchIcon) {
        appleTouchIcon.href = logoUrl
      } else {
        appleTouchIcon = document.createElement('link')
        appleTouchIcon.rel = 'apple-touch-icon'
        appleTouchIcon.href = logoUrl
        document.head.appendChild(appleTouchIcon)
      }
    } catch (error) {
      console.error('Failed to update favicon:', error)
    }
  }

  if (loading) {
    return (
      <div className={className}>
        {fallbackIcon}
      </div>
    )
  }

  if (logoUrl) {
    return (
      <div className={className}>
        <img 
          src={logoUrl} 
          alt={alt} 
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {fallbackIcon}
    </div>
  )
}

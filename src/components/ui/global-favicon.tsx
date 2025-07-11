'use client'

import { useEffect } from 'react'

// Global favicon update function
export const updateGlobalFavicon = (logoUrl: string) => {
  // Check if we're in the browser
  if (typeof window === 'undefined') return
  // Dispatch custom event for favicon update
  window.dispatchEvent(new CustomEvent('faviconUpdate', { detail: { logoUrl } }))
}

// Function to clear favicon cache and reload
export const clearFaviconCache = () => {
  // Check if we're in the browser
  if (typeof window === 'undefined') return
  localStorage.removeItem('system-logo-url')
  window.dispatchEvent(new CustomEvent('faviconUpdate', { detail: { logoUrl: '/globe.svg' } }))
}

export function GlobalFavicon() {
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return

    const updateFavicon = async () => {
      try {
        // Check localStorage first for instant update
        const cachedLogo = localStorage.getItem('system-logo-url')
        if (cachedLogo && cachedLogo !== 'null') {
          setFaviconUrl(cachedLogo)
        }

        // Always fetch fresh data in background
        const response = await fetch('/api/admin/settings/logo')
        if (response.ok) {
          const data = await response.json()
          if (data.logoUrl) {
            setFaviconUrl(data.logoUrl)
            // Update cache
            localStorage.setItem('system-logo-url', data.logoUrl)
          } else {
            // No custom logo, keep default
            localStorage.setItem('system-logo-url', 'null')
          }
        }
      } catch (error) {
        console.error('Failed to load favicon:', error)
      }
    }

    // Listen for favicon update events
    const handleFaviconUpdate = (event: CustomEvent) => {
      const { logoUrl } = event.detail
      setFaviconUrl(logoUrl)
    }

    window.addEventListener('faviconUpdate', handleFaviconUpdate as EventListener)

    updateFavicon()

    // Cleanup event listener
    return () => {
      window.removeEventListener('faviconUpdate', handleFaviconUpdate as EventListener)
    }
  }, [])

  const setFaviconUrl = (logoUrl: string) => {
    try {
      // Update favicon
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = logoUrl
      } else {
        favicon = document.createElement('link')
        favicon.rel = 'icon'
        favicon.type = 'image/svg+xml'
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

      // Update shortcut icon for older browsers
      let shortcutIcon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement
      if (shortcutIcon) {
        shortcutIcon.href = logoUrl
      } else {
        shortcutIcon = document.createElement('link')
        shortcutIcon.rel = 'shortcut icon'
        shortcutIcon.href = logoUrl
        document.head.appendChild(shortcutIcon)
      }
    } catch (error) {
      console.error('Failed to update favicon:', error)
    }
  }

  // This component doesn't render anything
  return null
}

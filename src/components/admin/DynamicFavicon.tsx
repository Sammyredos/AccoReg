'use client'

import { useEffect } from 'react'
import { useBranding } from '@/contexts/BrandingContext'

export function DynamicFavicon() {
  const { branding, isLoading } = useBranding()

  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading) {
      // Use branding logo if available, otherwise use default favicon
      const faviconUrl = branding.logoUrl || '/favicon.ico'

      // Update favicon
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = faviconUrl
      } else {
        const newFavicon = document.createElement('link')
        newFavicon.rel = 'icon'
        newFavicon.type = 'image/x-icon'
        newFavicon.href = faviconUrl
        document.head.appendChild(newFavicon)
      }

      // Update apple-touch-icon
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
      if (appleTouchIcon) {
        appleTouchIcon.href = faviconUrl
      } else {
        const newAppleTouchIcon = document.createElement('link')
        newAppleTouchIcon.rel = 'apple-touch-icon'
        newAppleTouchIcon.href = faviconUrl
        document.head.appendChild(newAppleTouchIcon)
      }

      // Update shortcut icon
      const shortcutIcon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement
      if (shortcutIcon) {
        shortcutIcon.href = faviconUrl
      } else {
        const newShortcutIcon = document.createElement('link')
        newShortcutIcon.rel = 'shortcut icon'
        newShortcutIcon.href = faviconUrl
        document.head.appendChild(newShortcutIcon)
      }
    }
  }, [branding.logoUrl, isLoading])

  return null // This component doesn't render anything
}

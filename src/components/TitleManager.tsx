'use client'

import { useEffect } from 'react'

// Global title manager - prevents any flashing of default titles
export function TitleManager() {
  useEffect(() => {
    // This runs immediately when the component mounts
    if (typeof window !== 'undefined') {
      // Try to get cached system name first for instant title update
      const cachedSystemName = localStorage.getItem('system-name')
      
      if (cachedSystemName) {
        // Set title immediately with cached value - no flashing
        const currentPath = window.location.pathname
        
        if (currentPath.startsWith('/admin')) {
          if (currentPath.includes('/login')) {
            document.title = `Login - ${cachedSystemName}`
          } else {
            // Extract page name from current title if it exists, otherwise use Admin Panel
            const currentTitle = document.title
            if (currentTitle && !currentTitle.includes('Mopgomglobal')) {
              // Keep existing page-specific title structure
              const pageName = currentTitle.split(' - ')[0]
              if (pageName && pageName !== cachedSystemName) {
                document.title = `${pageName} - ${cachedSystemName} Admin`
              } else {
                document.title = `${cachedSystemName} - Admin Panel`
              }
            } else {
              document.title = `${cachedSystemName} - Admin Panel`
            }
          }
        } else {
          document.title = `${cachedSystemName} - Registration System`
        }
      }

      // Load fresh system name in background and update if different
      const loadSystemName = async () => {
        try {
          const response = await fetch('/api/admin/settings', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            const brandingSettings = data.settings?.branding || []
            const systemNameSetting = brandingSettings.find((s: any) => s.key === 'systemName')
            const freshSystemName = systemNameSetting?.value || 'Mopgomglobal'
            
            // Update localStorage cache
            localStorage.setItem('system-name', freshSystemName)
            
            // Update title if it's different from cached version
            if (freshSystemName !== cachedSystemName) {
              const currentPath = window.location.pathname
              
              if (currentPath.startsWith('/admin')) {
                if (currentPath.includes('/login')) {
                  document.title = `Login - ${freshSystemName}`
                } else {
                  const currentTitle = document.title
                  const pageName = currentTitle.split(' - ')[0]
                  if (pageName && pageName !== freshSystemName) {
                    document.title = `${pageName} - ${freshSystemName} Admin`
                  } else {
                    document.title = `${freshSystemName} - Admin Panel`
                  }
                }
              } else {
                document.title = `${freshSystemName} - Registration System`
              }
            }
          }
        } catch (error) {
          console.error('Failed to load fresh system name for title:', error)
        }
      }

      // Load fresh data in background
      loadSystemName()
    }
  }, [])

  return null // This component doesn't render anything
}

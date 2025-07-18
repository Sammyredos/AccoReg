'use client'

import { useState, useEffect } from 'react'

interface ReactiveSystemNameProps {
  onNameUpdate?: (systemName: string) => void
}

// Global system name state to share across components
let globalSystemName: string = 'Mopgomglobal'
let globalSystemNameLoaded = false
const systemNameListeners: Set<(systemName: string) => void> = new Set()

// Function to update system name globally
export const updateGlobalSystemName = (systemName: string) => {
  globalSystemName = systemName
  globalSystemNameLoaded = true
  // Update localStorage cache
  if (typeof window !== 'undefined') {
    localStorage.setItem('system-name', systemName)
  }
  // Notify all listeners
  systemNameListeners.forEach(listener => listener(systemName))
}

// Function to get current system name
export const getCurrentSystemName = () => globalSystemName

// Function to check if system name is loaded
export const isSystemNameLoaded = () => globalSystemNameLoaded

export function ReactiveSystemName({ onNameUpdate }: ReactiveSystemNameProps) {
  const [systemName, setSystemName] = useState<string>(globalSystemName)
  const [loading, setLoading] = useState(!globalSystemNameLoaded)

  useEffect(() => {
    // Load initial system name
    const loadSystemName = async () => {
      try {
        // Check localStorage first for instant loading
        const cachedName = typeof window !== 'undefined' ? localStorage.getItem('system-name') : null
        if (cachedName) {
          setSystemName(cachedName)
          globalSystemName = cachedName
          onNameUpdate?.(cachedName)
        }

        // Always fetch fresh data in background
        const response = await fetch('/api/admin/settings')
        if (response.ok) {
          const data = await response.json()
          const brandingSettings = data.settings?.branding || []
          const systemNameSetting = brandingSettings.find((s: any) => s.key === 'systemName')
          const newSystemName = systemNameSetting?.value || 'Mopgomglobal'
          
          setSystemName(newSystemName)
          updateGlobalSystemName(newSystemName)
          onNameUpdate?.(newSystemName)
        }
      } catch (error) {
        console.error('Failed to load system name:', error)
        // Set as loaded even on error to prevent infinite loading
        globalSystemNameLoaded = true
      } finally {
        setLoading(false)
      }
    }

    // Only load if we haven't loaded the system name globally yet
    if (!globalSystemNameLoaded) {
      loadSystemName()
    } else {
      setSystemName(globalSystemName)
      setLoading(false)
      onNameUpdate?.(globalSystemName)
    }

    // Listen for system name updates
    const handleSystemNameUpdate = (newSystemName: string) => {
      setSystemName(newSystemName)
      setLoading(false)
      onNameUpdate?.(newSystemName)
    }

    systemNameListeners.add(handleSystemNameUpdate)

    // Cleanup listener on unmount
    return () => {
      systemNameListeners.delete(handleSystemNameUpdate)
    }
  }, [onNameUpdate])

  return systemName
}

// Hook for using reactive system name
export function useReactiveSystemName() {
  const [systemName, setSystemName] = useState<string>(globalSystemName)

  useEffect(() => {
    // Load initial system name if not loaded
    if (!globalSystemNameLoaded) {
      const loadSystemName = async () => {
        try {
          const cachedName = typeof window !== 'undefined' ? localStorage.getItem('system-name') : null
          if (cachedName) {
            setSystemName(cachedName)
            globalSystemName = cachedName
          }

          const response = await fetch('/api/admin/settings')
          if (response.ok) {
            const data = await response.json()
            const brandingSettings = data.settings?.branding || []
            const systemNameSetting = brandingSettings.find((s: any) => s.key === 'systemName')
            const newSystemName = systemNameSetting?.value || 'Mopgomglobal'
            
            updateGlobalSystemName(newSystemName)
          }
        } catch (error) {
          console.error('Failed to load system name:', error)
          globalSystemNameLoaded = true
        }
      }
      loadSystemName()
    } else {
      setSystemName(globalSystemName)
    }

    // Listen for system name updates
    const handleSystemNameUpdate = (newSystemName: string) => {
      setSystemName(newSystemName)
    }

    systemNameListeners.add(handleSystemNameUpdate)

    return () => {
      systemNameListeners.delete(handleSystemNameUpdate)
    }
  }, [])

  return systemName
}

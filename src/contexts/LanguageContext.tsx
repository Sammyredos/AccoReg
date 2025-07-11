'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Language, getCurrentLanguage, setLanguage as setI18nLanguage, i18n } from '@/lib/i18n/index'

interface LanguageContextType {
  currentLanguage: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  isHydrated: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en') // Default to 'en' for SSR
  const [isHydrated, setIsHydrated] = useState(false)

  // Initialize language after hydration
  useEffect(() => {
    setCurrentLanguage(getCurrentLanguage())
    setIsHydrated(true)
  }, [])

  const setLanguage = (lang: Language) => {
    try {
      setI18nLanguage(lang)
      setCurrentLanguage(lang)
    } catch (error) {
      console.error('Failed to set language:', error)
    }
  }

  // Create a reactive translation function that updates when language changes
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    return i18n.translate(key, params)
  }, [currentLanguage]) // Re-create when language changes

  // Listen for language changes from other sources (like settings page)
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      try {
        const newLang = event.detail as Language
        setCurrentLanguage(newLang)
      } catch (error) {
        console.error('Failed to handle language change:', error)
      }
    }

    window.addEventListener('langChange', handleLanguageChange as EventListener)

    return () => {
      window.removeEventListener('langChange', handleLanguageChange as EventListener)
    }
  }, [])

  const contextValue: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    isHydrated
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Hook for components that only need the translation function
export function useTranslation() {
  const { t, currentLanguage, isHydrated } = useLanguage()
  return { t, currentLanguage, isHydrated }
}

// Safe translation hook that returns fallback during SSR
export function useSafeTranslation() {
  const { t, currentLanguage, isHydrated } = useLanguage()

  const safeT = (key: string, params?: Record<string, string | number>): string => {
    if (!isHydrated) {
      // Return English fallback during SSR to prevent hydration mismatch
      return key.split('.').pop() || key
    }
    return t(key, params)
  }

  return { t: safeT, currentLanguage, isHydrated }
}

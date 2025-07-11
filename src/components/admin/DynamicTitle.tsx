'use client'

import { useEffect } from 'react'
import { useBranding } from '@/contexts/BrandingContext'

interface DynamicTitleProps {
  pageTitle?: string
}

export function DynamicTitle({ pageTitle }: DynamicTitleProps) {
  const { branding, isLoading } = useBranding()

  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading) {
      const title = pageTitle
        ? `${pageTitle} - ${branding.systemName}`
        : `${branding.systemName} - Admin Panel`

      document.title = title
    }
  }, [branding.systemName, pageTitle, isLoading])

  return null // This component doesn't render anything
}

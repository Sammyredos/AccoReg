'use client'

import { useEffect } from 'react'
import { useReactiveSystemName } from './reactive-system-name'

interface DynamicTitleProps {
  pageTitle?: string
  separator?: string
}

export function DynamicTitle({ pageTitle, separator = ' | ' }: DynamicTitleProps) {
  const systemName = useReactiveSystemName()

  useEffect(() => {
    // Update document title with system name
    const title = pageTitle ? `${pageTitle}${separator}${systemName}` : systemName
    document.title = title
  }, [systemName, pageTitle, separator])

  // This component doesn't render anything
  return null
}

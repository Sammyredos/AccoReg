/**
 * Simple page transition components - no heavy animations for better performance
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  stagger?: boolean
}

// Simple wrapper with no animations for better performance
export function PageTransition({ 
  children, 
  className 
}: PageTransitionProps) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  )
}

// Simple container wrapper
export function StaggeredContainer({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  )
}

// Simple loading wrapper
export function LoadingWrapper({
  isLoading,
  skeleton,
  children,
  className
}: {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>
  }

  return (
    <div className={className}>
      {children}
    </div>
  )
}

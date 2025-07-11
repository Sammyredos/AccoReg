'use client'

import { useEffect, useState } from 'react'

interface HydrationSafeProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

/**
 * A component that prevents hydration mismatches by only rendering children on the client side
 * This is useful for components that might be affected by browser extensions or other client-side modifications
 */
export function HydrationSafe({ children, fallback = null, className }: HydrationSafeProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return fallback ? <div className={className}>{fallback}</div> : null
  }

  return <div className={className} suppressHydrationWarning={true}>{children}</div>
}

/**
 * A simple div wrapper that suppresses hydration warnings
 * Use this for containers that might be affected by browser extensions
 */
export function HydrationSafeDiv({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} suppressHydrationWarning={true} {...props}>
      {children}
    </div>
  )
}

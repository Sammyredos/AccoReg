'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect if code is running on the client side
 * Helps prevent hydration mismatches between server and client
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

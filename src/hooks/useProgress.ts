'use client'

import { useCallback, useRef } from 'react'

/**
 * STRICT progress bar hook - only for intentional user actions
 * NO automatic triggers, NO background activity tracking
 */
export function useProgress() {
  const lastActionRef = useRef(0)

  const startProgress = useCallback(() => {
    const now = Date.now()
    // Strict: Prevent rapid calls within 1 second
    if (now - lastActionRef.current < 1000) {
      return
    }
    lastActionRef.current = now

    console.log('🚀 STRICT PROGRESS: User action started')
    window.dispatchEvent(new Event('progress-start'))
  }, [])

  const completeProgress = useCallback(() => {
    console.log('✅ STRICT PROGRESS: User action completed')
    window.dispatchEvent(new Event('progress-complete'))
  }, [])

  const withProgress = useCallback(async <T>(
    asyncOperation: () => Promise<T>
  ): Promise<T> => {
    startProgress()
    try {
      const result = await asyncOperation()
      return result
    } finally {
      // Delay completion to ensure visual feedback
      setTimeout(() => {
        completeProgress()
      }, 500)
    }
  }, [startProgress, completeProgress])

  return {
    startProgress,
    completeProgress,
    withProgress
  }
}

/**
 * STRICT navigation helper - only for intentional user navigation
 */
export function navigateWithProgress(router: any, path: string) {
  console.log('🚀 STRICT NAVIGATION: User navigating to', path)
  window.dispatchEvent(new Event('progress-start'))
  router.push(path)
  // Progress will complete when page loads
}

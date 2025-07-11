'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * STRICT page readiness hook - enforces hard-gate for full page load
 * NO progressive rendering, NO skeleton loaders, NO half-rendered states
 * Page is either 100% ready or completely hidden
 */
export function usePageReady() {
  const [isPageReady, setIsPageReady] = useState(false)
  const readinessChecks = useRef<Set<string>>(new Set())
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Register a readiness check
  const registerCheck = (checkId: string) => {
    readinessChecks.current.add(checkId)
    setIsPageReady(false)
    
    console.log(`🔒 PAGE READINESS: Registered check "${checkId}"`)
    
    // Safety timeout - force ready after 5 seconds to prevent infinite loading
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      console.log('⚠️ PAGE READINESS: Timeout reached, forcing ready state')
      setIsPageReady(true)
    }, 5000)
  }

  // Complete a readiness check
  const completeCheck = (checkId: string) => {
    readinessChecks.current.delete(checkId)
    
    console.log(`✅ PAGE READINESS: Completed check "${checkId}"`)
    console.log(`🔍 PAGE READINESS: Remaining checks: ${readinessChecks.current.size}`)
    
    // If all checks are complete, page is ready
    if (readinessChecks.current.size === 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = undefined
      }
      
      console.log('🎯 PAGE READINESS: All checks complete - PAGE IS READY')
      setIsPageReady(true)
    }
  }

  // Force ready state (emergency escape hatch)
  const forceReady = () => {
    console.log('🚨 PAGE READINESS: Force ready triggered')
    readinessChecks.current.clear()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    setIsPageReady(true)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isPageReady,
    registerCheck,
    completeCheck,
    forceReady
  }
}

/**
 * STRICT data loading hook - enforces complete data load before rendering
 */
export function useStrictDataLoad<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { registerCheck, completeCheck } = usePageReady()

  useEffect(() => {
    const checkId = `data-load-${Date.now()}`
    registerCheck(checkId)
    setIsLoading(true)
    setError(null)

    fetchFunction()
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load data')
        console.error('🚨 STRICT DATA LOAD: Error:', err)
      })
      .finally(() => {
        setIsLoading(false)
        completeCheck(checkId)
      })
  }, dependencies)

  return { data, isLoading, error }
}

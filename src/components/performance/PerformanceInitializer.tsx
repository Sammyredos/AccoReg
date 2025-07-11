'use client'

import { useEffect } from 'react'
import { pagePreloader } from '@/lib/page-preloader'
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization'

interface PerformanceInitializerProps {
  enablePreloading?: boolean
  enableMonitoring?: boolean
}

export function PerformanceInitializer({ 
  enablePreloading = true, 
  enableMonitoring = true 
}: PerformanceInitializerProps) {
  const { reportMetrics } = usePerformanceOptimization({
    enablePrefetching: true,
    enableImageOptimization: true,
    enableServiceWorker: true,
    enablePerformanceMonitoring: enableMonitoring
  })

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const initializePerformance = async () => {
      try {
        console.log('🚀 Initializing performance optimizations...')
        
        if (enablePreloading) {
          // Test preloader functionality
          console.log('📊 Preloader status:', pagePreloader.getPreloadStatus())
          
          // Preload a test route to verify functionality
          await pagePreloader.prefetchRoute('/admin/dashboard')
          console.log('✅ Test prefetch completed')
        }

        if (enableMonitoring) {
          // Report initial metrics after a delay
          setTimeout(() => {
            const metrics = reportMetrics()
            console.log('📊 Initial performance metrics:', metrics)
          }, 2000)
        }
        
        console.log('✅ Performance optimizations initialized successfully')
      } catch (error) {
        console.warn('⚠️ Performance optimization initialization failed:', error)
      }
    }

    // Use requestIdleCallback for non-critical initialization
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initializePerformance)
    } else {
      setTimeout(initializePerformance, 100)
    }
  }, [enablePreloading, enableMonitoring, reportMetrics])

  // This component doesn't render anything
  return null
}

export default PerformanceInitializer

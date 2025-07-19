'use client'

import { useEffect, useState, useRef } from 'react'

interface ProgressBarProps {
  color?: string
  height?: number
}

export function ProgressBar({
  color = '#4f46e5',
  height = 3
}: ProgressBarProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const isLoadingRef = useRef(false)
  const completeTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const startProgress = () => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setIsLoading(true)
      setProgress(85)
    }

    const completeProgress = () => {
      if (!isLoadingRef.current) return
      isLoadingRef.current = false
      setProgress(100)

      completeTimerRef.current = setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 300)
    }

    // Listen for manual progress events
    window.addEventListener('progress-start', startProgress)
    window.addEventListener('progress-complete', completeProgress)

    return () => {
      window.removeEventListener('progress-start', startProgress)
      window.removeEventListener('progress-complete', completeProgress)
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
      }
    }
  }, [])

  if (!isLoading) return null

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50"
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}

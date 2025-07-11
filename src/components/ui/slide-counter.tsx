/**
 * Simple counter component - no heavy animations for better performance
 */

import React from 'react'

interface SlideCounterProps {
  value: number
  className?: string
}

// Simple static counter - no animations for better performance
export function SlideCounter({ value, className }: SlideCounterProps) {
  return (
    <span className={className}>
      {value.toLocaleString()}
    </span>
  )
}

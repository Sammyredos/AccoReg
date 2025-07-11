/**
 * Simple counter components - no heavy animations for better performance
 */

import React from 'react'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  className?: string
}

interface AnimatedPercentageProps {
  value: number
  className?: string
}

// Simple static number - no animations for better performance
export function AnimatedNumber({ value, decimals = 0, className }: AnimatedNumberProps) {
  return (
    <span className={className}>
      {decimals > 0 ? value.toFixed(decimals) : value.toLocaleString()}
    </span>
  )
}

// Simple static percentage - no animations for better performance
export function AnimatedPercentage({ value, className }: AnimatedPercentageProps) {
  return (
    <span className={className}>
      {Math.round(value)}%
    </span>
  )
}

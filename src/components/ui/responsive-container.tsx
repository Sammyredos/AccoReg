/**
 * Responsive Container Components
 * Optimized for tablet landscape and MacBook Air responsiveness
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'chat' | 'dashboard' | 'modal'
}

export function ResponsiveContainer({ 
  children, 
  className, 
  variant = 'default' 
}: ResponsiveContainerProps) {
  const baseClasses = 'w-full'
  
  const variantClasses = {
    default: 'px-4 sm:px-6 tablet:px-8 laptop:px-10 desktop:px-12',
    chat: 'h-[calc(100vh-12rem)] tablet:h-[calc(100vh-10rem)] laptop:h-[calc(100vh-8rem)]',
    dashboard: 'min-h-screen tablet:min-h-[calc(100vh-4rem)] laptop:min-h-[calc(100vh-6rem)]',
    modal: 'max-w-sm sm:max-w-md tablet:max-w-lg laptop:max-w-xl desktop:max-w-2xl'
  }
  
  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    tablet?: number
    laptop?: number
    desktop?: number
  }
  gap?: string
}

export function ResponsiveGrid({ 
  children, 
  className, 
  cols = { default: 1, sm: 2, tablet: 3, laptop: 4, desktop: 4 },
  gap = 'gap-4 tablet:gap-6 laptop:gap-8'
}: ResponsiveGridProps) {
  const gridClasses = [
    `grid`,
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.tablet && `tablet:grid-cols-${cols.tablet}`,
    cols.laptop && `laptop:grid-cols-${cols.laptop}`,
    cols.desktop && `desktop:grid-cols-${cols.desktop}`,
    gap
  ].filter(Boolean).join(' ')
  
  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  )
}

interface ResponsiveFlexProps {
  children: React.ReactNode
  className?: string
  direction?: 'row' | 'col'
  breakpoint?: 'sm' | 'tablet' | 'laptop' | 'desktop'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  gap?: string
}

export function ResponsiveFlex({ 
  children, 
  className,
  direction = 'row',
  breakpoint = 'tablet',
  align = 'start',
  justify = 'start',
  gap = 'gap-4'
}: ResponsiveFlexProps) {
  const flexClasses = [
    'flex',
    direction === 'col' ? 'flex-col' : 'flex-row',
    breakpoint && direction === 'col' ? `${breakpoint}:flex-row` : '',
    `items-${align}`,
    `justify-${justify}`,
    gap
  ].filter(Boolean).join(' ')
  
  return (
    <div className={cn(flexClasses, className)}>
      {children}
    </div>
  )
}

interface ResponsiveTextProps {
  children: React.ReactNode
  className?: string
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
  responsive?: boolean
}

export function ResponsiveText({ 
  children, 
  className,
  size = 'base',
  responsive = true
}: ResponsiveTextProps) {
  const sizeMap = {
    xs: responsive ? 'text-xs tablet:text-sm' : 'text-xs',
    sm: responsive ? 'text-sm tablet:text-base' : 'text-sm',
    base: responsive ? 'text-base tablet:text-lg' : 'text-base',
    lg: responsive ? 'text-lg tablet:text-xl' : 'text-lg',
    xl: responsive ? 'text-xl tablet:text-2xl' : 'text-xl',
    '2xl': responsive ? 'text-2xl tablet:text-3xl' : 'text-2xl',
    '3xl': responsive ? 'text-3xl tablet:text-4xl' : 'text-3xl'
  }
  
  return (
    <span className={cn(sizeMap[size], className)}>
      {children}
    </span>
  )
}

interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl'
}

export function ResponsiveCard({ 
  children, 
  className,
  padding = 'md'
}: ResponsiveCardProps) {
  const paddingMap = {
    sm: 'p-3 tablet:p-4',
    md: 'p-4 tablet:p-6 laptop:p-8',
    lg: 'p-6 tablet:p-8 laptop:p-10',
    xl: 'p-8 tablet:p-10 laptop:p-12'
  }
  
  return (
    <div className={cn(
      'bg-white rounded-lg shadow-sm border border-gray-200',
      paddingMap[padding],
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveButtonProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
}

export function ResponsiveButton({ 
  children, 
  className,
  size = 'md',
  fullWidth = false,
  onClick,
  disabled = false,
  variant = 'primary'
}: ResponsiveButtonProps) {
  const sizeMap = {
    sm: 'px-3 py-1.5 text-sm tablet:px-4 tablet:py-2',
    md: 'px-4 py-2 text-sm tablet:px-6 tablet:py-3 tablet:text-base',
    lg: 'px-6 py-3 text-base tablet:px-8 tablet:py-4 tablet:text-lg'
  }
  
  const variantMap = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'font-apercu-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        sizeMap[size],
        variantMap[variant],
        fullWidth && 'w-full',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}

// Hook for responsive breakpoint detection
export function useResponsiveBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<string>('mobile')
  
  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width >= 1920) setBreakpoint('wide')
      else if (width >= 1440) setBreakpoint('desktop')
      else if (width >= 1366) setBreakpoint('laptop')
      else if (width >= 1024) setBreakpoint('tablet-lg')
      else if (width >= 768) setBreakpoint('tablet')
      else if (width >= 640) setBreakpoint('sm')
      else if (width >= 475) setBreakpoint('xs')
      else setBreakpoint('mobile')
    }
    
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])
  
  return breakpoint
}

// Export all components
export const Responsive = {
  Container: ResponsiveContainer,
  Grid: ResponsiveGrid,
  Flex: ResponsiveFlex,
  Text: ResponsiveText,
  Card: ResponsiveCard,
  Button: ResponsiveButton,
  useBreakpoint: useResponsiveBreakpoint
}

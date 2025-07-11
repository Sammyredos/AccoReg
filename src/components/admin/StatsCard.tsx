'use client'

import { Card } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink'
  className?: string
}

const colorVariants = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    border: 'border-blue-200',
    textPrimary: 'text-blue-600',
    textSecondary: 'text-blue-900',
    iconBg: 'bg-blue-500'
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100',
    border: 'border-green-200',
    textPrimary: 'text-green-600',
    textSecondary: 'text-green-900',
    iconBg: 'bg-green-500'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    border: 'border-orange-200',
    textPrimary: 'text-orange-600',
    textSecondary: 'text-orange-900',
    iconBg: 'bg-orange-500'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    border: 'border-purple-200',
    textPrimary: 'text-purple-600',
    textSecondary: 'text-purple-900',
    iconBg: 'bg-purple-500'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100',
    border: 'border-red-200',
    textPrimary: 'text-red-600',
    textSecondary: 'text-red-900',
    iconBg: 'bg-red-500'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
    border: 'border-yellow-200',
    textPrimary: 'text-yellow-600',
    textSecondary: 'text-yellow-900',
    iconBg: 'bg-yellow-500'
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    border: 'border-indigo-200',
    textPrimary: 'text-indigo-600',
    textSecondary: 'text-indigo-900',
    iconBg: 'bg-indigo-500'
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100',
    border: 'border-pink-200',
    textPrimary: 'text-pink-600',
    textSecondary: 'text-pink-900',
    iconBg: 'bg-pink-500'
  }
}

export function StatsCard({ title, value, icon: Icon, color, className = '' }: StatsCardProps) {
  // Fallback to blue if color is not found in colorVariants
  const colors = colorVariants[color] || colorVariants.blue

  return (
    <Card className={`p-4 sm:p-6 ${colors.bg} ${colors.border} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-apercu-medium ${colors.textPrimary} mb-1`}>
            {title}
          </p>
          <p className={`text-2xl sm:text-3xl font-apercu-bold ${colors.textSecondary}`}>
            {value}
          </p>
        </div>
        <div className={`h-10 w-10 sm:h-12 sm:w-12 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
      </div>
    </Card>
  )
}

interface StatsGridProps {
  children: React.ReactNode
  className?: string
}

export function StatsGrid({ children, className = '' }: StatsGridProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {children}
      </div>
    </div>
  )
}

'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { colors } from "@/lib/colors"

const enhancedBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 w-fit whitespace-nowrap shrink-0 gap-1.5",
  {
    variants: {
      variant: {
        // Role variants
        superAdmin: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
        admin: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
        manager: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        staff: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        viewer: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        
        // Status variants
        success: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        error: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        info: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        neutral: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        
        // Priority variants
        high: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        medium: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        low: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        
        // Special variants
        active: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        inactive: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        pending: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        completed: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        
        // Default variants
        default: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        primary: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
        secondary: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        outline: "text-gray-700 border-gray-300 hover:bg-gray-50",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface EnhancedBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof enhancedBadgeVariants> {
  icon?: React.ReactNode
}

function EnhancedBadge({ className, variant, size, icon, children, ...props }: EnhancedBadgeProps) {
  return (
    <span
      className={cn(enhancedBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

// Helper function to get role badge variant
export const getRoleBadgeVariant = (roleName: string, isSystem: boolean = false): VariantProps<typeof enhancedBadgeVariants>['variant'] => {
  if (isSystem && roleName === 'Super Admin') {
    return 'superAdmin'
  }
  
  const roleMap: Record<string, VariantProps<typeof enhancedBadgeVariants>['variant']> = {
    'super admin': 'superAdmin',
    'admin': 'admin',
    'manager': 'manager',
    'staff': 'staff',
    'viewer': 'viewer',
  }
  
  return roleMap[roleName.toLowerCase()] || 'viewer'
}

// Helper function to get status badge variant
export const getStatusBadgeVariant = (status: string): VariantProps<typeof enhancedBadgeVariants>['variant'] => {
  const statusMap: Record<string, VariantProps<typeof enhancedBadgeVariants>['variant']> = {
    'success': 'success',
    'completed': 'completed',
    'active': 'active',
    'enabled': 'active',
    'warning': 'warning',
    'pending': 'pending',
    'error': 'error',
    'failed': 'error',
    'inactive': 'inactive',
    'disabled': 'inactive',
    'info': 'info',
    'neutral': 'neutral',
  }
  
  return statusMap[status.toLowerCase()] || 'neutral'
}

// Helper function to get priority badge variant
export const getPriorityBadgeVariant = (priority: string): VariantProps<typeof enhancedBadgeVariants>['variant'] => {
  const priorityMap: Record<string, VariantProps<typeof enhancedBadgeVariants>['variant']> = {
    'high': 'high',
    'urgent': 'high',
    'critical': 'high',
    'medium': 'medium',
    'normal': 'medium',
    'low': 'low',
  }
  
  return priorityMap[priority.toLowerCase()] || 'medium'
}

export { EnhancedBadge, enhancedBadgeVariants }

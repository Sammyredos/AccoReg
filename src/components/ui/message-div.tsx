'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  Loader2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface MessageDivProps {
  type: MessageType
  title?: string
  message: string
  details?: string
  onClose?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  actions?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  }[]
}

export function MessageDiv({
  type,
  title,
  message,
  details,
  onClose,
  className,
  size = 'md',
  showIcon = true,
  actions
}: MessageDivProps) {
  
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700',
          iconBg: 'bg-green-100'
        }
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700',
          iconBg: 'bg-red-100'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          titleColor: 'text-amber-900',
          messageColor: 'text-amber-700',
          iconBg: 'bg-amber-100'
        }
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700',
          iconBg: 'bg-blue-100'
        }
      case 'loading':
        return {
          icon: Loader2,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-700',
          iconBg: 'bg-gray-100'
        }
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          padding: 'p-3',
          iconSize: 'h-4 w-4',
          iconContainer: 'h-6 w-6',
          titleSize: 'text-sm',
          messageSize: 'text-xs',
          spacing: 'space-x-2'
        }
      case 'md':
        return {
          padding: 'p-4',
          iconSize: 'h-4 w-4',
          iconContainer: 'h-8 w-8',
          titleSize: 'text-sm',
          messageSize: 'text-sm',
          spacing: 'space-x-3'
        }
      case 'lg':
        return {
          padding: 'p-6',
          iconSize: 'h-5 w-5',
          iconContainer: 'h-10 w-10',
          titleSize: 'text-base',
          messageSize: 'text-sm',
          spacing: 'space-x-4'
        }
      default:
        return {
          padding: 'p-4',
          iconSize: 'h-4 w-4',
          iconContainer: 'h-8 w-8',
          titleSize: 'text-sm',
          messageSize: 'text-sm',
          spacing: 'space-x-3'
        }
    }
  }

  const config = getTypeConfig()
  const sizeClasses = getSizeClasses()
  const IconComponent = config.icon

  return (
    <Card className={cn(
      config.bgColor,
      config.borderColor,
      'border',
      className
    )}>
      <div className={cn(sizeClasses.padding, 'relative')}>
        <div className={cn('flex items-start', sizeClasses.spacing)}>
          {/* Icon */}
          {showIcon && (
            <div className={cn(
              sizeClasses.iconContainer,
              config.iconBg,
              'rounded-lg flex items-center justify-center flex-shrink-0'
            )}>
              <IconComponent 
                className={cn(
                  sizeClasses.iconSize,
                  config.iconColor,
                  type === 'loading' ? 'animate-spin' : ''
                )} 
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className={cn(
                'font-semibold mb-1',
                sizeClasses.titleSize,
                config.titleColor
              )}>
                {title}
              </h4>
            )}
            
            <p className={cn(
              sizeClasses.messageSize,
              config.messageColor
            )}>
              {message}
            </p>

            {details && (
              <p className={cn(
                'mt-2',
                sizeClasses.messageSize,
                config.messageColor,
                'opacity-80'
              )}>
                {details}
              </p>
            )}

            {/* Actions */}
            {actions && actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.onClick}
                    variant={action.variant || 'outline'}
                    size="sm"
                    className="text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 flex-shrink-0 hover:bg-white/50"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// Convenience components for specific message types
export function SuccessDiv(props: Omit<MessageDivProps, 'type'>) {
  return <MessageDiv {...props} type="success" />
}

export function ErrorDiv(props: Omit<MessageDivProps, 'type'>) {
  return <MessageDiv {...props} type="error" />
}

export function WarningDiv(props: Omit<MessageDivProps, 'type'>) {
  return <MessageDiv {...props} type="warning" />
}

export function InfoDiv(props: Omit<MessageDivProps, 'type'>) {
  return <MessageDiv {...props} type="info" />
}

export function LoadingDiv(props: Omit<MessageDivProps, 'type'>) {
  return <MessageDiv {...props} type="loading" />
}

'use client'

import React from 'react'
import { AlertCircle, X, Info, AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'error' | 'warning' | 'info' | 'success'
  title: string
  description: string
  details?: string
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'destructive'
    icon?: React.ReactNode
  }>
  showRetry?: boolean
  onRetry?: () => void
  showContactSupport?: boolean
  errorCode?: string
}

export function ErrorModal({
  isOpen,
  onClose,
  type,
  title,
  description,
  details,
  actions,
  showRetry = false,
  onRetry,
  showContactSupport = false,
  errorCode
}: ErrorModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />
      case 'info':
        return <Info className="h-8 w-8 text-blue-600" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          accent: 'text-red-600'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          accent: 'text-yellow-600'
        }
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          accent: 'text-blue-600'
        }
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          accent: 'text-green-600'
        }
    }
  }

  const styles = getStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className={cn(
        'w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200',
        styles.bg,
        styles.border
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div>
              <h3 className={cn('font-apercu-bold text-lg', styles.text)}>
                {title}
              </h3>
              {errorCode && (
                <p className={cn('font-apercu-regular text-xs mt-1', styles.accent)}>
                  Error Code: {errorCode}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-1 hover:bg-black/10 rounded-full transition-colors',
              styles.text
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <div className={cn('mb-6', styles.text)}>
          <p className="font-apercu-regular text-sm leading-relaxed mb-3">
            {description}
          </p>
          
          {details && (
            <details className="mt-3">
              <summary className={cn(
                'font-apercu-medium text-sm cursor-pointer hover:underline',
                styles.accent
              )}>
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-white/50 rounded-lg border border-white/20">
                <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                  {details}
                </pre>
              </div>
            </details>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3">
          {/* Custom Actions */}
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || 'default'}
                  size="sm"
                  className="font-apercu-medium"
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Default Actions */}
          <div className="flex flex-wrap gap-2">
            {showRetry && onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="font-apercu-medium"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}

            {showContactSupport && (
              <Button
                onClick={() => {
                  window.open('mailto:support@youth.com?subject=Error Report&body=' + 
                    encodeURIComponent(`Error: ${title}\nDescription: ${description}\nError Code: ${errorCode || 'N/A'}`))
                }}
                variant="outline"
                size="sm"
                className="font-apercu-medium"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            )}

            <Button
              onClick={onClose}
              variant={type === 'error' ? 'destructive' : 'default'}
              size="sm"
              className="font-apercu-medium"
            >
              {type === 'success' ? 'Continue' : 'Close'}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        {type === 'error' && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className={cn('font-apercu-regular text-xs', styles.accent)}>
              💡 If this problem persists, please contact your administrator or try refreshing the page.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

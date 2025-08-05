'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus, Mail, Phone, Clock, Eye, EyeOff } from 'lucide-react'

interface Registration {
  id: string
  fullName: string
  emailAddress: string
  phoneNumber: string
  createdAt: string
  gender: string
  dateOfBirth: string
  isVerified?: boolean
  parentalPermissionGranted?: boolean
  isNew?: boolean
}

interface RealtimeRegistrationFeedProps {
  onNewRegistration?: (registration: Registration) => void
  className?: string
}

export function RealtimeRegistrationFeed({ onNewRegistration, className = '' }: RealtimeRegistrationFeedProps) {
  const [recentRegistrations, setRecentRegistrations] = useState<Registration[]>([])
  const [isVisible, setIsVisible] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date())

  // Fetch recent registrations and updates
  const fetchRecentRegistrations = async () => {
    try {
      const response = await fetch(`/api/registrations?limit=10&since=${lastFetchTime.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        const newRegistrations = data.registrations || []

        if (newRegistrations.length > 0) {
          // Mark new registrations
          const markedRegistrations = newRegistrations.map((reg: Registration) => ({
            ...reg,
            isNew: true
          }))

          setRecentRegistrations(prev => {
            // Add new registrations to the top and keep only last 10
            const updated = [...markedRegistrations, ...prev].slice(0, 10)
            return updated
          })

          // Notify parent component about new registrations
          newRegistrations.forEach((reg: Registration) => {
            onNewRegistration?.(reg)
          })

          // Remove "new" flag after 5 seconds
          setTimeout(() => {
            setRecentRegistrations(prev =>
              prev.map(reg => ({ ...reg, isNew: false }))
            )
          }, 5000)
        }

        setLastFetchTime(new Date())
      }
    } catch (error) {
      console.error('Error fetching recent registrations:', error)
    }
  }

  // Handle registration updates (edits)
  const handleRegistrationUpdate = (updatedRegistration: Registration) => {
    setRecentRegistrations(prev => {
      const existingIndex = prev.findIndex(reg => reg.id === updatedRegistration.id)
      if (existingIndex !== -1) {
        // Update existing registration
        const updated = [...prev]
        updated[existingIndex] = { ...updatedRegistration, isNew: true }
        return updated
      } else {
        // Add new registration if not found
        return [{ ...updatedRegistration, isNew: true }, ...prev].slice(0, 10)
      }
    })

    // Notify parent component
    onNewRegistration?.(updatedRegistration)

    // Remove "new" flag after 5 seconds
    setTimeout(() => {
      setRecentRegistrations(prev =>
        prev.map(reg => reg.id === updatedRegistration.id ? { ...reg, isNew: false } : reg)
      )
    }, 5000)
  }

  // Set up real-time polling
  useEffect(() => {
    // Initial fetch
    fetchRecentRegistrations()
    
    // Poll every 10 seconds for new registrations
    const pollInterval = setInterval(fetchRecentRegistrations, 10000)
    
    // Listen for custom registration events
    const handleRegistrationEvent = (event: any) => {
      console.log('🔄 Registration event detected in feed:', event.detail?.action)

      if (event.detail?.action === 'edit' && event.detail?.registration) {
        // Handle registration edit
        handleRegistrationUpdate(event.detail.registration)
      } else {
        // Handle new registration or general update
        fetchRecentRegistrations()
      }
    }

    window.addEventListener('registrationUpdated', handleRegistrationEvent)

    // Listen for storage events (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'registration_updated') {
        fetchRecentRegistrations()
        localStorage.removeItem('registration_updated')
      } else if (e.key === 'registration_edit_data') {
        // Handle registration edit from other tabs
        const editData = localStorage.getItem('registration_edit_data')
        if (editData) {
          try {
            const registration = JSON.parse(editData)
            handleRegistrationUpdate(registration)
            localStorage.removeItem('registration_edit_data')
          } catch (error) {
            console.error('Error parsing registration edit data:', error)
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('registrationUpdated', handleRegistrationEvent)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (!isVisible) {
    return (
      <div className={`${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          Show Recent Registrations
        </Button>
      </div>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <h3 className="font-apercu-bold text-sm text-gray-900">Recent Registrations</h3>
          {recentRegistrations.some(reg => reg.isNew) && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
              New
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 p-0"
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {recentRegistrations.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <UserPlus className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No recent registrations</p>
          </div>
        ) : (
          recentRegistrations.map((registration) => (
            <div
              key={registration.id}
              className={`p-3 rounded-lg border transition-all duration-300 ${
                registration.isNew 
                  ? 'bg-green-50 border-green-200 shadow-sm animate-pulse' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-apercu-medium text-sm text-gray-900 truncate">
                      {registration.fullName}
                    </h4>
                    {registration.isNew && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        NEW
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{registration.emailAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{registration.phoneNumber}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-500 ml-2">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeAgo(registration.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {recentRegistrations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Updates every 10 seconds • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
    </Card>
  )
}

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { capitalizeName } from '@/lib/utils'

interface Registration {
  id: string
  fullName: string
  emailAddress: string
  dateOfBirth: string
  createdAt: string
  parentalPermissionGranted: boolean
}

interface RecentRegistrationsProps {
  registrations: Registration[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInHours < 48) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}

function isNewRegistration(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  return diffInHours <= 24 // Consider registrations within 24 hours as "new"
}

export function RecentRegistrations({ registrations }: RecentRegistrationsProps) {
  const recentRegistrations = registrations.slice(0, 5)

  return (
    <div className="space-y-3">
      {recentRegistrations.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">No recent registrations</p>
          <p className="text-xs text-gray-400 mt-1">New registrations will appear here</p>
        </div>
      ) : (
        recentRegistrations.map((registration) => (
          <div key={registration.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50/50 transition-colors group">
            {/* Avatar */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xs">
                {getInitials(capitalizeName(registration.fullName))}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {capitalizeName(registration.fullName)}
                </p>
                {isNewRegistration(registration.createdAt) && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    New
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="truncate max-w-[120px]">{registration.emailAddress}</span>
                <span>•</span>
                <span>Age {calculateAge(registration.dateOfBirth)}</span>
                <span>•</span>
                <span>{formatDate(registration.createdAt)}</span>
              </div>
            </div>

            {/* Status */}
            <div className="flex-shrink-0">
              {registration.parentalPermissionGranted ? (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              ) : (
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              )}
            </div>
          </div>
        ))
      )}

      {/* View All Link */}
      {recentRegistrations.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <Link href="/admin/registrations" className="flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            View all registrations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

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
    <Card className="p-4 sm:p-2 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div className="min-w-0 flex-1">
          <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900 truncate">Recent Registrations</h3>
          <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">Latest participant sign-ups</p>
        </div>
        <Link href="/admin/registrations" className="flex-shrink-0">
          <Button variant="outline" size="sm" className="font-apercu-medium w-full sm:w-auto">
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">View All</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {recentRegistrations.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
            </div>
            <p className="font-apercu-medium text-sm sm:text-base text-gray-500">No recent registrations</p>
            <p className="font-apercu-regular text-xs sm:text-sm text-gray-400">New registrations will appear here</p>
          </div>
        ) : (
          recentRegistrations.map((registration) => (
            <div key={registration.id} className="flex items-start sm:items-center space-x-3 sm:space-x-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-apercu-bold text-xs sm:text-sm">
                  {getInitials(capitalizeName(registration.fullName))}
                </span>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <p className="font-apercu-medium text-sm text-gray-900 truncate">
                    {capitalizeName(registration.fullName)}
                  </p>
                  <div className="flex gap-1 sm:gap-2">
                    {isNewRegistration(registration.createdAt) && (
                      <Badge
                        variant="default"
                        className="h-5 px-2 text-xs font-apercu-bold self-start sm:self-auto bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        NEW
                      </Badge>
                    )}
                    <Badge
                      variant={registration.parentalPermissionGranted ? "success" : "warning"}
                      className="h-5 px-2 text-xs font-apercu-medium self-start sm:self-auto"
                    >
                      {registration.parentalPermissionGranted ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                  <span className="font-apercu-regular truncate">{registration.emailAddress}</span>
                  <span className="font-apercu-regular">Age: {calculateAge(registration.dateOfBirth)}</span>
                  <span className="font-apercu-regular">{formatDate(registration.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

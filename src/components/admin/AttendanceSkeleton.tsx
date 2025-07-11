/**
 * Attendance Page Skeleton Loader
 * Provides loading states for the attendance verification page
 */

import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

// Statistics Cards Skeleton
export function AttendanceStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    {i === 1 && <Skeleton className="h-3 w-20" />} {/* Verification rate */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// Verification Controls Skeleton
export function VerificationControlsSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-64" /> {/* Search input */}
            <Skeleton className="h-10 w-32" /> {/* Gender filter */}
          </div>
        </div>
      </div>
      
      {/* Registration List Skeleton */}
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-6 w-16 rounded-full" /> {/* Gender badge */}
                    <Skeleton className="h-4 w-12" /> {/* Age */}
                    <Skeleton className="h-4 w-24" /> {/* Phone */}
                    {i % 2 === 0 && <Skeleton className="h-6 w-20 rounded-full" />} {/* QR badge */}
                  </div>
                </div>
              </div>
              <Skeleton className="h-9 w-20" /> {/* Verify button */}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// Action Buttons Skeleton
export function ActionButtonsSkeleton() {
  return (
    <div className="flex justify-end space-x-3">
      <Skeleton className="h-10 w-28" /> {/* QR Scanner button */}
      <Skeleton className="h-10 w-20" /> {/* Refresh button */}
    </div>
  )
}

// Complete Attendance Page Skeleton
export function AttendancePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <ActionButtonsSkeleton />
      
      {/* Statistics Cards */}
      <AttendanceStatsSkeleton />
      
      {/* Verification Controls */}
      <VerificationControlsSkeleton />
    </div>
  )
}

// Minimal Loading State (for quick transitions)
export function AttendanceMinimalSkeleton() {
  return (
    <div className="space-y-6">
      {/* Quick stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card shadow-sm">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Main content skeleton */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Empty State Skeleton (when no data)
export function AttendanceEmptySkeleton() {
  return (
    <div className="space-y-6">
      <ActionButtonsSkeleton />
      
      <AttendanceStatsSkeleton />
      
      <Card className="border-0 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </Card>
    </div>
  )
}

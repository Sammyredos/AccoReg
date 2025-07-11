import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Card Skeleton
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>
    </div>
  )
}

// Table Skeleton
function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1">
                  {colIndex === 0 ? (
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard Stats Skeleton
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Chart Skeleton
function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className={cn("relative", height)}>
          <div className="absolute inset-0 flex items-end justify-between space-x-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Form Skeleton
function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}

// List Skeleton
function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 rounded-lg border p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

// Page Header Skeleton
function PageHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}

// Button Loading Skeleton
function ButtonSkeleton({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    default: 'h-9 w-24',
    lg: 'h-10 w-28'
  }

  return <Skeleton className={`${sizeClasses[size]} rounded-md`} />
}

// Sidebar Loading Skeleton
function SidebarSkeleton() {
  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 p-4">
      <div className="space-y-4">
        {/* Logo */}
        <Skeleton className="h-8 w-32" />

        {/* Navigation items */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Modal Loading Skeleton
function ModalSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <ButtonSkeleton />
        <ButtonSkeleton />
      </div>
    </div>
  )
}

// Notification Panel Skeleton
function NotificationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start space-x-3 p-3 rounded-lg border">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// User Directory Skeleton
function UserDirectorySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Dashboard Content Skeleton (fits within existing containers)
function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Recent Registrations Skeleton */}
        <div className="xl:col-span-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>

        {/* Notifications Skeleton */}
        <div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




// Inbox Content Skeleton
function InboxContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Chat Interface Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: '75vh' }}>
        <div className="flex h-full">
          {/* Conversations List Skeleton */}
          <div className="flex flex-col w-full lg:w-1/3 border-r border-gray-200">
            {/* Search Header Skeleton */}
            <div className="p-4 border-b border-gray-200 bg-indigo-50">
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>

            {/* Conversations Skeleton */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area Skeleton */}
          <div className="hidden lg:flex flex-col w-2/3">
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-indigo-50 to-indigo-100">
              <Skeleton className="h-16 w-16 rounded-full mb-4" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Registration Form Skeleton
function RegistrationFormSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-32 mb-6" />

          <div className="text-center">
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl mx-auto mb-3 sm:mb-4" />
            <Skeleton className="h-6 sm:h-8 w-64 sm:w-80 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 sm:w-64 mx-auto" />
          </div>
        </div>

        {/* Progress Indicator Skeleton */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between px-2 sm:px-0">
            <div className="flex items-center flex-1">
              <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
              <div className="ml-1 sm:ml-2 lg:ml-3 flex-1 min-w-0">
                <Skeleton className="h-3 sm:h-4 w-20 mb-1" />
                <Skeleton className="h-2 w-16 hidden sm:block" />
              </div>
            </div>
            <Skeleton className="w-2 sm:w-4 lg:w-8 h-1 rounded-full mx-0.5 sm:mx-1" />
            <div className="flex items-center flex-1">
              <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
              <div className="ml-1 sm:ml-2 lg:ml-3 flex-1 min-w-0">
                <Skeleton className="h-3 sm:h-4 w-20 mb-1" />
                <Skeleton className="h-2 w-16 hidden sm:block" />
              </div>
            </div>
            <Skeleton className="w-2 sm:w-4 lg:w-8 h-1 rounded-full mx-0.5 sm:mx-1" />
            <div className="flex items-center flex-1">
              <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
              <div className="ml-1 sm:ml-2 lg:ml-3 flex-1 min-w-0">
                <Skeleton className="h-3 sm:h-4 w-20 mb-1" />
                <Skeleton className="h-2 w-16 hidden sm:block" />
              </div>
            </div>
          </div>
        </div>

        {/* Form Card Skeleton */}
        <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
          <div className="space-y-6 p-6 sm:p-8">
            {/* Step Header Skeleton */}
            <div className="text-center pb-4 sm:pb-6 border-b border-gray-100">
              <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl mx-auto mb-3 sm:mb-4" />
              <Skeleton className="h-6 sm:h-8 w-48 sm:w-64 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 sm:w-48 mx-auto" />

              {/* Progress Bar Skeleton */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="w-full h-2 rounded-full" />
              </div>
            </div>

            {/* Form Fields Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ))}
            </div>

            {/* Navigation Buttons Skeleton */}
            <div className="flex justify-between pt-6 border-t border-gray-100">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Registration Settings Loading Skeleton
function RegistrationSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  )
}

export {
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  StatsSkeleton,
  ChartSkeleton,
  FormSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  ButtonSkeleton,
  SidebarSkeleton,
  ModalSkeleton,
  NotificationSkeleton,
  UserDirectorySkeleton,
  DashboardContentSkeleton,
  InboxContentSkeleton,
  RegistrationFormSkeleton,
  RegistrationSettingsSkeleton
}

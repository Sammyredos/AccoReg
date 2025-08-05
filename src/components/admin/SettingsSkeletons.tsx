import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function SettingsCardSkeleton() {
  return (
    <Card className="p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded-xl mr-4" />
          <div>
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* Settings List */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
            <div className="flex-1 min-w-0 lg:pr-4">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function SettingsTabSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <SettingsCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-24 rounded-md" />
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <SettingsTabSkeleton />
        </div>
      </div>
    </div>
  )
}

export function SettingInputSkeleton({ type = 'text' }: { type?: string }) {
  switch (type) {
    case 'boolean':
      return <Skeleton className="h-4 w-4 rounded" />
    case 'select':
      return <Skeleton className="h-8 w-32 rounded-md" />
    case 'password':
      return <Skeleton className="h-8 w-24 rounded-md" />
    default:
      return <Skeleton className="h-8 w-20 rounded-md" />
  }
}

export function NotificationCardSkeleton() {
  return (
    <Card className="p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded-xl mr-4" />
          <div>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
            <div className="flex-1 min-w-0 lg:pr-4">
              <Skeleton className="h-4 w-36 mb-1" />
              <Skeleton className="h-3 w-52" />
            </div>
            <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function SecurityCardSkeleton() {
  return (
    <Card className="p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded-xl mr-4" />
          <div>
            <Skeleton className="h-5 w-44 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* Security Settings */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 border-b border-gray-100 last:border-b-0 space-y-3 lg:space-y-0">
            <div className="flex-1 min-w-0 lg:pr-4">
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex items-center justify-start lg:justify-end lg:flex-shrink-0">
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

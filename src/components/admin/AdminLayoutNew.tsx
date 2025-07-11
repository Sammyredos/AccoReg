'use client'

import { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Menu } from 'lucide-react'
import { SessionTimeout } from '@/components/SessionTimeout'
import { UniversalUserAccess } from './UniversalUserAccess'
import { useBranding } from '@/contexts/BrandingContext'
import { DynamicTitle } from './DynamicTitle'
import { DynamicFavicon } from './DynamicFavicon'


interface AdminLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

function AdminLayoutContent({ children, title, description }: AdminLayoutProps) {
  const { branding } = useBranding()
  const sessionTimeout = 30
  const systemInitials = branding.systemName.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50">


      {/* Dynamic title and favicon components */}
      <DynamicTitle pageTitle={title} />
      <DynamicFavicon />

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {branding.logoUrl ? (
              <div className="h-8 w-8 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={branding.logoUrl}
                  alt="System Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-apercu-bold text-sm">{systemInitials}</span>
              </div>
            )}
            <h1 className="font-apercu-bold text-lg text-gray-900">{branding.systemName}</h1>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
              </VisuallyHidden>
              <AdminSidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          {(title || description) && (
            <header className="bg-white border-b border-gray-200">
              <div className="px-6 py-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {title && (
                      <h1 className="font-apercu-bold text-2xl text-gray-900 mb-1">
                        {title}
                      </h1>
                    )}
                    {description && (
                      <p className="font-apercu-regular text-gray-600">
                        {description}
                      </p>
                    )}
                  </div>
                  <div className="ml-6">
                    <UniversalUserAccess variant="compact" />
                  </div>
                </div>
              </div>
            </header>
          )}

          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Session Timeout Component */}
      <SessionTimeout sessionTimeoutHours={sessionTimeout} />
    </div>
  )
}

export function AdminLayoutNew({ children, title, description }: AdminLayoutProps) {
  return (
    <AdminLayoutContent title={title} description={description}>
      {children}
    </AdminLayoutContent>
  )
}

export default AdminLayoutNew

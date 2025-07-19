'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      console.log('🚪 AdminLayout logout - calling API...')

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      console.log('📡 AdminLayout logout response:', response.status)

      // Wait for cookie to be cleared before redirecting
      setTimeout(() => {
        console.log('🚀 AdminLayout logout - redirecting to login...')
        window.location.href = '/admin/login'
      }, 100) // Wait 100ms for cookie to be cleared

    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even on error
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Youth Registration Admin
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/admin/dashboard"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/registrations"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                >
                  Registrations
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

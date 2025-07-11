'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
  fallbackPath?: string
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackPath = '/admin/dashboard'
}: ProtectedRouteProps) {
  const { currentUser, loading } = useUser()
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!currentUser) {
      router.push('/admin/login')
      return
    }

    // Check role-based access
    const hasRequiredRole = requiredRoles.length === 0 ||
      requiredRoles.includes(currentUser.role?.name || '')

    // Check permission-based access
    const hasRequiredPermission = requiredPermissions.length === 0 ||
      requiredPermissions.some(permission => {
        // Super Admin and Admin have all permissions
        if (currentUser.role?.name === 'Super Admin' || currentUser.role?.name === 'Admin') {
          return true
        }

        return currentUser.role?.permissions?.some(p =>
          p.name === permission || p.name === 'system:admin'
        )
      })

    if (hasRequiredRole && hasRequiredPermission) {
      setHasAccess(true)
    } else {
      router.push(fallbackPath)
    }
  }, [currentUser, loading, router, requiredRoles, requiredPermissions, fallbackPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning={true}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" suppressHydrationWarning={true}></div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserRole {
  id: string
  name: string
  description?: string
  isSystem?: boolean
  permissions: Array<{
    id: string
    name: string
    description?: string
  }>
}

interface CurrentUser {
  id: string
  email: string
  name: string
  type: 'admin' | 'user'
  role: UserRole
  isActive: boolean
}

interface UserContextType {
  currentUser: CurrentUser | null
  loading: boolean
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
  isRole: (roleName: string) => boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true) // Start with true to show skeleton until user data loads

  const fetchCurrentUser = async () => {
    try {
      console.log('🔍 UserContext: Fetching current user from /api/auth/me')
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 UserContext: Response status:', response.status)

      if (response.ok) {
        const userData = await response.json()
        console.log('✅ UserContext: User data received:', userData.user?.email || 'No email')
        setCurrentUser(userData.user)
      } else {
        console.log('❌ UserContext: Response not ok, status:', response.status)
        const errorText = await response.text()
        console.log('❌ UserContext: Error response:', errorText)
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('❌ UserContext: Failed to fetch current user:', error)
      console.error('❌ UserContext: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })

      // Check if this is a network error (development server not running)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        console.warn('⚠️ UserContext: Network error detected. Development server may not be running.')
        console.warn('⚠️ UserContext: Please ensure the development server is running on localhost:3000')
      }

      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    await fetchCurrentUser()
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentUser?.role?.permissions) return false
    
    // Super Admin and Admin roles have all permissions
    if (currentUser.role.name === 'Super Admin' || currentUser.role.name === 'Admin') {
      return true
    }
    
    return currentUser.role.permissions.some(p => 
      p.name === permission || p.name === 'system:admin'
    )
  }

  const isRole = (roleName: string): boolean => {
    return currentUser?.role?.name === roleName
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const value: UserContextType = {
    currentUser,
    loading,
    refreshUser,
    hasPermission,
    isRole
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

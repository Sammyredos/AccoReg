import { NextRequest } from 'next/server'
import { prisma } from './db'
import { verifyToken } from '@/lib/auth'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  type: 'admin' | 'user'
  isActive: boolean
  role: {
    id: string
    name: string
    permissions: Array<{
      id: string
      name: string
    }>
  } | null
}

export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean
  user?: AuthenticatedUser
  error?: string
  status?: number
}> {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return { success: false, error: 'Unauthorized', status: 401 }
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return { success: false, error: 'Invalid token', status: 401 }
    }

    // Determine user type from token
    const userType = payload.type || 'admin' // Default to admin for backward compatibility

    let user
    if (userType === 'admin') {
      // Fetch admin user
      user = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })
    } else {
      // Fetch regular user
      user = await prisma.user.findUnique({
        where: { id: payload.adminId }, // adminId field is used for both types
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      })
    }

    if (!user || !user.isActive) {
      return { success: false, error: 'User not found or inactive', status: 401 }
    }

    // Format user data
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      type: userType,
      isActive: user.isActive,
      role: user.role
    }

    return { success: true, user: authenticatedUser }

  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, error: 'Authentication failed', status: 500 }
  }
}

export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  if (!user.role?.permissions) return false
  
  // Super Admin and Admin roles have all permissions
  if (user.role.name === 'Super Admin' || user.role.name === 'Admin') {
    return true
  }
  
  return user.role.permissions.some(p => 
    p.name === permission || p.name === 'system:admin'
  )
}

export function hasRole(user: AuthenticatedUser, roleName: string): boolean {
  return user.role?.name === roleName
}

export function hasAnyRole(user: AuthenticatedUser, roleNames: string[]): boolean {
  return roleNames.includes(user.role?.name || '')
}

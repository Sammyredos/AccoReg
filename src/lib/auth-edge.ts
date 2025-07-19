/**
 * Edge Runtime compatible authentication functions
 * Only uses Web APIs that work in Edge Runtime
 */

import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface JWTPayload {
  adminId: string
  email: string
  type?: 'admin' | 'user'
  iat?: number
  exp?: number
}

// Edge Runtime compatible token verification
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    // Ensure the payload has the correct structure
    const jwtPayload = payload as any

    // Handle both admin and user token structures
    if (jwtPayload.adminId || jwtPayload.userId) {
      return {
        adminId: jwtPayload.adminId || jwtPayload.userId,
        email: jwtPayload.email,
        type: jwtPayload.type || 'admin',
        iat: jwtPayload.iat,
        exp: jwtPayload.exp
      }
    }

    return null
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // For middleware, we need to check cookies differently
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      // Decode the cookie value in case it's URL encoded
      acc[key] = value ? decodeURIComponent(value) : value
      return acc
    }, {} as Record<string, string>)

    const token = cookies['auth-token']
    if (token) {
      console.log('Token found in cookie:', token.substring(0, 20) + '...')
      return token
    }
  }

  console.log('No token found in request')
  return null
}

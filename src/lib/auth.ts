import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface JWTPayload {
  adminId: string
  email: string
  type?: 'admin' | 'user'
  iat?: number
  exp?: number
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12)
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(password, hashedPassword)
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInHours?: number): string {
  const expiresIn = expiresInHours ? `${expiresInHours}h` : '7d'
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    return payload
  } catch (error) {
    return null
  }
}

// Edge Runtime compatible token verification
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Also check for token in cookies
  const token = request.cookies.get('auth-token')?.value
  return token || null
}

export function verifyAdmin(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null

  return verifyToken(token)
}

// Edge Runtime compatible admin verification
export async function verifyAdminEdge(request: NextRequest): Promise<JWTPayload | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null

  return await verifyTokenEdge(token)
}

// Generate token function (alias for signToken for compatibility)
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInHours?: number): string {
  return signToken(payload, expiresInHours)
}

// Verify auth function for API routes
export async function verifyAuth(request: NextRequest): Promise<{
  success: boolean
  user?: JWTPayload
  error?: string
}> {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return { success: false, error: 'No token provided' }
    }

    const payload = verifyToken(token)
    if (!payload) {
      return { success: false, error: 'Invalid token' }
    }

    return { success: true, user: payload }
  } catch (error) {
    return { success: false, error: 'Authentication failed' }
  }
}

// Alias for compatibility
export const authenticateRequest = verifyAuth

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify and decode token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    return NextResponse.json({
      exp: payload.exp,
      iat: payload.iat,
      timeRemaining: payload.exp ? (payload.exp * 1000) - Date.now() : 0
    })
  } catch (error) {
    console.error('Token info error:', error)
    return NextResponse.json(
      { error: 'Failed to get token info' },
      { status: 500 }
    )
  }
}

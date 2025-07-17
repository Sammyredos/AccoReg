import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge, getTokenFromRequest } from '@/lib/auth-edge'
import { initializeDatabase } from '@/lib/db-init'

export async function middleware(request: NextRequest) {
  // Initialize database on first request in production
  if (process.env.NODE_ENV === 'production') {
    try {
      await initializeDatabase()
    } catch (error) {
      console.error('Database initialization error in middleware:', error)
    }
  }

  const { pathname } = request.nextUrl

  // Skip middleware for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Token extraction is now handled by the imported function

  // Protect admin routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const admin = await verifyTokenEdge(token)
    if (!admin) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Redirect logged-in admins away from login page
  if (pathname === '/admin/login') {
    const token = getTokenFromRequest(request)
    if (token) {
      const admin = await verifyTokenEdge(token)
      if (admin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }
  }

  // Continue with the request
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*'
  ]
}

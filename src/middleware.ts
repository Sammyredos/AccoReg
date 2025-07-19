import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge, getTokenFromRequest } from '@/lib/auth-edge'

export async function middleware(request: NextRequest) {
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
      console.log('No token found, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const admin = await verifyTokenEdge(token)
    if (!admin) {
      console.log('Token verification failed, redirecting to login')
      // Clear the invalid token
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    console.log('Admin authenticated:', admin.email)
  }

  // Redirect logged-in admins away from login page
  if (pathname === '/admin/login') {
    const token = getTokenFromRequest(request)
    if (token) {
      const admin = await verifyTokenEdge(token)
      if (admin) {
        console.log('Already authenticated, redirecting to dashboard')
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else {
        // Clear invalid token
        console.log('Invalid token found on login page, clearing it')
        const response = NextResponse.next()
        response.cookies.delete('auth-token')
        return response
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

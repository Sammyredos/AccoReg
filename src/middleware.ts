import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge, getTokenFromRequest } from '@/lib/auth-edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('🔍 Middleware processing:', pathname)

  // Skip middleware for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip middleware for static files and Next.js internals
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Protect admin routes (except login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = getTokenFromRequest(request)
    if (!token) {
      console.log('🔒 No token found, redirecting to login from:', pathname)
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const admin = await verifyTokenEdge(token)
    if (!admin) {
      console.log('🔒 Token verification failed, redirecting to login from:', pathname)
      // Clear the invalid token
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    console.log('✅ Admin authenticated:', admin.email, 'accessing:', pathname)
  }

  // Handle login page - redirect if already authenticated
  if (pathname === '/admin/login') {
    const token = getTokenFromRequest(request)
    if (token) {
      const admin = await verifyTokenEdge(token)
      if (admin) {
        console.log('🔄 Already authenticated, redirecting to dashboard from login page')
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else {
        // Clear invalid token
        console.log('🧹 Invalid token found on login page, clearing it')
        const response = NextResponse.next()
        response.cookies.delete('auth-token')
        return response
      }
    }
    console.log('👤 No token on login page, allowing access')
  }

  // Continue with the request
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*'
  ]
}

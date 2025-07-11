import { NextRequest, NextResponse } from 'next/server'
import { isMaintenanceMode } from '@/lib/settings'

export async function maintenanceMiddleware(request: NextRequest) {
  // Skip maintenance check for admin routes and API routes
  const { pathname } = request.nextUrl
  
  // Allow admin access during maintenance
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Check if maintenance mode is enabled
  const maintenanceEnabled = await isMaintenanceMode()
  
  if (maintenanceEnabled) {
    // Return maintenance page
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>System Maintenance</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            font-weight: 700;
          }
          p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 2rem;
          }
          .admin-link {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.75rem 1.5rem;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
          }
          .admin-link:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🔧</div>
          <h1>System Maintenance</h1>
          <p>We're currently performing scheduled maintenance to improve your experience. Please check back shortly.</p>
          <p>We apologize for any inconvenience this may cause.</p>
          <a href="/admin" class="admin-link">Admin Access</a>
        </div>
      </body>
      </html>
      `,
      {
        status: 503,
        headers: {
          'Content-Type': 'text/html',
          'Retry-After': '3600' // Suggest retry after 1 hour
        }
      }
    )
  }

  return NextResponse.next()
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the auth token cookie immediately and thoroughly
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      expires: new Date(0), // Set to past date for extra security
      path: '/' // Ensure it clears from all paths
    })

    // Also clear any other potential auth cookies
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      expires: new Date(0),
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)

    // Even if there's an error, clear the cookies
    const response = NextResponse.json(
      { error: 'Logout failed but cookies cleared' },
      { status: 500 }
    )

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      expires: new Date(0),
      path: '/'
    })

    return response
  }
}

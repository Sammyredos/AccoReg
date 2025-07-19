/**
 * Reliable redirect utilities for authentication flows
 */

export interface RedirectOptions {
  fallbackDelay?: number
  clearStorage?: boolean
  logRedirect?: boolean
}

/**
 * Force redirect with multiple fallback strategies
 * This ensures the redirect works even if one method fails
 */
export function forceRedirect(url: string, options: RedirectOptions = {}) {
  const {
    fallbackDelay = 50,
    clearStorage = false,
    logRedirect = true
  } = options

  if (logRedirect) {
    console.log(`🚀 Force redirecting to: ${url}`)
  }

  // Clear storage if requested (useful for logout)
  if (clearStorage && typeof window !== 'undefined') {
    try {
      localStorage.clear()
      sessionStorage.clear()
      if (logRedirect) {
        console.log('🧹 Storage cleared')
      }
    } catch (error) {
      console.warn('Failed to clear storage:', error)
    }
  }

  // Strategy 1: Immediate window.location.replace (most reliable)
  try {
    window.location.replace(url)
  } catch (error) {
    console.warn('window.location.replace failed:', error)
  }

  // Strategy 2: Backup using window.location.href
  setTimeout(() => {
    try {
      if (window.location.pathname !== new URL(url, window.location.origin).pathname) {
        if (logRedirect) {
          console.log('🔄 Backup redirect using href...')
        }
        window.location.href = url
      }
    } catch (error) {
      console.warn('window.location.href failed:', error)
    }
  }, fallbackDelay)

  // Strategy 3: Final fallback using window.location.assign
  setTimeout(() => {
    try {
      if (window.location.pathname !== new URL(url, window.location.origin).pathname) {
        if (logRedirect) {
          console.log('🚨 Final fallback using assign...')
        }
        window.location.assign(url)
      }
    } catch (error) {
      console.warn('window.location.assign failed:', error)
    }
  }, fallbackDelay * 2)
}

/**
 * Redirect after successful login
 */
export function redirectAfterLogin(targetUrl: string = '/admin/dashboard') {
  console.log('✅ Login successful - executing immediate redirect...')

  // IMMEDIATE redirect - no delays
  try {
    // Method 1: Most aggressive - replace immediately
    window.location.replace(targetUrl)
  } catch (error) {
    console.warn('replace failed, trying href:', error)
    try {
      // Method 2: Fallback to href
      window.location.href = targetUrl
    } catch (error2) {
      console.warn('href failed, trying assign:', error2)
      // Method 3: Final fallback
      window.location.assign(targetUrl)
    }
  }
}

/**
 * Redirect after logout
 */
export function redirectAfterLogout(targetUrl: string = '/admin/login') {
  console.log('🚪 Logout successful - executing redirect...')
  forceRedirect(targetUrl, {
    fallbackDelay: 50,
    clearStorage: true,
    logRedirect: true
  })
}

/**
 * Check if current page matches target URL
 */
export function isCurrentPage(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const current = new URL(window.location.href)
    const target = new URL(targetUrl, window.location.origin)
    return current.pathname === target.pathname
  } catch (error) {
    console.warn('URL comparison failed:', error)
    return false
  }
}

// Service Worker for AccoReg Application
// Ensures the app stays online and provides caching for better performance

const CACHE_NAME = 'accoreg-v1'
const STATIC_CACHE_NAME = 'accoreg-static-v1'
const DYNAMIC_CACHE_NAME = 'accoreg-dynamic-v1'

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/admin/login',
  '/register',
  '/offline.html',
  '/fonts/ApercuPro-Regular.woff',
  '/fonts/ApercuPro-Medium.woff',
  '/fonts/ApercuPro-Bold.woff',
  '/globe.svg'
]

// API routes that should be cached
const CACHEABLE_API_ROUTES = [
  '/api/system/branding',
  '/api/registration/settings',
  '/api/health'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets...')
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/offline.html'))
      })
      .then(() => {
        console.log('✅ Static assets cached successfully')
        self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, cache fallback
    event.respondWith(handleAPIRequest(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static Next.js assets - cache first
    event.respondWith(handleStaticAssets(request))
  } else {
    // Page requests - network first, cache fallback
    event.respondWith(handlePageRequest(request))
  }
})

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses for cacheable API routes
    if (networkResponse.ok && CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('📱 Serving API from cache:', url.pathname)
      return cachedResponse
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Network unavailable', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url)
    throw error
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful page responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('📱 Serving page from cache:', request.url)
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html')
      if (offlineResponse) {
        return offlineResponse
      }
    }
    
    throw error
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

// Handle background sync operations
async function handleBackgroundSync() {
  try {
    // Implement any background sync logic here
    console.log('✅ Background sync completed')
  } catch (error) {
    console.error('❌ Background sync failed:', error)
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: '/globe.svg',
      badge: '/globe.svg',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: data.actions || []
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})

// Periodic background sync for keeping the app fresh
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(handlePeriodicSync())
  }
})

async function handlePeriodicSync() {
  try {
    // Refresh critical data in the background
    const criticalEndpoints = [
      '/api/system/branding',
      '/api/registration/settings'
    ]
    
    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(endpoint)
        if (response.ok) {
          const cache = await caches.open(DYNAMIC_CACHE_NAME)
          cache.put(endpoint, response.clone())
        }
      } catch (error) {
        console.warn('Failed to sync:', endpoint)
      }
    }
    
    console.log('✅ Periodic sync completed')
  } catch (error) {
    console.error('❌ Periodic sync failed:', error)
  }
}

console.log('🚀 Service Worker loaded successfully')

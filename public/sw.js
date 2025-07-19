// Simple Service Worker to prevent 404 errors
// This is a minimal service worker that doesn't do any caching

self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...')
  // Skip waiting to activate immediately
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activated')
  // Claim all clients immediately
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', function(event) {
  // Don't intercept any requests - just let them pass through
  // This prevents any caching issues while still preventing 404 errors
  return
})

console.log('Service Worker: Loaded (minimal implementation)')

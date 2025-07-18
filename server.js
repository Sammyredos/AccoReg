const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT) || 3000

// Memory optimization settings
if (process.env.NODE_ENV === 'production') {
  // Force garbage collection more frequently in production
  if (global.gc) {
    setInterval(() => {
      global.gc()
    }, 30000) // Every 30 seconds
  }
}

// Create Next.js app with memory optimizations
const app = next({
  dev,
  hostname,
  port,
  // Reduce memory usage in production
  conf: {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
    // Reduce cache size
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    }
  }
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Add memory-efficient headers
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Set server timeout to prevent memory leaks
  server.timeout = 30000
  server.keepAliveTimeout = 5000
  server.headersTimeout = 6000

  server
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Environment: ${process.env.NODE_ENV}`)
      console.log(`> Port: ${port}`)
      console.log(`> Memory optimization: ${process.env.NODE_OPTIONS || 'default'}`)

      // Log memory usage
      const memUsage = process.memoryUsage()
      console.log(`> Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`)
    })
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for server components
  serverExternalPackages: ['prisma', '@prisma/client'],

  // Simplified webpack configuration
  webpack: (config, { isServer }) => {
    // Fix module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    }

    // Only add fallbacks for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      }
    ],
    unoptimized: false,
  },

  // TypeScript configuration
  typescript: {
    // Only ignore build errors in development or when SKIP_TYPE_CHECK is true
    ignoreBuildErrors: process.env.NODE_ENV === 'development' || process.env.SKIP_TYPE_CHECK === 'true',
  },

  // ESLint configuration
  eslint: {
    // Only ignore during builds in development or when SKIP_TYPE_CHECK is true
    ignoreDuringBuilds: process.env.NODE_ENV === 'development' || process.env.SKIP_TYPE_CHECK === 'true',
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security and performance
  async headers() {
    const securityHeaders = [
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
    ]

    // Add HSTS header in production
    if (process.env.NODE_ENV === 'production' && process.env.HSTS_ENABLED === 'true') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      })
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Redirects
  async redirects() {
    return []
  },
}

module.exports = nextConfig

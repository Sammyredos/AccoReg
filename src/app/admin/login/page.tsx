'use client'

import { useState } from 'react'
// import { useRouter } from 'next/navigation' // Commented out as unused
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, Mail, Users, Shield, ArrowRight } from 'lucide-react'
// import { HydrationSafeDiv } from '@/components/ui/hydration-safe' // Commented out as unused
import { LoginLogo } from '@/components/ui/UniversalLogo'
import { useReactiveSystemName } from '@/components/ui/reactive-system-name'
import { pagePreloader } from '@/lib/page-preloader'
import '@/styles/login-animations.css'
import { useRouter } from 'next/navigation'
import { redirectAfterLogin } from '@/lib/redirect-utils'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const systemName = useReactiveSystemName()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Prevent multiple submissions
    if (loading) {
      console.log('⚠️ Login already in progress, ignoring submission')
      return
    }

    setLoading(true)
    setError('')

    console.log('🔐 Starting login process for:', email)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Ensure cookies are included
      })

      console.log('📡 Login response status:', response.status)
      const data = await response.json()
      console.log('📋 Login response data:', { success: data.success, hasUser: !!data.user })

      if (response.ok && data.success) {
        console.log('✅ Login successful - redirecting immediately')

        // Clear any existing error
        setError('')

        // IMMEDIATE redirect - no waiting, no delays
        console.log('🚀 Executing immediate redirect to dashboard...')
        window.location.replace('/admin/dashboard')

        // Backup redirect in case the first one fails
        setTimeout(() => {
          if (window.location.pathname === '/admin/login') {
            console.log('🔄 Backup redirect triggered')
            window.location.href = '/admin/dashboard'
          }
        }, 100)

      } else {
        console.log('❌ Login failed:', data.error || 'Unknown error')
        setError(data.error || 'Login failed')
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Login network error:', error)
      setError('Network error. Please try again.')
    } finally {
      // Only set loading to false if we're still on the login page
      // (i.e., if the redirect didn't happen)
      setTimeout(() => {
        if (window.location.pathname === '/admin/login') {
          setLoading(false)
        }
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 animate-gradient flex items-center justify-center p-4" suppressHydrationWarning={true}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" suppressHydrationWarning={true} />

      {/* Main Container */}
      <div className="w-full max-w-md animate-fade-in" suppressHydrationWarning={true}>
        {/* Header Section */}
        <div className="text-center mb-8 animate-slide-in-up" suppressHydrationWarning={true}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg animate-float overflow-hidden">
            <LoginLogo
              className="w-16 h-16 rounded-2xl"
              alt="System Logo"
              fallbackText="M"
            />
          </div>
          <h1 className="font-apercu-bold text-3xl text-gray-900 mb-2 animate-fade-in animate-delay-100">
            Admin Access
          </h1>
          <p className="font-apercu-regular text-gray-600 animate-fade-in animate-delay-200">
            Sign in to your admin dashboard
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 animate-fade-in animate-delay-300">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="font-apercu-medium text-sm text-indigo-600">{systemName}</span>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="font-apercu-bold text-xl text-center text-gray-900">
              Admin Login
            </CardTitle>
            <CardDescription className="font-apercu-regular text-center text-gray-600">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="font-apercu-medium text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="font-apercu-medium text-sm text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-apercu-regular pl-10 h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="font-apercu-medium text-sm text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-apercu-regular pl-10 pr-10 h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white">Signing in...</span>
                  </div>
                ) : (
                  <div className="flex text-white items-center gap-2">
                    <span className="text-white">Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>


          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="font-apercu-regular text-sm text-gray-500">
            Secure Access to <span className="font-apercu-regular text-sm text-gray-500">{systemName}</span> Management System
          </p>
        </div>
      </div>
    </div>
  )
}

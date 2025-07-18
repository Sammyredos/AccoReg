'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import { useReactiveSystemName } from '@/components/ui/reactive-system-name'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Star,
  ArrowRight,
  CheckCircle,
  Heart,
  Sparkles,
  Menu,
  X,
  Utensils,
  Home as HomeIcon
} from 'lucide-react'

export default function Home() {
  const systemName = useReactiveSystemName()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    // Only add scroll listener in browser environment
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load logo from admin branding with timeout
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch('/api/admin/settings/logo', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl)
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load logo:', error)
        }
        // Continue without logo if it fails
      }
    }

    loadLogo()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50" suppressHydrationWarning={true}>
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-purple-100' : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              {logoUrl ? (
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 p-1 shadow-lg">
                  <Image
                    src={logoUrl}
                    alt={`${systemName} Logo`}
                    width={48}
                    height={48}
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="font-apercu-bold text-lg lg:text-xl bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">{systemName}</h1>
                <p className="font-apercu-regular text-xs bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">Youth Revival 2025</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <a href="#about" className="font-apercu-medium text-gray-700 hover:text-purple-600 transition-colors duration-200">
                About
              </a>
              <a href="#details" className="font-apercu-medium text-gray-700 hover:text-pink-600 transition-colors duration-200">
                Event Details
              </a>
              <a href="#features" className="font-apercu-medium text-gray-700 hover:text-orange-600 transition-colors duration-200">
                What to Expect
              </a>
              <Button asChild className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <Link href="/register">
                  Register Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden bg-gradient-to-br from-white to-purple-50 border-t border-purple-200 py-4">
              <div className="space-y-4">
                <a href="#about" className="block font-apercu-medium text-gray-700 hover:text-purple-600 transition-colors duration-200">
                  About
                </a>
                <a href="#details" className="block font-apercu-medium text-gray-700 hover:text-pink-600 transition-colors duration-200">
                  Event Details
                </a>
                <a href="#features" className="block font-apercu-medium text-gray-700 hover:text-orange-600 transition-colors duration-200">
                  What to Expect
                </a>
                <Button asChild className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-apercu-medium transition-all duration-200 transform hover:scale-105">
                  <Link href="/register">
                    Register Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 pt-16 lg:pt-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-orange-400 to-red-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-20 w-16 h-16 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full opacity-20 animate-pulse delay-500"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Decorative Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 rounded-full mb-8 shadow-lg">
            <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
            <span className="font-apercu-medium text-sm bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">Linger no Longer 6.0</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-apercu-bold text-gray-900 mb-6 leading-tight">
            Transform Your
            <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              Faith Journey
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed font-apercu-regular">
            Join hundreds of young believers for an unforgettable 3-day retreat filled with worship,
            fellowship, and spiritual growth at {systemName}.
          </p>

          {/* Accommodation & Feeding Info */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 max-w-2xl mx-auto px-4">
            <div className="flex items-center px-4 py-2.5 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full shadow-sm">
              <HomeIcon className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
              <span className="font-apercu-medium text-sm text-green-700 whitespace-nowrap">Full Accommodation</span>
            </div>
            <div className="flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full shadow-sm">
              <Utensils className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
              <span className="font-apercu-medium text-sm text-blue-700 whitespace-nowrap">All Meals Provided</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-apercu-medium shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
              <Link href="/register">
                Register Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-purple-300 hover:border-pink-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 font-apercu-medium text-purple-700 hover:text-pink-700 transition-all duration-200">
              <a href="#details">
                Learn More
              </a>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 max-w-3xl mx-auto">
            <div className="text-center p-4 lg:p-6 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 hover:from-purple-200 hover:to-purple-100 transition-all duration-200 transform hover:scale-105">
              <div className="text-2xl lg:text-3xl font-apercu-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-1">3</div>
              <div className="text-sm font-apercu-medium text-gray-600">Days</div>
            </div>
            <div className="text-center p-4 lg:p-6 rounded-xl bg-gradient-to-br from-green-100 to-green-50 hover:from-green-200 hover:to-green-100 transition-all duration-200 transform hover:scale-105">
              <div className="text-2xl lg:text-3xl font-apercu-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-1">Aug</div>
              <div className="text-sm font-apercu-medium text-gray-600">7th-9th</div>
            </div>
            <div className="text-center p-4 lg:p-6 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 hover:from-orange-200 hover:to-orange-100 transition-all duration-200 transform hover:scale-105">
              <div className="text-2xl lg:text-3xl font-apercu-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent mb-1">Free</div>
              <div className="text-sm font-apercu-medium text-gray-600">Registration</div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Details Section */}
      <section id="details" className="py-20 bg-gradient-to-br from-white via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-apercu-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent mb-4">
              Event Details
            </h2>
            <p className="text-lg text-gray-600 font-apercu-regular max-w-2xl mx-auto">
              Everything you need to know about our upcoming youth revival
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* When & Where Cards */}
            <Card className="bg-gradient-to-br from-white to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-apercu-bold text-xl text-gray-900 mb-4">When</h3>
                <div className="space-y-2">
                  <p className="text-2xl font-apercu-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">August 7th - 9th, 2025</p>
                  <p className="text-gray-600 font-apercu-regular">Thursday to Sunday</p>
                  <p className="text-sm text-gray-500 font-apercu-regular">Check-in starts at 8:00 AM</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-green-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-apercu-bold text-xl text-gray-900 mb-4">Where</h3>
                <div className="space-y-2">
                  <p className="text-2xl font-apercu-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">MOPGOM Campground Gudugba <br></br>
                    After WAPCO Housing Estate, Ifo/Abeokuta Expressway, Gudugba Bus Stop, Ogun State
                  </p>
                  <p className="text-gray-600 font-apercu-regular">Retreat Center</p>
                  <p className="text-sm text-gray-500 font-apercu-regular">Full accommodation & meals provided</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-apercu-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
              What to Expect
            </h2>
            <p className="text-lg text-gray-600 font-apercu-regular max-w-2xl mx-auto">
              An incredible experience designed to strengthen your faith and build lasting connections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Inspiring Worship",
                description: "Experience powerful worship sessions that will uplift your spirit and draw you closer to God.",
                color: "from-red-500 via-pink-500 to-rose-600",
                bgColor: "from-red-50 to-pink-50"
              },
              {
                icon: Users,
                title: "Fellowship & Community",
                description: "Connect with like-minded youth and build friendships that will last a lifetime.",
                color: "from-blue-500 via-indigo-500 to-purple-600",
                bgColor: "from-blue-50 to-indigo-50"
              },
              {
                icon: Star,
                title: "Spiritual Growth",
                description: "Participate in workshops and sessions designed to deepen your understanding of faith.",
                color: "from-yellow-500 via-orange-500 to-red-600",
                bgColor: "from-yellow-50 to-orange-50"
              },
              {
                icon: Clock,
                title: "24/7 Activities",
                description: "Enjoy a packed schedule of activities, games, and meaningful conversations.",
                color: "from-green-500 via-emerald-500 to-teal-600",
                bgColor: "from-green-50 to-emerald-50"
              },
              {
                icon: CheckCircle,
                title: "Expert Speakers",
                description: "Learn from experienced pastors and youth leaders who will inspire and guide you.",
                color: "from-purple-500 via-violet-500 to-indigo-600",
                bgColor: "from-purple-50 to-violet-50"
              },
              {
                icon: Sparkles,
                title: "Life-Changing Experience",
                description: "Leave with renewed purpose, stronger faith, and unforgettable memories.",
                color: "from-indigo-500 via-purple-500 to-pink-600",
                bgColor: "from-indigo-50 to-purple-50"
              }
            ].map((feature, index) => (
              <Card key={index} className={`bg-gradient-to-br ${feature.bgColor} border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
                <CardContent className="p-6">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-apercu-bold text-lg text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 font-apercu-regular leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-apercu-bold text-gray-900 mb-6">
                About {systemName}
              </h2>
              <p className="text-lg text-gray-600 font-apercu-regular mb-6 leading-relaxed">
                Our youth revival is more than just an event—it's a transformative experience designed
                to empower young believers in their faith journey. For three incredible days, you'll be
                immersed in worship, fellowship, and spiritual growth.
              </p>
              <p className="text-gray-600 font-apercu-regular mb-8 leading-relaxed">
                Whether you're seeking to deepen your relationship with God, connect with other believers,
                or simply experience the joy of Christian community, this retreat offers something special for everyone.
              </p>
              <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-apercu-medium">
                <Link href="/register">
                  Join Us Today
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h3 className="font-apercu-bold text-xl text-gray-900 mb-4">Ready to Transform?</h3>
                <p className="text-gray-600 font-apercu-regular mb-6">
                  Don't miss this opportunity to be part of something extraordinary.
                </p>
                <div className="text-center">
                  <div className="text-3xl font-apercu-bold text-indigo-600 mb-1">Free</div>
                  <div className="text-sm font-apercu-medium text-gray-600">Registration & Accommodation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-20 h-20 bg-white/10 rounded-full animate-pulse delay-500"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-apercu-bold text-white mb-6">
            Your Journey Starts Here
          </h2>
          <p className="text-lg text-white/90 font-apercu-regular mb-8 leading-relaxed">
            Don't wait—spaces are limited and filling up fast. Secure your spot today and
            prepare for a life-changing experience with full accommodation and meals provided.
          </p>
          <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-gray-100 hover:text-pink-600 font-apercu-medium shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <Link href="/register">
              Register Now - It's Free!
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              {logoUrl ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 p-1">
                  <Image
                    src={logoUrl}
                    alt={`${systemName} Logo`}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              )}
              <h3 className="font-apercu-bold text-white text-xl">{systemName}</h3>
            </div>
            <p className="text-gray-400 font-apercu-regular mb-6">
              Empowering youth through faith, fellowship, and spiritual growth.
            </p>

            {/* Contact Information */}
            <div className="mb-6 space-y-3">
              <h4 className="text-sm font-apercu-medium text-gray-400 mb-3">Contact Support</h4>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:+2348023882300" className="text-gray-300 hover:text-white font-apercu-medium text-sm transition-colors duration-200">
                  +234 802 388 2300
                </a>
                <span className="text-gray-600 hidden sm:inline">|</span>
                <a href="tel:+2348064394424" className="text-gray-300 hover:text-white font-apercu-medium text-sm transition-colors duration-200">
                  +234 806 439 4424
                </a>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <p className="text-sm text-gray-400 font-apercu-regular">
                © 2025 {systemName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

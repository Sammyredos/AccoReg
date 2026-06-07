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
  Home as HomeIcon,
  Church
} from 'lucide-react'

export default function Home() {
  const systemName = useReactiveSystemName()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load logo from admin branding
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/api/admin/settings/logo')
        if (response.ok) {
          const data = await response.json()
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl)
          }
        }
      } catch (error) {
        console.error('Failed to load logo:', error)
      }
    }

    loadLogo()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 font-sans selection:bg-purple-500/30" suppressHydrationWarning={true}>
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-neutral-950/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 lg:h-24">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              {logoUrl ? (
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm p-1 border border-white/10 shadow-2xl">
                  <Image
                    src={logoUrl}
                    alt={`${systemName} Logo`}
                    width={56}
                    height={56}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                  <Church className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="font-bold tracking-tight text-xl lg:text-2xl text-white">{systemName}</h1>
                <p className="text-sm font-medium text-purple-400 tracking-wide">Youth Revival 2026</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-10">
              <a href="#about" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors duration-200">
                About
              </a>
              <a href="#details" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors duration-200">
                Event Details
              </a>
              <a href="#features" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors duration-200">
                What to Expect
              </a>
              <Button asChild className="bg-white text-neutral-950 hover:bg-neutral-200 font-semibold px-8 h-12 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300">
                <Link href="/register">
                  Register Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-neutral-300 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden absolute top-full left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-white/10 p-6 shadow-2xl">
              <div className="flex flex-col space-y-6">
                <a href="#about" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-neutral-300 hover:text-white transition-colors duration-200">
                  About
                </a>
                <a href="#details" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-neutral-300 hover:text-white transition-colors duration-200">
                  Event Details
                </a>
                <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-neutral-300 hover:text-white transition-colors duration-200">
                  What to Expect
                </a>
                <Button asChild className="w-full bg-white text-neutral-950 hover:bg-neutral-200 font-semibold h-12 rounded-full mt-4">
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
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Immersive Background Image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1544427920-c49ccf08c146?q=80&w=2500&auto=format&fit=crop" 
            alt="Youth Revival Worship"
            fill
            className="object-cover opacity-40"
            priority
          />
          {/* Gradients to blend image smoothly into the dark theme */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-neutral-950/30"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-transparent to-neutral-950/50"></div>
        </div>

        {/* Floating Orbs for Premium Depth */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Decorative Badge */}
          <div className="inline-flex items-center px-5 py-2.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-full mb-10 shadow-2xl">
            <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
            <span className="font-medium text-sm text-neutral-200 tracking-wide">Linger no Longer 7.0</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tight">
            Transform Your <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
              Faith Journey
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-neutral-300 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            Join hundreds of young believers for an unforgettable 3-day retreat filled with worship,
            fellowship, and spiritual growth at {systemName}.
          </p>

          {/* Accommodation & Feeding Info */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="flex items-center px-6 py-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full shadow-lg">
              <HomeIcon className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
              <span className="font-medium text-sm text-white whitespace-nowrap">Full Accommodation</span>
            </div>
            <div className="flex items-center px-6 py-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full shadow-lg">
              <Utensils className="w-5 h-5 text-pink-400 mr-3 flex-shrink-0" />
              <span className="font-medium text-sm text-white whitespace-nowrap">All Meals Provided</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-20">
            <Button asChild size="lg" className="bg-white text-neutral-950 hover:bg-neutral-200 font-semibold px-10 h-14 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 text-lg">
              <Link href="/register">
                Reserve Your Spot
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white font-semibold px-10 h-14 rounded-full transition-all duration-300 text-lg">
              <a href="#details">
                Explore Event
              </a>
            </Button>
          </div>

          {/* Quick Stats - Glassmorphism */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <div className="text-3xl font-bold text-white mb-1">3</div>
              <div className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Days</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <div className="text-3xl font-bold text-white mb-1">Aug</div>
              <div className="text-sm font-medium text-neutral-400 uppercase tracking-wider">6th-8th</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-1">Free</div>
              <div className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Registration</div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Details Section */}
      <section id="details" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
              Event Details
            </h2>
            <p className="text-lg text-neutral-400 font-light max-w-2xl mx-auto">
              Everything you need to know about our upcoming youth revival
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* When Card */}
            <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 shadow-2xl hover:border-purple-500/30 transition-all duration-300">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-8 border border-purple-500/20">
                  <Calendar className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="font-bold text-2xl text-white mb-4">When</h3>
                <div className="space-y-3">
                  <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">August 6th - 8th, 2026</p>
                  <p className="text-neutral-300 text-lg">Thursday to Saturday</p>
                  <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-400 mt-2">
                    Check-in starts at 8:00 AM
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Where Card */}
            <Card className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 shadow-2xl hover:border-pink-500/30 transition-all duration-300">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-8 border border-pink-500/20">
                  <MapPin className="w-10 h-10 text-pink-400" />
                </div>
                <h3 className="font-bold text-2xl text-white mb-4">Where</h3>
                <div className="space-y-3">
                  <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">MOPGOM Campground Gudugba</p>
                  <p className="text-neutral-300 text-base max-w-sm mx-auto leading-relaxed">
                    After WAPCO Housing Estate, Ifo/Abeokuta Expressway, Gudugba Bus Stop, Ogun State
                  </p>
                  <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-400 mt-2">
                    Retreat Center with full accommodation
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-neutral-900/30 relative border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
              What to Expect
            </h2>
            <p className="text-lg text-neutral-400 font-light max-w-2xl mx-auto">
              An incredible experience designed to strengthen your faith and build lasting connections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Inspiring Worship",
                description: "Experience powerful worship sessions that will uplift your spirit and draw you closer to God.",
                color: "text-rose-400",
                bg: "bg-rose-500/10 border-rose-500/20"
              },
              {
                icon: Users,
                title: "Fellowship & Community",
                description: "Connect with like-minded youth and build friendships that will last a lifetime.",
                color: "text-blue-400",
                bg: "bg-blue-500/10 border-blue-500/20"
              },
              {
                icon: Star,
                title: "Spiritual Growth",
                description: "Participate in workshops and sessions designed to deepen your understanding of faith.",
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20"
              },
              {
                icon: Clock,
                title: "24/7 Activities",
                description: "Enjoy a packed schedule of activities, games, and meaningful conversations.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20"
              },
              {
                icon: Sparkles,
                title: "Life-Changing Experience",
                description: "Leave with renewed purpose, stronger faith, and unforgettable memories.",
                color: "text-purple-400",
                bg: "bg-purple-500/10 border-purple-500/20"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-neutral-900/50 backdrop-blur-md border border-white/5 p-8 rounded-2xl hover:bg-white/5 transition-all duration-300">
                <div className={`w-14 h-14 ${feature.bg} border rounded-xl flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="font-bold text-xl text-white mb-3">{feature.title}</h3>
                <p className="text-neutral-400 font-light leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 relative">
        <div className="absolute left-0 top-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight">
                About {systemName}
              </h2>
              <div className="space-y-6 text-lg text-neutral-300 font-light leading-relaxed">
                <p>
                  Our youth revival is more than just an event—it's a transformative experience designed
                  to empower young believers in their faith journey. For three incredible days, you'll be
                  immersed in worship, fellowship, and spiritual growth.
                </p>
                <p>
                  Whether you're seeking to deepen your relationship with God, connect with other believers,
                  or simply experience the joy of Christian community, this retreat offers something special for everyone.
                </p>
              </div>
              <Button asChild className="mt-10 bg-white text-neutral-950 hover:bg-neutral-200 font-semibold px-8 h-14 rounded-full">
                <Link href="/register">
                  Join Us Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="relative lg:pl-10">
              <div className="bg-neutral-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="font-bold text-2xl text-white mb-4">Ready to Transform?</h3>
                  <p className="text-neutral-400 font-light mb-8">
                    Don't miss this opportunity to be part of something extraordinary.
                  </p>
                  <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">Free</div>
                    <div className="text-sm font-medium text-neutral-300 uppercase tracking-wide">Registration & Accommodation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 to-neutral-900"></div>
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-purple-600/20 blur-[100px] pointer-events-none rounded-full"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl lg:text-6xl font-black text-white mb-8 tracking-tight">
            Your Journey Starts Here
          </h2>
          <p className="text-xl text-neutral-300 font-light mb-12 leading-relaxed max-w-3xl mx-auto">
            Don't wait—spaces are limited and filling up fast. Secure your spot today and
            prepare for a life-changing experience with full accommodation and meals provided.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold px-12 h-16 rounded-full shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all duration-300 text-xl">
            <Link href="/register">
              Register Now - It's Free!
              <ArrowRight className="w-6 h-6 ml-3" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              {logoUrl ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 p-1 border border-white/10">
                  <Image
                    src={logoUrl}
                    alt={`${systemName} Logo`}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain rounded-md"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                  <Church className="w-5 h-5 text-white" />
                </div>
              )}
              <h3 className="font-bold text-white text-xl tracking-tight">{systemName}</h3>
            </div>
            <p className="text-neutral-500 font-light mb-10 max-w-md mx-auto">
              Empowering youth through faith, fellowship, and spiritual growth.
            </p>

            {/* Contact Information */}
            <div className="mb-10 space-y-4">
              <h4 className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Contact Support</h4>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <a href="tel:+2348023882300" className="text-neutral-300 hover:text-white font-medium transition-colors duration-200">
                  +234 802 388 2300
                </a>
                <span className="text-neutral-700 hidden sm:inline">•</span>
                <a href="tel:+2348064394424" className="text-neutral-300 hover:text-white font-medium transition-colors duration-200">
                  +234 806 439 4424
                </a>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8">
              <p className="text-sm text-neutral-500 font-light">
                © 2026 {systemName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

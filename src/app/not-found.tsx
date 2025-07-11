'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useReactiveSystemName } from '@/components/ui/reactive-system-name'
import { ArrowLeft, Home, Search, Users, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  const systemName = useReactiveSystemName()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        <Card className="text-center bg-white shadow-xl border-0">
          <CardContent className="pt-12 pb-12">
            {/* 404 Icon */}
            <div className="mx-auto h-24 w-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mb-8 shadow-lg">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>

            {/* 404 Number */}
            <div className="mb-6">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-apercu-bold text-gray-900 mb-2">
                404
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-orange-600 mx-auto rounded-full"></div>
            </div>

            {/* Error Message */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-apercu-bold text-gray-900 mb-4">
              Page Not Found
            </h2>
            
            <p className="text-sm sm:text-base font-apercu-regular text-gray-600 mb-8 leading-relaxed px-4">
              Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you may have entered an incorrect URL.
            </p>

            {/* Helpful Links */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-apercu-bold text-gray-900 mb-4 text-sm">
                What would you like to do?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <Link 
                  href="/" 
                  className="flex items-center justify-center p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group"
                >
                  <Home className="h-4 w-4 text-indigo-600 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="font-apercu-medium text-gray-700 group-hover:text-indigo-600">Go Home</span>
                </Link>
                
                <Link 
                  href="/register" 
                  className="flex items-center justify-center p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200 group"
                >
                  <Users className="h-4 w-4 text-green-600 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="font-apercu-medium text-gray-700 group-hover:text-green-600">Register</span>
                </Link>
                

                
                <button 
                  onClick={() => window.history.back()}
                  className="flex items-center justify-center p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 group"
                >
                  <ArrowLeft className="h-4 w-4 text-purple-600 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="font-apercu-medium text-gray-700 group-hover:text-purple-600">Go Back</span>
                </button>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-apercu-medium shadow-lg hover:shadow-xl transition-all duration-200">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Return to {systemName}
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 font-apercu-medium transition-all duration-200">
                <Link href="/register">
                  <Users className="w-4 h-4 mr-2" />
                  Register Now
                </Link>
              </Button>
            </div>

            {/* Footer Text */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs font-apercu-regular text-gray-500">
                If you believe this is an error, please contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

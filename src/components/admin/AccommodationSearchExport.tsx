'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

import { useToast } from '@/contexts/ToastContext'
import { parseApiError } from '@/lib/error-messages'
import {
  Search,
  Download,
  FileText,
  Users,
  Home,
  Eye,
  Loader2,
  Filter,
  X
} from 'lucide-react'
import { calculateAge } from '@/lib/age-calculator'
import { capitalizeName } from '@/lib/utils'

interface SearchResult {
  id: string
  fullName: string
  gender: string
  dateOfBirth: string
  phoneNumber: string
  emailAddress: string
  roomAllocation?: {
    id: string
    room: {
      id: string
      name: string
      gender: string
      capacity: number
    }
  }
}

interface AccommodationSearchExportProps {
  onPersonSelectAction?: (registrationId: string) => void
  refreshTrigger?: number
  canExport?: boolean
  canViewPersonDetails?: boolean
  isViewerOnly?: boolean
}

export function AccommodationSearchExport({
  onPersonSelectAction,
  refreshTrigger,
  canExport = true,
  canViewPersonDetails = true,
  isViewerOnly = false
}: AccommodationSearchExportProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [filterType] = useState<'all' | 'allocated' | 'unallocated'>('all') // Always search all
  const [showResults, setShowResults] = useState(false)

  const { success, error } = useToast()

  const showToast = (title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    }
  }

  const searchRegistrants = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    try {
      setLoading(true)

      const params = new URLSearchParams({
        search: searchQuery.trim(),
        filter: filterType
      })

      const response = await fetch(`/api/admin/accommodations/search?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to search registrants')
      }

      const data = await response.json()
      setSearchResults(data.results || [])
      setShowResults(true)
    } catch (error) {
      console.error('Error searching registrants:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchRegistrants()
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(format)

      const params = new URLSearchParams({
        format,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        filter: filterType
      })

      const response = await fetch(`/api/admin/accommodations/export?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to export ${format.toUpperCase()}`)
      }

      if (format === 'pdf') {
        // For PDF, the server returns HTML content that opens in a new window for printing
        const htmlContent = await response.text()
        const printWindow = window.open('', '_blank', 'width=800,height=600')

        if (printWindow) {
          printWindow.document.write(htmlContent)
          printWindow.document.close()
          showToast('PDF Export Successful - PDF report opened in a new window. Use your browser\'s print function to save as PDF.', 'success')
        } else {
          // Fallback: download as HTML file
          const blob = new Blob([htmlContent], { type: 'text/html' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = url
          a.download = `accommodation-report-${new Date().toISOString().split('T')[0]}.html`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          showToast('PDF export downloaded as HTML file. Open in browser and print to save as PDF.', 'success')
        }
      } else {
        // For CSV, download the file directly
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `accommodation-report-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast(`${format.toUpperCase()} exported successfully`, 'success')
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage.description, 'error')
    } finally {
      setExporting(null)
    }
  }

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Refresh search results when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && showResults) {
      searchRegistrants()
    }
  }, [refreshTrigger])

  // Real-time search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchRegistrants()
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }, 300) // Debounce search by 300ms

    return () => clearTimeout(timeoutId)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Search Section - Match platoon page filter container */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="space-y-4">
          {/* Search Input - Same width as platoon page */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by name, email, phone number..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Real-time search info */}
          {!searchQuery && (
            <div className="text-sm text-gray-500 font-apercu-regular">
              Start typing to search participants
            </div>
          )}

          {/* Export Buttons */}
          {canExport && !isViewerOnly && (
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('csv')}
              disabled={!!exporting}
              className="font-apercu-medium w-full sm:w-auto"
            >
              {exporting === 'csv' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('pdf')}
              disabled={!!exporting}
              className="font-apercu-medium w-full sm:w-auto"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Export PDF
            </Button>
            </div>
          )}
        </div>

        {/* Search Results - List View like Platoon Page */}
        {showResults && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-apercu-bold text-base text-gray-900">
              Search Results ({searchResults.length})
            </h3>
            {searchQuery && (
              <Badge variant="outline" className="font-apercu-medium w-fit text-xs">
                "{searchQuery}"
              </Badge>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="font-apercu-medium text-gray-500">No participants found</p>
              <p className="font-apercu-regular text-sm text-gray-400">
                Try adjusting your search terms
              </p>
            </div>
          ) : (
            <div>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
                {searchResults.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      person.gender === 'Male'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : 'bg-gradient-to-r from-pink-500 to-pink-600'
                    }`}>
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-apercu-medium text-sm text-gray-900 truncate">
                          {capitalizeName(person.fullName)}
                        </span>
                        <Badge className={`${person.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'} border-0 text-xs`}>
                          {person.gender}
                        </Badge>
                        <span className="font-apercu-regular text-xs text-gray-500">
                          {calculateAge(person.dateOfBirth)} yrs
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {person.roomAllocation ? (
                          <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                            🏠 {person.roomAllocation.room.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Unallocated
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {canViewPersonDetails && onPersonSelectAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPersonSelectAction(person.id)}
                      className="font-apercu-medium flex-shrink-0"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  )
}

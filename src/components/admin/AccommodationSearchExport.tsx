'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
  const [filterType, setFilterType] = useState<'all' | 'allocated' | 'unallocated'>('all')
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

  return (
    <div className="space-y-6 bg-white">
      {/* Search and Filter Section */}
      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search by name, email, phone number..."
              className="pl-10 pr-10 font-apercu-regular"
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

          {/* Filter and Search Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="font-apercu-medium flex-1 sm:flex-none"
              >
                <Users className="h-4 w-4 mr-1 hidden sm:inline" />
                All
              </Button>
              <Button
                variant={filterType === 'allocated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('allocated')}
                className="font-apercu-medium flex-1 sm:flex-none"
              >
                <Home className="h-4 w-4 mr-1 hidden sm:inline" />
                Allocated
              </Button>
              <Button
                variant={filterType === 'unallocated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('unallocated')}
                className="font-apercu-medium flex-1 sm:flex-none"
              >
                <Filter className="h-4 w-4 mr-1 hidden sm:inline" />
                Unallocated
              </Button>
            </div>

            {/* Search Button */}
            {!isViewerOnly && (
              <Button
                onClick={searchRegistrants}
                disabled={loading}
                className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            )}
          </div>

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
      </Card>

      {/* Search Results */}
      {showResults && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="font-apercu-bold text-lg text-gray-900">
              Search Results ({searchResults.length})
            </h3>
            {searchQuery && (
              <Badge variant="outline" className="font-apercu-medium w-fit">
                "{searchQuery}" • {filterType}
              </Badge>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="font-apercu-medium text-gray-500">No registrants found</p>
              <p className="font-apercu-regular text-sm text-gray-400">
                Try adjusting your search terms or filters
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.map((person) => (
                <div
                  key={person.id}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-apercu-bold text-sm text-gray-900 truncate">{capitalizeName(person.fullName)}</h4>
                        <div className="flex items-center space-x-2 mt-1 flex-wrap">
                          <Badge className={`${person.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'} border-0 text-xs`}>
                            {person.gender}
                          </Badge>
                          <span className="font-apercu-regular text-xs text-gray-500">
                            {calculateAge(person.dateOfBirth)} years old
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mb-2">
                      <p className="font-apercu-regular text-xs text-gray-600 truncate">
                        📧 {person.emailAddress}
                      </p>
                      <p className="font-apercu-regular text-xs text-gray-600">
                        📞 {person.phoneNumber}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      {person.roomAllocation ? (
                        <Badge className="bg-green-50 text-green-700 border-0 text-xs">
                          🏠 {person.roomAllocation.room.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Unallocated
                        </Badge>
                      )}
                    </div>
                  </div>

                  {canViewPersonDetails && onPersonSelectAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPersonSelectAction(person.id)}
                      className="font-apercu-medium w-full sm:w-auto flex-shrink-0"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

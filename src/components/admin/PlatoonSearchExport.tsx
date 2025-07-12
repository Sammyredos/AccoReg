'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Download, X } from 'lucide-react'

interface PlatoonSearchExportProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterStatus: 'all' | 'active' | 'inactive' | 'full' | 'available'
  onFilterChange: (value: 'all' | 'active' | 'inactive' | 'full' | 'available') => void
  onExport?: () => void
  totalResults: number
  loading?: boolean
}

export function PlatoonSearchExport({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange,
  onExport,
  totalResults,
  loading = false
}: PlatoonSearchExportProps) {
  const hasActiveFilters = searchTerm || filterStatus !== 'all'

  const clearFilters = () => {
    onSearchChange('')
    onFilterChange('all')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search platoons..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 font-apercu-regular"
            disabled={loading}
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={filterStatus} onValueChange={onFilterChange} disabled={loading}>
            <SelectTrigger className="w-40 font-apercu-regular">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platoons</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="available">Available</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="font-apercu-regular"
            disabled={loading}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Count and Export */}
      <div className="flex items-center gap-4">
        {/* Results Count */}
        <span className="text-sm text-gray-600 font-apercu-regular">
          {loading ? 'Loading...' : `${totalResults} platoon${totalResults !== 1 ? 's' : ''}`}
        </span>

        {/* Export Button */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="font-apercu-medium"
            disabled={loading || totalResults === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>
    </div>
  )
}

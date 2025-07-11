'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
  className?: string
  theme?: 'blue' | 'pink' | 'default'
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
  theme = 'default'
}: PaginationControlsProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getThemeStyles = () => {
    switch (theme) {
      case 'blue':
        return {
          activeButton: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
          inactiveButton: 'hover:bg-blue-50 border-blue-200 text-blue-700'
        }
      case 'pink':
        return {
          activeButton: 'bg-pink-600 hover:bg-pink-700 text-white border-pink-600',
          inactiveButton: 'hover:bg-pink-50 border-pink-200 text-pink-700'
        }
      default:
        return {
          activeButton: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600',
          inactiveButton: 'hover:bg-gray-50 border-gray-200 text-gray-700'
        }
    }
  }

  const themeStyles = getThemeStyles()

  const getVisiblePages = () => {
    // Show fewer pages on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const delta = isMobile ? 1 : 2
    const range: number[] = []
    const rangeWithDots: (number | string)[] = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  if (totalPages <= 1) {
    return (
      <div className={`flex items-center justify-center text-sm text-gray-500 ${className}`}>
        <span className="font-apercu-regular">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      {/* Items info */}
      <div className="text-xs sm:text-sm text-gray-500 font-apercu-regular order-2 sm:order-1">
        Showing {startItem} to {endItem} of {totalItems} items
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1 order-1 sm:order-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="font-apercu-medium px-2 sm:px-3"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-1 sm:px-2 py-1 text-gray-400 font-apercu-regular text-sm">...</span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className={`font-apercu-medium min-w-[2rem] sm:min-w-[2.5rem] px-2 sm:px-3 text-sm ${
                    currentPage === page
                      ? themeStyles.activeButton
                      : themeStyles.inactiveButton
                  }`}
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="font-apercu-medium px-2 sm:px-3"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  )
}

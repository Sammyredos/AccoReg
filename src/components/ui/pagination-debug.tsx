'use client'

import { useEffect } from 'react'

interface PaginationDebugProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  currentItems: number
  searchTerm?: string
  filterRole?: string
}

export function PaginationDebug({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  currentItems,
  searchTerm,
  filterRole
}: PaginationDebugProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Pagination Debug')
      console.log('Current Page:', currentPage)
      console.log('Total Pages:', totalPages)
      console.log('Total Items:', totalItems)
      console.log('Items Per Page:', itemsPerPage)
      console.log('Current Items:', currentItems)
      console.log('Search Term:', searchTerm || 'None')
      console.log('Filter Role:', filterRole || 'None')
      console.log('Expected Start Index:', (currentPage - 1) * itemsPerPage + 1)
      console.log('Expected End Index:', Math.min(currentPage * itemsPerPage, totalItems))
      
      // Validation checks
      if (currentPage > totalPages && totalPages > 0) {
        console.warn('⚠️ Current page exceeds total pages!')
      }
      
      if (currentItems > itemsPerPage) {
        console.warn('⚠️ Current items exceed items per page!')
      }
      
      if (totalPages !== Math.ceil(totalItems / itemsPerPage) && totalItems > 0) {
        console.warn('⚠️ Total pages calculation mismatch!')
        console.log('Expected Total Pages:', Math.ceil(totalItems / itemsPerPage))
      }
      
      console.groupEnd()
    }
  }, [currentPage, totalPages, totalItems, itemsPerPage, currentItems, searchTerm, filterRole])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">🔍 Pagination Debug</div>
      <div>Page: {currentPage}/{totalPages}</div>
      <div>Items: {currentItems}/{totalItems}</div>
      <div>Per Page: {itemsPerPage}</div>
      {searchTerm && <div>Search: "{searchTerm}"</div>}
      {filterRole && <div>Filter: {filterRole}</div>}
      
      {/* Warnings */}
      {currentPage > totalPages && totalPages > 0 && (
        <div className="text-red-400 mt-1">⚠️ Page overflow!</div>
      )}
      {currentItems > itemsPerPage && (
        <div className="text-red-400 mt-1">⚠️ Items overflow!</div>
      )}
    </div>
  )
}

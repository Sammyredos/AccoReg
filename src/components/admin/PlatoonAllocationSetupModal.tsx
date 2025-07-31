'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/contexts/ToastContext'
import { parseApiError } from '@/lib/error-messages'
import { X, Users } from 'lucide-react'

interface PlatoonAllocation {
  id: string
  name: string
  leaderName: string
  label: string
  leaderPhone: string
  capacity: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  participants?: any[]
  occupancy?: number
  occupancyRate?: number
}

interface PlatoonAllocationSetupModalProps {
  isOpen: boolean
  onCloseAction: () => void
  onSaveAction: () => void
  platoon?: PlatoonAllocation | null
}

export function PlatoonAllocationSetupModal({
  isOpen,
  onCloseAction,
  onSaveAction,
  platoon
}: PlatoonAllocationSetupModalProps) {
  const { success, error } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Safe toast function with better error handling
  const safeShowToast = (message: string, type: 'success' | 'error') => {
    try {
      if (type === 'success') {
        success(message)
      } else if (type === 'error') {
        error(message)
      }
    } catch (error) {
      console.error('Error showing toast:', error, message)
    }
  }
  const [formData, setFormData] = useState({
    name: '',
    leaderName: '',
    leaderPhone: '',
    capacity: 30
  })

  useEffect(() => {
    if (platoon) {
      setFormData({
        name: platoon.name,
        leaderName: platoon.leaderName,
        leaderPhone: platoon.leaderPhone,
        capacity: platoon.capacity
      })
    } else {
      setFormData({
        name: '',
        leaderName: '',
        leaderPhone: '',
        capacity: 30
      })
    }
  }, [platoon, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation with toaster feedback
    if (!formData.name.trim()) {
      safeShowToast('Please enter a platoon name', 'error')
      return
    }
    if (!formData.leaderName.trim()) {
      safeShowToast('Please enter the leader name', 'error')
      return
    }

    if (!formData.leaderPhone.trim()) {
      safeShowToast('Please enter the leader phone number', 'error')
      return
    }
    if (formData.capacity < 1 || formData.capacity > 200) {
      safeShowToast('Platoon capacity must be between 1 and 200', 'error')
      return
    }

    setIsLoading(true)

    try {
      const url = platoon
        ? `/api/admin/platoon-allocations/${platoon.id}`
        : '/api/admin/platoon-allocations'

      const method = platoon ? 'PUT' : 'POST'

      // Ensure capacity is a number
      const requestData = {
        ...formData,
        capacity: parseInt(formData.capacity.toString())
      }

      console.log('🚀 Sending platoon data:', requestData)

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMsg = responseData.message || responseData.error || 'Failed to save platoon'

        // Check if it's a duplicate name error and show it in the form
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          if (errorMsg.toLowerCase().includes('name')) {
            setErrors(prev => ({ ...prev, name: 'A platoon with this name already exists. Please choose a different name.' }))
          }
        }

        throw new Error(errorMsg)
      }

      // Trigger refresh first
      onSaveAction()

      // Close modal immediately
      onCloseAction()

      // Show success notification after modal closes to ensure it's visible
      const successMessage = platoon
        ? `Platoon "${formData.name}" updated successfully`
        : `Platoon "${formData.name}" created successfully`

      setTimeout(() => {
        safeShowToast(successMessage, 'success')
      }, 100)
    } catch (error) {
      console.error('Error saving platoon:', error)
      const errorMessage = parseApiError(error)
      safeShowToast(errorMessage.description, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-6 border-b border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-apercu-bold text-lg text-white">
                  {platoon ? 'Edit Platoon' : 'Create New Platoon'}
                </h2>
                <p className="font-apercu-regular text-sm text-indigo-100">
                  {platoon ? 'Update platoon details and settings' : 'Set up a new platoon for participant allocation'}
                </p>
              </div>
            </div>
            <Button
              onClick={onCloseAction}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <Label htmlFor="name" className="font-apercu-medium text-sm text-gray-700">
              Platoon Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                // Clear name error when user starts typing
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: '' }))
                }
              }}
              placeholder="e.g., Alpha Platoon"
              required
              className={`mt-1 ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600 font-apercu-medium mt-1">{errors.name}</p>
            )}
          </div>



          <div>
            <Label htmlFor="leaderName" className="font-apercu-medium text-sm text-gray-700">
              Leader Name *
            </Label>
            <Input
              id="leaderName"
              type="text"
              value={formData.leaderName}
              onChange={(e) => setFormData(prev => ({ ...prev, leaderName: e.target.value }))}
              placeholder="e.g., John Smith"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="leaderPhone" className="font-apercu-medium text-sm text-gray-700">
              Leader Phone *
            </Label>
            <Input
              id="leaderPhone"
              type="tel"
              value={formData.leaderPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, leaderPhone: e.target.value }))}
              placeholder="e.g., +1234567890"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="capacity" className="font-apercu-medium text-sm text-gray-700">
              Capacity *
            </Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              min="1"
              max="100"
              required
              className="mt-1"
            />
          </div>



          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onCloseAction}
              variant="outline"
              className="flex-1 font-apercu-medium"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 font-apercu-medium bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : platoon ? 'Update Platoon' : 'Create Platoon'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/contexts/ToastContext'
import { parseApiError } from '@/lib/error-messages'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Users } from 'lucide-react'

interface PlatoonAllocation {
  id: string
  name: string
  leaderName: string
  label: string
  leaderPhone: string
  capacity: number
  occupancy: number
  occupancyRate: number
}

interface PlatoonAllocationSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onError?: (error: string) => void
  platoon?: PlatoonAllocation | null
}

export function PlatoonAllocationSetupModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onError, 
  platoon 
}: PlatoonAllocationSetupModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    leaderName: '',
    label: '',
    leaderPhone: '',
    capacity: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { success, error } = useToast()

  const showToast = (title: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (type === 'success') {
      success(title)
    } else if (type === 'error') {
      error(title)
    }
  }

  const isEditing = !!platoon

  // Reset form when modal opens/closes or platoon changes
  useEffect(() => {
    if (isOpen) {
      if (platoon) {
        // Editing existing platoon
        setFormData({
          name: platoon.name,
          leaderName: platoon.leaderName,
          label: platoon.label,
          leaderPhone: platoon.leaderPhone,
          capacity: platoon.capacity.toString()
        })
      } else {
        // Creating new platoon
        setFormData({
          name: '',
          leaderName: '',
          label: '',
          leaderPhone: '',
          capacity: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, platoon])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Platoon name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Platoon name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Platoon name must be less than 50 characters'
    }

    if (!formData.leaderName.trim()) {
      newErrors.leaderName = 'Leader name is required'
    } else if (formData.leaderName.trim().length < 2) {
      newErrors.leaderName = 'Leader name must be at least 2 characters'
    } else if (formData.leaderName.trim().length > 50) {
      newErrors.leaderName = 'Leader name must be less than 50 characters'
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Platoon label is required'
    } else if (formData.label.trim().length < 1) {
      newErrors.label = 'Platoon label must be at least 1 character'
    } else if (formData.label.trim().length > 20) {
      newErrors.label = 'Platoon label must be less than 20 characters'
    }

    if (!formData.leaderPhone.trim()) {
      newErrors.leaderPhone = 'Leader phone number is required'
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.leaderPhone.trim())) {
      newErrors.leaderPhone = 'Please enter a valid phone number'
    }

    const capacity = parseInt(formData.capacity)
    if (!formData.capacity) {
      newErrors.capacity = 'Capacity is required'
    } else if (isNaN(capacity) || capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1'
    } else if (capacity > 200) {
      newErrors.capacity = 'Capacity cannot exceed 200'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const url = isEditing ? `/api/admin/platoon-allocations/${platoon.id}` : '/api/admin/platoon-allocations'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          leaderName: formData.leaderName.trim(),
          label: formData.label.trim(),
          leaderPhone: formData.leaderPhone.trim(),
          capacity: parseInt(formData.capacity)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} platoon`)
      }

      showToast(
        `Platoon ${isEditing ? 'updated' : 'created'} successfully!`,
        'success'
      )

      onSave()
    } catch (error) {
      console.error('Error saving platoon:', error)
      const errorMessage = parseApiError(error)
      showToast(errorMessage, 'error')
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl mx-4 sm:mx-0">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-apercu-bold text-lg">
                {isEditing ? 'Edit Platoon' : 'Create New Platoon'}
              </DialogTitle>
              <DialogDescription className="font-apercu-regular">
                {isEditing ? 'Update platoon details and settings' : 'Set up a new platoon for participant allocation'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Platoon Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-apercu-medium">
                Platoon Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Alpha Platoon"
                className={`font-apercu-regular ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-red-500 text-xs font-apercu-regular">{errors.name}</p>
              )}
            </div>

            {/* Platoon Label */}
            <div className="space-y-2">
              <Label htmlFor="label" className="font-apercu-medium">
                Platoon Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                type="text"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., A1, B2, Charlie"
                className={`font-apercu-regular ${errors.label ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.label && (
                <p className="text-red-500 text-xs font-apercu-regular">{errors.label}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Leader Name */}
            <div className="space-y-2">
              <Label htmlFor="leaderName" className="font-apercu-medium">
                Platoon Leader Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="leaderName"
                type="text"
                value={formData.leaderName}
                onChange={(e) => setFormData(prev => ({ ...prev, leaderName: e.target.value }))}
                placeholder="e.g., John Smith"
                className={`font-apercu-regular ${errors.leaderName ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.leaderName && (
                <p className="text-red-500 text-xs font-apercu-regular">{errors.leaderName}</p>
              )}
            </div>

            {/* Leader Phone */}
            <div className="space-y-2">
              <Label htmlFor="leaderPhone" className="font-apercu-medium">
                Leader Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="leaderPhone"
                type="tel"
                value={formData.leaderPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, leaderPhone: e.target.value }))}
                placeholder="e.g., +1234567890"
                className={`font-apercu-regular ${errors.leaderPhone ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={loading}
              />
              {errors.leaderPhone && (
                <p className="text-red-500 text-xs font-apercu-regular">{errors.leaderPhone}</p>
              )}
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity" className="font-apercu-medium">
              Capacity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="200"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
              placeholder="Maximum number of participants"
              className={`font-apercu-regular ${errors.capacity ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.capacity && (
              <p className="text-red-500 text-xs font-apercu-regular">{errors.capacity}</p>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="font-apercu-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-apercu-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Platoon' : 'Create Platoon'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

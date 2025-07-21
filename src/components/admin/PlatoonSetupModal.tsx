'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Users } from 'lucide-react'

interface Platoon {
  id: string
  name: string
  gender: string
  capacity: number
  isActive: boolean
  description?: string
}

interface PlatoonSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onError?: (error: string) => void
  platoon?: Platoon | null
  defaultGender?: 'Male' | 'Female' | null
}

export function PlatoonSetupModal({ isOpen, onClose, onSave, onError, platoon, defaultGender }: PlatoonSetupModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    capacity: '',
    description: '',
    isActive: true
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
          gender: platoon.gender,
          capacity: platoon.capacity.toString(),
          description: platoon.description || '',
          isActive: platoon.isActive
        })
      } else {
        // Creating new platoon
        setFormData({
          name: '',
          gender: defaultGender || '',
          capacity: '',
          description: '',
          isActive: true
        })
      }
      setErrors({})
    }
  }, [isOpen, platoon, defaultGender])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Platoon name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Platoon name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Platoon name must be less than 50 characters'
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required'
    }

    const capacity = parseInt(formData.capacity)
    if (!formData.capacity) {
      newErrors.capacity = 'Capacity is required'
    } else if (isNaN(capacity) || capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1'
    } else if (capacity > 100) {
      newErrors.capacity = 'Capacity cannot exceed 100'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
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
      const url = isEditing ? `/api/admin/accommodations/rooms/${platoon.id}` : '/api/admin/accommodations/rooms'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          gender: formData.gender,
          capacity: parseInt(formData.capacity),
          description: formData.description.trim() || null,
          isActive: formData.isActive
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
                {isEditing ? 'Update platoon details and settings' : 'Set up a new platoon for participant assignment'}
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

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender" className="font-apercu-medium">
                Gender <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                disabled={loading}
              >
                <SelectTrigger className={`font-apercu-regular ${errors.gender ? 'border-red-500 focus:border-red-500' : ''}`}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male" className="font-apercu-regular">Male</SelectItem>
                  <SelectItem value="Female" className="font-apercu-regular">Female</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-red-500 text-xs font-apercu-regular">{errors.gender}</p>
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
              max="100"
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="font-apercu-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for this platoon..."
              className={`font-apercu-regular min-h-[80px] resize-none ${errors.description ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.description && (
              <p className="text-red-500 text-xs font-apercu-regular">{errors.description}</p>
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

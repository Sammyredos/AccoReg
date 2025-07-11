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
import { Loader2, Home } from 'lucide-react'

interface Room {
  id: string
  name: string
  gender: string
  capacity: number
  isActive: boolean
  description?: string
}

interface RoomSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onError?: (error: string) => void
  room?: Room | null
  defaultGender?: 'Male' | 'Female' | null
}

export function RoomSetupModal({ isOpen, onClose, onSave, onError, room, defaultGender }: RoomSetupModalProps) {
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
  const isEditing = !!room

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        gender: room.gender,
        capacity: room.capacity.toString(),
        description: room.description || '',
        isActive: room.isActive
      })
    } else {
      setFormData({
        name: '',
        gender: defaultGender || '',
        capacity: '',
        description: '',
        isActive: true
      })
    }
    setErrors({})
  }, [room, defaultGender, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required'
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required'
    }

    if (!formData.capacity.trim()) {
      newErrors.capacity = 'Capacity is required'
    } else {
      const capacity = parseInt(formData.capacity)
      if (isNaN(capacity) || capacity < 1) {
        newErrors.capacity = 'Capacity must be a positive number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      const requestData = {
        name: formData.name.trim(),
        gender: formData.gender,
        capacity: parseInt(formData.capacity),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive
      }

      const url = isEditing ? `/api/admin/rooms/${room.id}` : '/api/admin/rooms'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.error || `Failed to ${isEditing ? 'update' : 'create'} room`

        // Check if it's a duplicate name error and show it in the form
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          setErrors(prev => ({ ...prev, name: 'A room with this name already exists. Please choose a different name.' }))
        }

        throw new Error(errorMsg)
      }

      onSave()
    } catch (error) {
      console.error('Error saving room:', error)
      const errorMessage = parseApiError(error)

      // Pass error to parent component if callback provided
      if (onError) {
        onError(errorMessage.description)
      } else {
        showToast(errorMessage.description, 'error')
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
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-apercu-bold text-lg">
                {isEditing ? 'Edit Room' : 'Create New Room'}
              </DialogTitle>
              <DialogDescription className="font-apercu-regular">
                {isEditing ? 'Update room details and settings' : 'Set up a new room for participant accommodation'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="font-apercu-medium text-sm text-gray-700">
              Room Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                // Clear name error when user starts typing
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: '' }))
                }
              }}
              placeholder="e.g., Room Shiloh, Room A1"
              className={`font-apercu-regular ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-red-600 font-apercu-medium">{errors.name}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender" className="font-apercu-medium text-sm text-gray-700">
              Gender *
            </Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
              disabled={loading}
            >
              <SelectTrigger className={`font-apercu-regular ${errors.gender ? 'border-red-300 focus:border-red-500' : ''}`}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male" className="font-apercu-regular">Male</SelectItem>
                <SelectItem value="Female" className="font-apercu-regular">Female</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-red-600 font-apercu-medium">{errors.gender}</p>
            )}
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity" className="font-apercu-medium text-sm text-gray-700">
              Capacity (Number of Persons) *
            </Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
              placeholder="e.g., 8"
              className={`font-apercu-regular ${errors.capacity ? 'border-red-300 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.capacity && (
              <p className="text-sm text-red-600 font-apercu-medium">{errors.capacity}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="font-apercu-medium text-sm text-gray-700">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional room details or notes..."
              className="font-apercu-regular resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Active Status */}
          {isEditing && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading}
              />
              <Label htmlFor="isActive" className="font-apercu-medium text-sm text-gray-700">
                Room is active and available for allocation
              </Label>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
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
              className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Room' : 'Create Room'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

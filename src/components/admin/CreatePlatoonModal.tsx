'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/contexts/ToastContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Users, Plus } from 'lucide-react'

interface CreatePlatoonModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreatePlatoonModal({ isOpen, onClose, onSuccess }: CreatePlatoonModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    leaderName: '',
    leaderPhone: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { success, error } = useToast()

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      leaderName: '',
      leaderPhone: ''
    })
    setErrors({})
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onClose()
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Platoon name is required'
    }

    if (!formData.leaderName.trim()) {
      newErrors.leaderName = 'Platoon leader name is required'
    }

    if (!formData.leaderPhone.trim()) {
      newErrors.leaderPhone = 'Leader phone number is required'
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.leaderPhone)) {
      newErrors.leaderPhone = 'Please enter a valid phone number'
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
        label: formData.label.trim() || undefined,
        leaderName: formData.leaderName.trim(),
        leaderPhone: formData.leaderPhone.trim()
      }

      const response = await fetch('/api/admin/platoons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (response.ok) {
        success('Platoon created successfully')
        resetForm()
        onSuccess()
        onClose()
      } else {
        error(data.error || 'Failed to create platoon')
      }
    } catch (err) {
      error('Failed to create platoon')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-apercu-bold text-lg">
                Create New Platoon
              </DialogTitle>
              <DialogDescription className="font-apercu-regular">
                Set up a new platoon with leader information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platoon Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="font-apercu-medium text-sm text-gray-700">
              Platoon Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: '' }))
                }
              }}
              placeholder="e.g., Alpha Platoon, Team Eagles"
              className={`font-apercu-regular ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-red-600 font-apercu-medium">{errors.name}</p>
            )}
          </div>

          {/* Platoon Label */}
          <div className="space-y-2">
            <Label htmlFor="label" className="font-apercu-medium text-sm text-gray-700">
              Platoon Label
            </Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="e.g., A1, Team-01 (optional)"
              className="font-apercu-regular"
              disabled={loading}
            />
          </div>

          {/* Leader Name */}
          <div className="space-y-2">
            <Label htmlFor="leaderName" className="font-apercu-medium text-sm text-gray-700">
              Platoon Leader Name *
            </Label>
            <Input
              id="leaderName"
              value={formData.leaderName}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, leaderName: e.target.value }))
                if (errors.leaderName) {
                  setErrors(prev => ({ ...prev, leaderName: '' }))
                }
              }}
              placeholder="Enter leader's full name"
              className={`font-apercu-regular ${errors.leaderName ? 'border-red-300 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.leaderName && (
              <p className="text-sm text-red-600 font-apercu-medium">{errors.leaderName}</p>
            )}
          </div>

          {/* Leader Phone */}
          <div className="space-y-2">
            <Label htmlFor="leaderPhone" className="font-apercu-medium text-sm text-gray-700">
              Leader Phone Number *
            </Label>
            <Input
              id="leaderPhone"
              value={formData.leaderPhone}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, leaderPhone: e.target.value }))
                if (errors.leaderPhone) {
                  setErrors(prev => ({ ...prev, leaderPhone: '' }))
                }
              }}
              placeholder="Enter leader's phone number"
              className={`font-apercu-regular ${errors.leaderPhone ? 'border-red-300 focus:border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.leaderPhone && (
              <p className="text-sm text-red-600 font-apercu-medium">{errors.leaderPhone}</p>
            )}
          </div>

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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Platoon
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/contexts/ToastContext'
import { Settings, Save, X } from 'lucide-react'

interface AccommodationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export function AccommodationSettingsModal({ isOpen, onClose, onSaved }: AccommodationSettingsModalProps) {
  const [ageGap, setAgeGap] = useState<string>('5')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchCurrentSettings()
    }
  }, [isOpen])

  const fetchCurrentSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/accommodations/age-gap-config')
      
      if (response.ok) {
        const data = await response.json()
        setAgeGap(data.ageGap.toString())
      } else {
        console.error('Failed to fetch settings')
        setAgeGap('5') // Default value
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setAgeGap('5') // Default value
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const ageGapValue = parseInt(ageGap)
    
    if (isNaN(ageGapValue) || ageGapValue < 1 || ageGapValue > 20) {
      error('Invalid Age Gap', 'Age gap must be between 1 and 20 years')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/accommodations/age-gap-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageGap: ageGapValue })
      })

      if (response.ok) {
        success('Settings Saved', 'Age gap configuration updated successfully')
        // Refresh the current value to show it was saved
        await fetchCurrentSettings()
        onSaved()
        // Don't close immediately - let user see the updated value
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        const errorData = await response.json()
        error('Save Failed', errorData.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      error('Network Error', 'Failed to connect to server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-apercu-bold text-xl flex items-center">
            <Settings className="h-5 w-5 mr-2 text-indigo-600" />
            Accommodation Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="ageGap" className="font-apercu-medium text-sm text-gray-700">
                  Maximum Age Gap in Rooms (Years) *
                </Label>
                <Input
                  id="ageGap"
                  type="number"
                  min="1"
                  max="20"
                  value={ageGap}
                  onChange={(e) => setAgeGap(e.target.value)}
                  placeholder="e.g., 5"
                  className="font-apercu-regular"
                  disabled={saving}
                />
                <p className="font-apercu-regular text-xs text-gray-500">
                  Maximum age difference allowed between the youngest and oldest person in the same room.
                  For example, with a 5-year gap, ages 17-22 can be in the same room, but 17 and 23 cannot.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-apercu-bold text-sm text-blue-900 mb-1">
                      How Age Validation Works
                    </h4>
                    <ul className="font-apercu-regular text-xs text-blue-800 space-y-1">
                      <li>• Prevents inappropriate age mixing in rooms</li>
                      <li>• Applies to both manual and automatic allocation</li>
                      <li>• Existing allocations are not affected by changes</li>
                      <li>• Recommended: 3-5 years for youth programs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="font-apercu-medium"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="font-apercu-medium"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

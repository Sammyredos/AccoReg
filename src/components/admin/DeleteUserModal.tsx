'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

interface User {
  id: string
  name: string
  email: string
  role?: {
    name: string
  }
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

interface DeleteUserModalProps {
  isOpen: boolean
  onCloseAction: () => void
  onUserDeletedAction: (deletedUserId: string) => void
  user: User | null
}

/**
 * DeleteUserModal - Client component for user deletion confirmation
 *
 * Note: TypeScript warnings about function props are false positives.
 * Function props are valid and necessary for client components that need
 * to communicate with their parent components.
 */
export function DeleteUserModal({
  isOpen,
  onCloseAction,
  onUserDeletedAction,
  user
}: DeleteUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { success } = useToast()

  if (!isOpen || !user) return null

  const handleDelete = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        // If user is already deleted (404), treat it as success
        if (response.status === 404 && data.error === 'User not found') {
          success(`User ${user.name} has already been deleted`)
          onUserDeletedAction(user.id) // Remove from UI anyway
          return
        }
        throw new Error(data.error || 'Failed to delete user')
      }

      success(`User ${user.name} has been deleted successfully`)
      onUserDeletedAction(user.id) // Pass the deleted user ID
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError('')
      onCloseAction()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-lg text-gray-900">Delete User</h3>
              <p className="font-apercu-regular text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <span className="font-apercu-regular text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center mr-3">
                <span className="font-apercu-bold text-sm text-white">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-apercu-bold text-sm text-gray-900">{user.name}</h4>
                <p className="font-apercu-regular text-xs text-gray-600">{user.email}</p>
                <div className="mt-1">
                  <Badge variant={user.role?.name === 'Super Admin' ? 'destructive' : 'secondary'}>
                    {user.role?.name || 'Viewer'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-apercu-bold text-sm text-yellow-900 mb-1">Warning</h4>
                <p className="font-apercu-regular text-sm text-yellow-800">
                  Are you sure you want to delete this user? This will permanently remove their account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="font-apercu-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="font-apercu-medium bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <AlertCircle className="text-white h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
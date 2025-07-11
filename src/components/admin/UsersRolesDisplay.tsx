'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserDirectorySkeleton } from '@/components/ui/skeleton'
import { capitalizeName } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import {
  Users,
  Shield,
  Mail,
  Phone,
  Calendar,
  X,
  Eye,
  UserCheck,
  Crown,
  Settings,
  Briefcase,
  User
} from 'lucide-react'

interface UserRole {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: Array<{
    id: string
    name: string
    description: string
  }>
}

interface SystemUser {
  id: string
  email: string
  name: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  type: 'admin' | 'user'
  role: UserRole
}

interface UsersRolesDisplayProps {
  isOpen: boolean
  onClose: () => void
}

export function UsersRolesDisplay({ isOpen, onClose }: UsersRolesDisplayProps) {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')
  const { error } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch users
      const usersResponse = await fetch('/api/admin/users')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      // Fetch roles
      const rolesResponse = await fetch('/api/admin/roles')
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData.roles || [])
      }
    } catch (err) {
      error('Failed to Load Data', 'Unable to fetch users and roles information.')
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin': return Crown
      case 'Admin': return Shield
      case 'Manager': return Briefcase
      case 'Staff': return UserCheck
      case 'Viewer': return Eye
      default: return User
    }
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'Manager': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Staff': return 'bg-green-100 text-green-800 border-green-200'
      case 'Viewer': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-apercu-bold text-xl text-white">System Users & Roles</h3>
                <p className="font-apercu-regular text-indigo-100 text-sm">
                  View all users and their role permissions
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-apercu-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`py-4 px-1 border-b-2 font-apercu-medium text-sm ${
                activeTab === 'roles'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Roles ({roles.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <UserDirectorySkeleton />
          ) : (
            <>
              {activeTab === 'users' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user) => {
                    const RoleIcon = getRoleIcon(user.role?.name || '')
                    return (
                      <Card key={user.id} className="p-4 bg-white">
                        <div className="flex items-start space-x-3">
                          <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-apercu-bold text-sm">
                              {capitalizeName(user.name).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-apercu-bold text-sm text-gray-900 truncate">
                                {user.name}
                              </h4>
                              {!user.isActive && (
                                <Badge variant="destructive" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                            <p className="font-apercu-regular text-xs text-gray-600 truncate mb-2">
                              {user.email}
                            </p>
                            <div className="flex items-center space-x-1 mb-2">
                              <RoleIcon className="h-3 w-3 text-gray-400" />
                              <Badge className={`text-xs font-apercu-medium ${getRoleBadgeColor(user.role?.name || '')}`}>
                                {user.role?.name || 'No Role'}
                              </Badge>
                            </div>
                            <p className="font-apercu-regular text-xs text-gray-500">
                              Last login: {formatDate(user.lastLogin)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}

              {activeTab === 'roles' && (
                <div className="space-y-4">
                  {roles.map((role) => {
                    const RoleIcon = getRoleIcon(role.name)
                    const userCount = users.filter(u => u.role?.id === role.id).length
                    return (
                      <Card key={role.id} className="p-6 bg-white">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                              role.name === 'Super Admin' ? 'bg-purple-100' :
                              role.name === 'Admin' ? 'bg-red-100' :
                              role.name === 'Manager' ? 'bg-blue-100' :
                              role.name === 'Staff' ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <RoleIcon className={`h-6 w-6 ${
                                role.name === 'Super Admin' ? 'text-purple-600' :
                                role.name === 'Admin' ? 'text-red-600' :
                                role.name === 'Manager' ? 'text-blue-600' :
                                role.name === 'Staff' ? 'text-green-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-apercu-bold text-lg text-gray-900">{role.name}</h3>
                              <p className="font-apercu-regular text-sm text-gray-600">{role.description}</p>
                              <p className="font-apercu-regular text-xs text-gray-500 mt-1">
                                {userCount} user{userCount !== 1 ? 's' : ''} • {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          {role.isSystem && (
                            <Badge variant="secondary" className="text-xs">System Role</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {role.permissions.map((permission) => (
                            <div key={permission.id} className="bg-gray-50 rounded px-2 py-1">
                              <p className="font-apercu-medium text-xs text-gray-700">{permission.name}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

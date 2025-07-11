'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { capitalizeName } from '@/lib/utils'
import { UserDirectorySkeleton } from '@/components/ui/skeleton'
import { useUser } from '@/contexts/UserContext'
import { Input } from '@/components/ui/input'
import {
  Users,
  Search,
  MessageSquare,
  X,
  Send,
  User,
  Shield,
  Eye,
  Settings,
  Crown
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: {
    name: string
  }
  isActive: boolean
  type: 'admin' | 'user'
}

interface UserDirectoryProps {
  isOpen: boolean
  onClose: () => void
  onSendMessage: (user: User) => void
}

export function UserDirectory({ isOpen, onClose, onSendMessage }: UserDirectoryProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const { currentUser } = useUser()

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/directory')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin':
        return <Crown className="h-4 w-4 text-purple-600" />
      case 'Admin':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'Manager':
        return <Settings className="h-4 w-4 text-green-600" />
      case 'Staff':
        return <User className="h-4 w-4 text-orange-600" />
      case 'Viewer':
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Manager':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Staff':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role.name === selectedRole
    const isNotCurrentUser = user.id !== currentUser?.id // Exclude current user
    return matchesSearch && matchesRole && user.isActive && isNotCurrentUser
  })

  const roles = ['all', ...Array.from(new Set(users.map(user => user.role.name)))]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-apercu-bold text-lg sm:text-xl text-white truncate">User Directory</h3>
                <p className="font-apercu-regular text-indigo-100 text-xs sm:text-sm truncate">
                  View all users and send direct messages
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0 flex-shrink-0 ml-2"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 font-apercu-regular text-sm h-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded-md font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white h-9"
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role === 'all' ? 'All Roles' : role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[50vh] sm:max-h-96">
          {loading ? (
            <UserDirectorySkeleton />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="font-apercu-medium text-gray-600">No users found</p>
              <p className="font-apercu-regular text-sm text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredUsers.map(user => (
                <Card key={user.id} className="p-3 sm:p-4 hover:shadow-md transition-shadow border border-gray-200 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="font-apercu-bold text-white text-sm">
                          {capitalizeName(user.name).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                          <h4 className="font-apercu-bold text-sm sm:text-base text-gray-900 truncate">
                            {capitalizeName(user.name)}
                          </h4>
                          <Badge className={`font-apercu-medium text-xs flex-shrink-0 w-fit mt-1 sm:mt-0 ${getRoleBadgeColor(user.role.name)}`}>
                            <div className="flex items-center space-x-1">
                              {getRoleIcon(user.role.name)}
                              <span className="hidden xs:inline">{user.role.name}</span>
                              <span className="xs:hidden">{user.role.name.split(' ')[0]}</span>
                            </div>
                          </Badge>
                        </div>
                        <p className="font-apercu-regular text-xs sm:text-sm text-gray-600 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onSendMessage(user)}
                      className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700 flex-shrink-0 h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                      <span className="hidden sm:inline text-white ml-1">Message</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
            <p className="font-apercu-regular text-xs sm:text-sm text-gray-600 text-center xs:text-left">
              Showing <span className="font-apercu-medium">{filteredUsers.length}</span> of <span className="font-apercu-medium">{users.filter(u => u.isActive).length}</span> active users
            </p>
            <Button
              variant="outline"
              onClick={onClose}
              className="font-apercu-medium w-full xs:w-auto h-9"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

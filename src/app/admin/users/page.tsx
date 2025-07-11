'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminLayoutNew } from '@/components/admin/AdminLayoutNew'
import { CreateUserModal } from '@/components/admin/CreateUserModal'
import { EditUserModal } from '@/components/admin/EditUserModalNew'
import { DeleteUserModal } from '@/components/admin/DeleteUserModal'
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal'
import { SimpleMessaging } from '@/components/admin/SimpleMessaging'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/statistics'

import { StatsCard, StatsGrid } from '@/components/ui/stats-card'
import { useTranslation } from '@/contexts/LanguageContext'
import { capitalizeName } from '@/lib/utils'
import { clearStatisticsCache } from '@/lib/statistics'

import { EnhancedBadge, getRoleBadgeVariant, getStatusBadgeVariant } from '@/components/ui/enhanced-badge'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/contexts/ToastContext'
import { ErrorModal } from '@/components/ui/error-modal'


import { useUser } from '@/contexts/UserContext'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Eye,
  UserCheck,
  UserX,
  Crown,
  Settings,
  Search,
  Filter,
  Key,
  MessageSquare
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  role: {
    id: string
    name: string
    description: string
    isSystem: boolean
  }
}

interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean
}

export default function UsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Pagination state (10 items per page as required)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalActiveUsers, setTotalActiveUsers] = useState(0)
  const ITEMS_PER_PAGE = 10

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    type: 'error' | 'warning' | 'info' | 'success'
    title: string
    description: string
    details?: string
    errorCode?: string
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    description: ''
  })

  const { error } = useToast()
  const { currentUser } = useUser()

  // Track recently deleted user IDs to prevent them from reappearing
  const [recentlyDeletedIds, setRecentlyDeletedIds] = useState<Set<string>>(new Set())

  // Fetch user statistics for accurate counts
  const fetchUserStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users/directory')
      if (response.ok) {
        const data = await response.json()
        setTotalUsers(data.stats?.total || 0)
        setTotalActiveUsers(data.stats?.total || 0) // All users in directory are active
      }
    } catch (error) {
      console.error('Failed to fetch user statistics:', error)
    }
  }, [])

  const fetchUsers = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Calculate offset for pagination
      const offset = (page - 1) * ITEMS_PER_PAGE

      // Build query parameters for pagination, search, and filtering
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: offset.toString()
      })

      // Add search and filter parameters if they exist
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (filterRole) params.append('roleId', filterRole)

      console.log(`Fetching users - Page: ${page}, Offset: ${offset}, Search: "${debouncedSearchTerm}", Role: "${filterRole}"`)

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache', // Disable cache for better pagination
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', {
          usersCount: data.users?.length,
          total: data.total,
          pagination: data.pagination
        })

        // Filter out recently deleted users to prevent them from reappearing
        const filteredUsers = (data.users || []).filter((user: User) => !recentlyDeletedIds.has(user.id))
        setUsers(filteredUsers)
        setTotalUsers(data.pagination?.total || data.total || 0)

        // Update current page if it's different from what we requested
        if (page !== currentPage) {
          setCurrentPage(page)
        }
      } else {
        const errorData = await response.json()
        setErrorModal({
          isOpen: true,
          type: 'error',
          title: 'Failed to Load Users',
          description: 'Unable to fetch user data from the server. This could be due to insufficient permissions or a server issue.',
          details: `Error: ${errorData.error || 'Unknown error'}\nStatus: ${response.status}\nTime: ${new Date().toISOString()}`,
          errorCode: `FETCH_USERS_${response.status}`
        })
      }
    } catch (fetchError) {
      console.error('Error fetching users:', fetchError)
      error('Network Error', 'Unable to connect to the server. Please check your internet connection and try again.', {
        duration: 8000,
        action: {
          label: 'Retry',
          onClick: () => fetchUsers(page)
        }
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedSearchTerm, filterRole, recentlyDeletedIds, error]) // Add error to dependencies

  const fetchRoles = useCallback(async () => {
    try {
      setRolesLoading(true)
      const response = await fetch('/api/admin/roles')
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      } else {
        const errorData = await response.json()
        setErrorModal({
          isOpen: true,
          type: 'error',
          title: 'Failed to Load Roles',
          description: 'Unable to fetch role data from the server. This could affect user management functionality.',
          details: `Error: ${errorData.error || 'Unknown error'}\nStatus: ${response.status}\nTime: ${new Date().toISOString()}`,
          errorCode: `FETCH_ROLES_${response.status}`
        })
      }
    } catch {
      error('Network Error Loading Roles', 'Unable to load user roles. Some functionality may be limited.', {
        duration: 6000,
        action: {
          label: 'Retry',
          onClick: () => fetchRoles()
        }
      })
    } finally {
      setRolesLoading(false)
    }
  }, []) // Remove error dependency to prevent re-renders

  // Add state to track initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Debounce search term (reduced to 200ms for more real-time feel)
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true)
    }

    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setIsSearching(false)
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, debouncedSearchTerm])

  // Single useEffect for initial data fetch only
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchUsers(1), fetchRoles(), fetchUserStats()])
      setInitialLoadComplete(true)
    }
    loadInitialData()
  }, []) // No dependencies to prevent re-renders

  // Reset to page 1 when search or filter changes - debounced
  useEffect(() => {
    if (initialLoadComplete) {
      console.log('Search/filter changed, resetting to page 1')
      setCurrentPage(1)
      fetchUsers(1) // Fetch with page 1
    }
  }, [debouncedSearchTerm, filterRole, initialLoadComplete])

  // Fetch users when page changes (only after initial load)
  useEffect(() => {
    if (initialLoadComplete && currentPage >= 1) {
      console.log(`Page changed to ${currentPage}, fetching users`)
      fetchUsers(currentPage)
    }
  }, [currentPage, initialLoadComplete])

  // Pagination handlers
  const handlePageChange = (page: number) => {
    console.log(`Changing page from ${currentPage} to ${page}`)
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin':
        return <Crown className="h-3 w-3" />
      case 'Admin':
        return <Shield className="h-3 w-3" />
      case 'Manager':
        return <Settings className="h-3 w-3" />
      case 'Staff':
        return <UserCheck className="h-3 w-3" />
      default:
        return <Eye className="h-3 w-3" />
    }
  }

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatLastLogin = (lastLogin: string | null): string => {
    if (!lastLogin) return 'Never'

    const date = new Date(lastLogin)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return formatDate(lastLogin)
  }

  // CRUD handlers
  const handleCreateUser = () => {
    setShowCreateModal(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (user: User) => {
    // Check if user still exists in the current user list
    const userExists = users.find(u => u.id === user.id)
    if (!userExists) {
      return // User no longer exists, skip opening delete modal
    }

    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const handleUserCreated = () => {
    fetchUsers(currentPage, true)
  }

  const handleUserUpdated = () => {
    fetchUsers(currentPage, true)
  }

  const handleUserDeleted = async (deletedUserId: string) => {
    // Add to recently deleted IDs to prevent reappearing
    setRecentlyDeletedIds(prev => new Set(prev).add(deletedUserId))

    // Immediately remove the user from the UI
    setUsers(prevUsers => prevUsers.filter(user => user.id !== deletedUserId))

    // Update stats immediately for real-time feedback
    setTotalUsers(prev => Math.max(0, prev - 1))
    setTotalActiveUsers(prev => Math.max(0, prev - 1))

    // Clear the selected user to prevent any stale references
    setSelectedUser(null)

    // Close the delete modal immediately
    setShowDeleteModal(false)

    // Clear global stats cache and refresh stats from server to ensure accuracy
    clearStatisticsCache()
    fetchUserStats()

    // Remove from recently deleted after 10 seconds to allow for re-adding if needed
    setTimeout(() => {
      setRecentlyDeletedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(deletedUserId)
        return newSet
      })
    }, 10000)
  }

  const handleChangePassword = (user: User) => {
    setSelectedUser(user)
    setShowChangePasswordModal(true)
  }

  const handlePasswordChanged = () => {
    fetchUsers(currentPage, true)
  }

  const handleSendMessage = (user: User) => {
    setSelectedUser(user)
    setShowMessageModal(true)
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setShowChangePasswordModal(false)
    setShowMessageModal(false)
    setSelectedUser(null)
  }

  // Filter out current user from the displayed users (server handles search/role filtering)
  const filteredUsers = users.filter(user => user.id !== currentUser?.id)

  // Show skeleton loader only on initial load, not on subsequent updates
  if ((loading || rolesLoading) && !initialLoadComplete) {
    return (
      <AdminLayoutNew title={t('page.users.title')} description={t('page.users.description')}>
        <div className="space-y-6">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-lg animate-pulse flex-shrink-0 ml-3" />
                </div>
              </Card>
            ))}
          </div>

          {/* Search and Filters Skeleton */}
          <Card className="p-4 sm:p-6 mb-6 bg-white">
            <div className="space-y-4">
              <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="h-10 flex-1 sm:max-w-xs bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </Card>

          {/* Users List Skeleton */}
          <Card className="p-4 sm:p-6 bg-white">
            <div className="mb-4 sm:mb-6">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['User', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map((_, i) => (
                      <th key={i} className="text-left py-3 px-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                          <div className="space-y-1">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-18 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end space-x-2">
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Skeleton */}
            <div className="lg:hidden space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
                      <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="flex space-x-2">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </Card>
        </div>
      </AdminLayoutNew>
    )
  }

  // Check permissions - Allow Super Admin, Admin, Manager, and Staff roles
  const allowedRoles = ['Super Admin', 'Admin', 'Manager', 'Staff']
  if (currentUser && !allowedRoles.includes(currentUser.role?.name || '')) {
    return (
      <AdminLayoutNew title={t('page.users.title')} description={t('page.users.description')}>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
        </div>
      </AdminLayoutNew>
    )
  }

  return (
    <AdminLayoutNew title={t('page.users.title')} description={t('page.users.description')}>
      {/* Stats Cards */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Users"
          value={totalUsers}
          subtitle="All system accounts"
          icon={Users}
          gradient="bg-gradient-to-r from-blue-500 to-cyan-600"
          bgGradient="bg-gradient-to-br from-white to-blue-50"
        />

        <StatsCard
          title="Active Users"
          value={totalActiveUsers}
          subtitle="Currently active accounts"
          icon={UserCheck}
          gradient="bg-gradient-to-r from-green-500 to-emerald-600"
          bgGradient="bg-gradient-to-br from-white to-green-50"
        />

        <StatsCard
          title="Roles"
          value={roles.length}
          subtitle="Total permission roles"
          icon={Shield}
          gradient="bg-gradient-to-r from-purple-500 to-pink-600"
          bgGradient="bg-gradient-to-br from-white to-purple-50"
        />

        <StatsCard
          title="System Roles"
          value={roles.filter(r => r.isSystem).length}
          subtitle="Built-in protected roles"
          icon={Crown}
          gradient="bg-gradient-to-r from-indigo-500 to-purple-600"
          bgGradient="bg-gradient-to-br from-white to-indigo-50"
        />
      </StatsGrid>

      {/* Filters and Search */}
      <Card className="p-4 sm:p-6 my-6 bg-white">
        <div className="space-y-4">
          {/* Filters and Actions Row */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            {/* Left side: Role Filter and Add User Button */}
            <div className="flex flex-col sm:flex-row gap-3 lg:flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                >
                  <option value="">All Roles</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleCreateUser}
                className="font-apercu-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 h-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline text-white">Add New User</span>
                <span className="xs:hidden text-white">Add User</span>
              </Button>
            </div>

            {/* Right side: Search Bar (wider and positioned to the right) */}
            <div className="relative lg:w-96 w-full">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                isSearching ? 'text-indigo-500 animate-pulse' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg font-apercu-regular focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all duration-200 hover:border-indigo-300 ${
                  isSearching ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-300'
                }`}
              />
              {isSearching && (
                <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              {searchTerm && !isSearching && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center text-lg leading-none"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
              <p className="font-apercu-regular text-sm text-gray-600">
                {searchTerm ? (
                  <>
                    Found <span className="font-apercu-medium text-indigo-600">{formatNumber(totalUsers)}</span> users matching &quot;<span className="font-apercu-medium text-indigo-600">{searchTerm}</span>&quot;
                    {totalUsers > 0 && (
                      <span className="ml-2">• Showing {startIndex}-{endIndex}</span>
                    )}
                  </>
                ) : (
                  <>
                    Showing <span className="font-apercu-medium">{startIndex}-{endIndex}</span> of <span className="font-apercu-medium">{formatNumber(totalUsers)}</span> users
                  </>
                )}
                {totalPages > 1 && (
                  <span className="ml-2">• Page {currentPage} of {totalPages}</span>
                )}
              </p>
              {(searchTerm || filterRole) && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {searchTerm && (
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full font-apercu-medium flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      Searching: &quot;{searchTerm}&quot;
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-1 hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        title="Clear search"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filterRole && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full font-apercu-medium flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Role: {roles.find(r => r.id === filterRole)?.name}
                      <button
                        onClick={() => setFilterRole('')}
                        className="ml-1 hover:bg-purple-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        title="Clear filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-4 sm:p-6 bg-white">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-apercu-bold  text-lg sm:text-xl text-gray-900 mb-1">System Users</h3>
              <p className="font-apercu-regular text-sm text-gray-600">Manage admin users and their permissions</p>
            </div>
            {refreshing && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-4 h-4 bg-blue-200 rounded animate-pulse"></div>
                <span className="font-apercu-regular">Refreshing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-apercu-medium text-sm text-gray-600">User</th>
                <th className="text-left py-3 px-4 font-apercu-medium text-sm text-gray-600">Role</th>
                <th className="text-left py-3 px-4 font-apercu-medium text-sm text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-apercu-medium text-sm text-gray-600">Last Login</th>
                <th className="text-left py-3 px-4 font-apercu-medium text-sm text-gray-600">Created</th>
                <th className="text-right py-3 px-4 font-apercu-medium text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-apercu-bold text-sm">
                          {getInitials(capitalizeName(user.name))}
                        </span>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-apercu-medium text-sm text-gray-900 truncate">{capitalizeName(user.name)}</p>
                        <p className="font-apercu-regular text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <EnhancedBadge
                      variant={getRoleBadgeVariant(user.role.name, user.role.isSystem)}
                      className="font-apercu-medium"
                      icon={getRoleIcon(user.role.name)}
                    >
                      {user.role.name}
                    </EnhancedBadge>
                  </td>
                  <td className="py-4 px-4">
                    <EnhancedBadge
                      variant={getStatusBadgeVariant(user.isActive ? 'active' : 'inactive')}
                      className="font-apercu-medium"
                      icon={user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </EnhancedBadge>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-apercu-regular text-sm text-gray-600">
                      {formatLastLogin(user.lastLogin)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-apercu-regular text-sm text-gray-600">
                      {formatDate(user.createdAt)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-apercu-medium"
                        onClick={() => handleEditUser(user)}
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-apercu-medium text-blue-600 hover:text-blue-700 hover:border-blue-300"
                        onClick={() => handleSendMessage(user)}
                        title="Send Message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-apercu-medium text-orange-600 hover:text-orange-700 hover:border-orange-300"
                        onClick={() => handleChangePassword(user)}
                        title="Change Password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-apercu-medium text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tablet View */}
        <div className="hidden md:block lg:hidden">
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-apercu-bold text-sm">
                        {getInitials(user.name)}
                      </span>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <p className="font-apercu-bold text-base text-gray-900 truncate">{user.name}</p>
                        <EnhancedBadge
                          variant={getRoleBadgeVariant(user.role.name, user.role.isSystem)}
                          className="font-apercu-medium text-xs flex-shrink-0"
                          icon={getRoleIcon(user.role.name)}
                        >
                          {user.role.name}
                        </EnhancedBadge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="truncate">{user.email}</span>
                        <EnhancedBadge
                          variant={getStatusBadgeVariant(user.isActive ? 'active' : 'inactive')}
                          className="font-apercu-medium text-xs flex-shrink-0"
                          icon={user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </EnhancedBadge>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>Last login: {formatLastLogin(user.lastLogin)}</span>
                        <span>Created: {formatDate(user.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-apercu-medium"
                      onClick={() => handleEditUser(user)}
                      title="Edit User"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-apercu-medium text-blue-600 hover:text-blue-700 hover:border-blue-300"
                      onClick={() => handleSendMessage(user)}
                      title="Send Message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-apercu-medium text-orange-600 hover:text-orange-700 hover:border-orange-300"
                      onClick={() => handleChangePassword(user)}
                      title="Change Password"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-apercu-medium text-red-600 hover:text-red-700 hover:border-red-300 "
                      onClick={() => handleDeleteUser(user)}
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-4 border border-gray-200 hover:border-gray-300 transition-colors">
              {/* User Header */}
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-apercu-bold text-sm">
                    {getInitials(capitalizeName(user.name))}
                  </span>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-apercu-bold text-base text-gray-900 truncate">{capitalizeName(user.name)}</p>
                  <p className="font-apercu-regular text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="font-apercu-medium text-sm text-gray-600">Role</span>
                  <EnhancedBadge
                    variant={getRoleBadgeVariant(user.role.name, user.role.isSystem)}
                    className="font-apercu-medium text-xs"
                    icon={getRoleIcon(user.role.name)}
                  >
                    {user.role.name}
                  </EnhancedBadge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-apercu-medium text-sm text-gray-600">Status</span>
                  <EnhancedBadge
                    variant={getStatusBadgeVariant(user.isActive ? 'active' : 'inactive')}
                    className="font-apercu-medium text-xs"
                    icon={user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </EnhancedBadge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-apercu-medium text-sm text-gray-600">Last Login</span>
                  <span className="font-apercu-regular text-sm text-gray-900">{formatLastLogin(user.lastLogin)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-apercu-medium text-sm text-gray-600">Created</span>
                  <span className="font-apercu-regular text-sm text-gray-900">{formatDate(user.createdAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-100 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-apercu-medium text-xs h-8"
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-apercu-medium text-xs h-8 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                    onClick={() => handleSendMessage(user)}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-apercu-medium text-xs h-8 text-orange-600 hover:text-orange-700 hover:border-orange-300"
                    onClick={() => handleChangePassword(user)}
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-apercu-medium text-xs h-8 text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => handleDeleteUser(user)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="font-apercu-medium text-gray-500">
              {totalUsers === 0 ? 'No users found' : 'No users match your search'}
            </p>
            <p className="font-apercu-regular text-sm text-gray-400">
              {totalUsers === 0
                ? 'Create your first user to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {totalUsers === 0 && (
              <Button onClick={handleCreateUser} className="mt-4 font-apercu-medium">
                <Plus className="h-4 w-4 mr-2" />
                Create First User
              </Button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600 font-apercu-regular">
              Showing {startIndex}-{endIndex} of {totalUsers} users
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-2 text-xs text-blue-600">
                  (Page {currentPage}/{totalPages})
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="font-apercu-medium"
              >
                Previous
              </Button>

              {(() => {
                const pages: number[] = []
                const maxVisiblePages = 5
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1)
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i)
                }

                return pages.map(page => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="font-apercu-medium min-w-[40px]"
                  >
                    {page}
                  </Button>
                ))
              })()}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="font-apercu-medium"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onUserCreated={handleUserCreated}
        roles={roles}
      />

      <EditUserModal
        isOpen={showEditModal}
        onClose={closeModals}
        onUserUpdated={handleUserUpdated}
        user={selectedUser}
        roles={roles}
      />

      <DeleteUserModal
        isOpen={showDeleteModal}
        onCloseAction={closeModals}
        onUserDeletedAction={handleUserDeleted}
        user={selectedUser}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={closeModals}
        onPasswordChanged={handlePasswordChanged}
        user={selectedUser}
      />

      <SimpleMessaging
        isOpen={showMessageModal}
        onClose={closeModals}
        recipient={selectedUser ? {
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role,
          type: 'admin' as const
        } : null}
        hideSubject={true}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        type={errorModal.type}
        title={errorModal.title}
        description={errorModal.description}
        details={errorModal.details}
        errorCode={errorModal.errorCode}
        showRetry={errorModal.type === 'error'}
        onRetry={() => {
          setErrorModal(prev => ({ ...prev, isOpen: false }))
          fetchUsers(currentPage)
          fetchRoles()
        }}
        showContactSupport={errorModal.type === 'error'}
      />


      </AdminLayoutNew>
  )
}

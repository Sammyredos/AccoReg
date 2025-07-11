'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'
import {
  Shield,
  Users,
  Eye,
  Edit,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Info
} from 'lucide-react'

interface Permission {
  id: string
  name: string
  description?: string
  resource?: string
  action?: string
}

interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: Permission[]
}

export function RolesPermissionsManager() {
  const { currentUser } = useUser()
  const { success, error } = useToast()
  
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [showEditRole, setShowEditRole] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, role: Role | null}>({show: false, role: null})
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [editRoleName, setEditRoleName] = useState('')
  const [editRoleDescription, setEditRoleDescription] = useState('')
  const [editSelectedPermissions, setEditSelectedPermissions] = useState<string[]>([])

  useEffect(() => {
    loadRolesAndPermissions()
  }, [])

  const loadRolesAndPermissions = async () => {
    try {
      setLoading(true)
      
      // Load roles
      const rolesResponse = await fetch('/api/admin/roles')
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData.roles || [])
      }

      // Load permissions
      const permissionsResponse = await fetch('/api/admin/permissions')
      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json()
        setPermissions(permissionsData.permissions || [])
      }
    } catch (err) {
      console.error('Failed to load roles and permissions:', err)
      error('Failed to Load Data', 'Unable to load roles and permissions.')
    } finally {
      setLoading(false)
    }
  }

  const createRole = async () => {
    if (!newRoleName.trim()) {
      error('Invalid Input', 'Please enter a role name.')
      return
    }

    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription,
          permissionIds: selectedPermissions
        })
      })

      if (response.ok) {
        success('Role Created', 'New role has been created successfully.')
        setShowCreateRole(false)
        setNewRoleName('')
        setNewRoleDescription('')
        setSelectedPermissions([])
        loadRolesAndPermissions()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create role')
      }
    } catch (err) {
      error('Creation Failed', err instanceof Error ? err.message : 'Failed to create role.')
    }
  }

  const editRole = async () => {
    if (!editingRole || !editRoleName.trim()) {
      error('Invalid Input', 'Please enter a role name.')
      return
    }

    try {
      const response = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRoleName,
          description: editRoleDescription,
          permissionIds: editSelectedPermissions
        })
      })

      if (response.ok) {
        success('Role Updated', 'Role has been updated successfully.')
        setShowEditRole(false)
        setEditingRole(null)
        setEditRoleName('')
        setEditRoleDescription('')
        setEditSelectedPermissions([])
        loadRolesAndPermissions()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update role')
      }
    } catch (err) {
      error('Update Failed', err instanceof Error ? err.message : 'Failed to update role.')
    }
  }

  const deleteRole = async (roleId: string, _roleName: string) => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        success('Role Deleted', 'Role has been deleted successfully.')
        setShowDeleteConfirm({show: false, role: null})
        loadRolesAndPermissions()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete role')
      }
    } catch (err) {
      error('Deletion Failed', err instanceof Error ? err.message : 'Failed to delete role.')
      setShowDeleteConfirm({show: false, role: null})
    }
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setEditRoleName(role.name)
    setEditRoleDescription(role.description)
    setEditSelectedPermissions(role.permissions.map(p => p.id))
    setShowEditRole(true)
  }

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) {
      error('Cannot Delete System Role', 'System roles cannot be deleted as they are essential for the application to function properly.')
      return
    }
    setShowDeleteConfirm({show: true, role})
  }

  const canManageRoles = currentUser?.role?.name === 'Super Admin'
  const canEditRoles = ['Super Admin', 'Admin'].includes(currentUser?.role?.name || '')
  const canViewRoles = ['Super Admin', 'Admin'].includes(currentUser?.role?.name || '')

  if (!canViewRoles) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-apercu-bold text-lg text-gray-900 mb-2">Access Restricted</h3>
          <p className="font-apercu-regular text-sm text-gray-600 mb-4">
            Only Admin and Super Admin users can view roles and permissions.
          </p>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="font-apercu-medium text-xs text-yellow-800">
              Your current role: <strong>{currentUser?.role?.name || 'Unknown'}</strong>
            </p>
            <p className="font-apercu-regular text-xs text-yellow-700 mt-1">
              Contact your administrator if you need access to this section.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Permission Notice for Admin Users */}
      {currentUser?.role?.name === 'Admin' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h4 className="font-apercu-bold text-sm text-blue-900">Admin Access Notice</h4>
          </div>
          <p className="font-apercu-regular text-xs text-blue-700 mt-2">
            As an Admin, you can view all roles and permissions but cannot create or delete roles.
            Only Super Admin users can manage system roles.
          </p>
        </div>
      )}

      {/* Current User Role */}
      <Card className="p-4 sm:p-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0 ">
          <div className="flex items-center">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">Your Current Role</h3>
              <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">Your role and permissions</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-apercu-bold text-base text-indigo-900">
              {currentUser?.role?.name || 'Unknown Role'}
            </h4>
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
              {(currentUser?.role as any)?.isSystem ? 'System Role' : 'Custom Role'}
            </Badge>
          </div>
          <p className="font-apercu-regular text-sm text-indigo-700 mb-4">
            {(currentUser?.role as any)?.description || 'No description available'}
          </p>

          {/* Permission Summary */}
          <div className="flex items-center justify-between p-3 bg-white border border-indigo-200 rounded-lg">
            <div>
              <p className="font-apercu-bold text-sm text-gray-900">Your Access Level</p>
              <p className="font-apercu-regular text-xs text-gray-600">
                {canManageRoles ? 'Full role management access' :
                 canEditRoles ? 'View roles and permissions' :
                 'Limited access'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-apercu-bold text-sm text-indigo-900">
                {currentUser?.role?.permissions?.length || 0} Permissions
              </p>
              <p className="font-apercu-regular text-xs text-indigo-700">
                {canManageRoles ? 'Can create/delete roles' :
                 canEditRoles ? 'Can view all roles' :
                 'View only'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {currentUser?.role?.permissions?.map((permission: Permission) => (
              <div key={permission.id} className="flex items-center space-x-2 text-xs sm:text-sm p-2 bg-white rounded border">
                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="font-apercu-medium text-green-800 truncate">{permission.name}</span>
              </div>
            )) || (
              <div className="col-span-full text-center py-4">
                <p className="font-apercu-regular text-xs sm:text-sm text-gray-500">No permissions loaded</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* All Roles */}
      <Card className="p-4 sm:p-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">System Roles</h3>
              <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">Manage all system roles</p>
            </div>
          </div>
          {canManageRoles && (
            <Button
              onClick={() => setShowCreateRole(true)}
              className="font-apercu-medium text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-white">Create Role</span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                      <h4 className="font-apercu-bold text-sm sm:text-base text-gray-900 truncate">{role.name}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge className={role.isSystem ? 'bg-blue-100 text-blue-800 text-xs' : 'bg-gray-100 text-gray-800 text-xs'}>
                          {role.isSystem ? 'System' : 'Custom'}
                        </Badge>
                        {role.isSystem && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                            Protected
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="font-apercu-regular text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{role.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.slice(0, 3).map((permission) => (
                        <Badge key={permission.id} className="bg-green-50 text-green-700 text-xs">
                          {permission.name}
                        </Badge>
                      ))}
                      {role.permissions?.length > 3 && (
                        <Badge className="bg-gray-50 text-gray-600 text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setEditingRole(role)} className="text-xs">
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    {canEditRoles && !role.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                        className="text-blue-600 hover:text-blue-700 text-xs"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                    )}
                    {canManageRoles && !role.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRole(role)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                    {role.isSystem && canEditRoles && (
                      <div className="text-xs text-gray-500 font-apercu-medium px-2 py-1 bg-gray-50 rounded">
                        Protected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Permissions Reference */}
      <Card className="p-4 sm:p-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="font-apercu-bold text-base sm:text-lg text-gray-900">Permissions Reference</h3>
              <p className="font-apercu-regular text-xs sm:text-sm text-gray-600">All available system permissions with descriptions</p>
            </div>
          </div>
          <div className="sm:ml-auto">
            <Badge className="bg-green-100 text-green-800 text-xs">
              {permissions.length} Total
            </Badge>
          </div>
        </div>

        {/* Permission Guide */}
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h4 className="font-apercu-bold text-sm text-blue-900">Permission Format Guide</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-apercu-bold text-blue-900">Permission Name:</span>
              <span className="font-apercu-regular text-blue-700">What you can do</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-apercu-medium bg-blue-100 text-blue-800 border border-blue-300">
                Resource
              </span>
              <span className="font-apercu-regular text-blue-700">What it affects</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-apercu-medium bg-purple-100 text-purple-800 border border-purple-300">
                Action
              </span>
              <span className="font-apercu-regular text-blue-700">Type of access</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {permissions.map((permission) => (
            <div key={permission.id} className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-gray-300">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-apercu-bold text-xs sm:text-sm text-gray-900 truncate flex-1">{permission.name}</h4>
                  <div className="flex items-center space-x-1 ml-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-apercu-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {permission.resource}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-apercu-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {permission.action}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <p className="font-apercu-regular text-xs text-gray-600 leading-relaxed">{permission.description}</p>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <span className="font-apercu-medium">{permission.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b flex-shrink-0">
              <h3 className="font-apercu-bold text-lg text-gray-900">Create New Role</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  rows={3}
                  placeholder="Enter role description"
                />
              </div>
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                  Permissions ({selectedPermissions.length} selected)
                </label>
                <div className="border border-gray-300 rounded-lg p-2 sm:p-3 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-1 sm:gap-2">
                    {permissions.map((permission) => (
                      <label key={permission.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, permission.id])
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id))
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs sm:text-sm font-apercu-bold text-gray-900">{permission.name}</span>
                            <div className="flex items-center space-x-1 mt-1 sm:mt-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-apercu-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {permission.resource}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-apercu-medium bg-purple-50 text-purple-700 border border-purple-200">
                                {permission.action}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 font-apercu-regular">{permission.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t flex justify-end space-x-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowCreateRole(false)}>
                Cancel
              </Button>
              <Button  onClick={createRole}>
                Create Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRole && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-apercu-bold text-lg text-gray-900">Edit Role</h3>
                <Badge className={editingRole.isSystem ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                  {editingRole.isSystem ? 'System Role' : 'Custom Role'}
                </Badge>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Role Name</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">Description</label>
                <textarea
                  value={editRoleDescription}
                  onChange={(e) => setEditRoleDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  rows={3}
                  placeholder="Enter role description"
                />
              </div>
              <div>
                <label className="block font-apercu-medium text-sm text-gray-700 mb-2">
                  Permissions ({editSelectedPermissions.length} selected)
                </label>
                <div className="border border-gray-300 rounded-lg p-2 sm:p-3 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-1 sm:gap-2">
                    {permissions.map((permission) => (
                      <label key={permission.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={editSelectedPermissions.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditSelectedPermissions([...editSelectedPermissions, permission.id])
                            } else {
                              setEditSelectedPermissions(editSelectedPermissions.filter(id => id !== permission.id))
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs sm:text-sm font-apercu-bold text-gray-900">{permission.name}</span>
                            <div className="flex items-center space-x-1 mt-1 sm:mt-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-apercu-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {permission.resource}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-apercu-medium bg-purple-50 text-purple-700 border border-purple-200">
                                {permission.action}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 font-apercu-regular">{permission.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t flex justify-end space-x-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowEditRole(false)}>
                Cancel
              </Button>
              <Button onClick={editRole}>
                Update Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Role Modal */}
      {editingRole && !showEditRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-apercu-bold text-lg text-gray-900">{editingRole.name}</h3>
                <Badge className={editingRole.isSystem ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                  {editingRole.isSystem ? 'System Role' : 'Custom Role'}
                </Badge>
              </div>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <p className="font-apercu-regular text-sm text-gray-600 mb-6">{editingRole.description}</p>
              <h4 className="font-apercu-bold text-base text-gray-900 mb-4">Permissions ({editingRole.permissions?.length || 0})</h4>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {editingRole.permissions?.map((permission) => (
                  <div key={permission.id} className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-2">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                        <span className="font-apercu-bold text-xs sm:text-sm text-green-800">{permission.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-apercu-medium bg-blue-100 text-blue-800 border border-blue-300">
                          {permission.resource}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-apercu-medium bg-purple-100 text-purple-800 border border-purple-300">
                          {permission.action}
                        </span>
                      </div>
                    </div>
                    <p className="font-apercu-regular text-xs text-green-700 mt-2">{permission.description}</p>
                  </div>
                )) || (
                  <div className="col-span-full text-center py-6 sm:py-8">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="font-apercu-regular text-sm text-gray-500">No permissions assigned</p>
                      <p className="font-apercu-regular text-xs text-gray-400 mt-1">This role has no specific permissions</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t flex justify-end flex-shrink-0">
              <Button variant="outline" onClick={() => setEditingRole(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm.show && showDeleteConfirm.role && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-apercu-bold text-lg text-gray-900">Delete Role</h3>
                  <p className="font-apercu-regular text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              <div className="mb-6">
                <p className="font-apercu-regular text-sm text-gray-700 mb-2">
                  Are you sure you want to delete the role <strong>"{showDeleteConfirm.role.name}"</strong>?
                </p>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-apercu-medium text-xs text-yellow-800">
                    Warning: This will permanently remove the role and may affect users assigned to it.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm({show: false, role: null})}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteRole(showDeleteConfirm.role!.id, showDeleteConfirm.role!.name)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Role
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

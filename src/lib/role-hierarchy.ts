// Role hierarchy definition - higher numbers mean higher authority
export const ROLE_HIERARCHY = {
  'Super Admin': 100,
  'Admin': 80,
  'Manager': 60,
  'Staff': 40,
  'Viewer': 20
} as const

export type RoleName = keyof typeof ROLE_HIERARCHY

/**
 * Get the hierarchy level of a role
 */
export function getRoleLevel(roleName: string): number {
  return ROLE_HIERARCHY[roleName as RoleName] || 0
}

/**
 * Check if role1 has higher authority than role2
 */
export function isRoleHigher(role1: string, role2: string): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2)
}

/**
 * Check if role1 has equal or higher authority than role2
 */
export function isRoleEqualOrHigher(role1: string, role2: string): boolean {
  return getRoleLevel(role1) >= getRoleLevel(role2)
}

/**
 * Get all roles that are below the given role in hierarchy
 */
export function getRolesBelowLevel(roleName: string): string[] {
  const currentLevel = getRoleLevel(roleName)
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < currentLevel)
    .map(([name, _]) => name)
    .sort((a, b) => getRoleLevel(b) - getRoleLevel(a)) // Sort by hierarchy descending
}

/**
 * Get all roles that are at or below the given role in hierarchy
 */
export function getRolesAtOrBelowLevel(roleName: string): string[] {
  const currentLevel = getRoleLevel(roleName)
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level <= currentLevel)
    .map(([name, _]) => name)
    .sort((a, b) => getRoleLevel(b) - getRoleLevel(a)) // Sort by hierarchy descending
}

/**
 * Check if a user can manage another user based on role hierarchy
 */
export function canManageUser(managerRole: string, targetUserRole: string): boolean {
  // Super Admin can manage everyone
  if (managerRole === 'Super Admin') {
    return true
  }

  // Admin can manage everyone except Super Admin
  if (managerRole === 'Admin') {
    return targetUserRole !== 'Super Admin'
  }

  // Manager can only manage roles below them
  if (managerRole === 'Manager') {
    return isRoleHigher(managerRole, targetUserRole)
  }

  // Staff can only manage Viewer role users
  if (managerRole === 'Staff') {
    return targetUserRole === 'Viewer'
  }

  // Other roles cannot manage users
  return false
}

/**
 * Check if a user can change password for another user
 */
export function canChangeUserPassword(managerRole: string, targetUserRole: string): boolean {
  return canManageUser(managerRole, targetUserRole)
}

/**
 * Get roles that a user can assign to others
 */
export function getAssignableRoles(userRole: string): string[] {
  // Super Admin can assign any role
  if (userRole === 'Super Admin') {
    return Object.keys(ROLE_HIERARCHY)
  }

  // Admin can assign any role except Super Admin
  if (userRole === 'Admin') {
    return Object.keys(ROLE_HIERARCHY).filter(role => role !== 'Super Admin')
  }

  // Manager can only assign roles below them
  if (userRole === 'Manager') {
    return getRolesBelowLevel(userRole)
  }

  // Staff can only assign Viewer role
  if (userRole === 'Staff') {
    return ['Viewer']
  }

  // Other roles cannot assign roles
  return []
}

/**
 * Filter users that a manager can see/manage
 */
export function filterManageableUsers<T extends { role?: { name: string } | null }>(
  users: T[],
  managerRole: string
): T[] {
  // Super Admin can see all users
  if (managerRole === 'Super Admin') {
    return users
  }

  // Admin can see all users except other Super Admins
  if (managerRole === 'Admin') {
    return users.filter(user => user.role?.name !== 'Super Admin')
  }

  // Manager can only see users with roles below them
  if (managerRole === 'Manager') {
    const manageableRoles = getRolesBelowLevel(managerRole)
    return users.filter(user =>
      user.role?.name && manageableRoles.includes(user.role.name)
    )
  }

  // Staff can only see Viewer users
  if (managerRole === 'Staff') {
    return users.filter(user => user.role?.name === 'Viewer')
  }

  // Other roles cannot see users
  return []
}

/**
 * Filter roles that a user can see/assign
 */
export function filterAssignableRoles<T extends { name: string }>(
  roles: T[],
  userRole: string
): T[] {
  const assignableRoleNames = getAssignableRoles(userRole)
  return roles.filter(role => assignableRoleNames.includes(role.name))
}

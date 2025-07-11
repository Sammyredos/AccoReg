// Color system for Youth Registration Admin Dashboard
// Optimized for light mode with proper contrast and accessibility

export const colors = {
  // Primary brand colors
  brand: {
    primary: '#4f46e5', // Indigo-600
    primaryHover: '#4338ca', // Indigo-700
    primaryLight: '#eef2ff', // Indigo-50
    secondary: '#6366f1', // Indigo-500
    accent: '#8b5cf6', // Violet-500
  },

  // Role-based colors (hierarchical and intuitive)
  roles: {
    superAdmin: {
      bg: '#faf5ff', // Purple-50
      text: '#7c3aed', // Purple-600
      border: '#e9d5ff', // Purple-200
      icon: '#8b5cf6', // Purple-500
    },
    admin: {
      bg: '#eef2ff', // Indigo-50
      text: '#4f46e5', // Indigo-600
      border: '#c7d2fe', // Indigo-200
      icon: '#6366f1', // Indigo-500
    },
    manager: {
      bg: '#eff6ff', // Blue-50
      text: '#2563eb', // Blue-600
      border: '#bfdbfe', // Blue-200
      icon: '#3b82f6', // Blue-500
    },
    staff: {
      bg: '#f0fdf4', // Green-50
      text: '#16a34a', // Green-600
      border: '#bbf7d0', // Green-200
      icon: '#22c55e', // Green-500
    },
    viewer: {
      bg: '#f9fafb', // Gray-50
      text: '#4b5563', // Gray-600
      border: '#e5e7eb', // Gray-200
      icon: '#6b7280', // Gray-500
    },
  },

  // Status colors (semantic and accessible)
  status: {
    success: {
      bg: '#f0fdf4', // Green-50
      text: '#16a34a', // Green-600
      border: '#bbf7d0', // Green-200
      icon: '#22c55e', // Green-500
    },
    warning: {
      bg: '#fffbeb', // Amber-50
      text: '#d97706', // Amber-600
      border: '#fed7aa', // Amber-200
      icon: '#f59e0b', // Amber-500
    },
    error: {
      bg: '#fef2f2', // Red-50
      text: '#dc2626', // Red-600
      border: '#fecaca', // Red-200
      icon: '#ef4444', // Red-500
    },
    info: {
      bg: '#eff6ff', // Blue-50
      text: '#2563eb', // Blue-600
      border: '#bfdbfe', // Blue-200
      icon: '#3b82f6', // Blue-500
    },
    neutral: {
      bg: '#f9fafb', // Gray-50
      text: '#4b5563', // Gray-600
      border: '#e5e7eb', // Gray-200
      icon: '#6b7280', // Gray-500
    },
  },

  // Priority levels
  priority: {
    high: {
      bg: '#fef2f2', // Red-50
      text: '#dc2626', // Red-600
      border: '#fecaca', // Red-200
    },
    medium: {
      bg: '#fffbeb', // Amber-50
      text: '#d97706', // Amber-600
      border: '#fed7aa', // Amber-200
    },
    low: {
      bg: '#f9fafb', // Gray-50
      text: '#4b5563', // Gray-600
      border: '#e5e7eb', // Gray-200
    },
  },

  // Button variants
  buttons: {
    primary: {
      bg: '#4f46e5', // Indigo-600
      hover: '#4338ca', // Indigo-700
      text: '#ffffff',
      border: '#4f46e5',
    },
    secondary: {
      bg: '#f3f4f6', // Gray-100
      hover: '#e5e7eb', // Gray-200
      text: '#374151', // Gray-700
      border: '#d1d5db', // Gray-300
    },
    outline: {
      bg: '#ffffff',
      hover: '#f9fafb', // Gray-50
      text: '#374151', // Gray-700
      border: '#d1d5db', // Gray-300
    },
    destructive: {
      bg: '#dc2626', // Red-600
      hover: '#b91c1c', // Red-700
      text: '#ffffff',
      border: '#dc2626',
    },
    success: {
      bg: '#16a34a', // Green-600
      hover: '#15803d', // Green-700
      text: '#ffffff',
      border: '#16a34a',
    },
  },

  // Text colors
  text: {
    primary: '#111827', // Gray-900
    secondary: '#374151', // Gray-700
    tertiary: '#6b7280', // Gray-500
    muted: '#9ca3af', // Gray-400
    white: '#ffffff',
    error: '#dc2626', // Red-600
    success: '#16a34a', // Green-600
    warning: '#d97706', // Amber-600
    info: '#2563eb', // Blue-600
  },

  // Background colors
  backgrounds: {
    primary: '#ffffff',
    secondary: '#f9fafb', // Gray-50
    tertiary: '#f3f4f6', // Gray-100
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Border colors
  borders: {
    light: '#f3f4f6', // Gray-100
    default: '#e5e7eb', // Gray-200
    medium: '#d1d5db', // Gray-300
    dark: '#9ca3af', // Gray-400
  },
}

// Helper functions for getting colors
export const getRoleColors = (roleName: string, isSystem: boolean = false) => {
  const roleKey = roleName.toLowerCase().replace(' ', '') as keyof typeof colors.roles
  
  if (isSystem && roleName === 'Super Admin') {
    return colors.roles.superAdmin
  }
  
  return colors.roles[roleKey] || colors.roles.viewer
}

export const getStatusColors = (status: 'success' | 'warning' | 'error' | 'info' | 'neutral') => {
  return colors.status[status]
}

export const getPriorityColors = (priority: 'high' | 'medium' | 'low') => {
  return colors.priority[priority]
}

// CSS class generators
export const getRoleBadgeClasses = (roleName: string, isSystem: boolean = false) => {
  const roleColors = getRoleColors(roleName, isSystem)
  return `bg-[${roleColors.bg}] text-[${roleColors.text}] border-[${roleColors.border}]`
}

export const getStatusBadgeClasses = (status: 'success' | 'warning' | 'error' | 'info' | 'neutral') => {
  const statusColors = getStatusColors(status)
  return `bg-[${statusColors.bg}] text-[${statusColors.text}] border-[${statusColors.border}]`
}

export const getPriorityBadgeClasses = (priority: 'high' | 'medium' | 'low') => {
  const priorityColors = getPriorityColors(priority)
  return `bg-[${priorityColors.bg}] text-[${priorityColors.text}] border-[${priorityColors.border}]`
}

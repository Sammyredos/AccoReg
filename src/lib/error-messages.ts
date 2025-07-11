export interface ErrorMessage {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  type: 'error' | 'warning' | 'info'
}

export const ERROR_MESSAGES = {
  // Permission Errors
  INSUFFICIENT_PERMISSIONS: {
    title: 'Access Denied',
    description: 'You do not have sufficient permissions to perform this action. Please contact your administrator if you believe this is an error.',
    type: 'error' as const
  },

  EMAIL_SEND_PERMISSION: {
    title: 'Email Send Permission Denied',
    description: 'Only Super Admins, Admins, and Managers can send emails to registrants. Staff users have view-only access to registration data.',
    type: 'error' as const
  },

  SETTINGS_ACCESS_DENIED: {
    title: 'Settings Access Denied',
    description: 'Only Super Admins and Admins can access system settings. This restriction helps maintain system security and configuration integrity.',
    type: 'error' as const
  },

  USER_MANAGEMENT_ACCESS_DENIED: {
    title: 'User Management Access Denied',
    description: 'You need Manager level permissions or higher to access user management features. Contact your administrator to request access.',
    type: 'error' as const
  },

  DOWNLOAD_PERMISSION_DENIED: {
    title: 'Download Permission Denied',
    description: 'Staff users can view reports and analytics but cannot download files. Only Managers and above can generate and download reports.',
    type: 'warning' as const
  },

  // Authentication Errors
  SESSION_EXPIRED: {
    title: 'Session Expired',
    description: 'Your session has expired for security reasons. Please log in again to continue using the system.',
    type: 'warning' as const
  },

  INVALID_CREDENTIALS: {
    title: 'Invalid Credentials',
    description: 'The email address or password you entered is incorrect. Please check your credentials and try again.',
    type: 'error' as const
  },

  ACCOUNT_INACTIVE: {
    title: 'Account Inactive',
    description: 'Your account has been deactivated. Please contact your administrator to reactivate your account.',
    type: 'error' as const
  },

  // System Errors
  NETWORK_ERROR: {
    title: 'Network Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection and try again. If the problem persists, contact support.',
    type: 'error' as const
  },

  SERVER_ERROR: {
    title: 'Server Error',
    description: 'An unexpected server error occurred. Our team has been notified. Please try again in a few moments.',
    type: 'error' as const
  },

  VALIDATION_ERROR: {
    title: 'Validation Error',
    description: 'Please check all required fields and ensure the information is entered correctly before submitting.',
    type: 'warning' as const
  },

  // Email Specific Errors
  EMAIL_CONFIGURATION_ERROR: {
    title: 'Email Configuration Error',
    description: 'The email system is not properly configured. Please contact your administrator to set up email notifications.',
    type: 'error' as const
  },

  EMAIL_SEND_FAILED: {
    title: 'Email Send Failed',
    description: 'The email could not be sent due to a technical issue. The system has logged this error for review. Please try again later.',
    type: 'error' as const
  },

  // Registration Errors
  DUPLICATE_REGISTRATION: {
    title: 'Duplicate Registration',
    description: 'A registration with this email address or phone number already exists. Please use different contact information.',
    type: 'warning' as const
  },

  REGISTRATION_NOT_FOUND: {
    title: 'Registration Not Found',
    description: 'The requested registration could not be found. It may have been deleted or the ID is incorrect.',
    type: 'error' as const
  },

  // User Management Errors
  USER_NOT_FOUND: {
    title: 'User Not Found',
    description: 'The requested user account could not be found. The user may have been deleted or the ID is incorrect.',
    type: 'error' as const
  },

  CANNOT_DELETE_SELF: {
    title: 'Cannot Delete Own Account',
    description: 'You cannot delete your own user account. Please ask another administrator to perform this action.',
    type: 'warning' as const
  },

  MAXIMUM_USERS_REACHED: {
    title: 'Maximum Users Reached',
    description: 'The system has reached the maximum number of allowed users. Please contact your administrator to increase the user limit.',
    type: 'warning' as const
  },

  // Success Messages
  EMAIL_SENT_SUCCESS: {
    title: 'Email Sent Successfully',
    description: 'The email has been sent to the registrant. They should receive it within a few minutes.',
    type: 'info' as const
  },

  SETTINGS_SAVED_SUCCESS: {
    title: 'Settings Saved',
    description: 'Your system settings have been saved successfully and are now in effect.',
    type: 'info' as const
  },

  USER_CREATED_SUCCESS: {
    title: 'User Created Successfully',
    description: 'The new user account has been created and the user can now log in to the system.',
    type: 'info' as const
  }
}

export function getErrorMessage(errorKey: keyof typeof ERROR_MESSAGES, customAction?: ErrorMessage['action']): ErrorMessage {
  const baseMessage = ERROR_MESSAGES[errorKey]
  return {
    ...baseMessage,
    action: customAction || baseMessage.action
  }
}

export function parseApiError(error: any): ErrorMessage {
  // Handle different types of API errors
  if (typeof error === 'string') {
    if (error.includes('Insufficient permissions')) {
      if (error.includes('email')) {
        return ERROR_MESSAGES.EMAIL_SEND_PERMISSION
      }
      if (error.includes('download')) {
        return ERROR_MESSAGES.DOWNLOAD_PERMISSION_DENIED
      }
      return ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
    }
    
    if (error.includes('Session expired') || error.includes('Unauthorized')) {
      return ERROR_MESSAGES.SESSION_EXPIRED
    }
    
    if (error.includes('Network')) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
  }

  // Handle HTTP status codes
  if (error.status) {
    switch (error.status) {
      case 401:
        return ERROR_MESSAGES.SESSION_EXPIRED
      case 403:
        return ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
      case 404:
        return ERROR_MESSAGES.USER_NOT_FOUND
      case 500:
        return ERROR_MESSAGES.SERVER_ERROR
    }
  }

  // Default error message
  return {
    title: 'Unexpected Error',
    description: error.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    type: 'error'
  }
}

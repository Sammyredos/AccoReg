export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export function validatePassword(password: string, requirement: string = 'Medium'): PasswordValidationResult {
  const errors: string[] = []
  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  // Basic length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  // Character type checks
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  // Calculate strength
  let strengthScore = 0
  if (password.length >= 8) strengthScore++
  if (password.length >= 12) strengthScore++
  if (hasLowercase) strengthScore++
  if (hasUppercase) strengthScore++
  if (hasNumbers) strengthScore++
  if (hasSpecialChars) strengthScore++

  if (strengthScore >= 5) {
    strength = 'strong'
  } else if (strengthScore >= 3) {
    strength = 'medium'
  } else {
    strength = 'weak'
  }

  // Apply requirement-specific validation
  switch (requirement.toLowerCase()) {
    case 'weak':
      // Only require minimum length
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters long')
      }
      break

    case 'medium':
      // Require length, lowercase, uppercase, and numbers
      if (!hasLowercase) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!hasUppercase) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!hasNumbers) {
        errors.push('Password must contain at least one number')
      }
      break

    case 'strong':
      // Require all character types and longer length
      if (password.length < 12) {
        errors.push('Password must be at least 12 characters long')
      }
      if (!hasLowercase) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!hasUppercase) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!hasNumbers) {
        errors.push('Password must contain at least one number')
      }
      if (!hasSpecialChars) {
        errors.push('Password must contain at least one special character (!@#$%^&*)')
      }
      break

    default:
      // Default to medium requirements
      if (!hasLowercase) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!hasUppercase) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!hasNumbers) {
        errors.push('Password must contain at least one number')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

export function getPasswordRequirementText(requirement: string): string {
  switch (requirement.toLowerCase()) {
    case 'weak':
      return 'Minimum 6 characters'
    case 'medium':
      return 'Minimum 8 characters with uppercase, lowercase, and numbers'
    case 'strong':
      return 'Minimum 12 characters with uppercase, lowercase, numbers, and special characters'
    default:
      return 'Minimum 8 characters with uppercase, lowercase, and numbers'
  }
}

export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'text-red-600'
    case 'medium':
      return 'text-yellow-600'
    case 'strong':
      return 'text-green-600'
    default:
      return 'text-gray-600'
  }
}

export function getPasswordStrengthBg(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-100 border-red-200'
    case 'medium':
      return 'bg-yellow-100 border-yellow-200'
    case 'strong':
      return 'bg-green-100 border-green-200'
    default:
      return 'bg-gray-100 border-gray-200'
  }
}

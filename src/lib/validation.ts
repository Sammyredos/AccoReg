export interface ValidationError {
  field: string
  message: string
}

export interface FormData {
  // Personal Information
  fullName: string
  dateOfBirth: string
  gender: string
  address: string
  phoneNumber: string
  emailAddress: string

  // Contact Information
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string

  // Parent/Guardian Information
  parentGuardianName: string
  parentGuardianPhone: string
  parentGuardianEmail: string

  // Additional Information
  medications: string
  allergies: string
  specialNeeds: string
  dietaryRestrictions: string
}

export const validateStep1 = (data: Partial<FormData>): ValidationError[] => {
  const errors: ValidationError[] = []

  if (!data.fullName?.trim()) {
    errors.push({ field: 'fullName', message: 'Full name is required' })
  } else if (data.fullName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Full name must be at least 2 characters' })
  }

  if (!data.dateOfBirth) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth is required' })
  } else {
    const birthDate = new Date(data.dateOfBirth)

    if (isNaN(birthDate.getTime())) {
      errors.push({ field: 'dateOfBirth', message: 'Please enter a valid date' })
    }
  }

  if (!data.gender) {
    errors.push({ field: 'gender', message: 'Gender selection is required' })
  }

  if (!data.address?.trim()) {
    errors.push({ field: 'address', message: 'Address is required' })
  } else if (data.address.trim().length < 10) {
    errors.push({ field: 'address', message: 'Please provide a complete address' })
  }

  if (!data.phoneNumber?.trim()) {
    errors.push({ field: 'phoneNumber', message: 'Phone number is required' })
  } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(data.phoneNumber.replace(/\s/g, ''))) {
    errors.push({ field: 'phoneNumber', message: 'Please enter a valid phone number' })
  }

  if (!data.emailAddress?.trim()) {
    errors.push({ field: 'emailAddress', message: 'Email address is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailAddress)) {
    errors.push({ field: 'emailAddress', message: 'Please enter a valid email address' })
  }

  return errors
}

export const validateStep2 = (data: Partial<FormData>): ValidationError[] => {
  const errors: ValidationError[] = []

  // Parent/Guardian information is required for all participants
  if (!data.parentGuardianName?.trim()) {
    errors.push({ field: 'parentGuardianName', message: 'Parent/Guardian name is required' })
  } else if (data.parentGuardianName.trim().length < 2) {
    errors.push({ field: 'parentGuardianName', message: 'Parent/Guardian name must be at least 2 characters' })
  }

  if (!data.parentGuardianPhone?.trim()) {
    errors.push({ field: 'parentGuardianPhone', message: 'Parent/Guardian phone is required' })
  } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(data.parentGuardianPhone.replace(/\s/g, ''))) {
    errors.push({ field: 'parentGuardianPhone', message: 'Please enter a valid parent/guardian phone number' })
  }

  // Parent/Guardian email is optional, but if provided, must be valid
  if (data.parentGuardianEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parentGuardianEmail)) {
    errors.push({ field: 'parentGuardianEmail', message: 'Please enter a valid parent/guardian email address' })
  }

  // Additional Information fields are now required
  if (!data.medications?.trim()) {
    errors.push({ field: 'medications', message: 'Medications field is required (write "None" if not applicable)' })
  }

  if (!data.allergies?.trim()) {
    errors.push({ field: 'allergies', message: 'Allergies field is required (write "None" if not applicable)' })
  }

  if (!data.specialNeeds?.trim()) {
    errors.push({ field: 'specialNeeds', message: 'Special needs field is required (write "None" if not applicable)' })
  }

  if (!data.dietaryRestrictions?.trim()) {
    errors.push({ field: 'dietaryRestrictions', message: 'Dietary restrictions field is required (write "None" if not applicable)' })
  }

  return errors
}

export const validateStep3 = (data: Partial<FormData>): ValidationError[] => {
  const errors: ValidationError[] = []

  // Note: Parental permission is now optional - form can be completed without it
  // The system will track permission status but won't block submission

  return errors
}

export const validateAllSteps = (data: Partial<FormData>): ValidationError[] => {
  return [
    ...validateStep1(data),
    ...validateStep2(data)
  ]
}

// Check for duplicate registration
export const checkDuplicateRegistration = async (emailAddress: string, phoneNumber: string) => {
  try {
    const response = await fetch('/api/registrations/check-duplicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailAddress: emailAddress.trim(),
        phoneNumber: phoneNumber.trim()
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to check for duplicate registration')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Duplicate check error:', error)
    throw error
  }
}

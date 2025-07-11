/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth as string or Date object
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  
  // Check if the date is valid
  if (isNaN(birthDate.getTime())) {
    return 0
  }
  
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  // Return 0 for negative ages (invalid dates)
  return age >= 0 ? age : 0
}

/**
 * Calculate age with null safety
 * @param dateOfBirth - Date of birth as string or Date object (can be null/undefined)
 * @returns Age in years or null if invalid
 */
export function calculateAgeOrNull(dateOfBirth: string | Date | null | undefined): number | null {
  if (!dateOfBirth) return null
  
  try {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    
    // Check if the date is valid
    if (isNaN(birthDate.getTime())) {
      return null
    }
    
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    // Return null for negative ages (invalid dates)
    return age >= 0 ? age : null
  } catch (error) {
    return null
  }
}

/**
 * Check if a person meets minimum age requirement
 * @param dateOfBirth - Date of birth as string or Date object
 * @param minimumAge - Minimum required age
 * @returns True if person meets minimum age requirement
 */
export function meetsMinimumAge(dateOfBirth: string | Date, minimumAge: number): boolean {
  const age = calculateAge(dateOfBirth)
  return age >= minimumAge
}

/**
 * Check if a person is within age range
 * @param dateOfBirth - Date of birth as string or Date object
 * @param minAge - Minimum age (optional)
 * @param maxAge - Maximum age (optional)
 * @returns True if person is within age range
 */
export function isWithinAgeRange(
  dateOfBirth: string | Date, 
  minAge?: number, 
  maxAge?: number
): boolean {
  const age = calculateAge(dateOfBirth)
  
  if (minAge !== undefined && age < minAge) {
    return false
  }
  
  if (maxAge !== undefined && age > maxAge) {
    return false
  }
  
  return true
}

/**
 * Get age group classification
 * @param dateOfBirth - Date of birth as string or Date object
 * @returns Age group classification
 */
export function getAgeGroup(dateOfBirth: string | Date): string {
  const age = calculateAge(dateOfBirth)
  
  if (age < 13) return 'Child'
  if (age < 18) return 'Teen'
  if (age < 25) return 'Young Adult'
  if (age < 35) return 'Adult'
  if (age < 50) return 'Middle-aged'
  return 'Senior'
}

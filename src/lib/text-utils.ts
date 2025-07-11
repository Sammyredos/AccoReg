/**
 * Text utility functions for formatting and capitalization
 */

/**
 * Capitalizes the first letter of each word in a string (Title Case)
 * Handles special cases like "O'Connor", "McDonald", etc.
 * @param text - The text to capitalize
 * @returns The capitalized text
 */
export function capitalizeWords(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return word
      
      // Handle special cases with apostrophes (O'Connor, D'Angelo, etc.)
      if (word.includes("'")) {
        return word
          .split("'")
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join("'")
      }
      
      // Handle hyphenated names (Mary-Jane, Jean-Claude, etc.)
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('-')
      }
      
      // Handle special prefixes
      const specialPrefixes = ['mc', 'mac', 'o\'', 'd\'', 'de', 'del', 'della', 'di', 'da', 'van', 'von', 'el']
      const lowerWord = word.toLowerCase()
      
      // Check for McDonald, MacPherson, etc.
      if (lowerWord.startsWith('mc') && lowerWord.length > 2) {
        return 'Mc' + lowerWord.charAt(2).toUpperCase() + lowerWord.slice(3)
      }
      
      if (lowerWord.startsWith('mac') && lowerWord.length > 3) {
        return 'Mac' + lowerWord.charAt(3).toUpperCase() + lowerWord.slice(4)
      }
      
      // Regular capitalization
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
    .trim()
}

/**
 * Capitalizes a person's full name properly
 * @param name - The full name to capitalize
 * @returns The properly capitalized name
 */
export function capitalizeName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  
  // Remove extra whitespace and normalize
  const cleanName = name.trim().replace(/\s+/g, ' ')
  
  return capitalizeWords(cleanName)
}

/**
 * Capitalizes the first letter of a sentence
 * @param text - The text to capitalize
 * @returns The text with first letter capitalized
 */
export function capitalizeFirst(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Converts text to proper sentence case
 * @param text - The text to convert
 * @returns The text in sentence case
 */
export function toSentenceCase(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .toLowerCase()
    .split('. ')
    .map(sentence => capitalizeFirst(sentence.trim()))
    .join('. ')
}

/**
 * Formats a phone number for display
 * @param phone - The phone number to format
 * @returns The formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Format based on length
  if (digits.length === 11 && digits.startsWith('234')) {
    // Nigerian format: +234 XXX XXX XXXX
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US format: +1 XXX XXX XXXX
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  } else if (digits.length === 10) {
    // Local format: XXX XXX XXXX
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  
  // Return original if no pattern matches
  return phone
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns The truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return ''
  
  if (text.length <= maxLength) return text
  
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Formats an email address for display (lowercase)
 * @param email - The email to format
 * @returns The formatted email
 */
export function formatEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  
  return email.toLowerCase().trim()
}

/**
 * Formats an address for display
 * @param address - The address to format
 * @returns The formatted address
 */
export function formatAddress(address: string): string {
  if (!address || typeof address !== 'string') return ''
  
  return capitalizeWords(address.trim())
}

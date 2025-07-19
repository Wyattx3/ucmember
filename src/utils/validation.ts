// Validation utilities for production
export class ValidationUtils {
  // English only text validation
  static isEnglishOnly(text: string): boolean {
    const englishPattern = /^[a-zA-Z\s\-'\.]+$/
    return englishPattern.test(text)
  }

  // Auto-format phone number
  static formatPhoneNumber(input: string): string {
    // Remove all non-digits
    const cleaned = input.replace(/\D/g, '')
    
    // Apply US phone format: (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    
    return input // Return original if not valid format
  }

  // Validate phone number
  static isValidPhoneNumber(phone: string): boolean {
    const phonePattern = /^\+?1?\s?\(?\d{3}\)?\s?[-.\s]?\d{3}[-.\s]?\d{4}$/
    return phonePattern.test(phone)
  }

  // Auto-format email
  static formatEmail(input: string): string {
    return input.toLowerCase().trim()
  }

  // Validate email
  static isValidEmail(email: string): boolean {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailPattern.test(email)
  }

  // Validate name (English only, no numbers)
  static isValidName(name: string): boolean {
    const namePattern = /^[a-zA-Z\s\-'\.]{2,50}$/
    return namePattern.test(name.trim())
  }

  // Auto-format name (capitalize first letters)
  static formatName(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  // Sanitize input (remove special characters for security)
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"'%;()&+]/g, '') // Remove potential XSS characters
      .trim()
  }

  // Validate city name
  static isValidCity(city: string): boolean {
    const cityPattern = /^[a-zA-Z\s\-'\.]{2,100}$/
    return cityPattern.test(city.trim())
  }

  // Format city name
  static formatCity(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }
} 
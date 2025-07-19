// Production API service layer for backend communication
class ApiService {
  private readonly formValidationUrl: string
  private readonly memberAuthUrl: string
  private readonly timeout: number = 30000 // 30 seconds

  constructor() {
    // Get API URLs from environment variables (production ready)
    this.formValidationUrl = import.meta.env.VITE_FORM_VALIDATION_URL || 
      'https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/form-validation'
    this.memberAuthUrl = import.meta.env.VITE_MEMBER_AUTH_URL || 
      'https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/member-auth'

    // Only log in development mode
    if (import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV) {
      console.log('API Service initialized with:')
      console.log('- Form Validation URL:', this.formValidationUrl)
      console.log('- Member Auth URL:', this.memberAuthUrl)
      console.log('- Environment:', import.meta.env.VITE_ENVIRONMENT || 'development')
    }
  }

  // Generic fetch with timeout and error handling
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Production error handling and logging
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout - server not responding')
        this.logError('TIMEOUT_ERROR', timeoutError, { url, options })
        throw timeoutError
      }
      
      this.logError('FETCH_ERROR', error, { url, options })
      throw error
    }
  }

  // Production error logging
  private logError(type: string, error: any, context?: any): void {
    const errorData = {
      type,
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      context
    }

    // Only log to console in development
    if (import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV) {
      console.error('API Error:', errorData)
    }

    // In production, you could send to monitoring service
    if (import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true') {
      // Example: Send to analytics or error reporting service
      // this.sendToErrorReporting(errorData)
    }
  }

  // Form Validation API Methods
  async validateField(field: string, value: string): Promise<{
    success: boolean;
    field: string;
    valid: boolean;
    error?: string;
    code?: string;
  }> {
    try {
      console.log(`Validating field: ${field} with value: ${value}`)
      
      const response = await this.fetchWithTimeout(this.formValidationUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'validateField',
          field,
          value
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`Validation result for ${field}:`, result)
      return result

    } catch (error) {
      console.error('Field validation error:', error)
      return {
        success: false,
        field,
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        code: 'VALIDATION_ERROR'
      }
    }
  }

  async formatField(field: string, value: string): Promise<{
    success: boolean;
    field: string;
    original: string;
    formatted: string;
    sanitized: string;
  }> {
    try {
      console.log(`Formatting field: ${field} with value: ${value}`)
      
      const response = await this.fetchWithTimeout(this.formValidationUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'formatField',
          field,
          value
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`Format result for ${field}:`, result)
      return result

    } catch (error) {
      console.error('Field formatting error:', error)
      return {
        success: false,
        field,
        original: value,
        formatted: value,
        sanitized: value
      }
    }
  }

  async validateAndFormatField(field: string, value: string): Promise<{
    success: boolean;
    field: string;
    original: string;
    formatted: string;
    valid: boolean;
    error?: string;
  }> {
    try {
      console.log(`Validating and formatting field: ${field}`)
      
      const response = await this.fetchWithTimeout(this.formValidationUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'validateAndFormat',
          field,
          value
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`Validate & format result for ${field}:`, result)
      return result

    } catch (error) {
      console.error('Field validate & format error:', error)
      return {
        success: false,
        field,
        original: value,
        formatted: value,
        valid: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }

  async validateAllFields(userData: any): Promise<{
    success: boolean;
    valid: boolean;
    results: any;
    errors?: any;
    message: string;
  }> {
    try {
      console.log('Validating all fields:', userData)
      
      const response = await this.fetchWithTimeout(this.formValidationUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'validateAll',
          userData
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Full validation result:', result)
      return result

    } catch (error) {
      console.error('Full validation error:', error)
      return {
        success: false,
        valid: false,
        results: {},
        errors: { general: error instanceof Error ? error.message : 'Validation failed' },
        message: 'Validation service unavailable'
      }
    }
  }

  // Member Authentication API Methods
  async registerUser(userData: any, memberCardData: any): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    error?: string;
    code?: string;
  }> {
    try {
      console.log('Registering user:', { email: userData.email, name: `${userData.firstName} ${userData.lastName}` })
      
      const response = await this.fetchWithTimeout(this.memberAuthUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'register',
          userData,
          memberCardData
        })
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Registration result:', result)
      return result

    } catch (error) {
      console.error('User registration error:', error)
      return {
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REGISTRATION_ERROR'
      }
    }
  }

  async loginUser(memberCardData: any, pin: string): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
    };
    error?: string;
    code?: string;
  }> {
    try {
      console.log('Logging in user with member card data')
      
      const response = await this.fetchWithTimeout(this.memberAuthUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'login',
          memberCardData,
          pin
        })
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Login result:', { success: result.success, user: result.user?.email })
      
      // Store token if login successful
      if (result.success && result.token) {
        localStorage.setItem('authToken', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
      }
      
      return result

    } catch (error) {
      console.error('User login error:', error)
      return {
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LOGIN_ERROR'
      }
    }
  }

  async verifyToken(token: string): Promise<{
    success: boolean;
    message: string;
    user?: {
      id: string;
      email: string;
      name: string;
    };
    error?: string;
    code?: string;
  }> {
    try {
      console.log('Verifying authentication token')
      
      const response = await this.fetchWithTimeout(this.memberAuthUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'verify',
          token
        })
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Token verification result:', { success: result.success, user: result.user?.email })
      return result

    } catch (error) {
      console.error('Token verification error:', error)
      return {
        success: false,
        message: 'Token verification failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'VERIFICATION_ERROR'
      }
    }
  }

  // Utility methods
  logout(): void {
    console.log('Logging out user')
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  getCurrentUser(): any {
    try {
      const userStr = localStorage.getItem('user')
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  }

  getAuthToken(): string | null {
    return localStorage.getItem('authToken')
  }

  isAuthenticated(): boolean {
    const token = this.getAuthToken()
    const user = this.getCurrentUser()
    return !!(token && user)
  }

  // Health check for APIs
  async healthCheck(): Promise<{
    formValidation: boolean;
    memberAuth: boolean;
    message: string;
  }> {
    const results = {
      formValidation: false,
      memberAuth: false,
      message: ''
    }

    try {
      // Test form validation API
      const validationResponse = await this.fetchWithTimeout(this.formValidationUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'validateField',
          field: 'firstName',
          value: 'Test'
        })
      })
      results.formValidation = validationResponse.ok

      // Test member auth API  
      const authResponse = await this.fetchWithTimeout(this.memberAuthUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'verify',
          token: 'test-token'
        })
      })
      results.memberAuth = authResponse.status === 401 || authResponse.ok // 401 is expected for invalid token

      if (results.formValidation && results.memberAuth) {
        results.message = 'All services are healthy'
      } else {
        results.message = 'Some services are unavailable'
      }

    } catch (error) {
      results.message = `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    console.log('Health check results:', results)
    return results
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService 
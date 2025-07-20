// Production API service layer for backend communication with proper service routing
// Enhanced environment detection for Vite builds
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

// Multi-service endpoint configuration
const API_ENDPOINTS = {
  EMAIL_SERVICE: import.meta.env.VITE_EMAIL_SERVICE_URL || 
    (isProduction 
      ? 'https://dev-splicer-463021-u3.uc.r.appspot.com'
      : 'http://localhost:3001'),
  FORM_VALIDATION: import.meta.env.VITE_FORM_VALIDATION_URL || 
    (isProduction 
      ? 'https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/formValidation'
      : 'http://localhost:3002'),
  MEMBER_AUTH: import.meta.env.VITE_MEMBER_AUTH_URL || 
    (isProduction 
      ? 'https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/memberAuth'
      : 'http://localhost:3003')
};

// Legacy API_BASE_URL for backward compatibility (if needed)
// const API_BASE_URL = API_ENDPOINTS.EMAIL_SERVICE;

console.log('API Endpoints Configuration:', {
  EMAIL_SERVICE: API_ENDPOINTS.EMAIL_SERVICE,
  FORM_VALIDATION: API_ENDPOINTS.FORM_VALIDATION,
  MEMBER_AUTH: API_ENDPOINTS.MEMBER_AUTH,
  environment: isProduction ? 'production' : 'development'
});

export const apiService = {
  // Validate and format field - Route to Form Validation Cloud Function
  async validateAndFormatField(fieldName: string, value: string): Promise<{
    success: boolean;
    valid?: boolean;
    formatted?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(API_ENDPOINTS.FORM_VALIDATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validateAndFormat',
          field: fieldName,
          value: value
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('Backend validation unavailable, using client-side validation:', error);
      
      // Fallback to client-side validation
      return {
        success: true,
        valid: true,
        formatted: value.trim()
      };
    }
  },

  // Send verification code - Route to Email Service (App Engine)
  async sendVerificationCode(email: string, firstName: string, lastName: string): Promise<{
    success: boolean;
    message?: string;
    emailId?: string;
    expiresIn?: number;
    error?: string;
    code?: string;
  }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.EMAIL_SERVICE}/api/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Send verification code failed:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      };
    }
  },

  // Verify code - Route to Email Service (App Engine)
  async verifyCode(email: string, code: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    code?: string;
    attemptsRemaining?: number;
  }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.EMAIL_SERVICE}/api/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Verify code failed:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
        code: 'NETWORK_ERROR'
      };
    }
  },

  // Register user - Route to Member Auth Cloud Function
  async registerUser(userData: any, memberCardData: any): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(API_ENDPOINTS.MEMBER_AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          userData,
          memberCardData
        })
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  },

  // Member card steganography verification - Route to Email Service (App Engine)
  async verifyMemberCard(imageData: string): Promise<{
    success: boolean;
    userData?: any;
    error?: string;
    hasData?: boolean;
  }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.EMAIL_SERVICE}/api/verify-member-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Member card verification failed:', error);
      return {
        success: false,
        error: 'Network error during verification',
        hasData: false
      };
    }
  },

  // Encode member card with steganography - Route to Email Service (App Engine)
  async encodeMemberCard(imageUrl: string, loginData: any): Promise<{
    success: boolean;
    encodedImageUrl?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.EMAIL_SERVICE}/api/encode-member-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          loginData: loginData
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Member card encoding failed:', error);
      return {
        success: false,
        error: 'Network error during encoding'
      };
    }
  },

  // Enhanced health check for all services
  async healthCheck(service?: 'email' | 'validation' | 'auth'): Promise<{
    success: boolean;
    message?: string;
    status?: string;
    timestamp?: string;
    error?: string;
    service?: string;
  }> {
    try {
      let endpoint: string;
      let serviceName: string;

      switch (service) {
        case 'validation':
          endpoint = API_ENDPOINTS.FORM_VALIDATION;
          serviceName = 'form-validation';
          // For Cloud Functions, we need to test with a simple request
          const validationResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'test' }),
            signal: AbortSignal.timeout(5000)
          });
          return {
            success: validationResponse.ok,
            service: serviceName,
            status: validationResponse.ok ? 'OK' : 'ERROR',
            message: `Form validation service ${validationResponse.ok ? 'healthy' : 'unhealthy'}`,
            timestamp: new Date().toISOString()
          };
          
        case 'auth':
          endpoint = API_ENDPOINTS.MEMBER_AUTH;
          serviceName = 'member-auth';
          // For Cloud Functions, we need to test with a simple request
          const authResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'test' }),
            signal: AbortSignal.timeout(5000)
          });
          return {
            success: authResponse.ok,
            service: serviceName,
            status: authResponse.ok ? 'OK' : 'ERROR',
            message: `Member auth service ${authResponse.ok ? 'healthy' : 'unhealthy'}`,
            timestamp: new Date().toISOString()
          };
          
        case 'email':
        default:
          endpoint = `${API_ENDPOINTS.EMAIL_SERVICE}/api/health`;
          serviceName = 'email-service';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        status: data.status,
        service: serviceName,
        message: data.message || `${serviceName} is healthy`,
        timestamp: data.timestamp || new Date().toISOString()
      };

    } catch (error: any) {
      let errorMessage = `Health check failed for ${service || 'email'} service`;
      
      if (error.name === 'TimeoutError') {
        errorMessage = `Health check timed out for ${service || 'email'} service`;
      } else if (error.message?.includes('CORS')) {
        errorMessage = `CORS error detected for ${service || 'email'} service`;
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = `Network error detected for ${service || 'email'} service`;
      }

      return {
        success: false,
        service: service || 'email',
        error: errorMessage
      };
    }
  },

  // Check health of all services
  async healthCheckAll(): Promise<{
    overall: boolean;
    services: Array<{
      name: string;
      success: boolean;
      message?: string;
      status?: string;
      error?: string;
    }>;
  }> {
    const services = ['email', 'validation', 'auth'] as const;
    const results = await Promise.allSettled(
      services.map(service => this.healthCheck(service))
    );

    const serviceResults = results.map((result, index) => ({
      name: services[index],
      success: result.status === 'fulfilled' ? result.value.success : false,
      message: result.status === 'fulfilled' ? result.value.message : undefined,
      status: result.status === 'fulfilled' ? result.value.status : undefined,
      error: result.status === 'fulfilled' ? result.value.error : 
             result.status === 'rejected' ? result.reason.message : 'Unknown error'
    }));

    const allHealthy = serviceResults.every(service => service.success);

    return {
      overall: allHealthy,
      services: serviceResults
    };
  },

  // Authentication and user management methods
  getCurrentUser(): any {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  },

  // Verify token - Route to Member Auth Cloud Function
  async verifyToken(token: string): Promise<{
    success: boolean;
    message?: string;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(API_ENDPOINTS.MEMBER_AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
          token
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Token verification failed'
      };
    }
  },

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // Login with member card - Route to Member Auth Cloud Function
  async loginWithMemberCard(memberCardData: any, enteredPin: string): Promise<{
    success: boolean;
    message?: string;
    token?: string;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(API_ENDPOINTS.MEMBER_AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'loginWithCard',
          memberCardData,
          enteredPin
        })
      });

      const data = await response.json();
      
      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Member card login failed'
      };
    }
  },

  // Get API endpoints for debugging
  getApiEndpoints() {
    return API_ENDPOINTS;
  }
} 
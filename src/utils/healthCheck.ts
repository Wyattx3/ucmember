// Production Health Check System
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    formValidation: ServiceHealth
    memberAuth: ServiceHealth
    googleMaps: ServiceHealth
    placidApi: ServiceHealth
  }
  performance: {
    buildTime: string
    loadTime: number
    memoryUsage?: number
  }
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  lastChecked: string
  error?: string
}

class HealthCheckService {
  private readonly timeout = 5000 // 5 seconds

  async checkOverallHealth(): Promise<HealthStatus> {
    const startTime = performance.now()
    
    const [formValidation, memberAuth, googleMaps, placidApi] = await Promise.allSettled([
      this.checkFormValidationService(),
      this.checkMemberAuthService(),
      this.checkGoogleMapsService(),
      this.checkPlacidApiService()
    ])

    const loadTime = performance.now() - startTime

    const services = {
      formValidation: formValidation.status === 'fulfilled' ? formValidation.value : this.createErrorHealth('Service check failed'),
      memberAuth: memberAuth.status === 'fulfilled' ? memberAuth.value : this.createErrorHealth('Service check failed'),
      googleMaps: googleMaps.status === 'fulfilled' ? googleMaps.value : this.createErrorHealth('Service check failed'),
      placidApi: placidApi.status === 'fulfilled' ? placidApi.value : this.createErrorHealth('Service check failed')
    }

    const overallStatus = this.determineOverallStatus(services)

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      services,
      performance: {
        buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
        loadTime: Math.round(loadTime),
        memoryUsage: this.getMemoryUsage()
      }
    }
  }

  private async checkFormValidationService(): Promise<ServiceHealth> {
    const startTime = performance.now()
    
    try {
      const response = await fetch(
        import.meta.env.VITE_FORM_VALIDATION_URL || 
        'https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/form-validation',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'validateField', field: 'name', value: 'test' }),
          signal: AbortSignal.timeout(this.timeout)
        }
      )

      const responseTime = performance.now() - startTime

      if (response.ok) {
        return {
          status: 'up',
          responseTime: Math.round(responseTime),
          lastChecked: new Date().toISOString()
        }
      } else {
        return {
          status: 'degraded',
          responseTime: Math.round(responseTime),
          lastChecked: new Date().toISOString(),
          error: `HTTP ${response.status}`
        }
      }
    } catch (error) {
      return this.createErrorHealth(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async checkMemberAuthService(): Promise<ServiceHealth> {
    const startTime = performance.now()
    
    try {
      const response = await fetch(
        import.meta.env.VITE_MEMBER_AUTH_URL || 
        'https://asia-southeast1-dev-splicer-463021-u3.cloudfunctions.net/member-auth',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token: 'test' }),
          signal: AbortSignal.timeout(this.timeout)
        }
      )

      const responseTime = performance.now() - startTime

      if (response.ok) {
        return {
          status: 'up',
          responseTime: Math.round(responseTime),
          lastChecked: new Date().toISOString()
        }
      } else {
        return {
          status: 'degraded',
          responseTime: Math.round(responseTime),
          lastChecked: new Date().toISOString(),
          error: `HTTP ${response.status}`
        }
      }
    } catch (error) {
      return this.createErrorHealth(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async checkGoogleMapsService(): Promise<ServiceHealth> {
    try {
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        return {
          status: 'up',
          lastChecked: new Date().toISOString()
        }
      } else {
        return {
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Google Maps API not loaded'
        }
      }
    } catch (error) {
      return this.createErrorHealth(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async checkPlacidApiService(): Promise<ServiceHealth> {
    const apiKey = import.meta.env.VITE_PLACID_API_KEY
    
    if (!apiKey) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: 'Placid API key not configured'
      }
    }

    const startTime = performance.now()
    
    try {
      const response = await fetch('https://api.placid.app/v1/templates', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(this.timeout)
      })

      const responseTime = performance.now() - startTime

      if (response.ok) {
        return {
          status: 'up',
          responseTime: Math.round(responseTime),
          lastChecked: new Date().toISOString()
        }
      } else {
        return {
          status: 'degraded',
          responseTime: Math.round(responseTime),
          lastChecked: new Date().toISOString(),
          error: `HTTP ${response.status}`
        }
      }
    } catch (error) {
      return this.createErrorHealth(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private createErrorHealth(error: string): ServiceHealth {
    return {
      status: 'down',
      lastChecked: new Date().toISOString(),
      error
    }
  }

  private determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceStatuses = Object.values(services).map(service => service.status)
    
    if (serviceStatuses.every(status => status === 'up')) {
      return 'healthy'
    } else if (serviceStatuses.some(status => status === 'up')) {
      return 'degraded'
    } else {
      return 'unhealthy'
    }
  }

  private getMemoryUsage(): number | undefined {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      return Math.round((window.performance as any).memory.usedJSHeapSize / 1024 / 1024)
    }
    return undefined
  }
}

export const healthCheckService = new HealthCheckService() 
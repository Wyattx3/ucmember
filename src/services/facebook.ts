// Facebook Authentication Service for Production
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export interface FacebookUser {
  id: string;
  name: string;
  email: string;
  picture: {
    data: {
      url: string;
    };
  };
  first_name: string;
  last_name: string;
}

export interface FacebookAuthResponse {
  success: boolean;
  user?: FacebookUser;
  error?: string;
  accessToken?: string;
}

class FacebookAuthService {
  private appId: string;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Get Facebook App ID from environment variable
    this.appId = import.meta.env.VITE_FACEBOOK_APP_ID || '';
    
    // Check if App ID is properly configured (not a dummy value)
    const isDummyAppId = !this.appId || 
                        this.appId === 'your_actual_facebook_app_id' ||
                        this.appId === '1234567890123456' ||
                        this.appId.includes('XXXX');
    
    if (isDummyAppId) {
      console.warn('Facebook App ID not configured properly - using mock authentication');
    }
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Check if App ID is properly configured
      const isDummyAppId = !this.appId || 
                          this.appId === 'your_actual_facebook_app_id' ||
                          this.appId === '1234567890123456' ||
                          this.appId.includes('XXXX');
      
      if (isDummyAppId) {
        reject(new Error('Facebook App ID not configured'));
        return;
      }

      // Wait for Facebook SDK to load
      if (typeof window !== 'undefined') {
        window.fbAsyncInit = () => {
          try {
            window.FB.init({
              appId: this.appId,
              cookie: true,
              xfbml: true,
              version: 'v18.0'
            });

            window.FB.AppEvents.logPageView();
            this.isInitialized = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        // If SDK is already loaded
        if (window.FB) {
          window.fbAsyncInit();
        } else {
          // If SDK fails to load after timeout
          setTimeout(() => {
            if (!this.isInitialized) {
              reject(new Error('Facebook SDK failed to load'));
            }
          }, 10000);
        }
      } else {
        reject(new Error('Window object not available'));
      }
    });

    return this.initPromise;
  }

  async login(): Promise<FacebookAuthResponse> {
    try {
      // Check if Facebook is properly configured
      const isDummyAppId = !this.appId || 
                          this.appId === 'your_actual_facebook_app_id' ||
                          this.appId === '1234567890123456' ||
                          this.appId.includes('XXXX');
      
      if (isDummyAppId) {
        // Return mock user data for development/demo purposes
        console.info('Using mock Facebook authentication (App ID not configured)');
        return {
          success: true,
          user: {
            id: 'mock_user_123',
            name: 'Demo User',
            email: 'demo@example.com',
            picture: {
              data: {
                url: 'https://via.placeholder.com/150x150?text=Demo+User'
              }
            },
            first_name: 'Demo',
            last_name: 'User'
          },
          accessToken: 'mock_access_token'
        };
      }

      await this.init();

      return new Promise((resolve) => {
        window.FB.login((response: any) => {
          if (response.authResponse) {
            // Get user info
            window.FB.api('/me', { 
              fields: 'id,name,email,picture.type(large),first_name,last_name' 
            }, (userResponse: FacebookUser | { error: any }) => {
              if (userResponse && !('error' in userResponse)) {
                resolve({
                  success: true,
                  user: userResponse,
                  accessToken: response.authResponse.accessToken
                });
              } else {
                resolve({
                  success: false,
                  error: 'Failed to get user information from Facebook'
                });
              }
            });
          } else {
            resolve({
              success: false,
              error: response.error || 'User cancelled Facebook login or permission denied'
            });
          }
        }, { 
          scope: 'email,public_profile',
          return_scopes: true 
        });
      });

    } catch (error) {
      console.error('Facebook login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Facebook authentication service unavailable'
      };
    }
  }

  async logout(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve) => {
      window.FB.logout(() => {
        resolve();
      });
    });
  }

  async getLoginStatus(): Promise<{
    connected: boolean;
    user?: FacebookUser;
    accessToken?: string;
  }> {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve) => {
      window.FB.getLoginStatus((response: any) => {
        if (response.status === 'connected') {
          // Get user info
          window.FB.api('/me', { 
            fields: 'id,name,email,picture.type(large),first_name,last_name' 
          }, (userResponse: FacebookUser | { error: any }) => {
            if (userResponse && !('error' in userResponse)) {
              resolve({
                connected: true,
                user: userResponse,
                accessToken: response.authResponse.accessToken
              });
            } else {
              resolve({ connected: false });
            }
          });
        } else {
          resolve({ connected: false });
        }
      });
    });
  }

  // Check if user has granted required permissions
  async checkPermissions(): Promise<{
    email: boolean;
    publicProfile: boolean;
  }> {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve) => {
      window.FB.api('/me/permissions', (response: any) => {
        const permissions = response.data || [];
        const grantedPermissions = permissions
          .filter((p: any) => p.status === 'granted')
          .map((p: any) => p.permission);

        resolve({
          email: grantedPermissions.includes('email'),
          publicProfile: grantedPermissions.includes('public_profile')
        });
      });
    });
  }

  // Check if Facebook App is properly configured
  isConfigured(): boolean {
    return !!(this.appId && 
             this.appId !== 'your_actual_facebook_app_id' && 
             this.appId.length > 10);
  }

  // Development fallback - only available in development mode
  async mockLogin(): Promise<FacebookAuthResponse> {
    // Only allow mock in development
    if (import.meta.env.PROD) {
      return {
        success: false,
        error: 'Mock authentication is not available in production'
      };
    }

    console.warn('Using mock Facebook authentication - for development only');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      user: {
        id: 'mock_user_123',
        name: 'Test User',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        picture: {
          data: {
            url: 'https://via.placeholder.com/150x150/4267B2/FFFFFF?text=FB'
          }
        }
      },
      accessToken: 'mock_access_token_12345'
    };
  }
}

// Export singleton instance
export const facebookAuth = new FacebookAuthService();

// Utility function for components
export const useFacebookAuth = () => {
  return {
    login: () => facebookAuth.login(),
    logout: () => facebookAuth.logout(),
    getStatus: () => facebookAuth.getLoginStatus(),
    checkPermissions: () => facebookAuth.checkPermissions(),
    isConfigured: () => facebookAuth.isConfigured()
  };
}; 
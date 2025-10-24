import { supabase, supabaseAdmin, User, Session, AuthError } from './supabase'
import { db } from './database-service'
import { analytics } from './monitoring'

// Enhanced authentication service with security features
export class AuthService {
  // User registration with enhanced validation
  static async registerUser(email: string, password: string, metadata?: any): Promise<{
    user: User | null
    error: AuthError | null
    session: Session | null
  }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return {
          user: null,
          error: { message: 'Invalid email format' } as AuthError,
          session: null
        }
      }

      // Validate password strength
      if (!this.validatePasswordStrength(password)) {
        return {
          user: null,
          error: { message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' } as AuthError,
          session: null
        }
      }

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        return {
          user: null,
          error: { message: 'User already exists' } as AuthError,
          session: null
        }
      }

      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            created_at: new Date().toISOString()
          }
        }
      })

      if (error) {
        return { user: null, error, session: null }
      }

      // Create user profile in database
      if (data.user) {
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            subscription_tier: 'free',
            free_rate_checks_used: 0,
            last_rate_check_reset: new Date().toISOString()
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }

        // Grant free tier entitlements
        await this.grantUserEntitlements(data.user.id, 'free')

        // Track registration analytics
        analytics.trackUserRegistration({
          userId: data.user.id,
          email: data.user.email!,
          subscriptionTier: 'free'
        })
      }

      return {
        user: data.user,
        error: null,
        session: data.session
      }
    } catch (error) {
      console.error('Registration error:', error)
      return {
        user: null,
        error: { message: 'Registration failed' } as AuthError,
        session: null
      }
    }
  }

  // Enhanced login with security features
  static async loginUser(email: string, password: string): Promise<{
    user: User | null
    error: AuthError | null
    session: Session | null
  }> {
    try {
      // Rate limiting check (implement your rate limiting logic here)
      const rateLimitKey = `login_attempts:${email}`
      // You would check Redis for rate limiting here

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        // Track failed login attempt
        analytics.trackFailedLogin({
          email,
          error: error.message,
          timestamp: new Date().toISOString()
        })

        return { user: null, error, session: null }
      }

      // Track successful login
      if (data.user) {
        analytics.trackUserLogin({
          userId: data.user.id,
          email: data.user.email!,
          timestamp: new Date().toISOString()
        })

        // Update last login time
        await supabaseAdmin
          .from('users')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', data.user.id)
      }

      return {
        user: data.user,
        error: null,
        session: data.session
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        user: null,
        error: { message: 'Login failed' } as AuthError,
        session: null
      }
    }
  }

  // OAuth login with Google
  static async loginWithGoogle(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      return { error }
    } catch (error) {
      console.error('Google OAuth error:', error)
      return { error: { message: 'Google login failed' } as AuthError }
    }
  }

  // Password reset with enhanced security
  static async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      // Check if user exists
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single()

      if (!user) {
        return { error: { message: 'User not found' } as AuthError }
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
      })

      if (error) {
        return { error }
      }

      // Track password reset request
      analytics.trackPasswordResetRequest({
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      })

      return { error: null }
    } catch (error) {
      console.error('Password reset error:', error)
      return { error: { message: 'Password reset failed' } as AuthError }
    }
  }

  // Update password with validation
  static async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      if (!this.validatePasswordStrength(newPassword)) {
        return {
          error: { message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' } as AuthError
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      return { error }
    } catch (error) {
      console.error('Password update error:', error)
      return { error: { message: 'Password update failed' } as AuthError }
    }
  }

  // Logout with cleanup
  static async logout(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      // Clear any cached data
      // You might want to clear user-specific cache here
      
      return { error }
    } catch (error) {
      console.error('Logout error:', error)
      return { error: { message: 'Logout failed' } as AuthError }
    }
  }

  // Get current user with profile data
  static async getCurrentUser(): Promise<{
    user: User | null
    profile: any | null
    error: string | null
  }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return { user: null, profile: null, error: authError?.message || 'No user found' }
      }

      const profile = await db.getUserProfile(user.id)
      
      return { user, profile, error: null }
    } catch (error) {
      console.error('Get current user error:', error)
      return { user: null, profile: null, error: 'Failed to get user' }
    }
  }

  // Session management
  static async getSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('Get session error:', error)
      return null
    }
  }

  // Refresh session
  static async refreshSession(): Promise<{
    session: Session | null
    error: AuthError | null
  }> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      return { session: data.session, error }
    } catch (error) {
      console.error('Refresh session error:', error)
      return { session: null, error: { message: 'Session refresh failed' } as AuthError }
    }
  }

  // User entitlements management
  static async grantUserEntitlements(userId: string, tier: 'free' | 'premium' | 'broker'): Promise<void> {
    try {
      const entitlements = this.getEntitlementsForTier(tier)
      
      for (const entitlement of entitlements) {
        await supabaseAdmin
          .from('user_entitlements')
          .upsert({
            user_id: userId,
            feature: entitlement.feature,
            entitlement_type: entitlement.type,
            is_active: true,
            expires_at: entitlement.expiresAt,
            usage_count: 0,
            usage_limit: entitlement.limit
          })
      }
    } catch (error) {
      console.error('Error granting user entitlements:', error)
    }
  }

  static async revokeUserEntitlements(userId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('user_entitlements')
        .update({ is_active: false })
        .eq('user_id', userId)
    } catch (error) {
      console.error('Error revoking user entitlements:', error)
    }
  }

  // Check if user has specific entitlement
  static async hasEntitlement(userId: string, feature: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_entitlements')
        .select('is_active, expires_at, usage_count, usage_limit')
        .eq('user_id', userId)
        .eq('feature', feature)
        .eq('is_active', true)
        .single()

      if (error || !data) return false

      // Check if entitlement has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return false
      }

      // Check usage limits
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking entitlement:', error)
      return false
    }
  }

  // Password strength validation
  private static validatePasswordStrength(password: string): boolean {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar
  }

  // Get entitlements for subscription tier
  private static getEntitlementsForTier(tier: 'free' | 'premium' | 'broker') {
    const baseEntitlements = [
      { feature: 'unlimited_calculations', type: 'subscription', expiresAt: null, limit: null }
    ]

    switch (tier) {
      case 'free':
        return [
          ...baseEntitlements,
          { feature: 'rate_checks', type: 'subscription', expiresAt: null, limit: 5 },
          { feature: 'scenario_saving', type: 'subscription', expiresAt: null, limit: 3 }
        ]
      
      case 'premium':
        return [
          ...baseEntitlements,
          { feature: 'rate_checks', type: 'subscription', expiresAt: null, limit: 50 },
          { feature: 'scenario_saving', type: 'subscription', expiresAt: null, limit: 100 },
          { feature: 'lead_generation', type: 'subscription', expiresAt: null, limit: 10 },
          { feature: 'report_export', type: 'subscription', expiresAt: null, limit: 20 }
        ]
      
      case 'broker':
        return [
          ...baseEntitlements,
          { feature: 'rate_checks', type: 'subscription', expiresAt: null, limit: null },
          { feature: 'scenario_saving', type: 'subscription', expiresAt: null, limit: null },
          { feature: 'lead_generation', type: 'subscription', expiresAt: null, limit: null },
          { feature: 'report_export', type: 'subscription', expiresAt: null, limit: null },
          { feature: 'broker_white_label', type: 'broker_license', expiresAt: null, limit: null }
        ]
      
      default:
        return baseEntitlements
    }
  }

  // Security audit logging
  static async logSecurityEvent(event: string, userId: string, metadata: any = {}): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_events')
        .insert({
          event_type: event,
          severity: this.getEventSeverity(event),
          description: this.getEventDescription(event),
          metadata: {
            user_id: userId,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        })
    } catch (error) {
      console.error('Error logging security event:', error)
    }
  }

  private static getEventSeverity(event: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalEvents = ['password_breach', 'suspicious_login', 'admin_access']
    const highEvents = ['failed_login', 'password_reset', 'account_locked']
    const mediumEvents = ['login', 'logout', 'password_change']
    
    if (criticalEvents.includes(event)) return 'critical'
    if (highEvents.includes(event)) return 'high'
    if (mediumEvents.includes(event)) return 'medium'
    return 'low'
  }

  private static getEventDescription(event: string): string {
    const descriptions: Record<string, string> = {
      'login': 'User logged in successfully',
      'logout': 'User logged out',
      'failed_login': 'Failed login attempt',
      'password_reset': 'Password reset requested',
      'password_change': 'Password changed successfully',
      'account_locked': 'Account locked due to suspicious activity',
      'suspicious_login': 'Suspicious login detected',
      'admin_access': 'Admin access granted'
    }
    
    return descriptions[event] || 'Security event occurred'
  }
}

// Export singleton instance
export const auth = AuthService
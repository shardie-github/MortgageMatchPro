import { z } from 'zod'

// Environment variable validation schema
const EnvSchema = z.object({
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Valid Supabase URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // External API Keys
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  
  // Rate Limiting
  REDIS_URL: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
})

// Validate environment variables
const parseEnv = () => {
  try {
    return EnvSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`)
    }
    throw error
  }
}

// Export validated environment variables
export const env = parseEnv()

// Key management utilities
export class KeyManager {
  private static instance: KeyManager
  private keys: Map<string, string> = new Map()

  private constructor() {
    this.initializeKeys()
  }

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager()
    }
    return KeyManager.instance
  }

  private initializeKeys() {
    // Store all keys securely
    this.keys.set('openai', env.OPENAI_API_KEY)
    this.keys.set('supabase_url', env.NEXT_PUBLIC_SUPABASE_URL)
    this.keys.set('supabase_anon', env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    this.keys.set('supabase_service', env.SUPABASE_SERVICE_ROLE_KEY)
    this.keys.set('encryption', env.ENCRYPTION_KEY)
    this.keys.set('jwt', env.JWT_SECRET)
    
    if (env.STRIPE_SECRET_KEY) {
      this.keys.set('stripe_secret', env.STRIPE_SECRET_KEY)
    }
    if (env.STRIPE_WEBHOOK_SECRET) {
      this.keys.set('stripe_webhook', env.STRIPE_WEBHOOK_SECRET)
    }
    if (env.SENTRY_DSN) {
      this.keys.set('sentry', env.SENTRY_DSN)
    }
    if (env.REDIS_URL) {
      this.keys.set('redis', env.REDIS_URL)
    }
  }

  getKey(keyName: string): string {
    const key = this.keys.get(keyName)
    if (!key) {
      throw new Error(`Key '${keyName}' not found or not configured`)
    }
    return key
  }

  hasKey(keyName: string): boolean {
    return this.keys.has(keyName)
  }

  // Rotate key (for future key rotation implementation)
  rotateKey(keyName: string, newKey: string): void {
    this.keys.set(keyName, newKey)
  }

  // Get all available keys (for debugging - should be removed in production)
  getAvailableKeys(): string[] {
    return Array.from(this.keys.keys())
  }
}

// Export singleton instance
export const keyManager = KeyManager.getInstance()

// Utility functions for common key access
export const getOpenAIKey = () => keyManager.getKey('openai')
export const getSupabaseUrl = () => keyManager.getKey('supabase_url')
export const getSupabaseAnonKey = () => keyManager.getKey('supabase_anon')
export const getSupabaseServiceKey = () => keyManager.getKey('supabase_service')
export const getEncryptionKey = () => keyManager.getKey('encryption')
export const getJWTSecret = () => keyManager.getKey('jwt')
export const getStripeSecretKey = () => keyManager.getKey('stripe_secret')
export const getStripeWebhookSecret = () => keyManager.getKey('stripe_webhook')
export const getSentryDSN = () => keyManager.getKey('sentry')
export const getRedisUrl = () => keyManager.getKey('redis')

// Environment-specific configurations
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// Security configurations
export const securityConfig = {
  // JWT settings
  jwt: {
    secret: getJWTSecret(),
    expiresIn: '24h',
    issuer: 'mortgagematch-pro',
    audience: 'mortgagematch-pro-users',
  },
  
  // Encryption settings
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
  
  // Rate limiting
  rateLimiting: {
    enabled: isProduction,
    redisUrl: getRedisUrl(),
    defaultWindow: 60 * 1000, // 1 minute
    defaultLimit: 100,
  },
  
  // CORS settings
  cors: {
    allowedOrigins: isProduction 
      ? ['https://chat.openai.com', 'https://chatgpt.com']
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  
  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': isProduction
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://*.supabase.co https://api.stripe.com;"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://api.openai.com https://*.supabase.co https://api.stripe.com;",
  },
}

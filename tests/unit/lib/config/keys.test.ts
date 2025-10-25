import { env, keyManager, getOpenAIKey, getSupabaseUrl, securityConfig } from '../../../lib/config/keys'

// Mock process.env
const originalEnv = process.env

describe('Key Management', () => {
  beforeEach(() => {
    // Reset modules
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Environment Validation', () => {
    it('should validate required environment variables', () => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'sk-test-key',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
        JWT_SECRET: 'test-jwt-secret-32-chars-long'
      }

      expect(() => {
        require('../../../lib/config/keys')
      }).not.toThrow()
    })

    it('should throw error for missing required variables', () => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'sk-test-key'
        // Missing other required variables
      }

      expect(() => {
        require('../../../lib/config/keys')
      }).toThrow('Environment validation failed')
    })

    it('should throw error for invalid URL format', () => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'sk-test-key',
        NEXT_PUBLIC_SUPABASE_URL: 'invalid-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
        JWT_SECRET: 'test-jwt-secret-32-chars-long'
      }

      expect(() => {
        require('../../../lib/config/keys')
      }).toThrow('Valid Supabase URL is required')
    })

    it('should throw error for short encryption key', () => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'sk-test-key',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        ENCRYPTION_KEY: 'short',
        JWT_SECRET: 'test-jwt-secret-32-chars-long'
      }

      expect(() => {
        require('../../../lib/config/keys')
      }).toThrow('Encryption key must be at least 32 characters')
    })
  })

  describe('Key Manager', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        OPENAI_API_KEY: 'sk-test-key',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
        JWT_SECRET: 'test-jwt-secret-32-chars-long'
      }
    })

    it('should get key successfully', () => {
      const key = getOpenAIKey()
      expect(key).toBe('sk-test-key')
    })

    it('should throw error for missing key', () => {
      expect(() => {
        keyManager.getKey('nonexistent')
      }).toThrow("Key 'nonexistent' not found or not configured")
    })

    it('should check if key exists', () => {
      expect(keyManager.hasKey('openai')).toBe(true)
      expect(keyManager.hasKey('nonexistent')).toBe(false)
    })

    it('should rotate key', () => {
      const newKey = 'new-test-key'
      keyManager.rotateKey('openai', newKey)
      expect(keyManager.getKey('openai')).toBe(newKey)
    })
  })

  describe('Security Configuration', () => {
    it('should have correct JWT configuration', () => {
      expect(securityConfig.jwt.expiresIn).toBe('24h')
      expect(securityConfig.jwt.issuer).toBe('mortgagematch-pro')
      expect(securityConfig.jwt.audience).toBe('mortgagematch-pro-users')
    })

    it('should have correct encryption configuration', () => {
      expect(securityConfig.encryption.algorithm).toBe('aes-256-gcm')
      expect(securityConfig.encryption.keyLength).toBe(32)
      expect(securityConfig.encryption.ivLength).toBe(16)
    })

    it('should have correct CORS configuration for production', () => {
      process.env.NODE_ENV = 'production'
      const prodConfig = require('../../../lib/config/keys').securityConfig
      expect(prodConfig.cors.allowedOrigins).toContain('https://chat.openai.com')
      expect(prodConfig.cors.allowedOrigins).toContain('https://chatgpt.com')
    })

    it('should have correct CORS configuration for development', () => {
      process.env.NODE_ENV = 'development'
      const devConfig = require('../../../lib/config/keys').securityConfig
      expect(devConfig.cors.allowedOrigins).toContain('http://localhost:3000')
      expect(devConfig.cors.allowedOrigins).toContain('http://localhost:3001')
    })
  })
})

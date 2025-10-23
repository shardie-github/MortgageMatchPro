import { NextApiRequest, NextApiResponse } from 'next'
import { createHash, createHmac } from 'crypto'
import { z } from 'zod'
import { supabaseAdmin } from './supabase'
import { errorTracking } from './monitoring'

// Rate limiting configuration
const RATE_LIMITS = {
  affordability: { requests: 10, window: 60 * 1000 }, // 10 requests per minute
  rates: { requests: 20, window: 60 * 1000 }, // 20 requests per minute
  leads: { requests: 5, window: 60 * 1000 }, // 5 requests per minute
  scenarios: { requests: 15, window: 60 * 1000 }, // 15 requests per minute
}

// Input validation schemas
export const AffordabilityInputSchema = z.object({
  country: z.enum(['CA', 'US']),
  income: z.number().min(0).max(10000000),
  debts: z.number().min(0).max(100000),
  downPayment: z.number().min(0).max(10000000),
  propertyPrice: z.number().min(10000).max(50000000),
  interestRate: z.number().min(0.1).max(50),
  termYears: z.number().min(1).max(50),
  location: z.string().min(1).max(100),
  taxes: z.number().min(0).max(10000).optional(),
  insurance: z.number().min(0).max(10000).optional(),
  hoa: z.number().min(0).max(10000).optional(),
})

export const RateInputSchema = z.object({
  country: z.enum(['CA', 'US']),
  termYears: z.number().min(1).max(50),
  rateType: z.enum(['fixed', 'variable']),
  propertyPrice: z.number().min(10000).max(50000000),
  downPayment: z.number().min(0).max(10000000),
})

export const LeadInputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(10).max(20),
  leadData: z.object({
    income: z.number().min(0).max(10000000),
    debts: z.number().min(0).max(100000),
    downPayment: z.number().min(0).max(10000000),
    propertyPrice: z.number().min(10000).max(50000000),
    creditScore: z.number().min(300).max(850).optional(),
    employmentType: z.string().min(1).max(50),
    location: z.string().min(1).max(100),
  }),
})

// Security headers
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://*.supabase.co https://api.stripe.com;",
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  req: NextApiRequest,
  endpoint: keyof typeof RATE_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const clientId = getClientId(req)
  const limit = RATE_LIMITS[endpoint]
  const now = Date.now()
  const key = `${clientId}:${endpoint}`
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.window })
    return { allowed: true, remaining: limit.requests - 1, resetTime: now + limit.window }
  }
  
  if (current.count >= limit.requests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }
  
  current.count++
  return { allowed: true, remaining: limit.requests - current.count, resetTime: current.resetTime }
}

export function getClientId(req: NextApiRequest): string {
  // Use IP address as client identifier
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.connection.remoteAddress
  return ip || 'unknown'
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '')
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  return input
}

// API key validation
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false
  
  try {
    // Check if it's a valid OpenAI API key format
    if (apiKey.startsWith('sk-')) {
      return true
    }
    
    // Check if it's a valid Supabase anon key
    if (apiKey.length === 64 && /^[A-Za-z0-9+/=]+$/.test(apiKey)) {
      return true
    }
    
    return false
  } catch (error) {
    errorTracking.captureException(error as Error, { context: 'api_key_validation' })
    return false
  }
}

// Request logging
export function logRequest(req: NextApiRequest, endpoint: string, userId?: string) {
  const logData = {
    method: req.method,
    endpoint,
    userId,
    clientId: getClientId(req),
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  }
  
  console.log('API Request:', logData)
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
  }
}

// Error response handler
export function handleError(
  res: NextApiResponse,
  error: Error,
  context: string,
  statusCode: number = 500
) {
  const errorId = createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex')
  
  errorTracking.captureException(error, {
    context,
    errorId,
    endpoint: res.req.url,
  })
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred processing your request'
    : error.message
    
  res.status(statusCode).json({
    error: message,
    errorId,
    timestamp: new Date().toISOString(),
  })
}

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'https://chat.openai.com',
      'https://chatgpt.com',
      process.env.NEXT_PUBLIC_APP_URL,
    ].filter(Boolean)
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}

// Security middleware
export function withSecurity(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Add security headers
      Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value)
      })
      
      // Log request
      logRequest(req, req.url || 'unknown')
      
      // Call the actual handler
      await handler(req, res)
    } catch (error) {
      handleError(res, error as Error, 'security_middleware')
    }
  }
}

// Authentication middleware
export async function withAuth(handler: (req: NextApiRequest, res: NextApiResponse, userId: string) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' })
      }
      
      const token = authHeader.substring(7)
      
      // Verify JWT token with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' })
      }
      
      await handler(req, res, user.id)
    } catch (error) {
      handleError(res, error as Error, 'auth_middleware', 401)
    }
  }
}

// Rate limiting middleware
export function withRateLimit(endpoint: keyof typeof RATE_LIMITS) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const { allowed, remaining, resetTime } = checkRateLimit(req, endpoint)
      
      if (!allowed) {
        res.setHeader('X-RateLimit-Limit', RATE_LIMITS[endpoint].requests.toString())
        res.setHeader('X-RateLimit-Remaining', '0')
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        })
      }
      
      res.setHeader('X-RateLimit-Limit', RATE_LIMITS[endpoint].requests.toString())
      res.setHeader('X-RateLimit-Remaining', remaining.toString())
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
      
      await handler(req, res)
    }
  }
}

// Input validation middleware
export function withValidation(schema: z.ZodSchema) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        const sanitized = sanitizeInput(req.body)
        const validated = schema.parse(sanitized)
        req.body = validated
        await handler(req, res)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Invalid input',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            }))
          })
        }
        handleError(res, error as Error, 'validation_middleware', 400)
      }
    }
  }
}

// Audit logging
export async function logAuditEvent(
  event: string,
  userId: string,
  details: Record<string, any> = {}
) {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        event,
        user_id: userId,
        details,
        timestamp: new Date().toISOString(),
        ip_address: 'unknown', // Would be passed from request context
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}

// Data encryption utilities
export function encryptSensitiveData(data: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long', 'utf8')
  const iv = Buffer.alloc(16, 0)
  
  const cipher = require('crypto').createCipher(algorithm, key)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return encrypted
}

export function decryptSensitiveData(encryptedData: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long', 'utf8')
  
  const decipher = require('crypto').createDecipher(algorithm, key)
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
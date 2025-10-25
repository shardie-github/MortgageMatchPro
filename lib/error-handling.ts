/**
 * Comprehensive Error Handling System
 * Provides standardized error handling across the application
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { captureException, captureMessage } from './monitoring'

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Business Logic
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_ENTITLEMENTS = 'INSUFFICIENT_ENTITLEMENTS',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  
  // External Services
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
}

export interface ErrorResponse {
  error: string
  code: ErrorCode
  message: string
  details?: any
  timestamp: string
  requestId?: string
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: any

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

// Error code to status code mapping
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INSUFFICIENT_ENTITLEMENTS]: 403,
  [ErrorCode.CALCULATION_ERROR]: 422,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.DATABASE_ERROR]: 503,
  [ErrorCode.CACHE_ERROR]: 503,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 408,
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Handle different types of errors
export const handleError = (
  error: Error | AppError,
  req: NextApiRequest,
  res: NextApiResponse,
  context?: string
): void => {
  const requestId = generateRequestId()
  
  // Determine if it's an operational error
  const isOperational = error instanceof AppError ? error.isOperational : false
  
  // Get error details
  const errorCode = error instanceof AppError ? error.code : ErrorCode.INTERNAL_ERROR
  const statusCode = error instanceof AppError ? error.statusCode : ERROR_STATUS_MAP[errorCode]
  const message = error.message || 'An unexpected error occurred'
  
  // Log error details
  const errorContext = {
    requestId,
    context: context || 'unknown',
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userId: req.body?.userId || req.query?.userId,
    errorCode,
    statusCode,
    isOperational,
    stack: error.stack,
  }

  // Capture in monitoring system
  if (isOperational) {
    captureMessage(`Operational Error: ${message}`, 'warning', errorContext)
  } else {
    captureException(error, errorContext)
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: errorCode,
    code: errorCode,
    message: process.env.NODE_ENV === 'production' && !isOperational 
      ? 'An unexpected error occurred. Please try again later.'
      : message,
    timestamp: new Date().toISOString(),
    requestId,
  }

  // Add details in development or for operational errors
  if (process.env.NODE_ENV === 'development' || isOperational) {
    errorResponse.details = error instanceof AppError ? error.details : undefined
  }

  // Send response
  res.status(statusCode).json(errorResponse)
}

// Validation error handler
export const handleValidationError = (
  errors: any[],
  req: NextApiRequest,
  res: NextApiResponse
): void => {
  const error = new AppError(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    400,
    true,
    { validationErrors: errors }
  )
  
  handleError(error, req, res, 'validation')
}

// Rate limit error handler
export const handleRateLimitError = (
  req: NextApiRequest,
  res: NextApiResponse,
  retryAfter?: number
): void => {
  const error = new AppError(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded',
    429,
    true,
    { retryAfter }
  )
  
  handleError(error, req, res, 'rate_limit')
}

// Database error handler
export const handleDatabaseError = (
  error: Error,
  req: NextApiRequest,
  res: NextApiResponse,
  operation: string
): void => {
  const appError = new AppError(
    ErrorCode.DATABASE_ERROR,
    `Database operation failed: ${operation}`,
    503,
    false,
    { originalError: error.message, operation }
  )
  
  handleError(appError, req, res, 'database')
}

// External API error handler
export const handleExternalApiError = (
  error: Error,
  req: NextApiRequest,
  res: NextApiResponse,
  service: string
): void => {
  const appError = new AppError(
    ErrorCode.EXTERNAL_API_ERROR,
    `External service error: ${service}`,
    502,
    false,
    { originalError: error.message, service }
  )
  
  handleError(appError, req, res, 'external_api')
}

// Timeout error handler
export const handleTimeoutError = (
  req: NextApiRequest,
  res: NextApiResponse,
  operation: string,
  timeoutMs: number
): void => {
  const error = new AppError(
    ErrorCode.TIMEOUT,
    `Operation timed out: ${operation}`,
    408,
    true,
    { operation, timeoutMs }
  )
  
  handleError(error, req, res, 'timeout')
}

// Async error wrapper
export const asyncHandler = (
  fn: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await fn(req, res)
    } catch (error) {
      handleError(error as Error, req, res)
    }
  }
}

// Retry mechanism with exponential backoff
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new AppError(
          ErrorCode.SERVICE_UNAVAILABLE,
          'Circuit breaker is open',
          503,
          true
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}

// Global error handler for unhandled rejections
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    captureException(new Error(`Unhandled Rejection: ${reason}`), {
      context: 'unhandled_rejection',
      promise: promise.toString(),
    })
  })

  process.on('uncaughtException', (error) => {
    captureException(error, {
      context: 'uncaught_exception',
    })
    
    // Exit process after logging
    process.exit(1)
  })
}

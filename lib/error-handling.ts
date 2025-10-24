import { SupabaseError } from './supabase'
import { analytics } from './monitoring'

// Enhanced error handling service
export class ErrorHandlingService {
  // Error types
  static readonly ERROR_TYPES = {
    VALIDATION_ERROR: 'validation_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    AUTHORIZATION_ERROR: 'authorization_error',
    DATABASE_ERROR: 'database_error',
    NETWORK_ERROR: 'network_error',
    RATE_LIMIT_ERROR: 'rate_limit_error',
    NOT_FOUND_ERROR: 'not_found_error',
    CONFLICT_ERROR: 'conflict_error',
    INTERNAL_ERROR: 'internal_error',
    EXTERNAL_SERVICE_ERROR: 'external_service_error'
  } as const

  // Error severity levels
  static readonly SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const

  // Error context interface
  interface ErrorContext {
    userId?: string
    requestId?: string
    endpoint?: string
    method?: string
    userAgent?: string
    ipAddress?: string
    timestamp?: string
    additionalData?: Record<string, any>
  }

  // Enhanced error class
  export class AppError extends Error {
    public readonly type: string
    public readonly severity: string
    public readonly statusCode: number
    public readonly context: ErrorContext
    public readonly isOperational: boolean
    public readonly timestamp: string

    constructor(
      message: string,
      type: string = ErrorHandlingService.ERROR_TYPES.INTERNAL_ERROR,
      statusCode: number = 500,
      severity: string = ErrorHandlingService.SEVERITY_LEVELS.MEDIUM,
      context: ErrorContext = {},
      isOperational: boolean = true
    ) {
      super(message)
      
      this.name = 'AppError'
      this.type = type
      this.severity = severity
      this.statusCode = statusCode
      this.context = {
        timestamp: new Date().toISOString(),
        ...context
      }
      this.isOperational = isOperational

      // Capture stack trace
      Error.captureStackTrace(this, this.constructor)
    }

    // Convert to JSON for logging
    toJSON() {
      return {
        name: this.name,
        message: this.message,
        type: this.type,
        severity: this.severity,
        statusCode: this.statusCode,
        context: this.context,
        isOperational: this.isOperational,
        stack: this.stack
      }
    }
  }

  // Error factory methods
  static createValidationError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.VALIDATION_ERROR,
      400,
      this.SEVERITY_LEVELS.LOW,
      context
    )
  }

  static createAuthenticationError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.AUTHENTICATION_ERROR,
      401,
      this.SEVERITY_LEVELS.MEDIUM,
      context
    )
  }

  static createAuthorizationError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.AUTHORIZATION_ERROR,
      403,
      this.SEVERITY_LEVELS.MEDIUM,
      context
    )
  }

  static createNotFoundError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.NOT_FOUND_ERROR,
      404,
      this.SEVERITY_LEVELS.LOW,
      context
    )
  }

  static createConflictError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.CONFLICT_ERROR,
      409,
      this.SEVERITY_LEVELS.MEDIUM,
      context
    )
  }

  static createRateLimitError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.RATE_LIMIT_ERROR,
      429,
      this.SEVERITY_LEVELS.MEDIUM,
      context
    )
  }

  static createDatabaseError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.DATABASE_ERROR,
      500,
      this.SEVERITY_LEVELS.HIGH,
      context
    )
  }

  static createInternalError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.INTERNAL_ERROR,
      500,
      this.SEVERITY_LEVELS.HIGH,
      context
    )
  }

  static createExternalServiceError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(
      message,
      this.ERROR_TYPES.EXTERNAL_SERVICE_ERROR,
      502,
      this.SEVERITY_LEVELS.HIGH,
      context
    )
  }

  // Error handler for API routes
  static handleApiError(error: any, context: ErrorContext = {}): {
    statusCode: number
    message: string
    type: string
    details?: any
  } {
    // Log the error
    this.logError(error, context)

    // Handle known error types
    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        message: error.message,
        type: error.type,
        details: error.context
      }
    }

    // Handle Supabase errors
    if (error instanceof SupabaseError) {
      return this.handleSupabaseError(error, context)
    }

    // Handle validation errors
    if (error.name === 'ValidationError' || error.name === 'ZodError') {
      return {
        statusCode: 400,
        message: 'Validation failed',
        type: this.ERROR_TYPES.VALIDATION_ERROR,
        details: error.details || error.issues
      }
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        statusCode: 502,
        message: 'Service temporarily unavailable',
        type: this.ERROR_TYPES.NETWORK_ERROR
      }
    }

    // Handle rate limiting
    if (error.status === 429) {
      return {
        statusCode: 429,
        message: 'Too many requests',
        type: this.ERROR_TYPES.RATE_LIMIT_ERROR
      }
    }

    // Default to internal server error
    return {
      statusCode: 500,
      message: 'Internal server error',
      type: this.ERROR_TYPES.INTERNAL_ERROR
    }
  }

  // Handle Supabase specific errors
  private static handleSupabaseError(error: SupabaseError, context: ErrorContext): {
    statusCode: number
    message: string
    type: string
    details?: any
  } {
    const errorCode = error.code || 'unknown'
    
    switch (errorCode) {
      case 'PGRST116':
        return {
          statusCode: 404,
          message: 'Resource not found',
          type: this.ERROR_TYPES.NOT_FOUND_ERROR
        }
      
      case '23505': // Unique constraint violation
        return {
          statusCode: 409,
          message: 'Resource already exists',
          type: this.ERROR_TYPES.CONFLICT_ERROR
        }
      
      case '23503': // Foreign key constraint violation
        return {
          statusCode: 400,
          message: 'Invalid reference',
          type: this.ERROR_TYPES.VALIDATION_ERROR
        }
      
      case '42501': // Insufficient privilege
        return {
          statusCode: 403,
          message: 'Insufficient permissions',
          type: this.ERROR_TYPES.AUTHORIZATION_ERROR
        }
      
      case '42P01': // Undefined table
        return {
          statusCode: 500,
          message: 'Database configuration error',
          type: this.ERROR_TYPES.DATABASE_ERROR
        }
      
      default:
        return {
          statusCode: 500,
          message: error.message || 'Database error',
          type: this.ERROR_TYPES.DATABASE_ERROR,
          details: {
            code: errorCode,
            hint: error.hint,
            details: error.details
          }
        }
    }
  }

  // Error logging
  static logError(error: any, context: ErrorContext = {}): void {
    const errorData = {
      message: error.message || 'Unknown error',
      type: error.type || 'unknown',
      severity: error.severity || this.SEVERITY_LEVELS.MEDIUM,
      stack: error.stack,
      context: {
        ...context,
        timestamp: new Date().toISOString()
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', errorData)
    }

    // Track error analytics
    analytics.trackError({
      errorType: errorData.type,
      severity: errorData.severity,
      message: errorData.message,
      context: errorData.context
    })

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToExternalService(errorData)
    }
  }

  // Log to external service (e.g., Sentry, LogRocket, etc.)
  private static logToExternalService(errorData: any): void {
    // Implement your external logging service here
    // Example: Sentry.captureException(error)
    console.log('External logging:', errorData)
  }

  // Error recovery strategies
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Don't retry certain error types
        if (error instanceof AppError && 
            (error.type === this.ERROR_TYPES.VALIDATION_ERROR ||
             error.type === this.ERROR_TYPES.AUTHENTICATION_ERROR ||
             error.type === this.ERROR_TYPES.AUTHORIZATION_ERROR)) {
          throw error
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
    }

    throw lastError
  }

  // Circuit breaker pattern
  private static circuitBreakers: Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    failureCount: number
    lastFailureTime: number
    successCount: number
  }> = new Map()

  static async executeWithCircuitBreaker<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number
      timeout?: number
      resetTimeout?: number
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      timeout = 5000,
      resetTimeout = 60000
    } = options

    const breaker = this.circuitBreakers.get(key) || {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0
    }

    // Check if circuit is open
    if (breaker.state === 'OPEN') {
      if (Date.now() - breaker.lastFailureTime > resetTimeout) {
        breaker.state = 'HALF_OPEN'
        breaker.successCount = 0
      } else {
        throw this.createExternalServiceError('Service temporarily unavailable')
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ])

      // Success - reset circuit breaker
      if (breaker.state === 'HALF_OPEN') {
        breaker.successCount++
        if (breaker.successCount >= 3) {
          breaker.state = 'CLOSED'
          breaker.failureCount = 0
        }
      } else {
        breaker.failureCount = 0
      }

      this.circuitBreakers.set(key, breaker)
      return result

    } catch (error) {
      // Failure - update circuit breaker
      breaker.failureCount++
      breaker.lastFailureTime = Date.now()

      if (breaker.failureCount >= failureThreshold) {
        breaker.state = 'OPEN'
      }

      this.circuitBreakers.set(key, breaker)
      throw error
    }
  }

  // Error monitoring and alerting
  static async checkErrorThresholds(): Promise<void> {
    // This would typically check error rates and send alerts
    // Implementation depends on your monitoring setup
    console.log('Checking error thresholds...')
  }

  // Graceful shutdown error handling
  static setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2']
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, shutting down gracefully...`)
        
        try {
          // Cleanup resources
          await this.cleanup()
          process.exit(0)
        } catch (error) {
          console.error('Error during graceful shutdown:', error)
          process.exit(1)
        }
      })
    })
  }

  private static async cleanup(): Promise<void> {
    // Implement cleanup logic here
    console.log('Cleaning up resources...')
  }
}

// Error boundary for React components
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    ErrorHandlingService.logError(error, {
      additionalData: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="error-boundary">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  )
}

// Export error handling utilities
export const errorHandler = ErrorHandlingService
export const AppError = ErrorHandlingService.AppError
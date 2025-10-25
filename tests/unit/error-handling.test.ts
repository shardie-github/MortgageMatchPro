import { 
  AppError, 
  ErrorCode, 
  handleError, 
  handleValidationError,
  handleRateLimitError,
  handleDatabaseError,
  handleExternalApiError,
  handleTimeoutError,
  asyncHandler,
  withRetry,
  CircuitBreaker,
  setupGlobalErrorHandlers
} from '@/lib/error-handling'
import { NextApiRequest, NextApiResponse } from 'next'

// Mock the monitoring module
jest.mock('@/lib/monitoring', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}))

describe('Error Handling System', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let mockJson: jest.Mock
  let mockStatus: jest.Mock

  beforeEach(() => {
    mockJson = jest.fn()
    mockStatus = jest.fn().mockReturnValue({ json: mockJson })
    
    mockReq = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1'
      },
      body: { userId: 'test-user' }
    }
    
    mockRes = {
      status: mockStatus,
      json: mockJson
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('AppError', () => {
    test('should create AppError with correct properties', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Test error',
        400,
        true,
        { field: 'test' }
      )

      expect(error.name).toBe('AppError')
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
      expect(error.details).toEqual({ field: 'test' })
      expect(error.message).toBe('Test error')
    })

    test('should have correct default values', () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Test error')

      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error.details).toBeUndefined()
    })
  })

  describe('handleError', () => {
    test('should handle AppError correctly', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        400,
        true
      )

      handleError(error, mockReq as NextApiRequest, mockRes as NextApiResponse, 'test')

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.VALIDATION_ERROR,
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        timestamp: expect.any(String),
        requestId: expect.any(String),
        details: undefined
      })
    })

    test('should handle regular Error correctly', () => {
      const error = new Error('Unexpected error')

      handleError(error, mockReq as NextApiRequest, mockRes as NextApiResponse, 'test')

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Unexpected error',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      })
    })

    test('should mask internal errors in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Internal error')
      handleError(error, mockReq as NextApiRequest, mockRes as NextApiResponse, 'test')

      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred. Please try again later.',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      })

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('handleValidationError', () => {
    test('should handle validation errors correctly', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ]

      handleValidationError(errors, mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.VALIDATION_ERROR,
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        timestamp: expect.any(String),
        requestId: expect.any(String),
        details: { validationErrors: errors }
      })
    })
  })

  describe('handleRateLimitError', () => {
    test('should handle rate limit errors correctly', () => {
      handleRateLimitError(mockReq as NextApiRequest, mockRes as NextApiResponse, 60)

      expect(mockStatus).toHaveBeenCalledWith(429)
      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.RATE_LIMIT_EXCEEDED,
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        timestamp: expect.any(String),
        requestId: expect.any(String),
        details: { retryAfter: 60 }
      })
    })
  })

  describe('handleDatabaseError', () => {
    test('should handle database errors correctly', () => {
      const error = new Error('Connection failed')
      handleDatabaseError(error, mockReq as NextApiRequest, mockRes as NextApiResponse, 'SELECT')

      expect(mockStatus).toHaveBeenCalledWith(503)
      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.DATABASE_ERROR,
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database operation failed: SELECT',
        timestamp: expect.any(String),
        requestId: expect.any(String),
        details: { originalError: 'Connection failed', operation: 'SELECT' }
      })
    })
  })

  describe('handleExternalApiError', () => {
    test('should handle external API errors correctly', () => {
      const error = new Error('API timeout')
      handleExternalApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse, 'Stripe')

      expect(mockStatus).toHaveBeenCalledWith(502)
      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.EXTERNAL_API_ERROR,
        code: ErrorCode.EXTERNAL_API_ERROR,
        message: 'External service error: Stripe',
        timestamp: expect.any(String),
        requestId: expect.any(String),
        details: { originalError: 'API timeout', service: 'Stripe' }
      })
    })
  })

  describe('handleTimeoutError', () => {
    test('should handle timeout errors correctly', () => {
      handleTimeoutError(mockReq as NextApiRequest, mockRes as NextApiResponse, 'API call', 5000)

      expect(mockStatus).toHaveBeenCalledWith(408)
      expect(mockJson).toHaveBeenCalledWith({
        error: ErrorCode.TIMEOUT,
        code: ErrorCode.TIMEOUT,
        message: 'Operation timed out: API call',
        timestamp: expect.any(String),
        requestId: expect.any(String),
        details: { operation: 'API call', timeoutMs: 5000 }
      })
    })
  })

  describe('asyncHandler', () => {
    test('should wrap async function and handle errors', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'))
      const wrappedHandler = asyncHandler(mockHandler)

      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes)
      expect(mockStatus).toHaveBeenCalledWith(500)
    })

    test('should pass through successful results', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined)
      const wrappedHandler = asyncHandler(mockHandler)

      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes)
      expect(mockStatus).not.toHaveBeenCalled()
    })
  })

  describe('withRetry', () => {
    test('should retry failed operations', async () => {
      let attemptCount = 0
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })

      const result = await withRetry(operation, 3, 10)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    test('should throw error after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'))

      await expect(withRetry(operation, 2, 10)).rejects.toThrow('Persistent failure')
      expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    test('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await withRetry(operation, 3, 10)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(2, 1000, 500)
    })

    test('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await circuitBreaker.execute(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    test('should open circuit after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service down'))

      // First two failures
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down')
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down')

      // Third call should open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open')

      expect(operation).toHaveBeenCalledTimes(2)
    })

    test('should transition to half-open after reset timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service down'))

      // Open the circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down')
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down')
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open')

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should be half-open now
      operation.mockResolvedValue('success')
      const result = await circuitBreaker.execute(operation)

      expect(result).toBe('success')
    })

    test('should close circuit after successful operation in half-open state', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service down'))

      // Open the circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down')
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service down')
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open')

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 600))

      // Success should close the circuit
      operation.mockResolvedValue('success')
      await circuitBreaker.execute(operation)

      // Next call should work normally
      const result = await circuitBreaker.execute(operation)
      expect(result).toBe('success')
    })
  })

  describe('setupGlobalErrorHandlers', () => {
    test('should set up global error handlers', () => {
      const originalOn = process.on
      const mockOn = jest.fn()
      process.on = mockOn

      setupGlobalErrorHandlers()

      expect(mockOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
      expect(mockOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function))

      process.on = originalOn
    })
  })
})

import { ApiService, ApiServiceFactory, apiUtils } from '../../lib/api/api-service'
import { ApiError, ApiErrorType } from '../../lib/api/request-manager'

// Mock axios
jest.mock('axios')
const mockedAxios = require('axios')

describe('API Edge Cases and Error Handling', () => {
  let apiService: ApiService

  beforeEach(() => {
    jest.clearAllMocks()
    apiService = new ApiService({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      retries: 2
    })
  })

  describe('Network Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          code: 'ECONNABORTED',
          message: 'timeout of 5000ms exceeded'
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('timeout')
    })

    it('should handle network disconnection', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          code: 'ERR_NETWORK',
          message: 'Network Error'
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Network error')
    })

    it('should handle DNS resolution failures', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          code: 'ENOTFOUND',
          message: 'getaddrinfo ENOTFOUND api.example.com'
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Network error')
    })
  })

  describe('HTTP Error Handling', () => {
    it('should handle 400 Bad Request', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          response: {
            status: 400,
            data: { error: 'Invalid request data' }
          }
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid request data')
    })

    it('should handle 401 Unauthorized', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          response: {
            status: 401,
            data: { error: 'Unauthorized' }
          }
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Authentication required')
    })

    it('should handle 403 Forbidden', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          response: {
            status: 403,
            data: { error: 'Forbidden' }
          }
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Access forbidden')
    })

    it('should handle 429 Rate Limited', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          response: {
            status: 429,
            data: { error: 'Too Many Requests' }
          }
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Rate limit exceeded')
    })

    it('should handle 500 Internal Server Error', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          response: {
            status: 500,
            data: { error: 'Internal Server Error' }
          }
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Server error')
    })

    it('should handle 502 Bad Gateway', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          response: {
            status: 502,
            data: { error: 'Bad Gateway' }
          }
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Server error')
    })

    it('should handle 503 Service Unavailable', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockRejectedValue({
          response: {
            status: 503,
            data: { error: 'Service Unavailable' }
          }
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Server error')
    })
  })

  describe('Retry Logic Edge Cases', () => {
    it('should retry on retryable errors', async () => {
      let attemptCount = 0
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount < 3) {
            return Promise.reject({
              code: 'ERR_NETWORK',
              message: 'Network Error'
            })
          }
          return Promise.resolve({ data: { success: true } })
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(true)
      expect(attemptCount).toBe(3)
    })

    it('should not retry on non-retryable errors', async () => {
      let attemptCount = 0
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockImplementation(() => {
          attemptCount++
          return Promise.reject({
            response: {
              status: 400,
              data: { error: 'Bad Request' }
            }
          })
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(attemptCount).toBe(1) // Should not retry on 400 errors
    })

    it('should respect retry limits', async () => {
      let attemptCount = 0
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockImplementation(() => {
          attemptCount++
          return Promise.reject({
            code: 'ERR_NETWORK',
            message: 'Network Error'
          })
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(false)
      expect(attemptCount).toBe(3) // Should retry exactly 3 times (1 initial + 2 retries)
    })
  })

  describe('Data Validation Edge Cases', () => {
    it('should handle malformed JSON responses', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: 'invalid json{',
          status: 200
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('invalid json{')
    })

    it('should handle empty responses', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: null,
          status: 200
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should handle very large responses', async () => {
      const largeData = { data: 'x'.repeat(1000000) } // 1MB string
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: largeData,
          status: 200
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(largeData)
    })

    it('should handle circular references in data', async () => {
      const circularData: any = { name: 'test' }
      circularData.self = circularData

      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: circularData,
          status: 200
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: { success: true },
          status: 200
        })
      })

      const promises = Array.from({ length: 10 }, (_, i) => 
        apiService.get(`/test${i}`)
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })

    it('should handle mixed success and failure responses', async () => {
      let requestCount = 0
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockImplementation(() => {
          requestCount++
          if (requestCount % 2 === 0) {
            return Promise.resolve({
              data: { success: true },
              status: 200
            })
          } else {
            return Promise.reject({
              response: {
                status: 500,
                data: { error: 'Server Error' }
              }
            })
          }
        })
      })

      const promises = Array.from({ length: 6 }, (_, i) => 
        apiService.get(`/test${i}`)
      )

      const results = await Promise.all(promises)
      
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length
      
      expect(successCount).toBe(3)
      expect(failureCount).toBe(3)
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating many large objects
      const largeObjects = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000)
      }))

      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: largeObjects,
          status: 200
        })
      })

      const result = await apiService.get('/test')
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1000)
    })

    it('should handle rapid successive requests', async () => {
      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: { success: true },
          status: 200
        })
      })

      const startTime = Date.now()
      const promises = Array.from({ length: 100 }, (_, i) => 
        apiService.get(`/test${i}`)
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      
      expect(results).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    })
  })

  describe('API Service Factory Edge Cases', () => {
    it('should handle service registration and retrieval', () => {
      const testService = new ApiService({
        baseURL: 'https://test.example.com'
      })

      ApiServiceFactory.registerService('test', testService)
      
      const retrievedService = ApiServiceFactory.getService('test')
      expect(retrievedService).toBe(testService)
    })

    it('should handle service removal', () => {
      const testService = new ApiService({
        baseURL: 'https://test.example.com'
      })

      ApiServiceFactory.registerService('test', testService)
      expect(ApiServiceFactory.removeService('test')).toBe(true)
      expect(ApiServiceFactory.removeService('nonexistent')).toBe(false)
    })

    it('should handle service listing', () => {
      ApiServiceFactory.registerService('service1', new ApiService({
        baseURL: 'https://service1.example.com'
      }))
      ApiServiceFactory.registerService('service2', new ApiService({
        baseURL: 'https://service2.example.com'
      }))

      const services = ApiServiceFactory.listServices()
      expect(services).toContain('service1')
      expect(services).toContain('service2')
    })
  })

  describe('Utility Functions Edge Cases', () => {
    it('should identify retryable errors correctly', () => {
      const retryableError = new ApiError('Network error', ApiErrorType.NETWORK_ERROR)
      const nonRetryableError = new ApiError('Bad request', ApiErrorType.VALIDATION_ERROR)

      expect(apiUtils.isRetryableError(retryableError)).toBe(true)
      expect(apiUtils.isRetryableError(nonRetryableError)).toBe(false)
    })

    it('should handle retry with exponential backoff', async () => {
      let attemptCount = 0
      const mockRequest = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          throw new ApiError('Network error', ApiErrorType.NETWORK_ERROR)
        }
        return Promise.resolve('success')
      })

      const result = await apiUtils.withRetry(mockRequest, 3, 100)
      
      expect(result).toBe('success')
      expect(attemptCount).toBe(3)
    })

    it('should handle timeout correctly', async () => {
      const slowRequest = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 2000))
      )

      await expect(
        apiUtils.withTimeout(slowRequest, 1000)
      ).rejects.toThrow('Request timeout')
    })
  })

  describe('Error Message Handling', () => {
    it('should provide user-friendly error messages', () => {
      const networkError = new ApiError('Network error', ApiErrorType.NETWORK_ERROR)
      const timeoutError = new ApiError('Timeout', ApiErrorType.TIMEOUT_ERROR)
      const validationError = new ApiError('Validation failed', ApiErrorType.VALIDATION_ERROR)

      expect(apiUtils.handleError(networkError)).toContain('Network connection failed')
      expect(apiUtils.handleError(timeoutError)).toContain('Request timed out')
      expect(apiUtils.handleError(validationError)).toContain('Invalid data provided')
    })

    it('should handle unknown error types', () => {
      const unknownError = new Error('Unknown error')
      expect(apiUtils.handleError(unknownError)).toBe('An unexpected error occurred')
    })
  })
})
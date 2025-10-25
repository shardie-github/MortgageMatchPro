import axios from 'axios'
import { 
  ApiError, 
  ApiErrorType, 
  createApiClient, 
  makeRequest, 
  apiRequests,
  isRetryableError,
  getErrorMessage 
} from '../../../lib/api/request-manager'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('API Request Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ApiError', () => {
    it('should create error with correct properties', () => {
      const error = new ApiError(
        'Test error',
        ApiErrorType.NETWORK_ERROR,
        500,
        { data: 'test' },
        'req-123'
      )

      expect(error.message).toBe('Test error')
      expect(error.type).toBe(ApiErrorType.NETWORK_ERROR)
      expect(error.status).toBe(500)
      expect(error.response).toEqual({ data: 'test' })
      expect(error.requestId).toBe('req-123')
      expect(error.name).toBe('ApiError')
    })
  })

  describe('createApiClient', () => {
    it('should create axios instance with correct configuration', () => {
      const client = createApiClient('https://api.test.com', 'test-key')
      
      expect(client.defaults.baseURL).toBe('https://api.test.com')
      expect(client.defaults.timeout).toBe(30000)
      expect(client.defaults.headers['Content-Type']).toBe('application/json')
      expect(client.defaults.headers['Accept']).toBe('application/json')
    })

    it('should create client without API key', () => {
      const client = createApiClient('https://api.test.com')
      
      expect(client.defaults.baseURL).toBe('https://api.test.com')
      expect(client.defaults.headers['Authorization']).toBeUndefined()
    })
  })

  describe('makeRequest', () => {
    let mockAxiosInstance: any

    beforeEach(() => {
      mockAxiosInstance = {
        request: jest.fn()
      }
    })

    it('should make successful request', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const result = await makeRequest(mockAxiosInstance, {
        method: 'GET',
        url: '/test'
      })

      expect(result).toEqual({ success: true })
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test'
      })
    })

    it('should handle retryable errors with retry logic', async () => {
      const mockError = new ApiError(
        'Network error',
        ApiErrorType.NETWORK_ERROR,
        500
      )

      mockAxiosInstance.request
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ data: { success: true } })

      const result = await makeRequest(mockAxiosInstance, {
        method: 'GET',
        url: '/test',
        retries: 1,
        retryDelay: 100
      })

      expect(result).toEqual({ success: true })
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      const mockError = new ApiError(
        'Network error',
        ApiErrorType.NETWORK_ERROR,
        500
      )

      mockAxiosInstance.request.mockRejectedValue(mockError)

      await expect(makeRequest(mockAxiosInstance, {
        method: 'GET',
        url: '/test',
        retries: 2,
        retryDelay: 100
      })).rejects.toThrow('Network error')

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const mockError = new ApiError(
        'Validation error',
        ApiErrorType.VALIDATION_ERROR,
        400
      )

      mockAxiosInstance.request.mockRejectedValue(mockError)

      await expect(makeRequest(mockAxiosInstance, {
        method: 'GET',
        url: '/test',
        retries: 2
      })).rejects.toThrow('Validation error')

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1)
    })
  })

  describe('apiRequests', () => {
    let mockOpenaiClient: any
    let mockSupabaseClient: any

    beforeEach(() => {
      mockOpenaiClient = {
        request: jest.fn()
      }
      mockSupabaseClient = {
        request: jest.fn()
      }

      // Mock the clients
      jest.doMock('../../../lib/api/request-manager', () => ({
        ...jest.requireActual('../../../lib/api/request-manager'),
        openaiClient: mockOpenaiClient,
        supabaseClient: mockSupabaseClient
      }))
    })

    describe('OpenAI requests', () => {
      it('should make chat completion request', async () => {
        const mockResponse = {
          data: { choices: [{ message: { content: 'Test response' } }] }
        }
        mockOpenaiClient.request.mockResolvedValue(mockResponse)

        const result = await apiRequests.openai.chatCompletion([
          { role: 'user', content: 'Test message' }
        ])

        expect(result).toEqual({ choices: [{ message: { content: 'Test response' } }] })
        expect(mockOpenaiClient.request).toHaveBeenCalledWith({
          method: 'POST',
          url: '/chat/completions',
          data: {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Test message' }]
          },
          retries: 2,
          retryDelay: 1000
        })
      })

      it('should make embeddings request', async () => {
        const mockResponse = {
          data: { data: [{ embedding: [0.1, 0.2, 0.3] }] }
        }
        mockOpenaiClient.request.mockResolvedValue(mockResponse)

        const result = await apiRequests.openai.embeddings('Test text')

        expect(result).toEqual({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        expect(mockOpenaiClient.request).toHaveBeenCalledWith({
          method: 'POST',
          url: '/embeddings',
          data: {
            model: 'text-embedding-ada-002',
            input: 'Test text'
          },
          retries: 2,
          retryDelay: 1000
        })
      })
    })

    describe('Supabase requests', () => {
      it('should make query request', async () => {
        const mockResponse = {
          data: [{ id: 1, name: 'Test' }]
        }
        mockSupabaseClient.request.mockResolvedValue(mockResponse)

        const result = await apiRequests.supabase.query('users', { limit: 10 })

        expect(result).toEqual([{ id: 1, name: 'Test' }])
        expect(mockSupabaseClient.request).toHaveBeenCalledWith({
          method: 'GET',
          url: '/rest/v1/users',
          params: { limit: 10 },
          retries: 1,
          retryDelay: 500
        })
      })

      it('should make insert request', async () => {
        const mockResponse = {
          data: { id: 1, name: 'Test' }
        }
        mockSupabaseClient.request.mockResolvedValue(mockResponse)

        const result = await apiRequests.supabase.insert('users', { name: 'Test' })

        expect(result).toEqual({ id: 1, name: 'Test' })
        expect(mockSupabaseClient.request).toHaveBeenCalledWith({
          method: 'POST',
          url: '/rest/v1/users',
          data: { name: 'Test' },
          retries: 1,
          retryDelay: 500
        })
      })

      it('should make update request', async () => {
        const mockResponse = {
          data: { id: 1, name: 'Updated' }
        }
        mockSupabaseClient.request.mockResolvedValue(mockResponse)

        const result = await apiRequests.supabase.update('users', { name: 'Updated' }, '1')

        expect(result).toEqual({ id: 1, name: 'Updated' })
        expect(mockSupabaseClient.request).toHaveBeenCalledWith({
          method: 'PATCH',
          url: '/rest/v1/users?id=eq.1',
          data: { name: 'Updated' },
          retries: 1,
          retryDelay: 500
        })
      })

      it('should make delete request', async () => {
        const mockResponse = {
          data: { id: 1 }
        }
        mockSupabaseClient.request.mockResolvedValue(mockResponse)

        const result = await apiRequests.supabase.delete('users', '1')

        expect(result).toEqual({ id: 1 })
        expect(mockSupabaseClient.request).toHaveBeenCalledWith({
          method: 'DELETE',
          url: '/rest/v1/users?id=eq.1',
          retries: 1,
          retryDelay: 500
        })
      })
    })
  })

  describe('Utility functions', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError(new ApiError('Test', ApiErrorType.NETWORK_ERROR))).toBe(true)
      expect(isRetryableError(new ApiError('Test', ApiErrorType.TIMEOUT_ERROR))).toBe(true)
      expect(isRetryableError(new ApiError('Test', ApiErrorType.SERVER_ERROR))).toBe(true)
      expect(isRetryableError(new ApiError('Test', ApiErrorType.VALIDATION_ERROR))).toBe(false)
      expect(isRetryableError(new ApiError('Test', ApiErrorType.AUTHENTICATION_ERROR))).toBe(false)
    })

    it('should return correct error messages', () => {
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.NETWORK_ERROR)))
        .toBe('Network connection failed. Please check your internet connection.')
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.TIMEOUT_ERROR)))
        .toBe('Request timed out. Please try again.')
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.VALIDATION_ERROR)))
        .toBe('Invalid data provided. Please check your input.')
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.AUTHENTICATION_ERROR)))
        .toBe('Authentication failed. Please log in again.')
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.AUTHORIZATION_ERROR)))
        .toBe('You do not have permission to perform this action.')
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.RATE_LIMIT_ERROR)))
        .toBe('Too many requests. Please wait a moment and try again.')
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.SERVER_ERROR)))
        .toBe('Server error occurred. Please try again later.')
      expect(getErrorMessage(new ApiError('Test', ApiErrorType.UNKNOWN_ERROR)))
        .toBe('An unexpected error occurred. Please try again.')
    })
  })
})

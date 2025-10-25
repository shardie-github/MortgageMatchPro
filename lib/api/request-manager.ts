import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { getOpenAIKey, getSupabaseUrl, getSupabaseAnonKey, isProduction } from '../config/keys'

// Request configuration interface
interface RequestConfig extends AxiosRequestConfig {
  retries?: number
  retryDelay?: number
  timeout?: number
  enableRetry?: boolean
  enableLogging?: boolean
}

// Error types
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Custom error class
export class ApiError extends Error {
  public type: ApiErrorType
  public status?: number
  public response?: any
  public requestId?: string

  constructor(
    message: string,
    type: ApiErrorType,
    status?: number,
    response?: any,
    requestId?: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.type = type
    this.status = status
    this.response = response
    this.requestId = requestId
  }
}

// Request interceptor for adding common headers and logging
const createRequestInterceptor = (apiKey?: string) => {
  return (config: any) => {
    // Add common headers
    config.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers
    }

    // Add API key if provided
    if (apiKey) {
      config.headers['Authorization'] = `Bearer ${apiKey}`
    }

    // Add request ID for tracking
    config.metadata = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now()
    }

    // Log request in development
    if (!isProduction && config.enableLogging !== false) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        requestId: config.metadata.requestId,
        headers: config.headers,
        data: config.data
      })
    }

    return config
  }
}

// Response interceptor for error handling and logging
const createResponseInterceptor = () => {
  return {
    onFulfilled: (response: AxiosResponse) => {
      const { config } = response
      const duration = Date.now() - (config.metadata?.startTime || 0)

      // Log successful response in development
      if (!isProduction && config.enableLogging !== false) {
        console.log(`[API Response] ${config.method?.toUpperCase()} ${config.url}`, {
          requestId: config.metadata?.requestId,
          status: response.status,
          duration: `${duration}ms`,
          data: response.data
        })
      }

      return response
    },
    onRejected: (error: AxiosError) => {
      const { config, response, code } = error
      const duration = Date.now() - (config?.metadata?.startTime || 0)

      // Determine error type
      let errorType = ApiErrorType.UNKNOWN_ERROR
      let errorMessage = error.message

      if (code === 'ECONNABORTED') {
        errorType = ApiErrorType.TIMEOUT_ERROR
        errorMessage = 'Request timeout'
      } else if (code === 'ERR_NETWORK') {
        errorType = ApiErrorType.NETWORK_ERROR
        errorMessage = 'Network error'
      } else if (response) {
        switch (response.status) {
          case 400:
            errorType = ApiErrorType.VALIDATION_ERROR
            errorMessage = 'Invalid request data'
            break
          case 401:
            errorType = ApiErrorType.AUTHENTICATION_ERROR
            errorMessage = 'Authentication required'
            break
          case 403:
            errorType = ApiErrorType.AUTHORIZATION_ERROR
            errorMessage = 'Access forbidden'
            break
          case 429:
            errorType = ApiErrorType.RATE_LIMIT_ERROR
            errorMessage = 'Rate limit exceeded'
            break
          case 500:
          case 502:
          case 503:
          case 504:
            errorType = ApiErrorType.SERVER_ERROR
            errorMessage = 'Server error'
            break
        }
      }

      // Log error in development
      if (!isProduction && config?.enableLogging !== false) {
        console.error(`[API Error] ${config?.method?.toUpperCase()} ${config?.url}`, {
          requestId: config?.metadata?.requestId,
          status: response?.status,
          duration: `${duration}ms`,
          error: errorMessage,
          response: response?.data
        })
      }

      // Create custom error
      const apiError = new ApiError(
        errorMessage,
        errorType,
        response?.status,
        response?.data,
        config?.metadata?.requestId
      )

      return Promise.reject(apiError)
    }
  }
}

// Retry logic
const retryRequest = async (
  axiosInstance: AxiosInstance,
  config: RequestConfig,
  retryCount: number = 0
): Promise<AxiosResponse> => {
  const maxRetries = config.retries || 3
  const retryDelay = config.retryDelay || 1000

  try {
    return await axiosInstance.request(config)
  } catch (error) {
    if (error instanceof ApiError && retryCount < maxRetries) {
      // Only retry on certain error types
      const retryableErrors = [
        ApiErrorType.NETWORK_ERROR,
        ApiErrorType.TIMEOUT_ERROR,
        ApiErrorType.SERVER_ERROR
      ]

      if (retryableErrors.includes(error.type) && config.enableRetry !== false) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount)
        
        if (!isProduction) {
          console.log(`[API Retry] Retrying request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
        return retryRequest(axiosInstance, config, retryCount + 1)
      }
    }

    throw error
  }
}

// Create configured axios instance
export const createApiClient = (baseURL: string, apiKey?: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 30000, // 30 seconds default timeout
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })

  // Add request interceptor
  client.interceptors.request.use(createRequestInterceptor(apiKey))

  // Add response interceptor
  client.interceptors.response.use(
    createResponseInterceptor().onFulfilled,
    createResponseInterceptor().onRejected
  )

  return client
}

// Pre-configured API clients
export const openaiClient = createApiClient('https://api.openai.com/v1', getOpenAIKey())
export const supabaseClient = createApiClient(getSupabaseUrl(), getSupabaseAnonKey())

// Generic request function with retry logic
export const makeRequest = async <T = any>(
  client: AxiosInstance,
  config: RequestConfig
): Promise<T> => {
  try {
    const response = await retryRequest(client, config)
    return response.data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Wrap unknown errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      ApiErrorType.UNKNOWN_ERROR
    )
  }
}

// Specific API request functions
export const apiRequests = {
  // OpenAI API requests
  openai: {
    chatCompletion: async (messages: any[], model: string = 'gpt-4o-mini', options: any = {}) => {
      return makeRequest(openaiClient, {
        method: 'POST',
        url: '/chat/completions',
        data: {
          model,
          messages,
          ...options
        },
        retries: 2,
        retryDelay: 1000
      })
    },

    embeddings: async (input: string | string[], model: string = 'text-embedding-ada-002') => {
      return makeRequest(openaiClient, {
        method: 'POST',
        url: '/embeddings',
        data: {
          model,
          input
        },
        retries: 2,
        retryDelay: 1000
      })
    }
  },

  // Supabase API requests
  supabase: {
    query: async (table: string, options: any = {}) => {
      return makeRequest(supabaseClient, {
        method: 'GET',
        url: `/rest/v1/${table}`,
        params: options,
        retries: 1,
        retryDelay: 500
      })
    },

    insert: async (table: string, data: any) => {
      return makeRequest(supabaseClient, {
        method: 'POST',
        url: `/rest/v1/${table}`,
        data,
        retries: 1,
        retryDelay: 500
      })
    },

    update: async (table: string, data: any, id: string) => {
      return makeRequest(supabaseClient, {
        method: 'PATCH',
        url: `/rest/v1/${table}?id=eq.${id}`,
        data,
        retries: 1,
        retryDelay: 500
      })
    },

    delete: async (table: string, id: string) => {
      return makeRequest(supabaseClient, {
        method: 'DELETE',
        url: `/rest/v1/${table}?id=eq.${id}`,
        retries: 1,
        retryDelay: 500
      })
    }
  }
}

// Utility functions
export const isRetryableError = (error: ApiError): boolean => {
  const retryableTypes = [
    ApiErrorType.NETWORK_ERROR,
    ApiErrorType.TIMEOUT_ERROR,
    ApiErrorType.SERVER_ERROR
  ]
  return retryableTypes.includes(error.type)
}

export const getErrorMessage = (error: ApiError): string => {
  switch (error.type) {
    case ApiErrorType.NETWORK_ERROR:
      return 'Network connection failed. Please check your internet connection.'
    case ApiErrorType.TIMEOUT_ERROR:
      return 'Request timed out. Please try again.'
    case ApiErrorType.VALIDATION_ERROR:
      return 'Invalid data provided. Please check your input.'
    case ApiErrorType.AUTHENTICATION_ERROR:
      return 'Authentication failed. Please log in again.'
    case ApiErrorType.AUTHORIZATION_ERROR:
      return 'You do not have permission to perform this action.'
    case ApiErrorType.RATE_LIMIT_ERROR:
      return 'Too many requests. Please wait a moment and try again.'
    case ApiErrorType.SERVER_ERROR:
      return 'Server error occurred. Please try again later.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

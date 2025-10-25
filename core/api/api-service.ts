import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { createApiClient, makeRequest, ApiError, ApiErrorType } from './request-manager'
import { keyManager } from '../config/keys'

// API Service Configuration
interface ApiServiceConfig {
  baseURL: string
  timeout?: number
  retries?: number
  retryDelay?: number
  enableLogging?: boolean
}

// Request Options
interface RequestOptions {
  retries?: number
  retryDelay?: number
  timeout?: number
  enableLogging?: boolean
  headers?: Record<string, string>
}

// Response Wrapper
interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  requestId?: string
  timestamp: string
}

// API Service Class
export class ApiService {
  private client: AxiosInstance
  private config: ApiServiceConfig

  constructor(config: ApiServiceConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      enableLogging: true,
      ...config
    }

    this.client = createApiClient(
      this.config.baseURL,
      this.getApiKey()
    )
  }

  private getApiKey(): string | undefined {
    try {
      // Try to get the appropriate API key based on the base URL
      if (this.config.baseURL.includes('openai.com')) {
        return keyManager.getKey('openai')
      } else if (this.config.baseURL.includes('supabase')) {
        return keyManager.getKey('supabase_anon')
      }
      return undefined
    } catch (error) {
      console.warn('API key not found for service:', this.config.baseURL)
      return undefined
    }
  }

  // Generic request method
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const requestConfig: AxiosRequestConfig = {
        method,
        url: endpoint,
        data,
        timeout: options.timeout || this.config.timeout,
        retries: options.retries || this.config.retries,
        retryDelay: options.retryDelay || this.config.retryDelay,
        enableLogging: options.enableLogging ?? this.config.enableLogging,
        headers: {
          ...options.headers
        }
      }

      const response = await makeRequest<T>(this.client, requestConfig)
      
      return {
        data: response,
        success: true,
        requestId: requestConfig.metadata?.requestId,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          data: null as any,
          success: false,
          message: error.message,
          requestId: error.requestId,
          timestamp: new Date().toISOString()
        }
      }
      
      return {
        data: null as any,
        success: false,
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options)
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options)
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options)
  }

  async patch<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options)
  }

  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options)
  }

  // Batch requests
  async batch<T = any>(requests: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    endpoint: string
    data?: any
    options?: RequestOptions
  }>): Promise<ApiResponse<T>[]> {
    const promises = requests.map(req => 
      this.request<T>(req.method, req.endpoint, req.data, req.options)
    )
    
    return Promise.all(promises)
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', { 
        timeout: 5000,
        retries: 1 
      })
      return response.success
    } catch {
      return false
    }
  }
}

// Pre-configured API services
export const openaiService = new ApiService({
  baseURL: 'https://api.openai.com/v1',
  timeout: 60000, // Longer timeout for AI requests
  retries: 2
})

export const supabaseService = new ApiService({
  baseURL: keyManager.getKey('supabase_url'),
  timeout: 30000,
  retries: 2
})

// API Service Factory
export class ApiServiceFactory {
  private static services: Map<string, ApiService> = new Map()

  static getService(name: string, config?: ApiServiceConfig): ApiService {
    if (!this.services.has(name)) {
      if (!config) {
        throw new Error(`Service '${name}' not found and no config provided`)
      }
      this.services.set(name, new ApiService(config))
    }
    return this.services.get(name)!
  }

  static registerService(name: string, service: ApiService): void {
    this.services.set(name, service)
  }

  static removeService(name: string): boolean {
    return this.services.delete(name)
  }

  static listServices(): string[] {
    return Array.from(this.services.keys())
  }
}

// Utility functions for common API operations
export const apiUtils = {
  // Handle API errors consistently
  handleError: (error: any): string => {
    if (error instanceof ApiError) {
      return error.message
    }
    return 'An unexpected error occurred'
  },

  // Check if error is retryable
  isRetryableError: (error: any): boolean => {
    if (error instanceof ApiError) {
      return [
        ApiErrorType.NETWORK_ERROR,
        ApiErrorType.TIMEOUT_ERROR,
        ApiErrorType.SERVER_ERROR
      ].includes(error.type)
    }
    return false
  },

  // Create request with exponential backoff
  withRetry: async <T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries || !apiUtils.isRetryableError(error)) {
          throw error
        }
        
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  },

  // Create request with timeout
  withTimeout: <T>(
    requestFn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    return Promise.race([
      requestFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ])
  }
}

// Export types
export type { ApiServiceConfig, RequestOptions, ApiResponse }
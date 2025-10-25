import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

// API response with metadata
interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
  fromCache?: boolean;
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
        )
      ]);

      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }

      return result as T;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

class CacheManager {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  // Persist cache to AsyncStorage
  async persistCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.cache);
      await AsyncStorage.setItem('api_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  // Restore cache from AsyncStorage
  async restoreCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem('api_cache');
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to restore cache:', error);
    }
  }
}

class EnhancedApiService {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private cacheManager: CacheManager;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.cacheManager = new CacheManager();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      timeout: 10000, // 10 seconds
      resetTimeout: 30000, // 30 seconds
    });

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.cacheManager.restoreCache();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('Response interceptor error:', error);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 
                    error.response.data?.error || 
                    `Server error: ${error.response.status}`;
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private generateCacheKey(url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}${paramString}`;
  }

  // Enhanced GET with caching and circuit breaker
  async get<T>(
    url: string, 
    config?: AxiosRequestConfig,
    cacheConfig?: CacheConfig
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.generateCacheKey(url, config?.params);
    
    // Check cache first
    if (cacheConfig) {
      const cachedData = this.cacheManager.get<T>(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          success: true,
          timestamp: Date.now(),
          fromCache: true,
        };
      }
    }

    try {
      const response = await this.circuitBreaker.execute(async () => {
        const headers = await this.getAuthHeaders();
        return this.axiosInstance.get<T>(url, {
          ...config,
          headers: { ...headers, ...config?.headers },
        });
      });

      const apiResponse: ApiResponse<T> = {
        data: response.data,
        success: true,
        timestamp: Date.now(),
      };

      // Cache the response
      if (cacheConfig) {
        this.cacheManager.set(cacheKey, response.data, cacheConfig.ttl);
      }

      return apiResponse;
    } catch (error) {
      // Try to return cached data on error
      if (cacheConfig) {
        const cachedData = this.cacheManager.get<T>(cacheKey);
        if (cachedData) {
          return {
            data: cachedData,
            success: true,
            timestamp: Date.now(),
            fromCache: true,
            error: 'Using cached data due to API error',
          };
        }
      }

      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  // Enhanced POST with retry logic
  async post<T>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        const headers = await this.getAuthHeaders();
        return this.axiosInstance.post<T>(url, data, {
          ...config,
          headers: { ...headers, ...config?.headers },
        });
      });

      return {
        data: response.data,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  // Enhanced PUT with retry logic
  async put<T>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        const headers = await this.getAuthHeaders();
        return this.axiosInstance.put<T>(url, data, {
          ...config,
          headers: { ...headers, ...config?.headers },
        });
      });

      return {
        data: response.data,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  // Enhanced DELETE with retry logic
  async delete<T>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        const headers = await this.getAuthHeaders();
        return this.axiosInstance.delete<T>(url, {
          ...config,
          headers: { ...headers, ...config?.headers },
        });
      });

      return {
        data: response.data,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Get circuit breaker state
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  // Reset circuit breaker
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  // Clear cache
  clearCache(): void {
    this.cacheManager.clear();
  }

  // Persist cache
  async persistCache(): Promise<void> {
    await this.cacheManager.persistCache();
  }
}

// Export singleton instance
export const enhancedApiService = new EnhancedApiService(process.env.API_BASE_URL || 'http://localhost:3000/api');

// Export types
export type { ApiResponse, CacheConfig, CircuitBreakerConfig };
export { CircuitState };
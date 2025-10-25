import { useState, useCallback, useRef, useEffect } from 'react'
import { ApiError, ApiErrorType, getErrorMessage } from '../api/request-manager'

// API state interface
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  success: boolean
}

// API options interface
interface UseApiOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
  retryOnError?: boolean
  maxRetries?: number
}

// Custom hook for API calls
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const {
    immediate = false,
    onSuccess,
    onError,
    retryOnError = false,
    maxRetries = 3
  } = options

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false
  })

  const retryCountRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Reset state
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    })
    retryCountRef.current = 0
  }, [])

  // Execute API call
  const execute = useCallback(async (...args: any[]) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: false
    }))

    try {
      const result = await apiFunction(...args)
      
      setState({
        data: result,
        loading: false,
        error: null,
        success: true
      })

      onSuccess?.(result)
      retryCountRef.current = 0

      return result
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        ApiErrorType.UNKNOWN_ERROR
      )

      // Handle retry logic
      if (retryOnError && retryCountRef.current < maxRetries) {
        const retryableErrors = [
          ApiErrorType.NETWORK_ERROR,
          ApiErrorType.TIMEOUT_ERROR,
          ApiErrorType.SERVER_ERROR
        ]

        if (retryableErrors.includes(apiError.type)) {
          retryCountRef.current++
          
          // Exponential backoff
          const delay = Math.pow(2, retryCountRef.current) * 1000
          
          setTimeout(() => {
            execute(...args)
          }, delay)

          return
        }
      }

      setState({
        data: null,
        loading: false,
        error: apiError,
        success: false
      })

      onError?.(apiError)
      retryCountRef.current = 0

      throw apiError
    }
  }, [apiFunction, onSuccess, onError, retryOnError, maxRetries])

  // Execute immediately on mount
  useEffect(() => {
    if (immediate) {
      execute()
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [immediate, execute])

  return {
    ...state,
    execute,
    reset,
    errorMessage: state.error ? getErrorMessage(state.error) : null,
    isRetryable: state.error ? retryOnError && retryCountRef.current < maxRetries : false
  }
}

// Hook for multiple API calls
export function useMultipleApi<T = any>(
  apiFunctions: Array<(...args: any[]) => Promise<T>>,
  options: UseApiOptions = {}
) {
  const [state, setState] = useState<{
    data: T[]
    loading: boolean
    error: ApiError | null
    success: boolean
    completed: number
    total: number
  }>({
    data: [],
    loading: false,
    error: null,
    success: false,
    completed: 0,
    total: apiFunctions.length
  })

  const executeAll = useCallback(async (...args: any[]) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
      completed: 0,
      data: []
    }))

    try {
      const results = await Promise.all(
        apiFunctions.map(async (apiFunction, index) => {
          try {
            const result = await apiFunction(...args)
            setState(prev => ({
              ...prev,
              completed: prev.completed + 1
            }))
            return result
          } catch (error) {
            setState(prev => ({
              ...prev,
              completed: prev.completed + 1
            }))
            throw error
          }
        })
      )

      setState(prev => ({
        ...prev,
        data: results,
        loading: false,
        success: true
      }))

      options.onSuccess?.(results)
      return results
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        ApiErrorType.UNKNOWN_ERROR
      )

      setState(prev => ({
        ...prev,
        loading: false,
        error: apiError,
        success: false
      }))

      options.onError?.(apiError)
      throw apiError
    }
  }, [apiFunctions, options])

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      success: false,
      completed: 0,
      total: apiFunctions.length
    })
  }, [apiFunctions.length])

  return {
    ...state,
    executeAll,
    reset,
    errorMessage: state.error ? getErrorMessage(state.error) : null,
    progress: state.total > 0 ? (state.completed / state.total) * 100 : 0
  }
}

// Hook for paginated API calls
export function usePaginatedApi<T = any>(
  apiFunction: (page: number, limit: number, ...args: any[]) => Promise<{
    data: T[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }>,
  options: UseApiOptions & {
    pageSize?: number
    initialPage?: number
  } = {}
) {
  const {
    pageSize = 10,
    initialPage = 1,
    ...apiOptions
  } = options

  const [state, setState] = useState<{
    data: T[]
    loading: boolean
    error: ApiError | null
    success: boolean
    page: number
    hasMore: boolean
    total: number
  }>({
    data: [],
    loading: false,
    error: null,
    success: false,
    page: initialPage,
    hasMore: true,
    total: 0
  })

  const loadPage = useCallback(async (page: number, ...args: any[]) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      const result = await apiFunction(page, pageSize, ...args)
      
      setState(prev => ({
        ...prev,
        data: page === 1 ? result.data : [...prev.data, ...result.data],
        loading: false,
        success: true,
        page: result.page,
        hasMore: result.hasMore,
        total: result.total
      }))

      apiOptions.onSuccess?.(result)
      return result
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        ApiErrorType.UNKNOWN_ERROR
      )

      setState(prev => ({
        ...prev,
        loading: false,
        error: apiError,
        success: false
      }))

      apiOptions.onError?.(apiError)
      throw apiError
    }
  }, [apiFunction, pageSize, apiOptions])

  const loadNextPage = useCallback((...args: any[]) => {
    if (state.hasMore && !state.loading) {
      return loadPage(state.page + 1, ...args)
    }
  }, [loadPage, state.page, state.hasMore, state.loading])

  const refresh = useCallback((...args: any[]) => {
    setState(prev => ({
      ...prev,
      page: 1,
      hasMore: true,
      data: []
    }))
    return loadPage(1, ...args)
  }, [loadPage])

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      success: false,
      page: initialPage,
      hasMore: true,
      total: 0
    })
  }, [initialPage])

  return {
    ...state,
    loadPage,
    loadNextPage,
    refresh,
    reset,
    errorMessage: state.error ? getErrorMessage(state.error) : null
  }
}

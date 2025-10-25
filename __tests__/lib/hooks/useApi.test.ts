import { renderHook, act } from '@testing-library/react'
import { useApi, useMultipleApi, usePaginatedApi } from '../../../lib/hooks/useApi'
import { ApiError, ApiErrorType } from '../../lib/api/request-manager'

// Mock the API error classes
jest.mock('../../lib/api/request-manager', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public type: ApiErrorType, public status?: number) {
      super(message)
      this.name = 'ApiError'
    }
  },
  ApiErrorType: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  },
  getErrorMessage: jest.fn((error) => error.message)
}))

describe('useApi', () => {
  const mockApiFunction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useApi(mockApiFunction))

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBe(false)
    expect(result.current.errorMessage).toBeNull()
    expect(result.current.isRetryable).toBe(false)
  })

  it('should execute API call successfully', async () => {
    const mockData = { id: 1, name: 'Test' }
    mockApiFunction.mockResolvedValue(mockData)

    const { result } = renderHook(() => useApi(mockApiFunction))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBe(true)
    expect(mockApiFunction).toHaveBeenCalledTimes(1)
  })

  it('should handle API errors', async () => {
    const mockError = new ApiError('Test error', ApiErrorType.NETWORK_ERROR, 500)
    mockApiFunction.mockRejectedValue(mockError)

    const { result } = renderHook(() => useApi(mockApiFunction))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toEqual(mockError)
    expect(result.current.success).toBe(false)
    expect(result.current.errorMessage).toBe('Test error')
  })

  it('should execute immediately when immediate is true', async () => {
    const mockData = { id: 1, name: 'Test' }
    mockApiFunction.mockResolvedValue(mockData)

    renderHook(() => useApi(mockApiFunction, { immediate: true }))

    await act(async () => {
      // Wait for the immediate execution
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockApiFunction).toHaveBeenCalledTimes(1)
  })

  it('should call onSuccess callback', async () => {
    const mockData = { id: 1, name: 'Test' }
    const onSuccess = jest.fn()
    mockApiFunction.mockResolvedValue(mockData)

    const { result } = renderHook(() => useApi(mockApiFunction, { onSuccess }))

    await act(async () => {
      await result.current.execute()
    })

    expect(onSuccess).toHaveBeenCalledWith(mockData)
  })

  it('should call onError callback', async () => {
    const mockError = new ApiError('Test error', ApiErrorType.VALIDATION_ERROR, 400)
    const onError = jest.fn()
    mockApiFunction.mockRejectedValue(mockError)

    const { result } = renderHook(() => useApi(mockApiFunction, { onError }))

    await act(async () => {
      await result.current.execute()
    })

    expect(onError).toHaveBeenCalledWith(mockError)
  })

  it('should reset state', async () => {
    const mockData = { id: 1, name: 'Test' }
    mockApiFunction.mockResolvedValue(mockData)

    const { result } = renderHook(() => useApi(mockApiFunction))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.success).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBe(false)
  })

  it('should handle retry logic for retryable errors', async () => {
    const mockError = new ApiError('Network error', ApiErrorType.NETWORK_ERROR, 500)
    const mockData = { id: 1, name: 'Test' }
    
    mockApiFunction
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockData)

    const { result } = renderHook(() => useApi(mockApiFunction, { 
      retryOnError: true, 
      maxRetries: 1 
    }))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.success).toBe(true)
    expect(mockApiFunction).toHaveBeenCalledTimes(2)
  })

  it('should not retry non-retryable errors', async () => {
    const mockError = new ApiError('Validation error', ApiErrorType.VALIDATION_ERROR, 400)
    mockApiFunction.mockRejectedValue(mockError)

    const { result } = renderHook(() => useApi(mockApiFunction, { 
      retryOnError: true, 
      maxRetries: 3 
    }))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toEqual(mockError)
    expect(mockApiFunction).toHaveBeenCalledTimes(1)
  })
})

describe('useMultipleApi', () => {
  const mockApiFunction1 = jest.fn()
  const mockApiFunction2 = jest.fn()
  const mockApiFunction3 = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should execute all API functions successfully', async () => {
    const mockData1 = { id: 1, name: 'Test1' }
    const mockData2 = { id: 2, name: 'Test2' }
    const mockData3 = { id: 3, name: 'Test3' }

    mockApiFunction1.mockResolvedValue(mockData1)
    mockApiFunction2.mockResolvedValue(mockData2)
    mockApiFunction3.mockResolvedValue(mockData3)

    const { result } = renderHook(() => useMultipleApi([
      mockApiFunction1,
      mockApiFunction2,
      mockApiFunction3
    ]))

    await act(async () => {
      await result.current.executeAll()
    })

    expect(result.current.data).toEqual([mockData1, mockData2, mockData3])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBe(true)
    expect(result.current.completed).toBe(3)
    expect(result.current.progress).toBe(100)
  })

  it('should handle partial failures', async () => {
    const mockData1 = { id: 1, name: 'Test1' }
    const mockError = new ApiError('Test error', ApiErrorType.SERVER_ERROR, 500)
    const mockData3 = { id: 3, name: 'Test3' }

    mockApiFunction1.mockResolvedValue(mockData1)
    mockApiFunction2.mockRejectedValue(mockError)
    mockApiFunction3.mockResolvedValue(mockData3)

    const { result } = renderHook(() => useMultipleApi([
      mockApiFunction1,
      mockApiFunction2,
      mockApiFunction3
    ]))

    await act(async () => {
      await result.current.executeAll()
    })

    expect(result.current.data).toEqual([mockData1, mockData3])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBe(true)
    expect(result.current.completed).toBe(3)
  })

  it('should track progress correctly', async () => {
    const mockData = { id: 1, name: 'Test' }
    mockApiFunction1.mockResolvedValue(mockData)
    mockApiFunction2.mockResolvedValue(mockData)
    mockApiFunction3.mockResolvedValue(mockData)

    const { result } = renderHook(() => useMultipleApi([
      mockApiFunction1,
      mockApiFunction2,
      mockApiFunction3
    ]))

    await act(async () => {
      await result.current.executeAll()
    })

    expect(result.current.progress).toBe(100)
    expect(result.current.completed).toBe(3)
    expect(result.current.total).toBe(3)
  })
})

describe('usePaginatedApi', () => {
  const mockApiFunction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load first page successfully', async () => {
    const mockData = {
      data: [{ id: 1, name: 'Test1' }, { id: 2, name: 'Test2' }],
      total: 10,
      page: 1,
      limit: 2,
      hasMore: true
    }
    mockApiFunction.mockResolvedValue(mockData)

    const { result } = renderHook(() => usePaginatedApi(mockApiFunction, { pageSize: 2 }))

    await act(async () => {
      await result.current.loadPage(1)
    })

    expect(result.current.data).toEqual(mockData.data)
    expect(result.current.page).toBe(1)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.total).toBe(10)
    expect(result.current.loading).toBe(false)
    expect(result.current.success).toBe(true)
  })

  it('should load next page and append data', async () => {
    const mockData1 = {
      data: [{ id: 1, name: 'Test1' }],
      total: 3,
      page: 1,
      limit: 1,
      hasMore: true
    }
    const mockData2 = {
      data: [{ id: 2, name: 'Test2' }],
      total: 3,
      page: 2,
      limit: 1,
      hasMore: true
    }

    mockApiFunction
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2)

    const { result } = renderHook(() => usePaginatedApi(mockApiFunction, { pageSize: 1 }))

    await act(async () => {
      await result.current.loadPage(1)
    })

    await act(async () => {
      await result.current.loadNextPage()
    })

    expect(result.current.data).toEqual([...mockData1.data, ...mockData2.data])
    expect(result.current.page).toBe(2)
    expect(result.current.hasMore).toBe(true)
  })

  it('should refresh data correctly', async () => {
    const mockData = {
      data: [{ id: 1, name: 'Test1' }],
      total: 5,
      page: 1,
      limit: 1,
      hasMore: true
    }
    mockApiFunction.mockResolvedValue(mockData)

    const { result } = renderHook(() => usePaginatedApi(mockApiFunction, { pageSize: 1 }))

    await act(async () => {
      await result.current.loadPage(1)
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.data).toEqual(mockData.data)
    expect(result.current.page).toBe(1)
    expect(result.current.hasMore).toBe(true)
  })

  it('should reset state correctly', async () => {
    const mockData = {
      data: [{ id: 1, name: 'Test1' }],
      total: 5,
      page: 1,
      limit: 1,
      hasMore: true
    }
    mockApiFunction.mockResolvedValue(mockData)

    const { result } = renderHook(() => usePaginatedApi(mockApiFunction, { pageSize: 1 }))

    await act(async () => {
      await result.current.loadPage(1)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toEqual([])
    expect(result.current.page).toBe(1)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.total).toBe(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBe(false)
  })
})

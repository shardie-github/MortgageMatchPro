import * as Sentry from '@sentry/nextjs'

// Initialize Sentry
export const initSentry = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      beforeSend(event) {
        // Filter out non-critical errors in production
        if (process.env.NODE_ENV === 'production') {
          if (event.exception) {
            const error = event.exception.values?.[0]
            if (error?.type === 'ChunkLoadError' || error?.type === 'Loading chunk failed') {
              return null // Don't send chunk load errors
            }
          }
        }
        return event
      },
    })
  }
}

// Error tracking utilities
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    tags: {
      component: 'mortgage-match-pro',
    },
    extra: context,
  })
}

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
  Sentry.captureMessage(message, level, {
    tags: {
      component: 'mortgage-match-pro',
    },
    extra: context,
  })
}

export const setUserContext = (user: { id: string; email: string; subscriptionTier: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    subscription_tier: user.subscriptionTier,
  })
}

export const clearUserContext = () => {
  Sentry.setUser(null)
}

// Performance monitoring
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({
    name,
    op,
  })
}

export const addBreadcrumb = (message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  })
}

// System health monitoring
export interface SystemHealthMetric {
  name: string
  value: number
  unit: string
  tags?: Record<string, string>
}

export const recordSystemMetric = async (metric: SystemHealthMetric) => {
  try {
    // Record in Sentry as a custom event
    Sentry.addBreadcrumb({
      message: `System metric: ${metric.name}`,
      category: 'system.health',
      level: 'info',
      data: {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        tags: metric.tags,
      },
    })

    // Also store in database for historical tracking
    if (typeof window === 'undefined') {
      const { supabaseAdmin } = await import('./supabase')
      await supabaseAdmin
        .from('system_health_metrics')
        .insert({
          metric_name: metric.name,
          metric_value: metric.value,
          metric_unit: metric.unit,
          tags: metric.tags,
        })
    }
  } catch (error) {
    console.error('Failed to record system metric:', error)
  }
}

// API monitoring
export const monitorApiCall = async <T>(
  apiCall: () => Promise<T>,
  endpoint: string,
  method: string = 'GET'
): Promise<T> => {
  const transaction = startTransaction(`API ${method} ${endpoint}`, 'http.client')
  
  try {
    const startTime = Date.now()
    const result = await apiCall()
    const duration = Date.now() - startTime
    
    // Record performance metric
    await recordSystemMetric({
      name: 'api_response_time',
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status: 'success',
      },
    })
    
    transaction.setStatus('ok')
    return result
  } catch (error) {
    transaction.setStatus('internal_error')
    captureException(error as Error, {
      endpoint,
      method,
    })
    throw error
  } finally {
    transaction.finish()
  }
}

// Database monitoring
export const monitorDatabaseQuery = async <T>(
  query: () => Promise<T>,
  table: string,
  operation: string
): Promise<T> => {
  const transaction = startTransaction(`DB ${operation} ${table}`, 'db')
  
  try {
    const startTime = Date.now()
    const result = await query()
    const duration = Date.now() - startTime
    
    // Record performance metric
    await recordSystemMetric({
      name: 'db_query_time',
      value: duration,
      unit: 'ms',
      tags: {
        table,
        operation,
        status: 'success',
      },
    })
    
    transaction.setStatus('ok')
    return result
  } catch (error) {
    transaction.setStatus('internal_error')
    captureException(error as Error, {
      table,
      operation,
    })
    throw error
  } finally {
    transaction.finish()
  }
}

// Memory and performance monitoring
export const recordPerformanceMetrics = () => {
  if (typeof window === 'undefined') return

  // Record memory usage
  if ('memory' in performance) {
    const memory = (performance as any).memory
    recordSystemMetric({
      name: 'memory_used',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
    })
    
    recordSystemMetric({
      name: 'memory_total',
      value: memory.totalJSHeapSize,
      unit: 'bytes',
    })
  }

  // Record page load time
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  if (navigation) {
    recordSystemMetric({
      name: 'page_load_time',
      value: navigation.loadEventEnd - navigation.loadEventStart,
      unit: 'ms',
    })
    
    recordSystemMetric({
      name: 'dom_content_loaded',
      value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      unit: 'ms',
    })
  }
}

// Error boundary for React components
export const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: ({ error, resetError }) => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            We've been notified about this error and are working to fix it.
          </p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    ),
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('errorBoundary', true)
      scope.setContext('errorInfo', errorInfo)
    },
  })
}

// Health check endpoint
export const performHealthCheck = async () => {
  const checks = {
    database: false,
    redis: false,
    external_apis: false,
    overall: false,
  }

  try {
    // Check database with timeout
    const dbCheckPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000)
      
      import('./supabase').then(({ supabaseAdmin }) => {
        supabaseAdmin
          .from('users')
          .select('count')
          .limit(1)
          .then(({ error }) => {
            clearTimeout(timeout)
            resolve(!error)
          })
          .catch(() => {
            clearTimeout(timeout)
            resolve(false)
          })
      }).catch(() => {
        clearTimeout(timeout)
        resolve(false)
      })
    })
    
    checks.database = await dbCheckPromise

    // Check Redis (if available)
    try {
      if (process.env.REDIS_URL) {
        const { createClient } = await import('redis')
        const redis = createClient({ url: process.env.REDIS_URL })
        await redis.connect()
        await redis.ping()
        await redis.disconnect()
        checks.redis = true
      } else {
        checks.redis = true // Skip Redis check if not configured
      }
    } catch (error) {
      console.warn('Redis health check failed:', error)
      checks.redis = false
    }

    // Check external APIs with timeout
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('/api/rates?country=CA&termYears=25&rateType=fixed&propertyPrice=500000&downPayment=50000', {
        method: 'GET',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      checks.external_apis = response.ok
    } catch (error) {
      console.warn('External API health check failed:', error)
      checks.external_apis = false
    }

    checks.overall = checks.database && checks.redis && checks.external_apis

    // Record health check results
    await recordSystemMetric({
      name: 'health_check_database',
      value: checks.database ? 1 : 0,
      unit: 'boolean',
    })

    await recordSystemMetric({
      name: 'health_check_redis',
      value: checks.redis ? 1 : 0,
      unit: 'boolean',
    })

    await recordSystemMetric({
      name: 'health_check_external_apis',
      value: checks.external_apis ? 1 : 0,
      unit: 'boolean',
    })

    await recordSystemMetric({
      name: 'health_check_overall',
      value: checks.overall ? 1 : 0,
      unit: 'boolean',
    })

    return checks
  } catch (error) {
    captureException(error as Error, { context: 'health_check' })
    return checks
  }
}

// Alerting system
export const sendAlert = async (type: 'error' | 'warning' | 'info', message: string, context?: Record<string, any>) => {
  try {
    // Send to Sentry
    captureMessage(message, type, context)

    // Send to external alerting service (e.g., Slack, email)
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 MortgageMatch Pro Alert: ${message}`,
          attachments: [
            {
              color: type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'good',
              fields: [
                {
                  title: 'Type',
                  value: type,
                  short: true,
                },
                {
                  title: 'Environment',
                  value: process.env.NODE_ENV,
                  short: true,
                },
                {
                  title: 'Timestamp',
                  value: new Date().toISOString(),
                  short: true,
                },
                {
                  title: 'Context',
                  value: JSON.stringify(context, null, 2),
                  short: false,
                },
              ],
            },
          ],
        }),
      })
    }
  } catch (error) {
    console.error('Failed to send alert:', error)
  }
}

// API Endpoints Configuration
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email'
  },

  // User Management
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    PREFERENCES: '/users/preferences',
    UPDATE_PREFERENCES: '/users/preferences',
    DELETE_ACCOUNT: '/users/account'
  },

  // Leads
  LEADS: {
    LIST: '/leads',
    CREATE: '/leads',
    GET: (id: string) => `/leads/${id}`,
    UPDATE: (id: string) => `/leads/${id}`,
    DELETE: (id: string) => `/leads/${id}`,
    SEARCH: '/leads/search',
    EXPORT: '/leads/export',
    IMPORT: '/leads/import',
    BULK_UPDATE: '/leads/bulk-update',
    ASSIGN: (id: string) => `/leads/${id}/assign`,
    CONVERT: (id: string) => `/leads/${id}/convert`,
    REJECT: (id: string) => `/leads/${id}/reject`
  },

  // Scenarios
  SCENARIOS: {
    LIST: '/scenarios',
    CREATE: '/scenarios',
    GET: (id: string) => `/scenarios/${id}`,
    UPDATE: (id: string) => `/scenarios/${id}`,
    DELETE: (id: string) => `/scenarios/${id}`,
    DUPLICATE: (id: string) => `/scenarios/${id}/duplicate`,
    SHARE: (id: string) => `/scenarios/${id}/share`,
    FAVORITE: (id: string) => `/scenarios/${id}/favorite`,
    TAGS: '/scenarios/tags',
    SEARCH: '/scenarios/search'
  },

  // Affordability Calculations
  AFFORDABILITY: {
    CALCULATE: '/affordability/calculate',
    BULK_CALCULATE: '/affordability/bulk-calculate',
    HISTORY: '/affordability/history',
    EXPORT: '/affordability/export'
  },

  // Rate Information
  RATES: {
    CURRENT: '/rates/current',
    HISTORICAL: '/rates/historical',
    FORECAST: '/rates/forecast',
    COMPARE: '/rates/compare',
    SEARCH: '/rates/search',
    FAVORITES: '/rates/favorites',
    ALERTS: '/rates/alerts'
  },

  // Broker Management
  BROKERS: {
    DASHBOARD: '/brokers/dashboard',
    METRICS: '/brokers/metrics',
    LEADS: '/brokers/leads',
    COMMISSIONS: '/brokers/commissions',
    TEAM: '/brokers/team',
    REPORTS: '/brokers/reports',
    SETTINGS: '/brokers/settings'
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    METRICS: '/analytics/metrics',
    TRENDS: '/analytics/trends',
    REPORTS: '/analytics/reports',
    EXPORT: '/analytics/export',
    CUSTOM: '/analytics/custom'
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences',
    UNSUBSCRIBE: (id: string) => `/notifications/${id}/unsubscribe`
  },

  // Files and Documents
  FILES: {
    UPLOAD: '/files/upload',
    DOWNLOAD: (id: string) => `/files/${id}/download`,
    DELETE: (id: string) => `/files/${id}`,
    LIST: '/files',
    SHARE: (id: string) => `/files/${id}/share`
  },

  // Integrations
  INTEGRATIONS: {
    LIST: '/integrations',
    CONNECT: (provider: string) => `/integrations/${provider}/connect`,
    DISCONNECT: (provider: string) => `/integrations/${provider}/disconnect`,
    STATUS: (provider: string) => `/integrations/${provider}/status`,
    SYNC: (provider: string) => `/integrations/${provider}/sync`
  },

  // OpenAI Integration
  OPENAI: {
    CHAT: '/openai/chat',
    EMBEDDINGS: '/openai/embeddings',
    MODERATION: '/openai/moderation',
    COMPLETIONS: '/openai/completions',
    IMAGES: '/openai/images'
  },

  // Supabase Integration
  SUPABASE: {
    QUERY: (table: string) => `/supabase/${table}`,
    INSERT: (table: string) => `/supabase/${table}`,
    UPDATE: (table: string, id: string) => `/supabase/${table}/${id}`,
    DELETE: (table: string, id: string) => `/supabase/${table}/${id}`,
    RPC: (functionName: string) => `/supabase/rpc/${functionName}`
  },

  // Health and Monitoring
  HEALTH: {
    CHECK: '/health',
    STATUS: '/health/status',
    METRICS: '/health/metrics',
    READINESS: '/health/readiness',
    LIVENESS: '/health/liveness'
  },

  // Webhooks
  WEBHOOKS: {
    STRIPE: '/webhooks/stripe',
    TWILIO: '/webhooks/twilio',
    RATE_APIS: '/webhooks/rate-apis',
    CUSTOM: (id: string) => `/webhooks/custom/${id}`
  }
} as const

// Query Parameters Builder
export class QueryBuilder {
  private params: Record<string, any> = {}

  static create(): QueryBuilder {
    return new QueryBuilder()
  }

  add(key: string, value: any): QueryBuilder {
    if (value !== undefined && value !== null && value !== '') {
      this.params[key] = value
    }
    return this
  }

  addArray(key: string, values: any[]): QueryBuilder {
    if (values && values.length > 0) {
      this.params[key] = values.join(',')
    }
    return this
  }

  addDateRange(startKey: string, endKey: string, startDate: Date, endDate: Date): QueryBuilder {
    this.add(startKey, startDate.toISOString())
    this.add(endKey, endDate.toISOString())
    return this
  }

  addPagination(page: number, limit: number): QueryBuilder {
    this.add('page', page)
    this.add('limit', limit)
    return this
  }

  addSorting(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): QueryBuilder {
    this.add('sort_by', sortBy)
    this.add('sort_order', sortOrder)
    return this
  }

  addFilter(filters: Record<string, any>): QueryBuilder {
    Object.entries(filters).forEach(([key, value]) => {
      this.add(key, value)
    })
    return this
  }

  build(): Record<string, any> {
    return { ...this.params }
  }

  toString(): string {
    const searchParams = new URLSearchParams()
    Object.entries(this.params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v.toString()))
      } else {
        searchParams.append(key, value.toString())
      }
    })
    return searchParams.toString()
  }
}

// URL Builder
export class UrlBuilder {
  private baseUrl: string
  private pathSegments: string[] = []
  private queryBuilder: QueryBuilder = QueryBuilder.create()

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  addPath(segment: string): UrlBuilder {
    this.pathSegments.push(segment)
    return this
  }

  addId(id: string): UrlBuilder {
    this.pathSegments.push(id)
    return this
  }

  addQuery(key: string, value: any): UrlBuilder {
    this.queryBuilder.add(key, value)
    return this
  }

  addQueries(queries: Record<string, any>): UrlBuilder {
    this.queryBuilder.addFilter(queries)
    return this
  }

  addPagination(page: number, limit: number): UrlBuilder {
    this.queryBuilder.addPagination(page, limit)
    return this
  }

  addSorting(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): UrlBuilder {
    this.queryBuilder.addSorting(sortBy, sortOrder)
    return this
  }

  build(): string {
    const path = this.pathSegments.length > 0 
      ? '/' + this.pathSegments.join('/')
      : ''
    
    const queryString = this.queryBuilder.toString()
    const query = queryString ? '?' + queryString : ''
    
    return this.baseUrl + path + query
  }
}

// Export utility functions
export const endpointUtils = {
  // Build URL with parameters
  buildUrl: (baseUrl: string, path: string, params?: Record<string, any>): string => {
    const url = new UrlBuilder(baseUrl)
      .addPath(path.replace(/^\//, '')) // Remove leading slash
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.addQuery(key, value)
      })
    }
    
    return url.build()
  },

  // Build query string
  buildQuery: (params: Record<string, any>): string => {
    return QueryBuilder.create().addFilter(params).toString()
  },

  // Extract ID from URL
  extractId: (url: string): string | null => {
    const match = url.match(/\/([^\/]+)$/)
    return match ? match[1] : null
  },

  // Validate endpoint
  isValidEndpoint: (endpoint: string): boolean => {
    return endpoint.startsWith('/') && endpoint.length > 1
  }
}
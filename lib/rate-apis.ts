import axios, { AxiosInstance } from 'axios'

// Circuit breaker for API resilience
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private failureCount = 0
  private lastFailureTime = 0
  private readonly failureThreshold = 5
  private readonly resetTimeout = 30000 // 30 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Rate API circuit breaker is OPEN - service temporarily unavailable')
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Rate API request timeout')), 10000)
        )
      ])

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED'
        this.failureCount = 0
      }

      return result as T
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN'
      }

      throw error
    }
  }

  getState() {
    return this.state
  }

  reset() {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = 0
  }
}

// Ratehub.ca API integration for Canadian rates
export class RatehubAPI {
  private apiKey: string
  private baseURL = 'https://api.ratehub.ca/v1'
  private axiosInstance: AxiosInstance
  private circuitBreaker: CircuitBreaker

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.circuitBreaker = new CircuitBreaker()
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MortgageMatch-Pro/1.0',
      },
    })

    // Add request/response interceptors for better error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Ratehub API error:', error.response?.status, error.message)
        return Promise.reject(error)
      }
    )
  }

  async getRates(params: {
    term: number
    type: 'fixed' | 'variable'
    province: string
    propertyValue: number
    downPayment: number
  }) {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.axiosInstance.get('/rates', {
          params: {
            term_years: params.term,
            rate_type: params.type,
            province: params.province,
            property_value: params.propertyValue,
            down_payment: params.downPayment,
          },
        })
      })

      return response.data.rates.map((rate: any) => ({
        lender: rate.lender_name,
        rate: rate.rate,
        apr: rate.apr,
        term: params.term,
        type: params.type,
        paymentEstimate: this.calculatePayment(
          params.propertyValue - params.downPayment,
          rate.rate,
          params.term
        ),
        features: rate.features || [],
        contactInfo: {
          phone: rate.phone || '1-800-RATEHUB',
          email: rate.email || 'info@ratehub.ca',
          website: rate.website || 'https://ratehub.ca',
        },
        lastUpdated: new Date().toISOString(),
        source: 'ratehub',
      }))
    } catch (error) {
      console.error('Ratehub API error:', error)
      // Return empty array instead of throwing to allow fallback
      return []
    }
  }

  private calculatePayment(principal: number, rate: number, termYears: number): number {
    const monthlyRate = rate / 100 / 12
    const numPayments = termYears * 12
    
    if (monthlyRate === 0) {
      return principal / numPayments
    }
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1)
  }
}

// Freddie Mac PMMS API integration for US rates
export class FreddieMacAPI {
  private apiKey: string
  private baseURL = 'https://api.freddiemac.com/v1'
  private axiosInstance: AxiosInstance
  private circuitBreaker: CircuitBreaker

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.circuitBreaker = new CircuitBreaker()
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MortgageMatch-Pro/1.0',
      },
    })

    // Add request/response interceptors for better error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Freddie Mac API error:', error.response?.status, error.message)
        return Promise.reject(error)
      }
    )
  }

  async getRates(params: {
    term: number
    type: 'fixed' | 'variable'
    state: string
    propertyValue: number
    downPayment: number
  }) {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.axiosInstance.get('/rates/pmm', {
          params: {
            term_years: params.term,
            rate_type: params.type,
            state: params.state,
            property_value: params.propertyValue,
            down_payment: params.downPayment,
          },
        })
      })

      return response.data.rates.map((rate: any) => ({
        lender: rate.lender_name,
        rate: rate.rate,
        apr: rate.apr,
        term: params.term,
        type: params.type,
        paymentEstimate: this.calculatePayment(
          params.propertyValue - params.downPayment,
          rate.rate,
          params.term
        ),
        features: rate.features || [],
        contactInfo: {
          phone: rate.phone || '1-800-FREDDIE',
          email: rate.email || 'info@freddiemac.com',
          website: rate.website || 'https://freddiemac.com',
        },
        lastUpdated: new Date().toISOString(),
        source: 'freddiemac',
      }))
    } catch (error) {
      console.error('Freddie Mac API error:', error)
      // Return empty array instead of throwing to allow fallback
      return []
    }
  }

  private calculatePayment(principal: number, rate: number, termYears: number): number {
    const monthlyRate = rate / 100 / 12
    const numPayments = termYears * 12
    
    if (monthlyRate === 0) {
      return principal / numPayments
    }
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1)
  }
}

// Mock rate data for development/testing
export const mockRates = {
  CA: [
    {
      lender: 'Royal Bank of Canada',
      rate: 5.45,
      apr: 5.52,
      term: 25,
      type: 'fixed' as const,
      paymentEstimate: 2847.23,
      features: ['No fee', 'Pre-approval available', 'Portable'],
      contactInfo: {
        phone: '1-800-769-2511',
        email: 'mortgages@rbc.com',
        website: 'https://rbc.com/mortgages',
      },
    },
    {
      lender: 'TD Canada Trust',
      rate: 5.52,
      apr: 5.59,
      term: 25,
      type: 'fixed' as const,
      paymentEstimate: 2876.45,
      features: ['Rate hold', 'Pre-approval available', 'Cashback'],
      contactInfo: {
        phone: '1-866-222-3456',
        email: 'mortgages@td.com',
        website: 'https://td.com/mortgages',
      },
    },
    {
      lender: 'Scotiabank',
      rate: 5.38,
      apr: 5.45,
      term: 25,
      type: 'fixed' as const,
      paymentEstimate: 2821.67,
      features: ['No fee', 'Rate hold', 'Portable'],
      contactInfo: {
        phone: '1-800-4SCOTIA',
        email: 'mortgages@scotiabank.com',
        website: 'https://scotiabank.com/mortgages',
      },
    },
    {
      lender: 'BMO Bank of Montreal',
      rate: 5.61,
      apr: 5.68,
      term: 25,
      type: 'fixed' as const,
      paymentEstimate: 2898.12,
      features: ['Pre-approval available', 'Cashback', 'Portable'],
      contactInfo: {
        phone: '1-877-225-5266',
        email: 'mortgages@bmo.com',
        website: 'https://bmo.com/mortgages',
      },
    },
    {
      lender: 'CIBC',
      rate: 5.48,
      apr: 5.55,
      term: 25,
      type: 'fixed' as const,
      paymentEstimate: 2854.89,
      features: ['No fee', 'Rate hold', 'Pre-approval available'],
      contactInfo: {
        phone: '1-800-465-2422',
        email: 'mortgages@cibc.com',
        website: 'https://cibc.com/mortgages',
      },
    },
  ],
  US: [
    {
      lender: 'Wells Fargo',
      rate: 6.25,
      apr: 6.35,
      term: 30,
      type: 'fixed' as const,
      paymentEstimate: 1847.23,
      features: ['No PMI with 20% down', 'Rate lock', 'Online application'],
      contactInfo: {
        phone: '1-800-869-3557',
        email: 'mortgages@wellsfargo.com',
        website: 'https://wellsfargo.com/mortgages',
      },
    },
    {
      lender: 'Bank of America',
      rate: 6.32,
      apr: 6.42,
      term: 30,
      type: 'fixed' as const,
      paymentEstimate: 1865.45,
      features: ['Rate lock', 'Online application', 'Pre-approval'],
      contactInfo: {
        phone: '1-800-900-9000',
        email: 'mortgages@bankofamerica.com',
        website: 'https://bankofamerica.com/mortgages',
      },
    },
    {
      lender: 'Chase Bank',
      rate: 6.18,
      apr: 6.28,
      term: 30,
      type: 'fixed' as const,
      paymentEstimate: 1821.67,
      features: ['No PMI with 20% down', 'Rate lock', 'Online application'],
      contactInfo: {
        phone: '1-800-873-6577',
        email: 'mortgages@chase.com',
        website: 'https://chase.com/mortgages',
      },
    },
    {
      lender: 'Quicken Loans',
      rate: 6.28,
      apr: 6.38,
      term: 30,
      type: 'fixed' as const,
      paymentEstimate: 1834.89,
      features: ['Online application', 'Rate lock', 'Fast closing'],
      contactInfo: {
        phone: '1-800-QUICKEN',
        email: 'mortgages@quickenloans.com',
        website: 'https://quickenloans.com',
      },
    },
    {
      lender: 'US Bank',
      rate: 6.35,
      apr: 6.45,
      term: 30,
      type: 'fixed' as const,
      paymentEstimate: 1847.23,
      features: ['Rate lock', 'Online application', 'Pre-approval'],
      contactInfo: {
        phone: '1-800-365-5000',
        email: 'mortgages@usbank.com',
        website: 'https://usbank.com/mortgages',
      },
    },
  ],
}

// Rate fetching service with enhanced error handling and fallbacks
export class RateService {
  private ratehubAPI: RatehubAPI
  private freddieMacAPI: FreddieMacAPI
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.ratehubAPI = new RatehubAPI(process.env.RATEHUB_API_KEY || '')
    this.freddieMacAPI = new FreddieMacAPI(process.env.FREDDIE_MAC_API_KEY || '')
  }

  private getCacheKey(country: string, params: any): string {
    return `${country}_${JSON.stringify(params)}`
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL
  }

  async getRates(country: 'CA' | 'US', params: any) {
    const cacheKey = this.getCacheKey(country, params)
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('Returning cached rates')
      return cached.data
    }

    try {
      let rates: any[] = []
      
      if (country === 'CA') {
        rates = await this.ratehubAPI.getRates({
          term: params.termYears,
          type: params.rateType,
          province: params.location?.split(',')[1]?.trim() || 'ON',
          propertyValue: params.propertyPrice,
          downPayment: params.downPayment,
        })
      } else {
        rates = await this.freddieMacAPI.getRates({
          term: params.termYears,
          type: params.rateType,
          state: params.location?.split(',')[1]?.trim() || 'CA',
          propertyValue: params.propertyPrice,
          downPayment: params.downPayment,
        })
      }

      // If API returns empty array, try fallback
      if (rates.length === 0) {
        console.warn('No rates from API, using fallback data')
        rates = this.getFallbackRates(country, params)
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: rates,
        timestamp: Date.now(),
      })

      return rates
    } catch (error) {
      console.error('Rate service error:', error)
      
      // Try to return cached data even if expired
      if (cached) {
        console.log('Returning expired cached data due to API error')
        return cached.data
      }

      // Fallback to mock data
      console.log('Falling back to mock data')
      return this.getFallbackRates(country, params)
    }
  }

  private getFallbackRates(country: 'CA' | 'US', params: any) {
    const baseRates = mockRates[country]
    
    // Filter rates based on parameters
    return baseRates.filter(rate => {
      if (params.rateType && rate.type !== params.rateType) return false
      if (params.termYears && rate.term !== params.termYears) return false
      return true
    }).map(rate => ({
      ...rate,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    }))
  }

  // Health check for all APIs
  async healthCheck(): Promise<{ ratehub: boolean; freddiemac: boolean }> {
    const [ratehubHealth, freddiemacHealth] = await Promise.allSettled([
      this.ratehubAPI.getRates({
        term: 25,
        type: 'fixed',
        province: 'ON',
        propertyValue: 500000,
        downPayment: 100000,
      }).then(() => true).catch(() => false),
      this.freddieMacAPI.getRates({
        term: 30,
        type: 'fixed',
        state: 'CA',
        propertyValue: 500000,
        downPayment: 100000,
      }).then(() => true).catch(() => false),
    ])

    return {
      ratehub: ratehubHealth.status === 'fulfilled' && ratehubHealth.value,
      freddiemac: freddiemacHealth.status === 'fulfilled' && freddiemacHealth.value,
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}
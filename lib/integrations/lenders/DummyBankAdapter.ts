/**
 * DummyBank API Adapter
 * v1.2.0 - Mock REST API adapter for demonstration and testing
 */

import { z } from 'zod'
import axios, { AxiosInstance } from 'axios'

// DummyBank API schemas
export const DummyBankRateSchema = z.object({
  id: z.string(),
  lender: z.string(),
  product: z.string(),
  rate: z.number(),
  apr: z.number(),
  term: z.number(),
  type: z.enum(['fixed', 'variable']),
  minAmount: z.number(),
  maxAmount: z.number(),
  features: z.array(z.string()),
  eligibility: z.object({
    minCreditScore: z.number(),
    maxLTV: z.number(),
    minIncome: z.number(),
    employmentTypes: z.array(z.string())
  }),
  contactInfo: z.object({
    phone: z.string(),
    email: z.string(),
    website: z.string()
  }),
  lastUpdated: z.string()
})

export const DummyBankApplicationSchema = z.object({
  applicationId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'under_review']),
  rate: z.number(),
  amount: z.number(),
  term: z.number(),
  monthlyPayment: z.number(),
  nextSteps: z.array(z.string()),
  documents: z.array(z.string()),
  estimatedClosing: z.string()
})

export type DummyBankRate = z.infer<typeof DummyBankRateSchema>
export type DummyBankApplication = z.infer<typeof DummyBankApplicationSchema>

export class DummyBankAdapter {
  private client: AxiosInstance
  private baseUrl: string
  private apiKey: string
  private integrationId: string = 'dummybank-api'

  constructor(config: {
    baseUrl: string
    apiKey: string
    timeout?: number
  }) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MortgageMatchPro/1.2.0'
      }
    })

    // Add request/response interceptors
    this.setupInterceptors()
  }

  /**
   * Get available mortgage rates
   */
  async getRates(criteria: {
    loanAmount: number
    termYears: number
    rateType?: 'fixed' | 'variable'
    propertyType?: 'primary' | 'secondary' | 'investment'
    creditScore?: number
    ltv?: number
  }): Promise<DummyBankRate[]> {
    try {
      const response = await this.client.get('/api/v1/rates', {
        params: {
          loan_amount: criteria.loanAmount,
          term_years: criteria.termYears,
          rate_type: criteria.rateType || 'fixed',
          property_type: criteria.propertyType || 'primary',
          credit_score: criteria.creditScore,
          ltv: criteria.ltv
        }
      })

      const rates = response.data.rates.map((rate: any) => 
        DummyBankRateSchema.parse(rate)
      )

      return rates

    } catch (error) {
      console.error('Error fetching rates from DummyBank:', error)
      throw new Error(`Failed to fetch rates: ${error.message}`)
    }
  }

  /**
   * Get specific rate by ID
   */
  async getRate(rateId: string): Promise<DummyBankRate> {
    try {
      const response = await this.client.get(`/api/v1/rates/${rateId}`)
      return DummyBankRateSchema.parse(response.data)

    } catch (error) {
      console.error('Error fetching rate from DummyBank:', error)
      throw new Error(`Failed to fetch rate: ${error.message}`)
    }
  }

  /**
   * Submit mortgage application
   */
  async submitApplication(application: {
    rateId: string
    borrower: {
      firstName: string
      lastName: string
      email: string
      phone: string
      ssn: string
    }
    property: {
      address: string
      city: string
      state: string
      zipCode: string
      propertyType: string
      purchasePrice: number
    }
    loan: {
      amount: number
      downPayment: number
      termYears: number
    }
    financial: {
      income: number
      employmentType: string
      creditScore: number
      debts: number
    }
  }): Promise<DummyBankApplication> {
    try {
      const response = await this.client.post('/api/v1/applications', {
        rate_id: application.rateId,
        borrower: application.borrower,
        property: application.property,
        loan: application.loan,
        financial: application.financial
      })

      return DummyBankApplicationSchema.parse(response.data)

    } catch (error) {
      console.error('Error submitting application to DummyBank:', error)
      throw new Error(`Failed to submit application: ${error.message}`)
    }
  }

  /**
   * Get application status
   */
  async getApplicationStatus(applicationId: string): Promise<DummyBankApplication> {
    try {
      const response = await this.client.get(`/api/v1/applications/${applicationId}`)
      return DummyBankApplicationSchema.parse(response.data)

    } catch (error) {
      console.error('Error fetching application status from DummyBank:', error)
      throw new Error(`Failed to fetch application status: ${error.message}`)
    }
  }

  /**
   * Update application
   */
  async updateApplication(
    applicationId: string,
    updates: Partial<{
      borrower: any
      property: any
      loan: any
      financial: any
    }>
  ): Promise<DummyBankApplication> {
    try {
      const response = await this.client.patch(`/api/v1/applications/${applicationId}`, updates)
      return DummyBankApplicationSchema.parse(response.data)

    } catch (error) {
      console.error('Error updating application in DummyBank:', error)
      throw new Error(`Failed to update application: ${error.message}`)
    }
  }

  /**
   * Cancel application
   */
  async cancelApplication(applicationId: string, reason?: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/applications/${applicationId}`, {
        data: { reason }
      })

    } catch (error) {
      console.error('Error canceling application in DummyBank:', error)
      throw new Error(`Failed to cancel application: ${error.message}`)
    }
  }

  /**
   * Get lender information
   */
  async getLenderInfo(): Promise<{
    name: string
    description: string
    logo: string
    website: string
    phone: string
    email: string
    address: string
    licenses: string[]
    ratings: {
      overall: number
      customerService: number
      rates: number
      process: number
    }
    features: string[]
  }> {
    try {
      const response = await this.client.get('/api/v1/lender/info')
      return response.data

    } catch (error) {
      console.error('Error fetching lender info from DummyBank:', error)
      throw new Error(`Failed to fetch lender info: ${error.message}`)
    }
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    responseTime: number
    version: string
    uptime: number
    lastError?: string
  }> {
    const startTime = Date.now()

    try {
      const response = await this.client.get('/api/v1/health')
      const responseTime = Date.now() - startTime

      return {
        status: response.data.status,
        responseTime,
        version: response.data.version,
        uptime: response.data.uptime,
        lastError: response.data.lastError
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        status: 'unhealthy',
        responseTime,
        version: 'unknown',
        uptime: 0,
        lastError: error.message
      }
    }
  }

  /**
   * Get rate history
   */
  async getRateHistory(rateId: string, days: number = 30): Promise<{
    rateId: string
    history: Array<{
      date: string
      rate: number
      apr: number
    }>
  }> {
    try {
      const response = await this.client.get(`/api/v1/rates/${rateId}/history`, {
        params: { days }
      })

      return response.data

    } catch (error) {
      console.error('Error fetching rate history from DummyBank:', error)
      throw new Error(`Failed to fetch rate history: ${error.message}`)
    }
  }

  /**
   * Get pre-approval
   */
  async getPreApproval(criteria: {
    income: number
    debts: number
    creditScore: number
    downPayment: number
    propertyPrice: number
  }): Promise<{
    preApprovalId: string
    maxAmount: number
    rate: number
    monthlyPayment: number
    expiresAt: string
    conditions: string[]
  }> {
    try {
      const response = await this.client.post('/api/v1/pre-approval', criteria)
      return response.data

    } catch (error) {
      console.error('Error getting pre-approval from DummyBank:', error)
      throw new Error(`Failed to get pre-approval: ${error.message}`)
    }
  }

  // Private helper methods

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`DummyBank API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('DummyBank API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`DummyBank API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error('DummyBank API Response Error:', error.response?.status, error.message)
        
        // Handle specific error cases
        if (error.response?.status === 401) {
          throw new Error('Invalid API key')
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded')
        } else if (error.response?.status >= 500) {
          throw new Error('DummyBank API server error')
        }

        return Promise.reject(error)
      }
    )
  }
}

// Factory function for creating adapter instances
export function createDummyBankAdapter(config: {
  baseUrl: string
  apiKey: string
  timeout?: number
}): DummyBankAdapter {
  return new DummyBankAdapter(config)
}

// Default configuration for development
export const DEFAULT_DUMMYBANK_CONFIG = {
  baseUrl: 'https://api.dummybank.com',
  apiKey: process.env.DUMMYBANK_API_KEY || 'demo-key',
  timeout: 30000
}
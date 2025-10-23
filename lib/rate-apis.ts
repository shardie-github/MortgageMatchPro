import axios from 'axios'

// Ratehub.ca API integration for Canadian rates
export class RatehubAPI {
  private apiKey: string
  private baseURL = 'https://api.ratehub.ca/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getRates(params: {
    term: number
    type: 'fixed' | 'variable'
    province: string
    propertyValue: number
    downPayment: number
  }) {
    try {
      const response = await axios.get(`${this.baseURL}/rates`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          term_years: params.term,
          rate_type: params.type,
          province: params.province,
          property_value: params.propertyValue,
          down_payment: params.downPayment,
        },
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
      }))
    } catch (error) {
      console.error('Ratehub API error:', error)
      throw new Error('Failed to fetch rates from Ratehub')
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

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getRates(params: {
    term: number
    type: 'fixed' | 'variable'
    state: string
    propertyValue: number
    downPayment: number
  }) {
    try {
      const response = await axios.get(`${this.baseURL}/rates/pmm`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          term_years: params.term,
          rate_type: params.type,
          state: params.state,
          property_value: params.propertyValue,
          down_payment: params.downPayment,
        },
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
      }))
    } catch (error) {
      console.error('Freddie Mac API error:', error)
      throw new Error('Failed to fetch rates from Freddie Mac')
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

// Rate fetching service
export class RateService {
  private ratehubAPI: RatehubAPI
  private freddieMacAPI: FreddieMacAPI

  constructor() {
    this.ratehubAPI = new RatehubAPI(process.env.RATEHUB_API_KEY || '')
    this.freddieMacAPI = new FreddieMacAPI(process.env.FREDDIE_MAC_API_KEY || '')
  }

  async getRates(country: 'CA' | 'US', params: any) {
    try {
      if (country === 'CA') {
        return await this.ratehubAPI.getRates({
          term: params.termYears,
          type: params.rateType,
          province: params.location?.split(',')[1]?.trim() || 'ON',
          propertyValue: params.propertyPrice,
          downPayment: params.downPayment,
        })
      } else {
        return await this.freddieMacAPI.getRates({
          term: params.termYears,
          type: params.rateType,
          state: params.location?.split(',')[1]?.trim() || 'CA',
          propertyValue: params.propertyPrice,
          downPayment: params.downPayment,
        })
      }
    } catch (error) {
      console.error('Rate service error:', error)
      // Fallback to mock data in development
      if (process.env.NODE_ENV === 'development') {
        return mockRates[country]
      }
      throw error
    }
  }
}
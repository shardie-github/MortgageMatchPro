import { createMocks } from 'node-mocks-http'
import calculateHandler from '@/pages/api/calculate'
import ratesHandler from '@/pages/api/rates'
import scenariosHandler from '@/pages/api/scenarios'
import leadsHandler from '@/pages/api/leads'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}))

jest.mock('@/lib/monitoring', () => ({
  analytics: {
    trackAffordabilityCalculation: jest.fn(),
    trackRateCheck: jest.fn(),
    trackScenarioComparison: jest.fn(),
    trackLeadSubmission: jest.fn()
  },
  errorTracking: {
    captureException: jest.fn()
  }
}))

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    connect: jest.fn()
  }))
}))

describe('API Integration Tests', () => {
  describe('/api/calculate', () => {
    it('should calculate affordability successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          country: 'CA',
          income: 75000,
          debts: 500,
          downPayment: 50000,
          propertyPrice: 500000,
          interestRate: 5.5,
          termYears: 25,
          location: 'Toronto, ON',
          taxes: 0,
          insurance: 0,
          hoa: 0
        }
      })

      await calculateHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toMatchObject({
        maxAffordable: expect.any(Number),
        monthlyPayment: expect.any(Number),
        gdsRatio: expect.any(Number),
        tdsRatio: expect.any(Number),
        dtiRatio: expect.any(Number),
        qualifyingRate: expect.any(Number),
        qualificationResult: expect.any(Boolean),
        breakdown: {
          principal: expect.any(Number),
          interest: expect.any(Number),
          taxes: expect.any(Number),
          insurance: expect.any(Number)
        },
        recommendations: expect.any(Array),
        disclaimers: expect.any(Array)
      })
    })

    it('should handle validation errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          country: 'INVALID',
          income: -1000,
          debts: 500,
          downPayment: 50000,
          propertyPrice: 500000,
          interestRate: 5.5,
          termYears: 25,
          location: 'Toronto, ON'
        }
      })

      await calculateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Invalid input')
    })

    it('should handle missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          country: 'CA',
          income: 75000
          // Missing required fields
        }
      })

      await calculateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('/api/rates', () => {
    it('should fetch rates successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          country: 'CA',
          termYears: '25',
          rateType: 'fixed',
          propertyPrice: '500000',
          downPayment: '50000'
        }
      })

      await ratesHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toMatchObject({
        rates: expect.any(Array),
        cached: expect.any(Boolean),
        lastUpdated: expect.any(String)
      })
      expect(data.rates.length).toBeGreaterThan(0)
    })

    it('should handle invalid query parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          country: 'INVALID',
          termYears: 'invalid',
          rateType: 'fixed',
          propertyPrice: '500000',
          downPayment: '50000'
        }
      })

      await ratesHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Invalid query parameters')
    })
  })

  describe('/api/scenarios', () => {
    it('should compare scenarios successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          scenarios: [
            {
              name: 'RBC Fixed 5.45%',
              rate: 5.45,
              term: 25,
              type: 'fixed',
              propertyPrice: 500000,
              downPayment: 50000
            },
            {
              name: 'TD Variable 5.52%',
              rate: 5.52,
              term: 25,
              type: 'variable',
              propertyPrice: 500000,
              downPayment: 50000
            }
          ]
        }
      })

      await scenariosHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toMatchObject({
        scenarios: expect.any(Array),
        recommendation: {
          bestOption: expect.any(String),
          savings: expect.any(Number),
          reasoning: expect.any(String)
        }
      })
    })
  })

  describe('/api/leads', () => {
    it('should process lead successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          leadData: {
            income: 75000,
            debts: 500,
            downPayment: 50000,
            propertyPrice: 500000,
            creditScore: 750,
            employmentType: 'salaried',
            location: 'Toronto, ON'
          }
        }
      })

      await leadsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toMatchObject({
        name: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        leadData: expect.any(Object),
        leadScore: expect.any(Number),
        brokerRecommendations: expect.any(Array)
      })
    })

    it('should handle invalid lead data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: '',
          email: 'invalid-email',
          phone: '123',
          leadData: {
            income: -1000,
            debts: 500,
            downPayment: 50000,
            propertyPrice: 500000,
            employmentType: 'salaried',
            location: 'Toronto, ON'
          }
        }
      })

      await leadsHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Invalid input')
    })
  })
})
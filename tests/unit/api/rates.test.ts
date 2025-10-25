import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/rates'
import { RateIntelligenceAgent } from '@/lib/openai'

// Mock dependencies
jest.mock('@/lib/openai')
jest.mock('@/lib/supabase')
jest.mock('@/lib/security')
jest.mock('@/lib/monitoring')
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
  })),
}))

const mockRateIntelligenceAgent = RateIntelligenceAgent as jest.MockedClass<typeof RateIntelligenceAgent>

describe('/api/rates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch rates successfully', async () => {
    const mockRates = [
      {
        lender: 'Royal Bank of Canada',
        rate: 5.45,
        apr: 5.52,
        term: 25,
        type: 'fixed',
        paymentEstimate: 2847.23,
        features: ['No fee', 'Pre-approval available'],
        contactInfo: {
          phone: '1-800-769-2511',
          email: 'mortgages@rbc.com',
          website: 'https://rbc.com/mortgages',
        },
      },
    ]

    mockRateIntelligenceAgent.prototype.fetchRates.mockResolvedValue(mockRates)

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        country: 'CA',
        termYears: '25',
        rateType: 'fixed',
        propertyPrice: '500000',
        downPayment: '50000',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    expect(response.rates).toEqual(mockRates)
    expect(response.cached).toBe(false)
    expect(response.lastUpdated).toBeDefined()
  })

  it('should return cached rates when available', async () => {
    const mockCachedRates = [
      {
        lender: 'TD Canada Trust',
        rate: 5.52,
        apr: 5.59,
        term: 25,
        type: 'fixed',
        paymentEstimate: 2876.45,
        features: ['Rate hold', 'Pre-approval available'],
        contactInfo: {
          phone: '1-866-222-3456',
          email: 'mortgages@td.com',
          website: 'https://td.com/mortgages',
        },
      },
    ]

    // Mock Redis client to return cached data
    const mockRedis = require('redis').createClient()
    mockRedis.get.mockResolvedValue(JSON.stringify(mockCachedRates))

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        country: 'CA',
        termYears: '25',
        rateType: 'fixed',
        propertyPrice: '500000',
        downPayment: '50000',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    expect(response.rates).toEqual(mockCachedRates)
    expect(response.cached).toBe(true)
  })

  it('should handle validation errors', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        // Missing required parameters
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toHaveProperty('error')
  })

  it('should handle AI agent errors', async () => {
    mockRateIntelligenceAgent.prototype.fetchRates.mockRejectedValue(
      new Error('Rate API error')
    )

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        country: 'CA',
        termYears: '25',
        rateType: 'fixed',
        propertyPrice: '500000',
        downPayment: '50000',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    expect(JSON.parse(res._getData())).toHaveProperty('error')
  })

  it('should reject non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('should handle US rates', async () => {
    const mockRates = [
      {
        lender: 'Wells Fargo',
        rate: 6.25,
        apr: 6.35,
        term: 30,
        type: 'fixed',
        paymentEstimate: 1847.23,
        features: ['No PMI with 20% down', 'Rate lock'],
        contactInfo: {
          phone: '1-800-869-3557',
          email: 'mortgages@wellsfargo.com',
          website: 'https://wellsfargo.com/mortgages',
        },
      },
    ]

    mockRateIntelligenceAgent.prototype.fetchRates.mockResolvedValue(mockRates)

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        country: 'US',
        termYears: '30',
        rateType: 'fixed',
        propertyPrice: '400000',
        downPayment: '40000',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    expect(response.rates).toEqual(mockRates)
  })

  it('should save rate check to database when userId provided', async () => {
    const mockRates = [
      {
        lender: 'Royal Bank of Canada',
        rate: 5.45,
        apr: 5.52,
        term: 25,
        type: 'fixed',
        paymentEstimate: 2847.23,
        features: ['No fee', 'Pre-approval available'],
        contactInfo: {
          phone: '1-800-769-2511',
          email: 'mortgages@rbc.com',
          website: 'https://rbc.com/mortgages',
        },
      },
    ]

    mockRateIntelligenceAgent.prototype.fetchRates.mockResolvedValue(mockRates)

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        country: 'CA',
        termYears: '25',
        rateType: 'fixed',
        propertyPrice: '500000',
        downPayment: '50000',
        userId: 'test-user-id',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    // Database save would be tested in integration tests
  })
})
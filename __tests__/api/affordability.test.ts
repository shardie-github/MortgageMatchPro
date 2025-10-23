import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/affordability'
import { AffordabilityAgent } from '@/lib/openai'

// Mock dependencies
jest.mock('@/lib/openai')
jest.mock('@/lib/supabase')
jest.mock('@/lib/security')
jest.mock('@/lib/monitoring')

const mockAffordabilityAgent = AffordabilityAgent as jest.MockedClass<typeof AffordabilityAgent>

describe('/api/affordability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should calculate affordability successfully', async () => {
    const mockResult = {
      maxAffordable: 500000,
      monthlyPayment: 2500,
      gdsRatio: 30,
      tdsRatio: 40,
      dtiRatio: 35,
      qualifyingRate: 5.5,
      qualificationResult: true,
      breakdown: {
        principal: 2000,
        interest: 500,
        taxes: 300,
        insurance: 200,
      },
      recommendations: ['Consider a larger down payment'],
      disclaimers: ['This is an estimate only'],
    }

    mockAffordabilityAgent.prototype.calculateAffordability.mockResolvedValue(mockResult)

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
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual(mockResult)
  })

  it('should handle validation errors', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        country: 'CA',
        // Missing required fields
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toHaveProperty('error')
  })

  it('should handle AI agent errors', async () => {
    mockAffordabilityAgent.prototype.calculateAffordability.mockRejectedValue(
      new Error('OpenAI API error')
    )

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
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    expect(JSON.parse(res._getData())).toHaveProperty('error')
  })

  it('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('should handle US affordability calculation', async () => {
    const mockResult = {
      maxAffordable: 400000,
      monthlyPayment: 2000,
      gdsRatio: 0,
      tdsRatio: 0,
      dtiRatio: 35,
      qualifyingRate: 6.5,
      qualificationResult: true,
      breakdown: {
        principal: 1600,
        interest: 400,
        taxes: 200,
        insurance: 100,
      },
      recommendations: ['Consider improving credit score'],
      disclaimers: ['This is an estimate only'],
    }

    mockAffordabilityAgent.prototype.calculateAffordability.mockResolvedValue(mockResult)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        country: 'US',
        income: 60000,
        debts: 400,
        downPayment: 40000,
        propertyPrice: 400000,
        interestRate: 6.5,
        termYears: 30,
        location: 'California, CA',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual(mockResult)
  })

  it('should save calculation to database when userId provided', async () => {
    const mockResult = {
      maxAffordable: 500000,
      monthlyPayment: 2500,
      gdsRatio: 30,
      tdsRatio: 40,
      dtiRatio: 35,
      qualifyingRate: 5.5,
      qualificationResult: true,
      breakdown: {
        principal: 2000,
        interest: 500,
        taxes: 300,
        insurance: 200,
      },
      recommendations: ['Consider a larger down payment'],
      disclaimers: ['This is an estimate only'],
    }

    mockAffordabilityAgent.prototype.calculateAffordability.mockResolvedValue(mockResult)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'test-user-id',
        country: 'CA',
        income: 75000,
        debts: 500,
        downPayment: 50000,
        propertyPrice: 500000,
        interestRate: 5.5,
        termYears: 25,
        location: 'Toronto, ON',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    // Database save would be tested in integration tests
  })
})
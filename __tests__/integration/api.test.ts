import { createMocks } from 'node-mocks-http'
import affordabilityHandler from '@/pages/api/affordability'
import ratesHandler from '@/pages/api/rates'
import leadsHandler from '@/pages/api/leads'

// Mock external dependencies
jest.mock('@/lib/openai')
jest.mock('@/lib/supabase')
jest.mock('@/lib/security')
jest.mock('@/lib/monitoring')
jest.mock('redis')
jest.mock('twilio')

describe('API Integration Tests', () => {
  describe('End-to-End Affordability Flow', () => {
    it('should complete full affordability calculation flow', async () => {
      // Mock successful AI response
      const mockAffordabilityResult = {
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

      const { AffordabilityAgent } = require('@/lib/openai')
      AffordabilityAgent.prototype.calculateAffordability.mockResolvedValue(mockAffordabilityResult)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'test-user-123',
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

      await affordabilityHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const response = JSON.parse(res._getData())
      expect(response).toEqual(mockAffordabilityResult)
    })
  })

  describe('End-to-End Rate Check Flow', () => {
    it('should complete full rate checking flow', async () => {
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

      const { RateIntelligenceAgent } = require('@/lib/openai')
      RateIntelligenceAgent.prototype.fetchRates.mockResolvedValue(mockRates)

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          country: 'CA',
          termYears: '25',
          rateType: 'fixed',
          propertyPrice: '500000',
          downPayment: '50000',
          userId: 'test-user-123',
        },
      })

      await ratesHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const response = JSON.parse(res._getData())
      expect(response.rates).toEqual(mockRates)
      expect(response.cached).toBe(false)
    })
  })

  describe('End-to-End Lead Submission Flow', () => {
    it('should complete full lead submission flow', async () => {
      const mockLeadResult = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+14161234567',
        leadData: {
          income: 75000,
          debts: 500,
          downPayment: 50000,
          propertyPrice: 500000,
          creditScore: 750,
          employmentType: 'salaried',
          location: 'Toronto, ON',
        },
        leadScore: 85,
        brokerRecommendations: [
          {
            brokerId: 'broker-1',
            name: 'John Smith',
            company: 'Royal Bank Mortgage',
            commissionRate: 0.75,
            matchReason: 'High income and good credit',
          },
        ],
      }

      const { LeadRoutingAgent } = require('@/lib/openai')
      LeadRoutingAgent.prototype.processLead.mockResolvedValue(mockLeadResult)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'test-user-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+14161234567',
          leadData: {
            income: 75000,
            debts: 500,
            downPayment: 50000,
            propertyPrice: 500000,
            creditScore: 750,
            employmentType: 'salaried',
            location: 'Toronto, ON',
          },
        },
      })

      await leadsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const response = JSON.parse(res._getData())
      expect(response.leadScore).toBe(85)
      expect(response.brokerRecommendations).toHaveLength(1)
      expect(response.message).toBe('Lead submitted successfully')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle AI service failures gracefully', async () => {
      const { AffordabilityAgent } = require('@/lib/openai')
      AffordabilityAgent.prototype.calculateAffordability.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
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

      await affordabilityHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
      const response = JSON.parse(res._getData())
      expect(response).toHaveProperty('error')
      expect(response).toHaveProperty('errorId')
    })

    it('should handle database connection failures gracefully', async () => {
      const { supabaseAdmin } = require('@/lib/supabase')
      supabaseAdmin.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: new Error('Database connection failed'),
        }),
      })

      const mockAffordabilityResult = {
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

      const { AffordabilityAgent } = require('@/lib/openai')
      AffordabilityAgent.prototype.calculateAffordability.mockResolvedValue(mockAffordabilityResult)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'test-user-123',
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

      await affordabilityHandler(req, res)

      // Should still return success even if database save fails
      expect(res._getStatusCode()).toBe(200)
      const response = JSON.parse(res._getData())
      expect(response).toEqual(mockAffordabilityResult)
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits across multiple requests', async () => {
      const mockAffordabilityResult = {
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

      const { AffordabilityAgent } = require('@/lib/openai')
      AffordabilityAgent.prototype.calculateAffordability.mockResolvedValue(mockAffordabilityResult)

      // Make multiple requests to test rate limiting
      const requests = Array(15).fill(null).map(() => {
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
        return { req, res }
      })

      // Execute all requests
      const results = await Promise.all(
        requests.map(({ req, res }) => affordabilityHandler(req, res))
      )

      // Check that some requests were rate limited
      const rateLimitedCount = results.filter((_, index) => {
        const { res } = requests[index]
        return res._getStatusCode() === 429
      }).length

      expect(rateLimitedCount).toBeGreaterThan(0)
    })
  })

  describe('Security Integration', () => {
    it('should reject requests with invalid input', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          country: 'INVALID',
          income: -1000, // Negative income
          debts: 'not-a-number',
          downPayment: 50000,
          propertyPrice: 500000,
          interestRate: 5.5,
          termYears: 25,
          location: 'Toronto, ON',
        },
      })

      await affordabilityHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const response = JSON.parse(res._getData())
      expect(response).toHaveProperty('error')
    })

    it('should sanitize malicious input', async () => {
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
          location: '<script>alert("xss")</script>Toronto, ON',
        },
      })

      await affordabilityHandler(req, res)

      // Should sanitize the location field
      expect(res._getStatusCode()).toBe(200)
    })
  })
})
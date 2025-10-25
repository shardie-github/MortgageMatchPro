import { RateIntelligenceAgent } from '@/lib/openai'

describe('RateIntelligenceAgent', () => {
  let agent: RateIntelligenceAgent

  beforeEach(() => {
    agent = new RateIntelligenceAgent()
  })

  describe('fetchRates', () => {
    it('should fetch Canadian rates', async () => {
      const input = {
        country: 'CA' as const,
        termYears: 25,
        rateType: 'fixed' as const,
        propertyPrice: 500000,
        downPayment: 50000
      }

      const result = await agent.fetchRates(input)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(rate => {
        expect(rate).toMatchObject({
          lender: expect.any(String),
          rate: expect.any(Number),
          apr: expect.any(Number),
          term: expect.any(Number),
          type: expect.any(String),
          paymentEstimate: expect.any(Number),
          features: expect.any(Array),
          contactInfo: {
            phone: expect.any(String),
            email: expect.any(String),
            website: expect.any(String)
          }
        })

        expect(rate.rate).toBeGreaterThan(0)
        expect(rate.apr).toBeGreaterThan(0)
        expect(rate.term).toBe(input.termYears)
        expect(rate.type).toBe(input.rateType)
        expect(rate.paymentEstimate).toBeGreaterThan(0)
        expect(rate.features.length).toBeGreaterThan(0)
      })
    })

    it('should fetch US rates', async () => {
      const input = {
        country: 'US' as const,
        termYears: 30,
        rateType: 'fixed' as const,
        propertyPrice: 400000,
        downPayment: 40000
      }

      const result = await agent.fetchRates(input)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(rate => {
        expect(rate).toMatchObject({
          lender: expect.any(String),
          rate: expect.any(Number),
          apr: expect.any(Number),
          term: expect.any(Number),
          type: expect.any(String),
          paymentEstimate: expect.any(Number),
          features: expect.any(Array),
          contactInfo: {
            phone: expect.any(String),
            email: expect.any(String),
            website: expect.any(String)
          }
        })

        expect(rate.rate).toBeGreaterThan(0)
        expect(rate.apr).toBeGreaterThan(0)
        expect(rate.term).toBe(input.termYears)
        expect(rate.type).toBe(input.rateType)
        expect(rate.paymentEstimate).toBeGreaterThan(0)
      })
    })

    it('should calculate payment estimates correctly', async () => {
      const input = {
        country: 'CA' as const,
        termYears: 25,
        rateType: 'fixed' as const,
        propertyPrice: 500000,
        downPayment: 100000
      }

      const result = await agent.fetchRates(input)
      const principal = input.propertyPrice - input.downPayment

      result.forEach(rate => {
        // Payment should be reasonable for the principal amount
        expect(rate.paymentEstimate).toBeGreaterThan(principal * 0.003) // At least 0.3% of principal
        expect(rate.paymentEstimate).toBeLessThan(principal * 0.01) // At most 1% of principal
      })
    })

    it('should handle variable rate requests', async () => {
      const input = {
        country: 'CA' as const,
        termYears: 25,
        rateType: 'variable' as const,
        propertyPrice: 500000,
        downPayment: 50000
      }

      const result = await agent.fetchRates(input)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(rate => {
        expect(rate.type).toBe('variable')
        expect(rate.rate).toBeGreaterThan(0)
        expect(rate.paymentEstimate).toBeGreaterThan(0)
      })
    })
  })
})
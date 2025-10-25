import { AffordabilityAgent } from '@/lib/openai'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  maxAffordable: 500000,
                  monthlyPayment: 2847.23,
                  gdsRatio: 28.5,
                  tdsRatio: 35.2,
                  dtiRatio: 32.1,
                  qualifyingRate: 7.5,
                  qualificationResult: true,
                  breakdown: {
                    principal: 1847.23,
                    interest: 1000.00,
                    taxes: 0,
                    insurance: 0,
                    pmi: 0
                  },
                  recommendations: [
                    'Your debt-to-income ratio is within acceptable limits',
                    'Consider making a larger down payment to reduce monthly payments',
                    'Shop around for better interest rates'
                  ],
                  disclaimers: [
                    'Rates are subject to change and approval',
                    'This calculation is for estimation purposes only'
                  ]
                })
              }
            }]
          })
        })
      }
    }))
  }
})

describe('AffordabilityAgent', () => {
  let agent: AffordabilityAgent

  beforeEach(() => {
    agent = new AffordabilityAgent()
  })

  describe('calculateAffordability', () => {
    it('should calculate affordability for Canadian user', async () => {
      const input = {
        country: 'CA' as const,
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

      const result = await agent.calculateAffordability(input)

      expect(result).toMatchObject({
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

      expect(result.maxAffordable).toBeGreaterThan(0)
      expect(result.monthlyPayment).toBeGreaterThan(0)
      expect(result.gdsRatio).toBeGreaterThan(0)
      expect(result.gdsRatio).toBeLessThanOrEqual(100)
      expect(result.tdsRatio).toBeGreaterThan(0)
      expect(result.tdsRatio).toBeLessThanOrEqual(100)
    })

    it('should calculate affordability for US user', async () => {
      const input = {
        country: 'US' as const,
        income: 80000,
        debts: 600,
        downPayment: 40000,
        propertyPrice: 400000,
        interestRate: 6.25,
        termYears: 30,
        location: 'Los Angeles, CA',
        taxes: 0,
        insurance: 0,
        hoa: 0
      }

      const result = await agent.calculateAffordability(input)

      expect(result).toMatchObject({
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

    it('should handle high debt-to-income ratio', async () => {
      const input = {
        country: 'CA' as const,
        income: 50000,
        debts: 2000,
        downPayment: 25000,
        propertyPrice: 300000,
        interestRate: 5.5,
        termYears: 25,
        location: 'Vancouver, BC',
        taxes: 0,
        insurance: 0,
        hoa: 0
      }

      const result = await agent.calculateAffordability(input)

      expect(result.qualificationResult).toBe(false)
      expect(result.tdsRatio).toBeGreaterThan(44) // Should exceed Canadian TDS limit
    })

    it('should include additional costs in calculations', async () => {
      const input = {
        country: 'CA' as const,
        income: 75000,
        debts: 500,
        downPayment: 50000,
        propertyPrice: 500000,
        interestRate: 5.5,
        termYears: 25,
        location: 'Toronto, ON',
        taxes: 300,
        insurance: 150,
        hoa: 200
      }

      const result = await agent.calculateAffordability(input)

      expect(result.monthlyPayment).toBeGreaterThan(0)
      expect(result.breakdown.taxes).toBe(300)
      expect(result.breakdown.insurance).toBe(150)
    })
  })
})
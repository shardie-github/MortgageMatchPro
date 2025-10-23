import { AffordabilityAgent, RateIntelligenceAgent, ScenarioAnalysisAgent, LeadRoutingAgent } from '@/lib/openai'

// Mock the OpenAI client
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}))

describe('OpenAI Agents', () => {
  describe('AffordabilityAgent', () => {
    let agent: AffordabilityAgent

    beforeEach(() => {
      agent = new AffordabilityAgent()
    })

    it('should calculate affordability for Canadian user', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
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
            })
          }
        }]
      }

      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }))

      const result = await agent.calculateAffordability({
        country: 'CA',
        income: 75000,
        debts: 500,
        downPayment: 50000,
        propertyPrice: 500000,
        interestRate: 5.5,
        termYears: 25,
        location: 'Toronto, ON',
      })

      expect(result.maxAffordable).toBe(500000)
      expect(result.qualificationResult).toBe(true)
      expect(result.gdsRatio).toBe(30)
    })

    it('should handle US affordability calculation', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
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
            })
          }
        }]
      }

      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }))

      const result = await agent.calculateAffordability({
        country: 'US',
        income: 60000,
        debts: 400,
        downPayment: 40000,
        propertyPrice: 400000,
        interestRate: 6.5,
        termYears: 30,
        location: 'California, CA',
      })

      expect(result.dtiRatio).toBe(35)
      expect(result.qualificationResult).toBe(true)
    })
  })

  describe('RateIntelligenceAgent', () => {
    let agent: RateIntelligenceAgent

    beforeEach(() => {
      agent = new RateIntelligenceAgent()
    })

    it('should fetch rates for Canadian market', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              rates: [
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
                }
              ]
            })
          }
        }]
      }

      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }))

      const rates = await agent.fetchRates({
        country: 'CA',
        termYears: 25,
        rateType: 'fixed',
        propertyPrice: 500000,
        downPayment: 50000,
      })

      expect(rates).toHaveLength(1)
      expect(rates[0].lender).toBe('Royal Bank of Canada')
      expect(rates[0].rate).toBe(5.45)
    })
  })

  describe('ScenarioAnalysisAgent', () => {
    let agent: ScenarioAnalysisAgent

    beforeEach(() => {
      agent = new ScenarioAnalysisAgent()
    })

    it('should compare multiple scenarios', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scenarios: [
                {
                  name: '5-Year Fixed',
                  rate: 5.5,
                  term: 25,
                  type: 'fixed',
                  monthlyPayment: 2500,
                  totalInterest: 200000,
                  totalCost: 700000,
                  amortizationSchedule: []
                },
                {
                  name: '5-Year Variable',
                  rate: 5.2,
                  term: 25,
                  type: 'variable',
                  monthlyPayment: 2400,
                  totalInterest: 190000,
                  totalCost: 690000,
                  amortizationSchedule: []
                }
              ],
              recommendation: {
                bestOption: '5-Year Variable',
                savings: 10000,
                reasoning: 'Lower rate and total cost'
              }
            })
          }
        }]
      }

      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }))

      const comparison = await agent.compareScenarios({
        scenarios: [
          {
            name: '5-Year Fixed',
            rate: 5.5,
            term: 25,
            type: 'fixed',
            propertyPrice: 500000,
            downPayment: 50000,
          },
          {
            name: '5-Year Variable',
            rate: 5.2,
            term: 25,
            type: 'variable',
            propertyPrice: 500000,
            downPayment: 50000,
          }
        ]
      })

      expect(comparison.scenarios).toHaveLength(2)
      expect(comparison.recommendation.bestOption).toBe('5-Year Variable')
      expect(comparison.recommendation.savings).toBe(10000)
    })
  })

  describe('LeadRoutingAgent', () => {
    let agent: LeadRoutingAgent

    beforeEach(() => {
      agent = new LeadRoutingAgent()
    })

    it('should process lead and calculate score', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
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
                  matchReason: 'High income and good credit'
                }
              ]
            })
          }
        }]
      }

      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      }))

      const lead = await agent.processLead({
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
        }
      })

      expect(lead.leadScore).toBe(85)
      expect(lead.brokerRecommendations).toHaveLength(1)
      expect(lead.brokerRecommendations[0].name).toBe('John Smith')
    })
  })
})
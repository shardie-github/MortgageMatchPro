import { LeadRoutingAgent } from '@/lib/openai'

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
                  },
                  leadScore: 85,
                  brokerRecommendations: [
                    {
                      brokerId: 'broker-1',
                      name: 'Jane Smith',
                      company: 'Royal Bank Mortgage',
                      commissionRate: 0.75,
                      matchReason: 'High credit score and stable income'
                    },
                    {
                      brokerId: 'broker-2',
                      name: 'Mike Johnson',
                      company: 'TD Mortgage',
                      commissionRate: 0.80,
                      matchReason: 'Specializes in first-time buyers'
                    }
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

describe('LeadRoutingAgent', () => {
  let agent: LeadRoutingAgent

  beforeEach(() => {
    agent = new LeadRoutingAgent()
  })

  describe('processLead', () => {
    it('should process a high-quality lead', async () => {
      const input = {
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

      const result = await agent.processLead(input)

      expect(result).toMatchObject({
        name: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        leadData: {
          income: expect.any(Number),
          debts: expect.any(Number),
          downPayment: expect.any(Number),
          propertyPrice: expect.any(Number),
          creditScore: expect.any(Number),
          employmentType: expect.any(String),
          location: expect.any(String)
        },
        leadScore: expect.any(Number),
        brokerRecommendations: expect.any(Array)
      })

      expect(result.leadScore).toBeGreaterThanOrEqual(0)
      expect(result.leadScore).toBeLessThanOrEqual(100)
      expect(result.brokerRecommendations.length).toBeGreaterThan(0)
    })

    it('should handle low-quality leads', async () => {
      const input = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567891',
        leadData: {
          income: 30000,
          debts: 1500,
          downPayment: 10000,
          propertyPrice: 400000,
          creditScore: 600,
          employmentType: 'contract',
          location: 'Vancouver, BC'
        }
      }

      const result = await agent.processLead(input)

      expect(result.leadScore).toBeLessThan(70) // Should be low quality
      expect(result.brokerRecommendations.length).toBeGreaterThanOrEqual(0)
    })

    it('should calculate lead score based on multiple factors', async () => {
      const highQualityInput = {
        name: 'High Quality Lead',
        email: 'high@example.com',
        phone: '+1234567892',
        leadData: {
          income: 100000,
          debts: 200,
          downPayment: 100000,
          propertyPrice: 500000,
          creditScore: 800,
          employmentType: 'salaried',
          location: 'Toronto, ON'
        }
      }

      const lowQualityInput = {
        name: 'Low Quality Lead',
        email: 'low@example.com',
        phone: '+1234567893',
        leadData: {
          income: 40000,
          debts: 2000,
          downPayment: 5000,
          propertyPrice: 600000,
          creditScore: 550,
          employmentType: 'contract',
          location: 'Vancouver, BC'
        }
      }

      const highQualityResult = await agent.processLead(highQualityInput)
      const lowQualityResult = await agent.processLead(lowQualityInput)

      expect(highQualityResult.leadScore).toBeGreaterThan(lowQualityResult.leadScore)
    })

    it('should provide appropriate broker recommendations', async () => {
      const input = {
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '+1234567894',
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

      const result = await agent.processLead(input)

      result.brokerRecommendations.forEach(broker => {
        expect(broker).toMatchObject({
          brokerId: expect.any(String),
          name: expect.any(String),
          company: expect.any(String),
          commissionRate: expect.any(Number),
          matchReason: expect.any(String)
        })

        expect(broker.commissionRate).toBeGreaterThan(0)
        expect(broker.commissionRate).toBeLessThanOrEqual(1)
        expect(broker.matchReason).toBeTruthy()
      })
    })

    it('should handle missing optional fields', async () => {
      const input = {
        name: 'Minimal Lead',
        email: 'minimal@example.com',
        phone: '+1234567895',
        leadData: {
          income: 60000,
          debts: 300,
          downPayment: 30000,
          propertyPrice: 400000,
          employmentType: 'salaried',
          location: 'Montreal, QC'
          // creditScore is optional
        }
      }

      const result = await agent.processLead(input)

      expect(result).toMatchObject({
        name: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        leadData: {
          income: expect.any(Number),
          debts: expect.any(Number),
          downPayment: expect.any(Number),
          propertyPrice: expect.any(Number),
          employmentType: expect.any(String),
          location: expect.any(String)
        },
        leadScore: expect.any(Number),
        brokerRecommendations: expect.any(Array)
      })
    })
  })
})
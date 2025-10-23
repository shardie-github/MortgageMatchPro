import { ScenarioAnalysisAgent } from '@/lib/openai'

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
                  scenarios: [
                    {
                      name: 'RBC Fixed 5.45%',
                      rate: 5.45,
                      term: 25,
                      type: 'fixed',
                      monthlyPayment: 2847.23,
                      totalInterest: 354169.00,
                      totalCost: 854169.00,
                      amortizationSchedule: [
                        {
                          month: 1,
                          principal: 1847.23,
                          interest: 1000.00,
                          balance: 498152.77
                        },
                        {
                          month: 2,
                          principal: 1855.47,
                          interest: 991.76,
                          balance: 496297.30
                        }
                      ]
                    },
                    {
                      name: 'TD Variable 5.52%',
                      rate: 5.52,
                      term: 25,
                      type: 'variable',
                      monthlyPayment: 2876.45,
                      totalInterest: 362935.00,
                      totalCost: 862935.00,
                      amortizationSchedule: [
                        {
                          month: 1,
                          principal: 1826.45,
                          interest: 1050.00,
                          balance: 498173.55
                        },
                        {
                          month: 2,
                          principal: 1834.85,
                          interest: 1041.60,
                          balance: 496338.70
                        }
                      ]
                    }
                  ],
                  recommendation: {
                    bestOption: 'RBC Fixed 5.45%',
                    savings: 8766.00,
                    reasoning: 'The RBC fixed rate offers the lowest monthly payment and total cost over the life of the loan, saving you $8,766 compared to the variable rate option.'
                  }
                })
              }
            }]
          })
        })
      }
    }))
  }
})

describe('ScenarioAnalysisAgent', () => {
  let agent: ScenarioAnalysisAgent

  beforeEach(() => {
    agent = new ScenarioAnalysisAgent()
  })

  describe('compareScenarios', () => {
    it('should compare multiple mortgage scenarios', async () => {
      const input = {
        scenarios: [
          {
            name: 'RBC Fixed 5.45%',
            rate: 5.45,
            term: 25,
            type: 'fixed' as const,
            propertyPrice: 500000,
            downPayment: 50000
          },
          {
            name: 'TD Variable 5.52%',
            rate: 5.52,
            term: 25,
            type: 'variable' as const,
            propertyPrice: 500000,
            downPayment: 50000
          }
        ]
      }

      const result = await agent.compareScenarios(input)

      expect(result).toMatchObject({
        scenarios: expect.any(Array),
        recommendation: {
          bestOption: expect.any(String),
          savings: expect.any(Number),
          reasoning: expect.any(String)
        }
      })

      expect(result.scenarios).toHaveLength(2)
      expect(result.scenarios[0]).toMatchObject({
        name: expect.any(String),
        rate: expect.any(Number),
        term: expect.any(Number),
        type: expect.any(String),
        monthlyPayment: expect.any(Number),
        totalInterest: expect.any(Number),
        totalCost: expect.any(Number),
        amortizationSchedule: expect.any(Array)
      })

      expect(result.recommendation.bestOption).toBeTruthy()
      expect(result.recommendation.savings).toBeGreaterThanOrEqual(0)
      expect(result.recommendation.reasoning).toBeTruthy()
    })

    it('should handle single scenario', async () => {
      const input = {
        scenarios: [
          {
            name: 'Single Option',
            rate: 5.5,
            term: 25,
            type: 'fixed' as const,
            propertyPrice: 500000,
            downPayment: 50000
          }
        ]
      }

      const result = await agent.compareScenarios(input)

      expect(result.scenarios).toHaveLength(1)
      expect(result.recommendation.bestOption).toBe('Single Option')
      expect(result.recommendation.savings).toBe(0)
    })

    it('should calculate amortization schedules correctly', async () => {
      const input = {
        scenarios: [
          {
            name: 'Test Scenario',
            rate: 5.0,
            term: 25,
            type: 'fixed' as const,
            propertyPrice: 500000,
            downPayment: 100000
          }
        ]
      }

      const result = await agent.compareScenarios(input)
      const scenario = result.scenarios[0]

      expect(scenario.amortizationSchedule).toBeInstanceOf(Array)
      expect(scenario.amortizationSchedule.length).toBeGreaterThan(0)

      const firstPayment = scenario.amortizationSchedule[0]
      expect(firstPayment).toMatchObject({
        month: expect.any(Number),
        principal: expect.any(Number),
        interest: expect.any(Number),
        balance: expect.any(Number)
      })

      expect(firstPayment.month).toBe(1)
      expect(firstPayment.principal).toBeGreaterThan(0)
      expect(firstPayment.interest).toBeGreaterThan(0)
      expect(firstPayment.balance).toBeLessThan(400000) // Should be less than principal
    })

    it('should identify the best option based on total cost', async () => {
      const input = {
        scenarios: [
          {
            name: 'Higher Rate Option',
            rate: 6.0,
            term: 25,
            type: 'fixed' as const,
            propertyPrice: 500000,
            downPayment: 50000
          },
          {
            name: 'Lower Rate Option',
            rate: 5.0,
            term: 25,
            type: 'fixed' as const,
            propertyPrice: 500000,
            downPayment: 50000
          }
        ]
      }

      const result = await agent.compareScenarios(input)

      expect(result.recommendation.bestOption).toBe('Lower Rate Option')
      expect(result.recommendation.savings).toBeGreaterThan(0)
    })
  })
})
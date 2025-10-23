import { DataIngestionAgent } from '@/lib/agents/data-ingestion-agent'
import { ForecastingAgent } from '@/lib/agents/forecasting-agent'
import { RefinanceAgent } from '@/lib/agents/refinance-agent'
import { PrescriptiveAgent } from '@/lib/agents/prescriptive-agent'
import { ScenarioSimulator } from '@/lib/agents/scenario-simulator'
import { ExplainabilityAgent } from '@/lib/agents/explainability-agent'
import { PredictiveOrchestrator } from '@/lib/agents/predictive-orchestrator'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  id: 'test-user-id',
                  interest_rate: 5.5,
                  property_price: 500000,
                  down_payment: 100000,
                  term_years: 25,
                  income: 75000
                },
                error: null
              }))
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null
      })),
      upsert: jest.fn(() => ({
        data: null,
        error: null
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}))

// Mock OpenAI
jest.mock('@/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(() => ({
          choices: [{
            message: {
              content: JSON.stringify({
                reasoning: 'Test reasoning',
                recommendations: ['Test recommendation']
              })
            }
          }]
        }))
      }
    }
  }
}))

describe('Predictive Insights System', () => {
  let dataIngestionAgent: DataIngestionAgent
  let forecastingAgent: ForecastingAgent
  let refinanceAgent: RefinanceAgent
  let prescriptiveAgent: PrescriptiveAgent
  let scenarioSimulator: ScenarioSimulator
  let explainabilityAgent: ExplainabilityAgent
  let orchestrator: PredictiveOrchestrator

  beforeEach(() => {
    dataIngestionAgent = new DataIngestionAgent()
    forecastingAgent = new ForecastingAgent()
    refinanceAgent = new RefinanceAgent()
    prescriptiveAgent = new PrescriptiveAgent()
    scenarioSimulator = new ScenarioSimulator()
    explainabilityAgent = new ExplainabilityAgent()
    
    orchestrator = new PredictiveOrchestrator({
      enableDataIngestion: true,
      enableForecasting: true,
      enableRefinanceWatchlist: true,
      enablePrescriptiveAnalytics: true,
      enableScenarioSimulation: true,
      enableExplainability: true,
      regions: ['CA', 'Toronto'],
      forecastHorizon: 12,
      simulationIterations: 100,
      alertThresholds: {
        rateDrop: 0.75,
        refinanceProbability: 0.6,
        propertyAppreciation: 5.0
      }
    })
  })

  describe('DataIngestionAgent', () => {
    test('should ingest mortgage rates data', async () => {
      const rates = await dataIngestionAgent.ingestMortgageRates('CA')
      expect(Array.isArray(rates)).toBe(true)
    })

    test('should ingest property values data', async () => {
      const properties = await dataIngestionAgent.ingestPropertyValues('Toronto')
      expect(Array.isArray(properties)).toBe(true)
    })

    test('should ingest income trends data', async () => {
      const income = await dataIngestionAgent.ingestIncomeTrends('CA')
      expect(Array.isArray(income)).toBe(true)
    })

    test('should ingest market indices data', async () => {
      const indices = await dataIngestionAgent.ingestMarketIndices('CA')
      expect(Array.isArray(indices)).toBe(true)
    })

    test('should get historical data', async () => {
      const historical = await dataIngestionAgent.getHistoricalData(
        'mortgage_rates',
        'CA',
        '2024-01-01',
        '2024-12-31'
      )
      expect(Array.isArray(historical)).toBe(true)
    })
  })

  describe('ForecastingAgent', () => {
    test('should forecast mortgage rates', async () => {
      const forecasts = await forecastingAgent.forecastMortgageRates('CA', 12)
      expect(Array.isArray(forecasts)).toBe(true)
      expect(forecasts.length).toBe(12)
      
      if (forecasts.length > 0) {
        expect(forecasts[0]).toHaveProperty('targetDate')
        expect(forecasts[0]).toHaveProperty('predictedValue')
        expect(forecasts[0]).toHaveProperty('confidenceScore')
      }
    })

    test('should forecast property appreciation', async () => {
      const forecasts = await forecastingAgent.forecastPropertyAppreciation('Toronto', 12)
      expect(Array.isArray(forecasts)).toBe(true)
      expect(forecasts.length).toBe(12)
      
      if (forecasts.length > 0) {
        expect(forecasts[0]).toHaveProperty('targetDate')
        expect(forecasts[0]).toHaveProperty('predictedValue')
        expect(forecasts[0]).toHaveProperty('confidenceScore')
      }
    })

    test('should predict refinance probability', async () => {
      const forecast = await forecastingAgent.predictRefinanceProbability(
        'test-user-id',
        5.5,
        400000,
        500000,
        750,
        75000
      )
      
      expect(forecast).toHaveProperty('probability')
      expect(forecast).toHaveProperty('potentialSavings')
      expect(forecast).toHaveProperty('priorityScore')
      expect(forecast.probability).toBeGreaterThanOrEqual(0)
      expect(forecast.probability).toBeLessThanOrEqual(1)
    })

    test('should get latest forecasts', async () => {
      const forecasts = await forecastingAgent.getLatestForecasts('test-user-id', 'rate_forecast')
      expect(Array.isArray(forecasts)).toBe(true)
    })
  })

  describe('RefinanceAgent', () => {
    test('should generate refinance watchlist', async () => {
      const watchlist = await refinanceAgent.generateRefinanceWatchlist()
      expect(Array.isArray(watchlist)).toBe(true)
    })

    test('should get refinance watchlist for user', async () => {
      const watchlist = await refinanceAgent.getRefinanceWatchlist('test-user-id')
      expect(Array.isArray(watchlist)).toBe(true)
    })

    test('should update watchlist item status', async () => {
      await expect(refinanceAgent.updateWatchlistItem(
        'test-item-id',
        'contacted',
        'Test notes'
      )).resolves.not.toThrow()
    })

    test('should generate retention strategies', async () => {
      const strategies = await refinanceAgent.generateRetentionStrategies('test-user-id')
      expect(Array.isArray(strategies)).toBe(true)
    })

    test('should check rate drop alerts', async () => {
      await expect(refinanceAgent.checkRateDropAlerts()).resolves.not.toThrow()
    })
  })

  describe('PrescriptiveAgent', () => {
    test('should analyze what-if scenarios', async () => {
      const baseScenario = {
        parameters: {
          propertyPrice: 500000,
          downPayment: 100000,
          interestRate: 5.5,
          termYears: 25,
          income: 75000
        }
      }

      const modifications = [
        { parameter: 'interestRate', newValue: 4.5 },
        { parameter: 'downPayment', newValue: 150000 }
      ]

      const analysis = await prescriptiveAgent.analyzeWhatIfScenarios(
        'test-user-id',
        baseScenario,
        modifications
      )

      expect(analysis).toHaveProperty('baseScenario')
      expect(analysis).toHaveProperty('modifications')
      expect(analysis).toHaveProperty('recommendations')
      expect(Array.isArray(analysis.modifications)).toBe(true)
      expect(Array.isArray(analysis.recommendations)).toBe(true)
    })

    test('should generate optimal recommendations', async () => {
      const recommendations = await prescriptiveAgent.generateOptimalRecommendations('test-user-id')
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('ScenarioSimulator', () => {
    test('should run stress test simulation', async () => {
      const baseScenario = {
        parameters: {
          propertyPrice: 500000,
          downPayment: 100000,
          interestRate: 5.5,
          termYears: 25,
          income: 75000
        }
      }

      const parameters = {
        baseScenario,
        iterations: 100,
        rateVolatility: 0.02,
        propertyVolatility: 0.1,
        incomeVolatility: 0.05,
        timeHorizon: 60
      }

      const result = await scenarioSimulator.runStressTestSimulation('test-user-id', parameters)
      
      expect(result).toHaveProperty('simulationId')
      expect(result).toHaveProperty('simulationType')
      expect(result).toHaveProperty('iterations')
      expect(result).toHaveProperty('results')
      expect(result.iterations).toBe(100)
    })

    test('should run rate shock simulation', async () => {
      const baseScenario = {
        parameters: {
          propertyPrice: 500000,
          downPayment: 100000,
          interestRate: 5.5,
          termYears: 25,
          income: 75000
        }
      }

      const shockScenarios = [
        { name: 'Mild Shock', rateIncrease: 1.0 },
        { name: 'Moderate Shock', rateIncrease: 2.0 }
      ]

      const result = await scenarioSimulator.runRateShockSimulation(
        'test-user-id',
        baseScenario,
        shockScenarios
      )

      expect(result).toHaveProperty('simulationId')
      expect(result).toHaveProperty('simulationType')
      expect(result.simulationType).toBe('rate_shock')
    })

    test('should get simulation results', async () => {
      const results = await scenarioSimulator.getSimulationResults('test-user-id')
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('ExplainabilityAgent', () => {
    test('should generate SHAP explanation', async () => {
      const inputFeatures = {
        interest_rate: 5.5,
        credit_score: 750,
        ltv_ratio: 0.8,
        income: 75000
      }

      const explanation = await explainabilityAgent.generateSHAPExplanation(
        'test-forecast-id',
        inputFeatures,
        'rate_forecast'
      )

      expect(explanation).toHaveProperty('id')
      expect(explanation).toHaveProperty('forecastId')
      expect(explanation).toHaveProperty('explanationType')
      expect(explanation).toHaveProperty('featureContributions')
      expect(explanation.explanationType).toBe('shap')
    })

    test('should generate LIME explanation', async () => {
      const inputFeatures = {
        interest_rate: 5.5,
        credit_score: 750,
        ltv_ratio: 0.8,
        income: 75000
      }

      const explanation = await explainabilityAgent.generateLIMEExplanation(
        'test-forecast-id',
        inputFeatures,
        'rate_forecast'
      )

      expect(explanation).toHaveProperty('id')
      expect(explanation).toHaveProperty('forecastId')
      expect(explanation).toHaveProperty('explanationType')
      expect(explanation.explanationType).toBe('lime')
    })

    test('should generate compliance report', async () => {
      const testData = [
        { actual: 1, predicted: 1 },
        { actual: 0, predicted: 0 },
        { actual: 1, predicted: 0 }
      ]

      const report = await explainabilityAgent.generateComplianceReport(
        'rate_forecast',
        'v1.0.0',
        testData
      )

      expect(report).toHaveProperty('modelType')
      expect(report).toHaveProperty('modelVersion')
      expect(report).toHaveProperty('metrics')
      expect(report).toHaveProperty('biasAssessment')
      expect(report).toHaveProperty('fairnessMetrics')
      expect(report).toHaveProperty('regulatoryCompliance')
    })
  })

  describe('PredictiveOrchestrator', () => {
    test('should run predictive insights pipeline', async () => {
      const summary = await orchestrator.runPredictiveInsightsPipeline()
      
      expect(summary).toHaveProperty('timestamp')
      expect(summary).toHaveProperty('dataIngestion')
      expect(summary).toHaveProperty('forecasting')
      expect(summary).toHaveProperty('refinanceWatchlist')
      expect(summary).toHaveProperty('prescriptiveAnalytics')
      expect(summary).toHaveProperty('scenarioSimulation')
      expect(summary).toHaveProperty('explainability')
      expect(summary).toHaveProperty('alerts')
      expect(summary).toHaveProperty('performance')
    })

    test('should run user predictive insights', async () => {
      const insights = await orchestrator.runUserPredictiveInsights('test-user-id')
      
      expect(insights).toHaveProperty('forecasts')
      expect(insights).toHaveProperty('refinanceOpportunities')
      expect(insights).toHaveProperty('recommendations')
      expect(insights).toHaveProperty('simulations')
      expect(insights).toHaveProperty('alerts')
      expect(Array.isArray(insights.forecasts)).toBe(true)
      expect(Array.isArray(insights.refinanceOpportunities)).toBe(true)
      expect(Array.isArray(insights.recommendations)).toBe(true)
      expect(Array.isArray(insights.simulations)).toBe(true)
      expect(Array.isArray(insights.alerts)).toBe(true)
    })

    test('should get predictive insights summary', async () => {
      const summary = await orchestrator.getPredictiveInsightsSummary()
      
      expect(summary).toHaveProperty('timestamp')
      expect(summary).toHaveProperty('dataIngestion')
      expect(summary).toHaveProperty('forecasting')
      expect(summary).toHaveProperty('refinanceWatchlist')
      expect(summary).toHaveProperty('prescriptiveAnalytics')
      expect(summary).toHaveProperty('scenarioSimulation')
      expect(summary).toHaveProperty('explainability')
      expect(summary).toHaveProperty('alerts')
      expect(summary).toHaveProperty('performance')
    })
  })

  describe('Integration Tests', () => {
    test('should handle end-to-end predictive insights workflow', async () => {
      // Test the complete workflow from data ingestion to recommendations
      const userId = 'test-user-id'
      
      // Step 1: Data ingestion
      await dataIngestionAgent.runFullIngestion()
      
      // Step 2: Generate forecasts
      const rateForecasts = await forecastingAgent.forecastMortgageRates('CA', 12)
      const propertyForecasts = await forecastingAgent.forecastPropertyAppreciation('Toronto', 12)
      const refinanceForecast = await forecastingAgent.predictRefinanceProbability(
        userId, 5.5, 400000, 500000, 750, 75000
      )
      
      // Step 3: Generate refinance watchlist
      const watchlist = await refinanceAgent.generateRefinanceWatchlist()
      
      // Step 4: Generate recommendations
      const recommendations = await prescriptiveAgent.generateOptimalRecommendations(userId)
      
      // Step 5: Run scenario simulation
      const baseScenario = {
        parameters: {
          propertyPrice: 500000,
          downPayment: 100000,
          interestRate: 5.5,
          termYears: 25,
          income: 75000
        }
      }
      
      const simulation = await scenarioSimulator.runComprehensiveStressTest(userId, baseScenario)
      
      // Verify all components worked
      expect(Array.isArray(rateForecasts)).toBe(true)
      expect(Array.isArray(propertyForecasts)).toBe(true)
      expect(refinanceForecast).toHaveProperty('probability')
      expect(Array.isArray(watchlist)).toBe(true)
      expect(Array.isArray(recommendations)).toBe(true)
      expect(Array.isArray(simulation)).toBe(true)
    })

    test('should handle errors gracefully', async () => {
      // Test error handling in the orchestrator
      const errorOrchestrator = new PredictiveOrchestrator({
        enableDataIngestion: true,
        enableForecasting: true,
        enableRefinanceWatchlist: true,
        enablePrescriptiveAnalytics: true,
        enableScenarioSimulation: true,
        enableExplainability: true,
        regions: ['INVALID_REGION'],
        forecastHorizon: 12,
        simulationIterations: 100,
        alertThresholds: {
          rateDrop: 0.75,
          refinanceProbability: 0.6,
          propertyAppreciation: 5.0
        }
      })

      const summary = await errorOrchestrator.runPredictiveInsightsPipeline()
      
      // Should still return a summary even with errors
      expect(summary).toHaveProperty('timestamp')
      expect(summary).toHaveProperty('dataIngestion')
      expect(summary).toHaveProperty('forecasting')
      
      // Some components may have errors
      expect(summary.dataIngestion.status).toMatch(/success|error|skipped/)
      expect(summary.forecasting.status).toMatch(/success|error|skipped/)
    })
  })
})
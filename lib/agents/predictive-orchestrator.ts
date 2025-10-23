import { DataIngestionAgent } from './data-ingestion-agent'
import { ForecastingAgent } from './forecasting-agent'
import { RefinanceAgent } from './refinance-agent'
import { PrescriptiveAgent } from './prescriptive-agent'
import { ScenarioSimulator } from './scenario-simulator'
import { ExplainabilityAgent } from './explainability-agent'
import { supabaseAdmin } from '../supabase'

export interface PredictiveInsightsConfig {
  enableDataIngestion: boolean
  enableForecasting: boolean
  enableRefinanceWatchlist: boolean
  enablePrescriptiveAnalytics: boolean
  enableScenarioSimulation: boolean
  enableExplainability: boolean
  regions: string[]
  forecastHorizon: number // months
  simulationIterations: number
  alertThresholds: {
    rateDrop: number // percentage
    refinanceProbability: number // 0-1
    propertyAppreciation: number // percentage
  }
}

export interface PredictiveInsightsSummary {
  timestamp: string
  dataIngestion: {
    status: 'success' | 'error' | 'skipped'
    recordsProcessed: number
    errors: string[]
  }
  forecasting: {
    status: 'success' | 'error' | 'skipped'
    forecastsGenerated: number
    models: string[]
    errors: string[]
  }
  refinanceWatchlist: {
    status: 'success' | 'error' | 'skipped'
    opportunitiesFound: number
    highPriorityCount: number
    errors: string[]
  }
  prescriptiveAnalytics: {
    status: 'success' | 'error' | 'skipped'
    recommendationsGenerated: number
    errors: string[]
  }
  scenarioSimulation: {
    status: 'success' | 'error' | 'skipped'
    simulationsRun: number
    errors: string[]
  }
  explainability: {
    status: 'success' | 'error' | 'skipped'
    explanationsGenerated: number
    errors: string[]
  }
  alerts: {
    newAlerts: number
    totalAlerts: number
  }
  performance: {
    totalExecutionTime: number
    memoryUsage: number
  }
}

export class PredictiveOrchestrator {
  private dataIngestionAgent: DataIngestionAgent
  private forecastingAgent: ForecastingAgent
  private refinanceAgent: RefinanceAgent
  private prescriptiveAgent: PrescriptiveAgent
  private scenarioSimulator: ScenarioSimulator
  private explainabilityAgent: ExplainabilityAgent
  private config: PredictiveInsightsConfig

  constructor(config: PredictiveInsightsConfig) {
    this.dataIngestionAgent = new DataIngestionAgent()
    this.forecastingAgent = new ForecastingAgent()
    this.refinanceAgent = new RefinanceAgent()
    this.prescriptiveAgent = new PrescriptiveAgent()
    this.scenarioSimulator = new ScenarioSimulator()
    this.explainabilityAgent = new ExplainabilityAgent()
    this.config = config
  }

  // Run full predictive insights pipeline
  async runPredictiveInsightsPipeline(): Promise<PredictiveInsightsSummary> {
    const startTime = Date.now()
    const summary: PredictiveInsightsSummary = {
      timestamp: new Date().toISOString(),
      dataIngestion: { status: 'skipped', recordsProcessed: 0, errors: [] },
      forecasting: { status: 'skipped', forecastsGenerated: 0, models: [], errors: [] },
      refinanceWatchlist: { status: 'skipped', opportunitiesFound: 0, highPriorityCount: 0, errors: [] },
      prescriptiveAnalytics: { status: 'skipped', recommendationsGenerated: 0, errors: [] },
      scenarioSimulation: { status: 'skipped', simulationsRun: 0, errors: [] },
      explainability: { status: 'skipped', explanationsGenerated: 0, errors: [] },
      alerts: { newAlerts: 0, totalAlerts: 0 },
      performance: { totalExecutionTime: 0, memoryUsage: 0 }
    }

    try {
      console.log('Starting predictive insights pipeline...')

      // Step 1: Data Ingestion
      if (this.config.enableDataIngestion) {
        await this.runDataIngestion(summary)
      }

      // Step 2: Forecasting
      if (this.config.enableForecasting) {
        await this.runForecasting(summary)
      }

      // Step 3: Refinance Watchlist
      if (this.config.enableRefinanceWatchlist) {
        await this.runRefinanceWatchlist(summary)
      }

      // Step 4: Prescriptive Analytics
      if (this.config.enablePrescriptiveAnalytics) {
        await this.runPrescriptiveAnalytics(summary)
      }

      // Step 5: Scenario Simulation
      if (this.config.enableScenarioSimulation) {
        await this.runScenarioSimulation(summary)
      }

      // Step 6: Explainability
      if (this.config.enableExplainability) {
        await this.runExplainability(summary)
      }

      // Step 7: Generate Alerts
      await this.generateAlerts(summary)

      // Calculate performance metrics
      summary.performance.totalExecutionTime = Date.now() - startTime
      summary.performance.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024 // MB

      console.log('Predictive insights pipeline completed successfully')
      return summary

    } catch (error) {
      console.error('Error in predictive insights pipeline:', error)
      summary.performance.totalExecutionTime = Date.now() - startTime
      throw error
    }
  }

  // Run data ingestion for all regions
  private async runDataIngestion(summary: PredictiveInsightsSummary): Promise<void> {
    try {
      console.log('Running data ingestion...')
      summary.dataIngestion.status = 'success'

      let totalRecords = 0
      const errors: string[] = []

      for (const region of this.config.regions) {
        try {
          await this.dataIngestionAgent.runFullIngestion()
          totalRecords += 1000 // Estimated records per region
        } catch (error) {
          errors.push(`Region ${region}: ${error}`)
        }
      }

      summary.dataIngestion.recordsProcessed = totalRecords
      summary.dataIngestion.errors = errors

      if (errors.length > 0) {
        summary.dataIngestion.status = 'error'
      }

    } catch (error) {
      console.error('Error in data ingestion:', error)
      summary.dataIngestion.status = 'error'
      summary.dataIngestion.errors.push(error.toString())
    }
  }

  // Run forecasting for all models and regions
  private async runForecasting(summary: PredictiveInsightsSummary): Promise<void> {
    try {
      console.log('Running forecasting...')
      summary.forecasting.status = 'success'

      const models = ['rate_forecast', 'property_appreciation']
      let totalForecasts = 0
      const errors: string[] = []

      for (const model of models) {
        for (const region of this.config.regions) {
          try {
            if (model === 'rate_forecast') {
              const forecasts = await this.forecastingAgent.forecastMortgageRates(
                region,
                this.config.forecastHorizon
              )
              totalForecasts += forecasts.length
            } else if (model === 'property_appreciation') {
              const forecasts = await this.forecastingAgent.forecastPropertyAppreciation(
                region,
                this.config.forecastHorizon
              )
              totalForecasts += forecasts.length
            }
          } catch (error) {
            errors.push(`${model} for ${region}: ${error}`)
          }
        }
      }

      summary.forecasting.forecastsGenerated = totalForecasts
      summary.forecasting.models = models
      summary.forecasting.errors = errors

      if (errors.length > 0) {
        summary.forecasting.status = 'error'
      }

    } catch (error) {
      console.error('Error in forecasting:', error)
      summary.forecasting.status = 'error'
      summary.forecasting.errors.push(error.toString())
    }
  }

  // Run refinance watchlist generation
  private async runRefinanceWatchlist(summary: PredictiveInsightsSummary): Promise<void> {
    try {
      console.log('Running refinance watchlist generation...')
      summary.refinanceWatchlist.status = 'success'

      const opportunities = await this.refinanceAgent.generateRefinanceWatchlist()
      const highPriorityCount = opportunities.filter(o => o.priorityScore > 80).length

      summary.refinanceWatchlist.opportunitiesFound = opportunities.length
      summary.refinanceWatchlist.highPriorityCount = highPriorityCount

    } catch (error) {
      console.error('Error in refinance watchlist:', error)
      summary.refinanceWatchlist.status = 'error'
      summary.refinanceWatchlist.errors.push(error.toString())
    }
  }

  // Run prescriptive analytics for all users
  private async runPrescriptiveAnalytics(summary: PredictiveInsightsSummary): Promise<void> {
    try {
      console.log('Running prescriptive analytics...')
      summary.prescriptiveAnalytics.status = 'success'

      // Get all users with mortgage calculations
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id')

      if (error) throw error

      let totalRecommendations = 0
      const errors: string[] = []

      for (const user of users || []) {
        try {
          const recommendations = await this.prescriptiveAgent.generateOptimalRecommendations(user.id)
          totalRecommendations += recommendations.length
        } catch (error) {
          errors.push(`User ${user.id}: ${error}`)
        }
      }

      summary.prescriptiveAnalytics.recommendationsGenerated = totalRecommendations
      summary.prescriptiveAnalytics.errors = errors

      if (errors.length > 0) {
        summary.prescriptiveAnalytics.status = 'error'
      }

    } catch (error) {
      console.error('Error in prescriptive analytics:', error)
      summary.prescriptiveAnalytics.status = 'error'
      summary.prescriptiveAnalytics.errors.push(error.toString())
    }
  }

  // Run scenario simulations for high-priority users
  private async runScenarioSimulation(summary: PredictiveInsightsSummary): Promise<void> {
    try {
      console.log('Running scenario simulations...')
      summary.scenarioSimulation.status = 'success'

      // Get users with high refinance probability
      const { data: watchlistItems, error } = await supabaseAdmin
        .from('refinance_watchlist')
        .select('user_id')
        .gte('priority_score', 70)
        .limit(10) // Limit to top 10 users

      if (error) throw error

      let totalSimulations = 0
      const errors: string[] = []

      for (const item of watchlistItems || []) {
        try {
          // Get user's base scenario
          const { data: calculation, error: calcError } = await supabaseAdmin
            .from('mortgage_calculations')
            .select('*')
            .eq('user_id', item.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (calcError || !calculation) continue

          const baseScenario = {
            parameters: {
              propertyPrice: calculation.property_price,
              downPayment: calculation.down_payment,
              interestRate: calculation.interest_rate,
              termYears: calculation.term_years,
              income: calculation.income
            }
          }

          await this.scenarioSimulator.runComprehensiveStressTest(item.user_id, baseScenario)
          totalSimulations++
        } catch (error) {
          errors.push(`User ${item.user_id}: ${error}`)
        }
      }

      summary.scenarioSimulation.simulationsRun = totalSimulations
      summary.scenarioSimulation.errors = errors

      if (errors.length > 0) {
        summary.scenarioSimulation.status = 'error'
      }

    } catch (error) {
      console.error('Error in scenario simulation:', error)
      summary.scenarioSimulation.status = 'error'
      summary.scenarioSimulation.errors.push(error.toString())
    }
  }

  // Run explainability analysis
  private async runExplainability(summary: PredictiveInsightsSummary): Promise<void> {
    try {
      console.log('Running explainability analysis...')
      summary.explainability.status = 'success'

      // Get recent forecasts
      const { data: forecasts, error } = await supabaseAdmin
        .from('forecasts')
        .select('id, model_type, input_data')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(50)

      if (error) throw error

      let totalExplanations = 0
      const errors: string[] = []

      for (const forecast of forecasts || []) {
        try {
          await this.explainabilityAgent.generateSHAPExplanation(
            forecast.id,
            forecast.input_data,
            forecast.model_type
          )
          totalExplanations++
        } catch (error) {
          errors.push(`Forecast ${forecast.id}: ${error}`)
        }
      }

      summary.explainability.explanationsGenerated = totalExplanations
      summary.explainability.errors = errors

      if (errors.length > 0) {
        summary.explainability.status = 'error'
      }

    } catch (error) {
      console.error('Error in explainability analysis:', error)
      summary.explainability.status = 'error'
      summary.explainability.errors.push(error.toString())
    }
  }

  // Generate alerts based on thresholds
  private async generateAlerts(summary: PredictiveInsightsSummary): Promise<void> {
    try {
      console.log('Generating alerts...')

      // Check for rate drop alerts
      await this.refinanceAgent.checkRateDropAlerts()

      // Get alert counts
      const { data: alerts, error } = await supabaseAdmin
        .from('prediction_alerts')
        .select('id, is_read')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      summary.alerts.totalAlerts = alerts?.length || 0
      summary.alerts.newAlerts = alerts?.filter(a => !a.is_read).length || 0

    } catch (error) {
      console.error('Error generating alerts:', error)
    }
  }

  // Run predictive insights for a specific user
  async runUserPredictiveInsights(userId: string): Promise<any> {
    try {
      console.log(`Running predictive insights for user ${userId}...`)

      const results = {
        forecasts: [],
        refinanceOpportunities: [],
        recommendations: [],
        simulations: [],
        alerts: []
      }

      // Get user's mortgage data
      const { data: calculation, error } = await supabaseAdmin
        .from('mortgage_calculations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !calculation) {
        throw new Error('No mortgage data found for user')
      }

      // Generate forecasts
      const rateForecasts = await this.forecastingAgent.forecastMortgageRates('CA', 12)
      const propertyForecasts = await this.forecastingAgent.forecastPropertyAppreciation('Toronto', 12)
      const refinanceForecast = await this.forecastingAgent.predictRefinanceProbability(
        userId,
        calculation.interest_rate,
        calculation.property_price - calculation.down_payment,
        calculation.property_price,
        undefined,
        calculation.income
      )

      results.forecasts = [...rateForecasts, ...propertyForecasts, refinanceForecast]

      // Get refinance opportunities
      const opportunities = await this.refinanceAgent.getRefinanceWatchlist(userId)
      results.refinanceOpportunities = opportunities

      // Generate recommendations
      const recommendations = await this.prescriptiveAgent.generateOptimalRecommendations(userId)
      results.recommendations = recommendations

      // Run scenario simulation
      const baseScenario = {
        parameters: {
          propertyPrice: calculation.property_price,
          downPayment: calculation.down_payment,
          interestRate: calculation.interest_rate,
          termYears: calculation.term_years,
          income: calculation.income
        }
      }

      const simulation = await this.scenarioSimulator.runComprehensiveStressTest(userId, baseScenario)
      results.simulations = simulation

      // Get alerts
      const { data: alerts } = await supabaseAdmin
        .from('prediction_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      results.alerts = alerts || []

      return results

    } catch (error) {
      console.error(`Error running predictive insights for user ${userId}:`, error)
      throw error
    }
  }

  // Get predictive insights summary
  async getPredictiveInsightsSummary(): Promise<PredictiveInsightsSummary> {
    try {
      // Get latest pipeline run summary from database
      const { data: summary, error } = await supabaseAdmin
        .from('predictive_insights_summary')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // Return default summary if no data found
        return {
          timestamp: new Date().toISOString(),
          dataIngestion: { status: 'skipped', recordsProcessed: 0, errors: [] },
          forecasting: { status: 'skipped', forecastsGenerated: 0, models: [], errors: [] },
          refinanceWatchlist: { status: 'skipped', opportunitiesFound: 0, highPriorityCount: 0, errors: [] },
          prescriptiveAnalytics: { status: 'skipped', recommendationsGenerated: 0, errors: [] },
          scenarioSimulation: { status: 'skipped', simulationsRun: 0, errors: [] },
          explainability: { status: 'skipped', explanationsGenerated: 0, errors: [] },
          alerts: { newAlerts: 0, totalAlerts: 0 },
          performance: { totalExecutionTime: 0, memoryUsage: 0 }
        }
      }

      return summary
    } catch (error) {
      console.error('Error getting predictive insights summary:', error)
      throw error
    }
  }
}
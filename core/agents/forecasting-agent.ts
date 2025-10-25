import { supabaseAdmin } from '../supabase'
import { DataIngestionAgent, MarketDataPoint } from './data-ingestion-agent'

export interface ForecastResult {
  targetDate: string
  predictedValue: number
  confidenceIntervalLower: number
  confidenceIntervalUpper: number
  confidenceScore: number
  modelVersion: string
  inputData: Record<string, any>
  region?: string
  userId?: string
}

export interface RateForecast extends ForecastResult {
  modelType: 'rate_forecast'
  currentRate: number
  rateChange: number
  rateChangePercent: number
}

export interface PropertyForecast extends ForecastResult {
  modelType: 'property_appreciation'
  currentValue: number
  appreciationRate: number
  appreciationAmount: number
}

export interface RefinanceForecast extends ForecastResult {
  modelType: 'refinance_probability'
  probability: number
  potentialSavings: number
  priorityScore: number
  recommendedAction: string
}

export class ForecastingAgent {
  private dataIngestionAgent: DataIngestionAgent

  constructor() {
    this.dataIngestionAgent = new DataIngestionAgent()
  }

  // Forecast mortgage rates using time series analysis
  async forecastMortgageRates(
    region: string = 'CA',
    forecastMonths: number = 12
  ): Promise<RateForecast[]> {
    try {
      // Get historical rate data
      const historicalData = await this.dataIngestionAgent.getHistoricalData(
        'mortgage_rates',
        region,
        this.getDateRange().start,
        this.getDateRange().end
      )

      if (historicalData.length < 30) {
        throw new Error('Insufficient historical data for forecasting')
      }

      // Simple linear regression for rate forecasting
      const forecasts: RateForecast[] = []
      const currentRate = historicalData[historicalData.length - 1].value
      
      // Calculate trend
      const trend = this.calculateTrend(historicalData.map(d => d.value))
      const volatility = this.calculateVolatility(historicalData.map(d => d.value))
      
      for (let i = 1; i <= forecastMonths; i++) {
        const targetDate = new Date()
        targetDate.setMonth(targetDate.getMonth() + i)
        
        // Simple trend-based prediction with confidence intervals
        const predictedValue = currentRate + (trend * i)
        const confidenceInterval = volatility * Math.sqrt(i) * 1.96 // 95% confidence
        
        const forecast: RateForecast = {
          modelType: 'rate_forecast',
          targetDate: targetDate.toISOString().split('T')[0],
          predictedValue: Math.max(0, predictedValue), // Ensure non-negative rates
          confidenceIntervalLower: Math.max(0, predictedValue - confidenceInterval),
          confidenceIntervalUpper: predictedValue + confidenceInterval,
          confidenceScore: Math.max(0, Math.min(1, 1 - (volatility * i / currentRate))),
          modelVersion: 'v1.0.0',
          inputData: {
            historicalDataPoints: historicalData.length,
            trend,
            volatility,
            lastValue: currentRate
          },
          region,
          currentRate,
          rateChange: predictedValue - currentRate,
          rateChangePercent: ((predictedValue - currentRate) / currentRate) * 100
        }

        forecasts.push(forecast)
      }

      // Store forecasts in database
      await this.storeForecasts(forecasts)

      return forecasts
    } catch (error) {
      console.error('Error forecasting mortgage rates:', error)
      throw error
    }
  }

  // Forecast property appreciation
  async forecastPropertyAppreciation(
    region: string,
    forecastMonths: number = 12
  ): Promise<PropertyForecast[]> {
    try {
      const historicalData = await this.dataIngestionAgent.getHistoricalData(
        'property_values',
        region,
        this.getDateRange().start,
        this.getDateRange().end
      )

      if (historicalData.length < 30) {
        throw new Error('Insufficient historical data for forecasting')
      }

      const forecasts: PropertyForecast[] = []
      const currentValue = historicalData[historicalData.length - 1].value
      
      const trend = this.calculateTrend(historicalData.map(d => d.value))
      const volatility = this.calculateVolatility(historicalData.map(d => d.value))
      
      for (let i = 1; i <= forecastMonths; i++) {
        const targetDate = new Date()
        targetDate.setMonth(targetDate.getMonth() + i)
        
        const predictedValue = currentValue * Math.pow(1 + trend, i)
        const confidenceInterval = currentValue * volatility * Math.sqrt(i) * 1.96
        
        const forecast: PropertyForecast = {
          modelType: 'property_appreciation',
          targetDate: targetDate.toISOString().split('T')[0],
          predictedValue: Math.max(0, predictedValue),
          confidenceIntervalLower: Math.max(0, predictedValue - confidenceInterval),
          confidenceIntervalUpper: predictedValue + confidenceInterval,
          confidenceScore: Math.max(0, Math.min(1, 1 - (volatility * i))),
          modelVersion: 'v1.0.0',
          inputData: {
            historicalDataPoints: historicalData.length,
            trend,
            volatility,
            lastValue: currentValue
          },
          region,
          currentValue,
          appreciationRate: trend,
          appreciationAmount: predictedValue - currentValue
        }

        forecasts.push(forecast)
      }

      await this.storeForecasts(forecasts)
      return forecasts
    } catch (error) {
      console.error('Error forecasting property appreciation:', error)
      throw error
    }
  }

  // Predict refinance probability using gradient boosting
  async predictRefinanceProbability(
    userId: string,
    currentRate: number,
    currentBalance: number,
    propertyValue: number,
    creditScore?: number,
    income?: number
  ): Promise<RefinanceForecast> {
    try {
      // Get user's historical data
      const userData = await this.dataIngestionAgent.ingestUserPortfolioData(userId)
      
      // Get current market rates
      const currentMarketRates = await this.dataIngestionAgent.getHistoricalData(
        'mortgage_rates',
        'CA',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      )
      
      const currentMarketRate = currentMarketRates[currentMarketRates.length - 1]?.value || currentRate
      
      // Calculate refinance probability using simplified model
      const rateDifference = currentRate - currentMarketRate
      const ltv = currentBalance / propertyValue
      const equity = propertyValue - currentBalance
      
      // Feature engineering
      const features = {
        rateDifference,
        ltv,
        equity,
        creditScore: creditScore || 700,
        income: income || 75000,
        propertyValue,
        currentBalance
      }
      
      // Simplified probability calculation (in production, use ML model)
      let probability = 0
      
      // Rate difference factor (0-0.4)
      if (rateDifference > 0.5) probability += 0.4
      else if (rateDifference > 0.25) probability += 0.3
      else if (rateDifference > 0.1) probability += 0.2
      else if (rateDifference > 0) probability += 0.1
      
      // LTV factor (0-0.3)
      if (ltv < 0.8) probability += 0.3
      else if (ltv < 0.9) probability += 0.2
      else if (ltv < 0.95) probability += 0.1
      
      // Credit score factor (0-0.2)
      if (features.creditScore >= 750) probability += 0.2
      else if (features.creditScore >= 700) probability += 0.15
      else if (features.creditScore >= 650) probability += 0.1
      
      // Income factor (0-0.1)
      if (features.income >= 100000) probability += 0.1
      else if (features.income >= 75000) probability += 0.05
      
      probability = Math.min(1, Math.max(0, probability))
      
      // Calculate potential savings
      const monthlySavings = (rateDifference / 100 / 12) * currentBalance
      const annualSavings = monthlySavings * 12
      const potentialSavings = annualSavings * 5 // 5-year savings estimate
      
      // Calculate priority score
      const priorityScore = Math.round(
        (probability * 40) + 
        (Math.min(annualSavings / 1000, 50)) + 
        (Math.min(equity / 10000, 10))
      )
      
      // Determine recommended action
      let recommendedAction = 'Monitor rates'
      if (probability > 0.7) {
        recommendedAction = 'Contact broker immediately'
      } else if (probability > 0.5) {
        recommendedAction = 'Get pre-approved for refinance'
      } else if (probability > 0.3) {
        recommendedAction = 'Watch for rate drops'
      }
      
      const forecast: RefinanceForecast = {
        modelType: 'refinance_probability',
        targetDate: new Date().toISOString().split('T')[0],
        predictedValue: probability,
        confidenceIntervalLower: Math.max(0, probability - 0.1),
        confidenceIntervalUpper: Math.min(1, probability + 0.1),
        confidenceScore: 0.8, // Simplified confidence score
        modelVersion: 'v1.0.0',
        inputData: features,
        userId,
        probability,
        potentialSavings,
        priorityScore,
        recommendedAction
      }
      
      // Store forecast
      await this.storeForecasts([forecast])
      
      return forecast
    } catch (error) {
      console.error('Error predicting refinance probability:', error)
      throw error
    }
  }

  // Calculate trend using linear regression
  private calculateTrend(values: number[]): number {
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = values
    
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return slope
  }

  // Calculate volatility (standard deviation)
  private calculateVolatility(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  // Store forecasts in database
  private async storeForecasts(forecasts: ForecastResult[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('forecasts')
        .upsert(
          forecasts.map(forecast => ({
            model_type: forecast.modelType,
            target_date: forecast.targetDate,
            predicted_value: forecast.predictedValue,
            confidence_interval_lower: forecast.confidenceIntervalLower,
            confidence_interval_upper: forecast.confidenceIntervalUpper,
            confidence_score: forecast.confidenceScore,
            model_version: forecast.modelVersion,
            input_data: forecast.inputData,
            region: forecast.region,
            user_id: forecast.userId,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          })),
          { onConflict: 'model_type,target_date,user_id' }
        )

      if (error) throw error
    } catch (error) {
      console.error('Error storing forecasts:', error)
      throw error
    }
  }

  // Get date range for forecasting
  private getDateRange(): { start: string; end: string } {
    const end = new Date()
    const start = new Date()
    start.setFullYear(start.getFullYear() - 2)
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  // Get latest forecasts for a user
  async getLatestForecasts(userId: string, modelType?: string): Promise<ForecastResult[]> {
    try {
      let query = supabaseAdmin
        .from('forecasts')
        .select('*')
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .order('target_date', { ascending: true })

      if (modelType) {
        query = query.eq('model_type', modelType)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(row => ({
        modelType: row.model_type,
        targetDate: row.target_date,
        predictedValue: row.predicted_value,
        confidenceIntervalLower: row.confidence_interval_lower,
        confidenceIntervalUpper: row.confidence_interval_upper,
        confidenceScore: row.confidence_score,
        modelVersion: row.model_version,
        inputData: row.input_data,
        region: row.region,
        userId: row.user_id
      }))
    } catch (error) {
      console.error('Error getting latest forecasts:', error)
      return []
    }
  }
}
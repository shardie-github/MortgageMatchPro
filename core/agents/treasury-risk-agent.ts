import { z } from 'zod'
import axios from 'axios'

// FX Risk Management Schemas
export const FXRiskSchema = z.object({
  riskId: z.string(),
  currencyPair: z.string(),
  exposure: z.number(),
  currentRate: z.number(),
  targetRate: z.number().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  volatility: z.number(),
  valueAtRisk: z.number(),
  expectedShortfall: z.number(),
  hedgingStrategy: z.enum(['none', 'forward', 'option', 'swap', 'natural']),
  hedgeRatio: z.number().min(0).max(1),
  costOfHedge: z.number(),
  lastUpdated: z.string(),
})

export const HedgingRecommendationSchema = z.object({
  recommendationId: z.string(),
  currencyPair: z.string(),
  exposure: z.number(),
  currentRate: z.number(),
  recommendedAction: z.enum(['hedge', 'partial_hedge', 'no_hedge', 'close_position']),
  hedgeAmount: z.number(),
  hedgeType: z.enum(['forward', 'option', 'swap']),
  hedgeRate: z.number(),
  cost: z.number(),
  expectedBenefit: z.number(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  validUntil: z.string(),
})

export const TreasuryPositionSchema = z.object({
  positionId: z.string(),
  currency: z.string(),
  amount: z.number(),
  valueUSD: z.number(),
  costBasis: z.number(),
  unrealizedPnL: z.number(),
  realizedPnL: z.number(),
  duration: z.number(), // days
  riskScore: z.number().min(0).max(100),
  hedgingStatus: z.enum(['unhedged', 'partially_hedged', 'fully_hedged']),
  lastUpdated: z.string(),
})

export const MacroEconomicIndicatorSchema = z.object({
  indicatorId: z.string(),
  name: z.string(),
  country: z.string(),
  value: z.number(),
  unit: z.string(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
  lastUpdated: z.string(),
  forecast: z.array(z.object({
    period: z.string(),
    value: z.number(),
    confidence: z.number().min(0).max(1),
  })),
  impact: z.enum(['positive', 'negative', 'neutral']),
  relevance: z.number().min(0).max(1),
})

export const FXForecastSchema = z.object({
  forecastId: z.string(),
  currencyPair: z.string(),
  currentRate: z.number(),
  forecastHorizon: z.number(), // days
  forecasts: z.array(z.object({
    date: z.string(),
    rate: z.number(),
    confidence: z.number().min(0).max(1),
    volatility: z.number(),
  })),
  trend: z.enum(['bullish', 'bearish', 'sideways']),
  keyDrivers: z.array(z.string()),
  riskFactors: z.array(z.string()),
  generatedAt: z.string(),
})

export type FXRisk = z.infer<typeof FXRiskSchema>
export type HedgingRecommendation = z.infer<typeof HedgingRecommendationSchema>
export type TreasuryPosition = z.infer<typeof TreasuryPositionSchema>
export type MacroEconomicIndicator = z.infer<typeof MacroEconomicIndicatorSchema>
export type FXForecast = z.infer<typeof FXForecastSchema>

// Treasury Risk Management Agent
export class TreasuryRiskAgent {
  private fxAPIKey: string
  private economicDataAPIKey: string
  private baseURL: string
  private positions: Map<string, TreasuryPosition>
  private fxRisks: Map<string, FXRisk>
  private economicIndicators: Map<string, MacroEconomicIndicator>

  constructor() {
    this.fxAPIKey = process.env.FX_API_KEY || ''
    this.economicDataAPIKey = process.env.ECONOMIC_DATA_API_KEY || ''
    this.baseURL = process.env.TREASURY_API_BASE_URL || 'https://api.treasury.com/v1'
    this.positions = new Map()
    this.fxRisks = new Map()
    this.economicIndicators = new Map()
    
    this.initializeEconomicIndicators()
  }

  private initializeEconomicIndicators(): void {
    // Initialize key macroeconomic indicators
    const indicators = [
      {
        indicatorId: 'US-GDP',
        name: 'US GDP Growth Rate',
        country: 'US',
        value: 2.1,
        unit: '%',
        frequency: 'quarterly' as const,
        lastUpdated: new Date().toISOString(),
        forecast: [
          { period: 'Q1-2024', value: 2.3, confidence: 0.8 },
          { period: 'Q2-2024', value: 2.0, confidence: 0.7 },
          { period: 'Q3-2024', value: 1.8, confidence: 0.6 },
        ],
        impact: 'positive' as const,
        relevance: 0.9,
      },
      {
        indicatorId: 'US-UNEMPLOYMENT',
        name: 'US Unemployment Rate',
        country: 'US',
        value: 3.7,
        unit: '%',
        frequency: 'monthly' as const,
        lastUpdated: new Date().toISOString(),
        forecast: [
          { period: 'Jan-2024', value: 3.6, confidence: 0.8 },
          { period: 'Feb-2024', value: 3.5, confidence: 0.7 },
          { period: 'Mar-2024', value: 3.4, confidence: 0.6 },
        ],
        impact: 'positive' as const,
        relevance: 0.8,
      },
      {
        indicatorId: 'US-INTEREST-RATE',
        name: 'US Federal Funds Rate',
        country: 'US',
        value: 5.25,
        unit: '%',
        frequency: 'monthly' as const,
        lastUpdated: new Date().toISOString(),
        forecast: [
          { period: 'Jan-2024', value: 5.0, confidence: 0.9 },
          { period: 'Feb-2024', value: 4.75, confidence: 0.8 },
          { period: 'Mar-2024', value: 4.5, confidence: 0.7 },
        ],
        impact: 'negative' as const,
        relevance: 0.95,
      },
      {
        indicatorId: 'CA-GDP',
        name: 'Canada GDP Growth Rate',
        country: 'CA',
        value: 1.8,
        unit: '%',
        frequency: 'quarterly' as const,
        lastUpdated: new Date().toISOString(),
        forecast: [
          { period: 'Q1-2024', value: 2.0, confidence: 0.7 },
          { period: 'Q2-2024', value: 1.9, confidence: 0.6 },
          { period: 'Q3-2024', value: 1.7, confidence: 0.5 },
        ],
        impact: 'positive' as const,
        relevance: 0.8,
      },
      {
        indicatorId: 'EU-GDP',
        name: 'EU GDP Growth Rate',
        country: 'EU',
        value: 0.5,
        unit: '%',
        frequency: 'quarterly' as const,
        lastUpdated: new Date().toISOString(),
        forecast: [
          { period: 'Q1-2024', value: 0.8, confidence: 0.6 },
          { period: 'Q2-2024', value: 1.0, confidence: 0.5 },
          { period: 'Q3-2024', value: 1.2, confidence: 0.4 },
        ],
        impact: 'positive' as const,
        relevance: 0.7,
      },
    ]

    indicators.forEach(indicator => {
      this.economicIndicators.set(indicator.indicatorId, indicator)
    })
  }

  // Calculate FX risk for currency exposure
  async calculateFXRisk(currencyPair: string, exposure: number, timeHorizon: number = 30): Promise<FXRisk> {
    const riskId = `FX-RISK-${Date.now()}`
    
    try {
      // Get current exchange rate
      const currentRate = await this.getCurrentExchangeRate(currencyPair)
      
      // Get historical volatility
      const volatility = await this.getHistoricalVolatility(currencyPair, 30)
      
      // Calculate Value at Risk (VaR) using Monte Carlo simulation
      const valueAtRisk = this.calculateValueAtRisk(exposure, volatility, timeHorizon)
      
      // Calculate Expected Shortfall (ES)
      const expectedShortfall = this.calculateExpectedShortfall(exposure, volatility, timeHorizon)
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(valueAtRisk, exposure)
      
      // Get current hedging strategy
      const hedgingStrategy = await this.getCurrentHedgingStrategy(currencyPair)
      
      // Calculate hedge ratio and cost
      const hedgeRatio = hedgingStrategy !== 'none' ? 0.8 : 0 // 80% hedge ratio
      const costOfHedge = this.calculateHedgeCost(exposure, currencyPair, hedgingStrategy)

      const fxRisk: FXRisk = {
        riskId,
        currencyPair,
        exposure,
        currentRate,
        riskLevel,
        volatility,
        valueAtRisk,
        expectedShortfall,
        hedgingStrategy,
        hedgeRatio,
        costOfHedge,
        lastUpdated: new Date().toISOString(),
      }

      this.fxRisks.set(riskId, fxRisk)
      return fxRisk

    } catch (error) {
      console.error('FX risk calculation error:', error)
      throw new Error(`Failed to calculate FX risk: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generate hedging recommendations using reinforcement learning
  async generateHedgingRecommendations(positions: TreasuryPosition[]): Promise<HedgingRecommendation[]> {
    const recommendations: HedgingRecommendation[] = []

    for (const position of positions) {
      try {
        // Get FX forecast for the currency
        const forecast = await this.generateFXForecast(position.currency, 30)
        
        // Calculate exposure in USD
        const exposureUSD = position.valueUSD
        
        // Determine recommended action based on ML model
        const recommendation = await this.mlHedgingDecision(position, forecast)
        
        // Calculate hedge parameters
        const hedgeAmount = this.calculateHedgeAmount(exposureUSD, recommendation.hedgeRatio)
        const hedgeRate = this.getHedgeRate(position.currency, recommendation.hedgeType)
        const cost = this.calculateHedgeCost(hedgeAmount, position.currency, recommendation.hedgeType)
        const expectedBenefit = this.calculateExpectedBenefit(hedgeAmount, forecast, recommendation)
        
        const hedgingRecommendation: HedgingRecommendation = {
          recommendationId: `HEDGE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          currencyPair: `${position.currency}/USD`,
          exposure: exposureUSD,
          currentRate: position.valueUSD / position.amount,
          recommendedAction: recommendation.action,
          hedgeAmount,
          hedgeType: recommendation.hedgeType,
          hedgeRate,
          cost,
          expectedBenefit,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        }

        recommendations.push(hedgingRecommendation)

      } catch (error) {
        console.error(`Error generating hedging recommendation for position ${position.positionId}:`, error)
      }
    }

    return recommendations
  }

  // Generate FX forecast using macroeconomic indicators
  async generateFXForecast(currency: string, horizonDays: number): Promise<FXForecast> {
    const forecastId = `FORECAST-${Date.now()}`
    
    try {
      // Get current rate
      const currentRate = await this.getCurrentExchangeRate(`${currency}/USD`)
      
      // Get relevant economic indicators
      const relevantIndicators = this.getRelevantIndicators(currency)
      
      // Generate forecast using economic model
      const forecasts = this.generateEconomicForecast(currentRate, relevantIndicators, horizonDays)
      
      // Determine trend
      const trend = this.determineTrend(forecasts)
      
      // Identify key drivers and risk factors
      const keyDrivers = this.identifyKeyDrivers(relevantIndicators)
      const riskFactors = this.identifyRiskFactors(currency, relevantIndicators)

      const fxForecast: FXForecast = {
        forecastId,
        currencyPair: `${currency}/USD`,
        currentRate,
        forecastHorizon: horizonDays,
        forecasts,
        trend,
        keyDrivers,
        riskFactors,
        generatedAt: new Date().toISOString(),
      }

      return fxForecast

    } catch (error) {
      console.error('FX forecast generation error:', error)
      throw new Error(`Failed to generate FX forecast: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Monitor treasury positions and generate alerts
  async monitorTreasuryPositions(): Promise<{
    alerts: Array<{
      type: 'risk_threshold' | 'hedging_opportunity' | 'market_volatility' | 'regulatory_change'
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      positionId?: string
      recommendedAction: string
    }>
    riskSummary: {
      totalExposure: number
      totalVaR: number
      totalHedged: number
      riskScore: number
    }
  }> {
    const alerts: Array<{
      type: 'risk_threshold' | 'hedging_opportunity' | 'market_volatility' | 'regulatory_change'
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      positionId?: string
      recommendedAction: string
    }> = []

    let totalExposure = 0
    let totalVaR = 0
    let totalHedged = 0
    let totalRiskScore = 0

    for (const [positionId, position] of this.positions) {
      totalExposure += position.valueUSD
      totalRiskScore += position.riskScore

      // Check for risk threshold breaches
      if (position.riskScore > 80) {
        alerts.push({
          type: 'risk_threshold',
          severity: 'critical',
          message: `Position ${positionId} has critical risk score: ${position.riskScore}`,
          positionId,
          recommendedAction: 'Immediately hedge or close position',
        })
      } else if (position.riskScore > 60) {
        alerts.push({
          type: 'risk_threshold',
          severity: 'high',
          message: `Position ${positionId} has high risk score: ${position.riskScore}`,
          positionId,
          recommendedAction: 'Consider hedging or reducing exposure',
        })
      }

      // Check for hedging opportunities
      if (position.hedgingStatus === 'unhedged' && position.riskScore > 40) {
        alerts.push({
          type: 'hedging_opportunity',
          severity: 'medium',
          message: `Unhedged position ${positionId} with moderate risk`,
          positionId,
          recommendedAction: 'Evaluate hedging options',
        })
      }

      // Calculate VaR for this position
      const volatility = await this.getHistoricalVolatility(position.currency, 30)
      const positionVaR = this.calculateValueAtRisk(position.valueUSD, volatility, 30)
      totalVaR += positionVaR

      // Calculate hedged amount
      if (position.hedgingStatus === 'fully_hedged') {
        totalHedged += position.valueUSD
      } else if (position.hedgingStatus === 'partially_hedged') {
        totalHedged += position.valueUSD * 0.5
      }
    }

    // Check for market volatility alerts
    const marketVolatility = await this.getMarketVolatility()
    if (marketVolatility > 0.3) {
      alerts.push({
        type: 'market_volatility',
        severity: 'high',
        message: `High market volatility detected: ${(marketVolatility * 100).toFixed(1)}%`,
        recommendedAction: 'Review all positions and consider additional hedging',
      })
    }

    const averageRiskScore = this.positions.size > 0 ? totalRiskScore / this.positions.size : 0

    return {
      alerts,
      riskSummary: {
        totalExposure,
        totalVaR,
        totalHedged,
        riskScore: averageRiskScore,
      },
    }
  }

  // Calculate currency risk buffer
  calculateCurrencyRiskBuffer(amount: number, currency: string, timeHorizon: number = 30): number {
    // Get currency volatility
    const volatility = this.getCurrencyVolatility(currency)
    
    // Calculate risk buffer based on volatility and time horizon
    const baseBuffer = 0.02 // 2% base buffer
    const volatilityMultiplier = Math.min(volatility * 0.1, 0.05) // Max 5% additional buffer
    const timeMultiplier = Math.min(timeHorizon / 365, 0.02) // Max 2% for longer horizons
    
    return amount * (baseBuffer + volatilityMultiplier + timeMultiplier)
  }

  // Helper methods
  private async getCurrentExchangeRate(currencyPair: string): Promise<number> {
    try {
      const response = await axios.get(`${this.baseURL}/fx/rates`, {
        params: { pair: currencyPair },
        headers: { 'Authorization': `Bearer ${this.fxAPIKey}` },
      })
      return response.data.rate
    } catch (error) {
      // Fallback to mock data
      const mockRates: Record<string, number> = {
        'USD/CAD': 1.35,
        'EUR/USD': 1.08,
        'GBP/USD': 1.27,
        'AUD/USD': 0.67,
        'JPY/USD': 150.0,
      }
      return mockRates[currencyPair] || 1.0
    }
  }

  private async getHistoricalVolatility(currencyPair: string, days: number): Promise<number> {
    try {
      const response = await axios.get(`${this.baseURL}/fx/volatility`, {
        params: { pair: currencyPair, days },
        headers: { 'Authorization': `Bearer ${this.fxAPIKey}` },
      })
      return response.data.volatility
    } catch (error) {
      // Fallback to mock data
      const mockVolatilities: Record<string, number> = {
        'USD/CAD': 0.08,
        'EUR/USD': 0.12,
        'GBP/USD': 0.15,
        'AUD/USD': 0.18,
        'JPY/USD': 0.20,
      }
      return mockVolatilities[currencyPair] || 0.10
    }
  }

  private calculateValueAtRisk(exposure: number, volatility: number, timeHorizon: number, confidence: number = 0.95): number {
    // Simplified VaR calculation using normal distribution
    const zScore = 1.645 // 95% confidence level
    const timeFactor = Math.sqrt(timeHorizon / 365)
    return exposure * volatility * zScore * timeFactor
  }

  private calculateExpectedShortfall(exposure: number, volatility: number, timeHorizon: number): number {
    // ES is typically 1.3-1.4 times VaR for normal distributions
    const var95 = this.calculateValueAtRisk(exposure, volatility, timeHorizon, 0.95)
    return var95 * 1.35
  }

  private determineRiskLevel(valueAtRisk: number, exposure: number): 'low' | 'medium' | 'high' | 'critical' {
    const riskRatio = valueAtRisk / exposure
    if (riskRatio < 0.02) return 'low'
    if (riskRatio < 0.05) return 'medium'
    if (riskRatio < 0.10) return 'high'
    return 'critical'
  }

  private async getCurrentHedgingStrategy(currencyPair: string): Promise<'none' | 'forward' | 'option' | 'swap' | 'natural'> {
    // This would check current hedging positions
    // For now, return mock data
    return 'none'
  }

  private calculateHedgeCost(exposure: number, currencyPair: string, strategy: string): number {
    const costRates: Record<string, number> = {
      'none': 0,
      'forward': 0.001, // 0.1%
      'option': 0.005, // 0.5%
      'swap': 0.002, // 0.2%
      'natural': 0,
    }
    return exposure * (costRates[strategy] || 0)
  }

  private async mlHedgingDecision(position: TreasuryPosition, forecast: FXForecast): Promise<{
    action: 'hedge' | 'partial_hedge' | 'no_hedge' | 'close_position'
    hedgeRatio: number
    hedgeType: 'forward' | 'option' | 'swap'
    confidence: number
    reasoning: string
  }> {
    // Simplified ML decision logic
    const volatility = forecast.forecasts[0]?.volatility || 0.1
    const trend = forecast.trend
    
    let action: 'hedge' | 'partial_hedge' | 'no_hedge' | 'close_position'
    let hedgeRatio = 0
    let hedgeType: 'forward' | 'option' | 'swap' = 'forward'
    let confidence = 0.5
    let reasoning = ''

    if (volatility > 0.2 || position.riskScore > 70) {
      action = 'hedge'
      hedgeRatio = 0.8
      hedgeType = 'option'
      confidence = 0.8
      reasoning = 'High volatility and risk score warrant full hedging with options'
    } else if (volatility > 0.15 || position.riskScore > 50) {
      action = 'partial_hedge'
      hedgeRatio = 0.5
      hedgeType = 'forward'
      confidence = 0.7
      reasoning = 'Moderate volatility suggests partial hedging with forwards'
    } else if (trend === 'bearish' && position.riskScore > 30) {
      action = 'partial_hedge'
      hedgeRatio = 0.3
      hedgeType = 'forward'
      confidence = 0.6
      reasoning = 'Bearish trend suggests light hedging'
    } else {
      action = 'no_hedge'
      hedgeRatio = 0
      hedgeType = 'forward'
      confidence = 0.6
      reasoning = 'Low risk and volatility suggest no hedging needed'
    }

    return { action, hedgeRatio, hedgeType, confidence, reasoning }
  }

  private calculateHedgeAmount(exposure: number, hedgeRatio: number): number {
    return exposure * hedgeRatio
  }

  private getHedgeRate(currency: string, hedgeType: string): number {
    // This would get actual hedge rates from market
    // For now, return mock data
    const baseRates: Record<string, number> = {
      'USD/CAD': 1.35,
      'EUR/USD': 1.08,
      'GBP/USD': 1.27,
    }
    return baseRates[currency] || 1.0
  }

  private calculateExpectedBenefit(hedgeAmount: number, forecast: FXForecast, recommendation: any): number {
    // Simplified benefit calculation
    const expectedRateChange = forecast.forecasts[0]?.rate - forecast.currentRate || 0
    return hedgeAmount * Math.abs(expectedRateChange) * recommendation.confidence
  }

  private getRelevantIndicators(currency: string): MacroEconomicIndicator[] {
    const currencyMap: Record<string, string[]> = {
      'USD': ['US-GDP', 'US-UNEMPLOYMENT', 'US-INTEREST-RATE'],
      'CAD': ['CA-GDP', 'US-INTEREST-RATE'],
      'EUR': ['EU-GDP', 'US-INTEREST-RATE'],
      'GBP': ['EU-GDP', 'US-INTEREST-RATE'],
    }
    
    const indicatorIds = currencyMap[currency] || ['US-GDP', 'US-INTEREST-RATE']
    return indicatorIds.map(id => this.economicIndicators.get(id)).filter(Boolean) as MacroEconomicIndicator[]
  }

  private generateEconomicForecast(currentRate: number, indicators: MacroEconomicIndicator[], horizonDays: number): Array<{
    date: string
    rate: number
    confidence: number
    volatility: number
  }> {
    const forecasts = []
    const baseDate = new Date()
    
    for (let i = 1; i <= horizonDays; i += 7) { // Weekly forecasts
      const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000)
      
      // Simple economic model (in practice, this would be much more sophisticated)
      let rateChange = 0
      let confidence = 0.5
      
      indicators.forEach(indicator => {
        const impact = indicator.impact === 'positive' ? 0.01 : indicator.impact === 'negative' ? -0.01 : 0
        const weight = indicator.relevance
        rateChange += impact * weight
        confidence += weight * 0.1
      })
      
      const rate = currentRate * (1 + rateChange * (i / 365))
      const volatility = 0.1 + Math.random() * 0.1 // Mock volatility
      
      forecasts.push({
        date: date.toISOString(),
        rate: Math.round(rate * 10000) / 10000,
        confidence: Math.min(confidence, 0.95),
        volatility: Math.round(volatility * 1000) / 1000,
      })
    }
    
    return forecasts
  }

  private determineTrend(forecasts: Array<{ rate: number }>): 'bullish' | 'bearish' | 'sideways' {
    if (forecasts.length < 2) return 'sideways'
    
    const firstRate = forecasts[0].rate
    const lastRate = forecasts[forecasts.length - 1].rate
    const change = (lastRate - firstRate) / firstRate
    
    if (change > 0.02) return 'bullish'
    if (change < -0.02) return 'bearish'
    return 'sideways'
  }

  private identifyKeyDrivers(indicators: MacroEconomicIndicator[]): string[] {
    return indicators
      .filter(ind => ind.relevance > 0.7)
      .map(ind => ind.name)
  }

  private identifyRiskFactors(currency: string, indicators: MacroEconomicIndicator[]): string[] {
    const riskFactors = []
    
    indicators.forEach(indicator => {
      if (indicator.impact === 'negative' && indicator.relevance > 0.6) {
        riskFactors.push(`${indicator.name} showing negative trend`)
      }
    })
    
    // Add currency-specific risks
    if (currency === 'EUR') {
      riskFactors.push('EU political uncertainty')
    } else if (currency === 'GBP') {
      riskFactors.push('Brexit-related volatility')
    } else if (currency === 'CAD') {
      riskFactors.push('Oil price sensitivity')
    }
    
    return riskFactors
  }

  private async getMarketVolatility(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseURL}/market/volatility`, {
        headers: { 'Authorization': `Bearer ${this.fxAPIKey}` },
      })
      return response.data.volatility
    } catch (error) {
      return 0.15 // Default volatility
    }
  }

  private getCurrencyVolatility(currency: string): number {
    const volatilities: Record<string, number> = {
      'USD': 0.05,
      'CAD': 0.08,
      'EUR': 0.12,
      'GBP': 0.15,
      'AUD': 0.18,
      'JPY': 0.20,
    }
    return volatilities[currency] || 0.10
  }
}
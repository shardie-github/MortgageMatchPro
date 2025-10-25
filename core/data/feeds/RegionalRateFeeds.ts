/**
 * Regional Rate Feeds System
 * v1.2.0 - Loads regional benchmark rates and displays deltas
 */

import { z } from 'zod'
import axios, { AxiosInstance } from 'axios'

// Regional rate schemas
export const RegionalRateSchema = z.object({
  id: z.string(),
  region: z.string(),
  country: z.enum(['CA', 'US', 'UK']),
  currency: z.enum(['CAD', 'USD', 'GBP']),
  benchmarkRate: z.number(),
  rateType: z.enum(['prime', 'treasury', 'central_bank', 'market']),
  term: z.number(), // in years
  lastUpdated: z.string(),
  source: z.string(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  changePercent: z.number().optional(),
  changeBasisPoints: z.number().optional()
})

export const RateDeltaSchema = z.object({
  lenderRate: z.number(),
  benchmarkRate: z.number(),
  delta: z.number(),
  deltaPercent: z.number(),
  deltaBasisPoints: z.number(),
  interpretation: z.enum(['excellent', 'good', 'fair', 'poor']),
  recommendation: z.string()
})

export type RegionalRate = z.infer<typeof RegionalRateSchema>
export type RateDelta = z.infer<typeof RateDeltaSchema>

export class RegionalRateFeeds {
  private static instance: RegionalRateFeeds
  private feeds: Map<string, RateFeed> = new Map()
  private cache: Map<string, { data: RegionalRate[]; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    this.initializeFeeds()
  }

  static getInstance(): RegionalRateFeeds {
    if (!RegionalRateFeeds.instance) {
      RegionalRateFeeds.instance = new RegionalRateFeeds()
    }
    return RegionalRateFeeds.instance
  }

  /**
   * Get regional rates for a specific country
   */
  async getRegionalRates(country: 'CA' | 'US' | 'UK'): Promise<RegionalRate[]> {
    try {
      const cacheKey = `rates_${country}`
      const cached = this.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }

      const rates: RegionalRate[] = []
      
      // Fetch from all available feeds for this country
      for (const [feedId, feed] of this.feeds) {
        if (feed.countries.includes(country)) {
          try {
            const feedRates = await feed.fetchRates(country)
            rates.push(...feedRates)
          } catch (error) {
            console.warn(`Error fetching rates from feed ${feedId}:`, error.message)
          }
        }
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: rates,
        timestamp: Date.now()
      })

      return rates

    } catch (error) {
      console.error('Error getting regional rates:', error)
      return []
    }
  }

  /**
   * Calculate rate delta for a lender rate
   */
  calculateRateDelta(
    lenderRate: number,
    benchmarkRate: number,
    rateType: 'prime' | 'treasury' | 'central_bank' | 'market' = 'market'
  ): RateDelta {
    const delta = lenderRate - benchmarkRate
    const deltaPercent = (delta / benchmarkRate) * 100
    const deltaBasisPoints = delta * 100

    let interpretation: RateDelta['interpretation']
    let recommendation: string

    if (delta <= -0.25) {
      interpretation = 'excellent'
      recommendation = 'This is an excellent rate, significantly below market average'
    } else if (delta <= 0) {
      interpretation = 'good'
      recommendation = 'This is a good rate, at or below market average'
    } else if (delta <= 0.25) {
      interpretation = 'fair'
      recommendation = 'This rate is fair, slightly above market average'
    } else {
      interpretation = 'poor'
      recommendation = 'This rate is above market average, consider shopping around'
    }

    return {
      lenderRate,
      benchmarkRate,
      delta,
      deltaPercent,
      deltaBasisPoints,
      interpretation,
      recommendation
    }
  }

  /**
   * Get rate trends for a region
   */
  async getRateTrends(
    country: 'CA' | 'US' | 'UK',
    days: number = 30
  ): Promise<{
    current: RegionalRate[]
    trends: Array<{
      date: string
      rate: number
      change: number
    }>
    summary: {
      trend: 'up' | 'down' | 'stable'
      averageChange: number
      volatility: number
    }
  }> {
    try {
      const rates = await this.getRegionalRates(country)
      const current = rates.filter(rate => 
        new Date(rate.lastUpdated) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      )

      // In a real implementation, this would fetch historical data
      const trends = this.generateMockTrends(days)
      
      const summary = this.calculateTrendSummary(trends)

      return {
        current,
        trends,
        summary
      }

    } catch (error) {
      console.error('Error getting rate trends:', error)
      return {
        current: [],
        trends: [],
        summary: {
          trend: 'stable',
          averageChange: 0,
          volatility: 0
        }
      }
    }
  }

  /**
   * Get benchmark rates for comparison
   */
  async getBenchmarkRates(country: 'CA' | 'US' | 'UK'): Promise<{
    prime: number
    treasury: number
    centralBank: number
    market: number
  }> {
    try {
      const rates = await this.getRegionalRates(country)
      
      const prime = rates.find(r => r.rateType === 'prime')?.benchmarkRate || 0
      const treasury = rates.find(r => r.rateType === 'treasury')?.benchmarkRate || 0
      const centralBank = rates.find(r => r.rateType === 'central_bank')?.benchmarkRate || 0
      const market = rates.find(r => r.rateType === 'market')?.benchmarkRate || 0

      return {
        prime,
        treasury,
        centralBank,
        market
      }

    } catch (error) {
      console.error('Error getting benchmark rates:', error)
      return {
        prime: 0,
        treasury: 0,
        centralBank: 0,
        market: 0
      }
    }
  }

  /**
   * Register a new rate feed
   */
  async registerFeed(feed: RateFeed): Promise<void> {
    this.feeds.set(feed.id, feed)
    console.log(`✅ Registered rate feed: ${feed.name}`)
  }

  /**
   * Get feed status
   */
  getFeedStatus(): Array<{
    id: string
    name: string
    status: 'active' | 'inactive' | 'error'
    lastUpdate: string
    countries: string[]
  }> {
    return Array.from(this.feeds.values()).map(feed => ({
      id: feed.id,
      name: feed.name,
      status: feed.status,
      lastUpdate: feed.lastUpdate,
      countries: feed.countries
    }))
  }

  // Private helper methods

  private initializeFeeds(): void {
    // Bank of Canada feed
    this.registerFeed(new BankOfCanadaFeed())
    
    // Federal Reserve feed
    this.registerFeed(new FederalReserveFeed())
    
    // Bank of England feed
    this.registerFeed(new BankOfEnglandFeed())
    
    // Market data feed
    this.registerFeed(new MarketDataFeed())
  }

  private generateMockTrends(days: number): Array<{ date: string; rate: number; change: number }> {
    const trends = []
    const baseRate = 5.5
    let currentRate = baseRate

    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const change = (Math.random() - 0.5) * 0.1 // Random change between -0.05 and +0.05
      currentRate += change
      
      trends.push({
        date: date.toISOString().split('T')[0],
        rate: Math.round(currentRate * 1000) / 1000,
        change: Math.round(change * 1000) / 1000
      })
    }

    return trends
  }

  private calculateTrendSummary(trends: Array<{ rate: number; change: number }>): {
    trend: 'up' | 'down' | 'stable'
    averageChange: number
    volatility: number
  } {
    if (trends.length === 0) {
      return { trend: 'stable', averageChange: 0, volatility: 0 }
    }

    const changes = trends.map(t => t.change)
    const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length
    
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - averageChange, 2), 0) / changes.length
    const volatility = Math.sqrt(variance)

    let trend: 'up' | 'down' | 'stable'
    if (averageChange > 0.01) trend = 'up'
    else if (averageChange < -0.01) trend = 'down'
    else trend = 'stable'

    return {
      trend,
      averageChange: Math.round(averageChange * 1000) / 1000,
      volatility: Math.round(volatility * 1000) / 1000
    }
  }
}

// Base rate feed interface
export abstract class RateFeed {
  abstract id: string
  abstract name: string
  abstract countries: string[]
  abstract status: 'active' | 'inactive' | 'error'
  abstract lastUpdate: string

  abstract fetchRates(country: 'CA' | 'US' | 'UK'): Promise<RegionalRate[]>
}

// Bank of Canada feed
class BankOfCanadaFeed extends RateFeed {
  id = 'bank-of-canada'
  name = 'Bank of Canada'
  countries = ['CA']
  status: 'active' | 'inactive' | 'error' = 'active'
  lastUpdate = new Date().toISOString()

  async fetchRates(country: 'CA' | 'US' | 'UK'): Promise<RegionalRate[]> {
    if (country !== 'CA') return []

    // In a real implementation, this would call the Bank of Canada API
    return [
      {
        id: 'boc-prime',
        region: 'Canada',
        country: 'CA',
        currency: 'CAD',
        benchmarkRate: 7.20, // Current Bank of Canada rate
        rateType: 'central_bank',
        term: 0,
        lastUpdated: new Date().toISOString(),
        source: 'Bank of Canada',
        trend: 'stable',
        changePercent: 0,
        changeBasisPoints: 0
      }
    ]
  }
}

// Federal Reserve feed
class FederalReserveFeed extends RateFeed {
  id = 'federal-reserve'
  name = 'Federal Reserve'
  countries = ['US']
  status: 'active' | 'inactive' | 'error' = 'active'
  lastUpdate = new Date().toISOString()

  async fetchRates(country: 'CA' | 'US' | 'UK'): Promise<RegionalRate[]> {
    if (country !== 'US') return []

    // In a real implementation, this would call the Federal Reserve API
    return [
      {
        id: 'fed-funds',
        region: 'United States',
        country: 'US',
        currency: 'USD',
        benchmarkRate: 5.25, // Current Federal Funds rate
        rateType: 'central_bank',
        term: 0,
        lastUpdated: new Date().toISOString(),
        source: 'Federal Reserve',
        trend: 'stable',
        changePercent: 0,
        changeBasisPoints: 0
      }
    ]
  }
}

// Bank of England feed
class BankOfEnglandFeed extends RateFeed {
  id = 'bank-of-england'
  name = 'Bank of England'
  countries = ['UK']
  status: 'active' | 'inactive' | 'error' = 'active'
  lastUpdate = new Date().toISOString()

  async fetchRates(country: 'CA' | 'US' | 'UK'): Promise<RegionalRate[]> {
    if (country !== 'UK') return []

    // In a real implementation, this would call the Bank of England API
    return [
      {
        id: 'boe-base',
        region: 'United Kingdom',
        country: 'UK',
        currency: 'GBP',
        benchmarkRate: 5.25, // Current Bank of England base rate
        rateType: 'central_bank',
        term: 0,
        lastUpdated: new Date().toISOString(),
        source: 'Bank of England',
        trend: 'stable',
        changePercent: 0,
        changeBasisPoints: 0
      }
    ]
  }
}

// Market data feed
class MarketDataFeed extends RateFeed {
  id = 'market-data'
  name = 'Market Data Provider'
  countries = ['CA', 'US', 'UK']
  status: 'active' | 'inactive' | 'error' = 'active'
  lastUpdate = new Date().toISOString()

  async fetchRates(country: 'CA' | 'US' | 'UK'): Promise<RegionalRate[]> {
    // Mock market rates - in production, this would call a real market data API
    const rates: RegionalRate[] = []

    if (country === 'CA') {
      rates.push({
        id: 'canada-market-5yr',
        region: 'Canada',
        country: 'CA',
        currency: 'CAD',
        benchmarkRate: 5.45,
        rateType: 'market',
        term: 5,
        lastUpdated: new Date().toISOString(),
        source: 'Market Data',
        trend: 'stable',
        changePercent: 0.1,
        changeBasisPoints: 1
      })
    } else if (country === 'US') {
      rates.push({
        id: 'us-market-30yr',
        region: 'United States',
        country: 'US',
        currency: 'USD',
        benchmarkRate: 6.25,
        rateType: 'market',
        term: 30,
        lastUpdated: new Date().toISOString(),
        source: 'Market Data',
        trend: 'stable',
        changePercent: 0.2,
        changeBasisPoints: 2
      })
    } else if (country === 'UK') {
      rates.push({
        id: 'uk-market-25yr',
        region: 'United Kingdom',
        country: 'UK',
        currency: 'GBP',
        benchmarkRate: 5.75,
        rateType: 'market',
        term: 25,
        lastUpdated: new Date().toISOString(),
        source: 'Market Data',
        trend: 'stable',
        changePercent: 0.15,
        changeBasisPoints: 1.5
      })
    }

    return rates
  }
}

// Export singleton instance
export const regionalRateFeeds = RegionalRateFeeds.getInstance()

// Convenience functions
export const getRegionalRates = (country: 'CA' | 'US' | 'UK') =>
  regionalRateFeeds.getRegionalRates(country)

export const calculateRateDelta = (lenderRate: number, benchmarkRate: number, rateType?: 'prime' | 'treasury' | 'central_bank' | 'market') =>
  regionalRateFeeds.calculateRateDelta(lenderRate, benchmarkRate, rateType)

export const getRateTrends = (country: 'CA' | 'US' | 'UK', days?: number) =>
  regionalRateFeeds.getRateTrends(country, days)

export const getBenchmarkRates = (country: 'CA' | 'US' | 'UK') =>
  regionalRateFeeds.getBenchmarkRates(country)
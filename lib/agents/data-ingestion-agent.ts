import { supabaseAdmin } from '../supabase'
import axios from 'axios'

export interface MarketDataPoint {
  dataType: 'mortgage_rates' | 'property_values' | 'income_trends' | 'market_indices'
  region: string
  date: string
  value: number
  metadata?: Record<string, any>
}

export interface IncomeTrendsData {
  region: string
  date: string
  medianIncome: number
  employmentRate: number
  inflationRate: number
  gdpGrowth: number
}

export interface PropertyValueData {
  region: string
  date: string
  averagePrice: number
  pricePerSqft: number
  salesVolume: number
  daysOnMarket: number
  priceChange: number
}

export interface MarketIndexData {
  region: string
  date: string
  indexValue: number
  indexType: 'stock' | 'bond' | 'commodity' | 'real_estate'
  changePercent: number
  volatility: number
}

export class DataIngestionAgent {
  private readonly BANK_OF_CANADA_API = 'https://www.bankofcanada.ca/valet/observations'
  private readonly STATS_CANADA_API = 'https://www150.statcan.gc.ca/t1/wds/rest/getBulkData'
  private readonly CREA_API = 'https://crea.ca/api/statistics'

  // Ingest mortgage rate data from Bank of Canada
  async ingestMortgageRates(region: string = 'CA'): Promise<MarketDataPoint[]> {
    try {
      // Bank of Canada API for mortgage rates
      const response = await axios.get(this.BANK_OF_CANADA_API, {
        params: {
          group_by: 'series',
          series: 'V80691311', // 5-year conventional mortgage rate
          start_date: this.getDateRange().start,
          end_date: this.getDateRange().end
        }
      })

      const dataPoints: MarketDataPoint[] = []
      
      if (response.data?.observations) {
        for (const [date, data] of Object.entries(response.data.observations)) {
          const value = (data as any).V80691311?.v
          if (value) {
            dataPoints.push({
              dataType: 'mortgage_rates',
              region,
              date,
              value: parseFloat(value),
              metadata: {
                source: 'Bank of Canada',
                rateType: '5_year_conventional',
                series: 'V80691311'
              }
            })
          }
        }
      }

      // Store in database
      await this.storeMarketData(dataPoints)
      return dataPoints
    } catch (error) {
      console.error('Error ingesting mortgage rates:', error)
      return []
    }
  }

  // Ingest property value data from CREA and other sources
  async ingestPropertyValues(region: string): Promise<PropertyValueData[]> {
    try {
      // Mock data for now - in production, integrate with CREA API
      const mockData: PropertyValueData[] = [
        {
          region,
          date: '2024-01-01',
          averagePrice: 1050000,
          pricePerSqft: 650,
          salesVolume: 1200,
          daysOnMarket: 25,
          priceChange: 0.05
        },
        {
          region,
          date: '2024-01-02',
          averagePrice: 1052000,
          pricePerSqft: 652,
          salesVolume: 1180,
          daysOnMarket: 24,
          priceChange: 0.02
        }
      ]

      const dataPoints: MarketDataPoint[] = mockData.map(data => ({
        dataType: 'property_values',
        region: data.region,
        date: data.date,
        value: data.averagePrice,
        metadata: {
          source: 'CREA',
          propertyType: 'single_family',
          pricePerSqft: data.pricePerSqft,
          salesVolume: data.salesVolume,
          daysOnMarket: data.daysOnMarket,
          priceChange: data.priceChange
        }
      }))

      await this.storeMarketData(dataPoints)
      return mockData
    } catch (error) {
      console.error('Error ingesting property values:', error)
      return []
    }
  }

  // Ingest income trends from Statistics Canada
  async ingestIncomeTrends(region: string = 'CA'): Promise<IncomeTrendsData[]> {
    try {
      // Mock data for now - in production, integrate with Stats Canada API
      const mockData: IncomeTrendsData[] = [
        {
          region,
          date: '2024-01-01',
          medianIncome: 75000,
          employmentRate: 0.95,
          inflationRate: 0.03,
          gdpGrowth: 0.025
        }
      ]

      const dataPoints: MarketDataPoint[] = mockData.map(data => ({
        dataType: 'income_trends',
        region: data.region,
        date: data.date,
        value: data.medianIncome,
        metadata: {
          source: 'Statistics Canada',
          metric: 'median_household_income',
          employmentRate: data.employmentRate,
          inflationRate: data.inflationRate,
          gdpGrowth: data.gdpGrowth
        }
      }))

      await this.storeMarketData(dataPoints)
      return mockData
    } catch (error) {
      console.error('Error ingesting income trends:', error)
      return []
    }
  }

  // Ingest market indices data
  async ingestMarketIndices(region: string = 'CA'): Promise<MarketIndexData[]> {
    try {
      // Mock data for now - in production, integrate with financial APIs
      const mockData: MarketIndexData[] = [
        {
          region,
          date: '2024-01-01',
          indexValue: 21000,
          indexType: 'stock',
          changePercent: 0.02,
          volatility: 0.15
        }
      ]

      const dataPoints: MarketDataPoint[] = mockData.map(data => ({
        dataType: 'market_indices',
        region: data.region,
        date: data.date,
        value: data.indexValue,
        metadata: {
          source: 'TSX',
          index: 'S&P_TSX_Composite',
          indexType: data.indexType,
          changePercent: data.changePercent,
          volatility: data.volatility
        }
      }))

      await this.storeMarketData(dataPoints)
      return mockData
    } catch (error) {
      console.error('Error ingesting market indices:', error)
      return []
    }
  }

  // Ingest user portfolio data from existing calculations
  async ingestUserPortfolioData(userId: string): Promise<any[]> {
    try {
      const { data: calculations, error } = await supabaseAdmin
        .from('mortgage_calculations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return calculations || []
    } catch (error) {
      console.error('Error ingesting user portfolio data:', error)
      return []
    }
  }

  // Store market data in database
  private async storeMarketData(dataPoints: MarketDataPoint[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('market_data')
        .upsert(
          dataPoints.map(point => ({
            data_type: point.dataType,
            region: point.region,
            date: point.date,
            value: point.value,
            metadata: point.metadata
          })),
          { onConflict: 'data_type,region,date' }
        )

      if (error) throw error
    } catch (error) {
      console.error('Error storing market data:', error)
      throw error
    }
  }

  // Get date range for data ingestion (last 2 years)
  private getDateRange(): { start: string; end: string } {
    const end = new Date()
    const start = new Date()
    start.setFullYear(start.getFullYear() - 2)
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  // Get historical data for a specific type and region
  async getHistoricalData(
    dataType: MarketDataPoint['dataType'],
    region: string,
    startDate?: string,
    endDate?: string
  ): Promise<MarketDataPoint[]> {
    try {
      let query = supabaseAdmin
        .from('market_data')
        .select('*')
        .eq('data_type', dataType)
        .eq('region', region)
        .order('date', { ascending: true })

      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(row => ({
        dataType: row.data_type as MarketDataPoint['dataType'],
        region: row.region,
        date: row.date,
        value: row.value,
        metadata: row.metadata
      }))
    } catch (error) {
      console.error('Error getting historical data:', error)
      return []
    }
  }

  // Run full data ingestion pipeline
  async runFullIngestion(): Promise<void> {
    console.log('Starting full data ingestion...')
    
    try {
      // Ingest all data types
      await Promise.all([
        this.ingestMortgageRates('CA'),
        this.ingestMortgageRates('US'),
        this.ingestPropertyValues('Toronto'),
        this.ingestPropertyValues('Vancouver'),
        this.ingestPropertyValues('Montreal'),
        this.ingestIncomeTrends('CA'),
        this.ingestIncomeTrends('US'),
        this.ingestMarketIndices('CA'),
        this.ingestMarketIndices('US')
      ])

      console.log('Full data ingestion completed successfully')
    } catch (error) {
      console.error('Error in full data ingestion:', error)
      throw error
    }
  }
}
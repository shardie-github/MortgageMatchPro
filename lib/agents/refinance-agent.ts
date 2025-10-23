import { supabaseAdmin } from '../supabase'
import { ForecastingAgent, RefinanceForecast } from './forecasting-agent'
import { openai } from '../openai'

export interface RefinanceWatchlistItem {
  id: string
  userId: string
  currentRate: number
  currentBalance: number
  propertyValue: number
  refinanceProbability: number
  potentialSavings: number
  priorityScore: number
  lastContacted?: string
  status: 'active' | 'contacted' | 'converted' | 'dismissed'
  recommendedAction: string
  nextContactDate?: string
  brokerNotes?: string
}

export interface RetentionStrategy {
  userId: string
  strategy: 'rate_lock' | 'product_switch' | 'payment_reduction' | 'term_extension'
  priority: 'high' | 'medium' | 'low'
  potentialValue: number
  implementationCost: number
  successProbability: number
  description: string
  nextSteps: string[]
}

export class RefinanceAgent {
  private forecastingAgent: ForecastingAgent

  constructor() {
    this.forecastingAgent = new ForecastingAgent()
  }

  // Generate refinance watchlist for all users
  async generateRefinanceWatchlist(): Promise<RefinanceWatchlistItem[]> {
    try {
      // Get all users with mortgage calculations
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, email')

      if (usersError) throw usersError

      const watchlistItems: RefinanceWatchlistItem[] = []

      for (const user of users || []) {
        try {
          // Get user's latest mortgage calculation
          const { data: calculation, error: calcError } = await supabaseAdmin
            .from('mortgage_calculations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (calcError || !calculation) continue

          // Predict refinance probability
          const forecast = await this.forecastingAgent.predictRefinanceProbability(
            user.id,
            calculation.interest_rate,
            calculation.property_price - calculation.down_payment,
            calculation.property_price,
            undefined, // credit score not available
            calculation.income
          )

          // Only add to watchlist if probability > 30%
          if (forecast.probability > 0.3) {
            const watchlistItem: RefinanceWatchlistItem = {
              id: `watchlist_${user.id}_${Date.now()}`,
              userId: user.id,
              currentRate: calculation.interest_rate,
              currentBalance: calculation.property_price - calculation.down_payment,
              propertyValue: calculation.property_price,
              refinanceProbability: forecast.probability,
              potentialSavings: forecast.potentialSavings,
              priorityScore: forecast.priorityScore,
              status: 'active',
              recommendedAction: forecast.recommendedAction,
              nextContactDate: this.calculateNextContactDate(forecast.priorityScore)
            }

            watchlistItems.push(watchlistItem)
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error)
          continue
        }
      }

      // Store watchlist items
      await this.storeWatchlistItems(watchlistItems)

      return watchlistItems.sort((a, b) => b.priorityScore - a.priorityScore)
    } catch (error) {
      console.error('Error generating refinance watchlist:', error)
      throw error
    }
  }

  // Get refinance watchlist for a specific user or broker
  async getRefinanceWatchlist(userId?: string): Promise<RefinanceWatchlistItem[]> {
    try {
      let query = supabaseAdmin
        .from('refinance_watchlist')
        .select('*')
        .eq('status', 'active')
        .order('priority_score', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        currentRate: row.current_rate,
        currentBalance: row.current_balance,
        propertyValue: row.property_value,
        refinanceProbability: row.refinance_probability,
        potentialSavings: row.potential_savings,
        priorityScore: row.priority_score,
        lastContacted: row.last_contacted,
        status: row.status,
        recommendedAction: this.getRecommendedAction(row.refinance_probability, row.potential_savings),
        nextContactDate: row.last_contacted ? 
          new Date(new Date(row.last_contacted).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : 
          new Date().toISOString(),
        brokerNotes: row.broker_notes
      }))
    } catch (error) {
      console.error('Error getting refinance watchlist:', error)
      return []
    }
  }

  // Update watchlist item status
  async updateWatchlistItem(
    itemId: string,
    status: RefinanceWatchlistItem['status'],
    brokerNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('refinance_watchlist')
        .update({
          status,
          broker_notes: brokerNotes,
          last_contacted: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating watchlist item:', error)
      throw error
    }
  }

  // Generate retention strategies for high-risk users
  async generateRetentionStrategies(userId: string): Promise<RetentionStrategy[]> {
    try {
      // Get user's current mortgage data
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

      // Get refinance probability
      const forecast = await this.forecastingAgent.predictRefinanceProbability(
        userId,
        calculation.interest_rate,
        calculation.property_price - calculation.down_payment,
        calculation.property_price,
        undefined,
        calculation.income
      )

      const strategies: RetentionStrategy[] = []

      // Rate lock strategy
      if (forecast.probability > 0.6) {
        strategies.push({
          userId,
          strategy: 'rate_lock',
          priority: 'high',
          potentialValue: forecast.potentialSavings * 0.5, // 50% of potential savings
          implementationCost: 0,
          successProbability: 0.8,
          description: 'Lock in current rate to prevent future increases',
          nextSteps: [
            'Contact user within 24 hours',
            'Explain rate lock benefits',
            'Process rate lock application'
          ]
        })
      }

      // Product switch strategy
      if (calculation.interest_rate > 6.0) {
        strategies.push({
          userId,
          strategy: 'product_switch',
          priority: 'medium',
          potentialValue: (calculation.interest_rate - 5.5) * (calculation.property_price - calculation.down_payment) / 100 / 12 * 12,
          implementationCost: 500,
          successProbability: 0.6,
          description: 'Switch to a lower rate product within same lender',
          nextSteps: [
            'Review current product terms',
            'Identify better rate options',
            'Present switch proposal to user'
          ]
        })
      }

      // Payment reduction strategy
      if (calculation.gds_ratio > 0.3) {
        strategies.push({
          userId,
          strategy: 'payment_reduction',
          priority: 'high',
          potentialValue: calculation.monthly_payment * 0.1 * 12, // 10% reduction
          implementationCost: 1000,
          successProbability: 0.7,
          description: 'Extend amortization period to reduce monthly payments',
          nextSteps: [
            'Calculate new payment schedule',
            'Present payment reduction options',
            'Process amortization extension'
          ]
        })
      }

      // Term extension strategy
      if (calculation.term_years < 30) {
        strategies.push({
          userId,
          strategy: 'term_extension',
          priority: 'low',
          potentialValue: calculation.monthly_payment * 0.15 * 12, // 15% reduction
          implementationCost: 2000,
          successProbability: 0.5,
          description: 'Extend mortgage term to reduce monthly payments',
          nextSteps: [
            'Calculate extended term impact',
            'Present term extension benefits',
            'Process term extension application'
          ]
        })
      }

      return strategies.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
    } catch (error) {
      console.error('Error generating retention strategies:', error)
      return []
    }
  }

  // Trigger RetainBot to contact high-priority users
  async triggerRetainBotContact(watchlistItem: RefinanceWatchlistItem): Promise<void> {
    try {
      // Generate personalized message using AI
      const message = await this.generateRetainBotMessage(watchlistItem)

      // Store alert for user
      await supabaseAdmin
        .from('prediction_alerts')
        .insert({
          user_id: watchlistItem.userId,
          alert_type: 'refinance_opportunity',
          threshold_value: watchlistItem.refinanceProbability,
          current_value: watchlistItem.refinanceProbability,
          message: message
        })

      // Update watchlist item
      await this.updateWatchlistItem(watchlistItem.id, 'contacted')

      console.log(`RetainBot message sent to user ${watchlistItem.userId}: ${message}`)
    } catch (error) {
      console.error('Error triggering RetainBot contact:', error)
      throw error
    }
  }

  // Generate personalized RetainBot message
  private async generateRetainBotMessage(item: RefinanceWatchlistItem): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are RetainBot, an AI assistant that helps mortgage brokers retain clients. Generate a personalized message about refinancing opportunities. Be friendly, professional, and specific about potential savings.`
          },
          {
            role: 'user',
            content: `Generate a message for a client with:
            - Current rate: ${item.currentRate}%
            - Potential savings: $${item.potentialSavings.toLocaleString()}
            - Refinance probability: ${(item.refinanceProbability * 100).toFixed(1)}%
            - Recommended action: ${item.recommendedAction}
            
            Keep it under 200 words and include a call-to-action.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })

      return response.choices[0].message.content || 'Refinancing could save you money. Contact us for details.'
    } catch (error) {
      console.error('Error generating RetainBot message:', error)
      return `Hi! Based on current market conditions, refinancing could save you $${item.potentialSavings.toLocaleString()}. Your current rate of ${item.currentRate}% is higher than current market rates. ${item.recommendedAction}. Contact us to discuss your options!`
    }
  }

  // Calculate next contact date based on priority
  private calculateNextContactDate(priorityScore: number): string {
    const days = priorityScore > 80 ? 1 : priorityScore > 60 ? 3 : priorityScore > 40 ? 7 : 14
    const nextContact = new Date()
    nextContact.setDate(nextContact.getDate() + days)
    return nextContact.toISOString()
  }

  // Get recommended action based on probability and savings
  private getRecommendedAction(probability: number, savings: number): string {
    if (probability > 0.7 && savings > 5000) {
      return 'Contact broker immediately'
    } else if (probability > 0.5 && savings > 2000) {
      return 'Get pre-approved for refinance'
    } else if (probability > 0.3) {
      return 'Watch for rate drops'
    } else {
      return 'Monitor rates'
    }
  }

  // Store watchlist items in database
  private async storeWatchlistItems(items: RefinanceWatchlistItem[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('refinance_watchlist')
        .upsert(
          items.map(item => ({
            id: item.id,
            user_id: item.userId,
            current_rate: item.currentRate,
            current_balance: item.currentBalance,
            property_value: item.propertyValue,
            refinance_probability: item.refinanceProbability,
            potential_savings: item.potentialSavings,
            priority_score: item.priorityScore,
            status: item.status,
            broker_notes: item.brokerNotes
          })),
          { onConflict: 'id' }
        )

      if (error) throw error
    } catch (error) {
      console.error('Error storing watchlist items:', error)
      throw error
    }
  }

  // Check for rate drop alerts
  async checkRateDropAlerts(): Promise<void> {
    try {
      // Get current market rates
      const { data: currentRates, error } = await supabaseAdmin
        .from('forecasts')
        .select('*')
        .eq('model_type', 'rate_forecast')
        .eq('target_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !currentRates) return

      const currentMarketRate = currentRates.predicted_value

      // Get users with rates > 0.75% above current market rate
      const { data: watchlistItems, error: watchlistError } = await supabaseAdmin
        .from('refinance_watchlist')
        .select('*')
        .eq('status', 'active')
        .lt('current_rate', currentMarketRate + 0.75)

      if (watchlistError) throw watchlistError

      // Create alerts for qualifying users
      for (const item of watchlistItems || []) {
        if (item.current_rate - currentMarketRate > 0.75) {
          await supabaseAdmin
            .from('prediction_alerts')
            .insert({
              user_id: item.user_id,
              alert_type: 'rate_drop',
              threshold_value: currentMarketRate + 0.75,
              current_value: currentMarketRate,
              message: `Rates have dropped! Current market rate is ${currentMarketRate.toFixed(3)}%, your rate is ${item.current_rate}%. Refinancing could save you $${item.potential_savings.toLocaleString()}.`
            })
        }
      }
    } catch (error) {
      console.error('Error checking rate drop alerts:', error)
    }
  }
}
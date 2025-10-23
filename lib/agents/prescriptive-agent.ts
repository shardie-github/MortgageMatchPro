import { supabaseAdmin } from '../supabase'
import { ForecastingAgent } from './forecasting-agent'
import { openai } from '../openai'

export interface PrescriptiveRecommendation {
  id: string
  userId: string
  scenario: string
  action: string
  description: string
  expectedOutcome: {
    monthlyPaymentChange: number
    totalInterestChange: number
    totalCostChange: number
    paybackPeriod: number
  }
  confidence: number
  reasoning: string
  implementationSteps: string[]
  risks: string[]
  alternatives: string[]
  priority: 'high' | 'medium' | 'low'
  createdAt: string
}

export interface WhatIfAnalysis {
  baseScenario: any
  modifications: Array<{
    parameter: string
    originalValue: number
    newValue: number
    impact: {
      monthlyPaymentChange: number
      totalInterestChange: number
      qualificationImpact: boolean
    }
  }>
  recommendations: PrescriptiveRecommendation[]
}

export class PrescriptiveAgent {
  private forecastingAgent: ForecastingAgent

  constructor() {
    this.forecastingAgent = new ForecastingAgent()
  }

  // Analyze what-if scenarios and provide recommendations
  async analyzeWhatIfScenarios(
    userId: string,
    baseScenario: any,
    modifications: Array<{ parameter: string; newValue: number }>
  ): Promise<WhatIfAnalysis> {
    try {
      const analysis: WhatIfAnalysis = {
        baseScenario,
        modifications: [],
        recommendations: []
      }

      // Calculate impact of each modification
      for (const modification of modifications) {
        const modifiedScenario = { ...baseScenario }
        modifiedScenario.parameters[modification.parameter] = modification.newValue

        // Calculate new scenario results
        const newResults = await this.calculateScenarioResults(modifiedScenario)
        const baseResults = await this.calculateScenarioResults(baseScenario)

        analysis.modifications.push({
          parameter: modification.parameter,
          originalValue: baseScenario.parameters[modification.parameter],
          newValue: modification.newValue,
          impact: {
            monthlyPaymentChange: newResults.monthlyPayment - baseResults.monthlyPayment,
            totalInterestChange: newResults.totalInterest - baseResults.totalInterest,
            qualificationImpact: newResults.qualificationResult !== baseResults.qualificationResult
          }
        })
      }

      // Generate AI-powered recommendations
      analysis.recommendations = await this.generateRecommendations(userId, baseScenario, analysis.modifications)

      return analysis
    } catch (error) {
      console.error('Error analyzing what-if scenarios:', error)
      throw error
    }
  }

  // Generate prescriptive recommendations for optimal course of action
  async generateOptimalRecommendations(userId: string): Promise<PrescriptiveRecommendation[]> {
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

      // Get current market forecasts
      const rateForecasts = await this.forecastingAgent.getLatestForecasts(userId, 'rate_forecast')
      const propertyForecasts = await this.forecastingAgent.getLatestForecasts(userId, 'property_appreciation')

      const recommendations: PrescriptiveRecommendation[] = []

      // Extra payments recommendation
      const extraPaymentRec = await this.analyzeExtraPayments(calculation, rateForecasts)
      if (extraPaymentRec) {
        recommendations.push(extraPaymentRec)
      }

      // Term shortening recommendation
      const termShorteningRec = await this.analyzeTermShortening(calculation, rateForecasts)
      if (termShorteningRec) {
        recommendations.push(termShorteningRec)
      }

      // Variable to fixed switch recommendation
      const rateSwitchRec = await this.analyzeRateSwitch(calculation, rateForecasts)
      if (rateSwitchRec) {
        recommendations.push(rateSwitchRec)
      }

      // Refinancing recommendation
      const refinanceRec = await this.analyzeRefinancing(calculation, rateForecasts)
      if (refinanceRec) {
        recommendations.push(refinanceRec)
      }

      // Property value optimization
      const propertyRec = await this.analyzePropertyOptimization(calculation, propertyForecasts)
      if (propertyRec) {
        recommendations.push(propertyRec)
      }

      // Store recommendations
      await this.storeRecommendations(recommendations)

      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
    } catch (error) {
      console.error('Error generating optimal recommendations:', error)
      return []
    }
  }

  // Analyze extra payments scenario
  private async analyzeExtraPayments(
    calculation: any,
    rateForecasts: any[]
  ): Promise<PrescriptiveRecommendation | null> {
    try {
      const extraPaymentAmount = calculation.monthly_payment * 0.1 // 10% extra
      const newMonthlyPayment = calculation.monthly_payment + extraPaymentAmount

      // Calculate new amortization schedule
      const newSchedule = this.calculateAmortizationSchedule(
        calculation.property_price - calculation.down_payment,
        calculation.interest_rate,
        calculation.term_years,
        extraPaymentAmount
      )

      const totalInterestSaved = calculation.total_interest - newSchedule[newSchedule.length - 1].cumulativeInterest
      const paybackPeriod = this.calculatePaybackPeriod(extraPaymentAmount, totalInterestSaved)

      if (totalInterestSaved > 5000) { // Only recommend if savings > $5,000
        return {
          id: `extra_payments_${Date.now()}`,
          userId: calculation.user_id,
          scenario: 'Extra Monthly Payments',
          action: `Add $${extraPaymentAmount.toFixed(0)} extra per month`,
          description: 'Making extra principal payments reduces total interest and shortens loan term',
          expectedOutcome: {
            monthlyPaymentChange: extraPaymentAmount,
            totalInterestChange: -totalInterestSaved,
            totalCostChange: -totalInterestSaved,
            paybackPeriod
          },
          confidence: 0.85,
          reasoning: `Based on your current rate of ${calculation.interest_rate}%, extra payments of $${extraPaymentAmount.toFixed(0)} monthly will save $${totalInterestSaved.toLocaleString()} in interest over the life of the loan.`,
          implementationSteps: [
            'Set up automatic extra payment with your lender',
            'Specify that extra payments go to principal',
            'Monitor monthly statements to ensure proper application',
            'Consider increasing extra payments when possible'
          ],
          risks: [
            'Reduces monthly cash flow',
            'May not be beneficial if rates drop significantly',
            'Opportunity cost of other investments'
          ],
          alternatives: [
            'Make annual lump sum payments',
            'Invest extra money in higher-yield investments',
            'Pay down other higher-interest debt first'
          ],
          priority: totalInterestSaved > 15000 ? 'high' : totalInterestSaved > 8000 ? 'medium' : 'low',
          createdAt: new Date().toISOString()
        }
      }

      return null
    } catch (error) {
      console.error('Error analyzing extra payments:', error)
      return null
    }
  }

  // Analyze term shortening scenario
  private async analyzeTermShortening(
    calculation: any,
    rateForecasts: any[]
  ): Promise<PrescriptiveRecommendation | null> {
    try {
      const currentTerm = calculation.term_years
      const newTerm = Math.max(15, currentTerm - 5) // Reduce by 5 years, minimum 15

      if (newTerm >= currentTerm) return null

      const newMonthlyPayment = this.calculateMonthlyPayment(
        calculation.property_price - calculation.down_payment,
        calculation.interest_rate,
        newTerm
      )

      const newSchedule = this.calculateAmortizationSchedule(
        calculation.property_price - calculation.down_payment,
        calculation.interest_rate,
        newTerm
      )

      const totalInterestSaved = calculation.total_interest - newSchedule[newSchedule.length - 1].cumulativeInterest
      const monthlyPaymentIncrease = newMonthlyPayment - calculation.monthly_payment

      if (totalInterestSaved > 10000 && monthlyPaymentIncrease < calculation.monthly_payment * 0.3) {
        return {
          id: `term_shortening_${Date.now()}`,
          userId: calculation.user_id,
          scenario: 'Term Shortening',
          action: `Reduce term from ${currentTerm} to ${newTerm} years`,
          description: 'Shortening the loan term reduces total interest paid and builds equity faster',
          expectedOutcome: {
            monthlyPaymentChange: monthlyPaymentIncrease,
            totalInterestChange: -totalInterestSaved,
            totalCostChange: -totalInterestSaved,
            paybackPeriod: 0
          },
          confidence: 0.80,
          reasoning: `Reducing your term to ${newTerm} years will increase your monthly payment by $${monthlyPaymentIncrease.toFixed(0)} but save $${totalInterestSaved.toLocaleString()} in total interest.`,
          implementationSteps: [
            'Contact your lender to discuss term reduction options',
            'Verify any prepayment penalties',
            'Update your budget to accommodate higher payments',
            'Consider the impact on your cash flow'
          ],
          risks: [
            'Higher monthly payments may strain budget',
            'Less flexibility for other financial goals',
            'May not be beneficial if rates drop significantly'
          ],
          alternatives: [
            'Make extra principal payments instead',
            'Refinance to a lower rate first',
            'Invest the difference in higher-yield investments'
          ],
          priority: totalInterestSaved > 25000 ? 'high' : totalInterestSaved > 15000 ? 'medium' : 'low',
          createdAt: new Date().toISOString()
        }
      }

      return null
    } catch (error) {
      console.error('Error analyzing term shortening:', error)
      return null
    }
  }

  // Analyze rate switch scenario
  private async analyzeRateSwitch(
    calculation: any,
    rateForecasts: any[]
  ): Promise<PrescriptiveRecommendation | null> {
    try {
      if (calculation.rate_type === 'fixed') return null

      const currentRate = calculation.interest_rate
      const forecastedRates = rateForecasts.slice(0, 12) // Next 12 months
      
      if (forecastedRates.length === 0) return null

      const averageForecastedRate = forecastedRates.reduce((sum, f) => sum + f.predictedValue, 0) / forecastedRates.length
      const rateIncrease = averageForecastedRate - currentRate

      if (rateIncrease > 0.5) { // If rates expected to increase by >0.5%
        const fixedRate = currentRate + 0.25 // Assume 0.25% premium for fixed
        const newMonthlyPayment = this.calculateMonthlyPayment(
          calculation.property_price - calculation.down_payment,
          fixedRate,
          calculation.term_years
        )

        const monthlyPaymentIncrease = newMonthlyPayment - calculation.monthly_payment

        return {
          id: `rate_switch_${Date.now()}`,
          userId: calculation.user_id,
          scenario: 'Variable to Fixed Rate Switch',
          action: `Switch from variable (${currentRate}%) to fixed (${fixedRate}%) rate`,
          description: 'Locking in a fixed rate protects against future rate increases',
          expectedOutcome: {
            monthlyPaymentChange: monthlyPaymentIncrease,
            totalInterestChange: monthlyPaymentIncrease * calculation.term_years * 12,
            totalCostChange: monthlyPaymentIncrease * calculation.term_years * 12,
            paybackPeriod: 0
          },
          confidence: 0.75,
          reasoning: `Rates are forecasted to increase by ${rateIncrease.toFixed(2)}% over the next year. Switching to a fixed rate now will provide payment stability and protect against future increases.`,
          implementationSteps: [
            'Contact your lender to discuss rate conversion options',
            'Review conversion fees and terms',
            'Compare with refinancing options',
            'Make decision based on rate outlook and personal risk tolerance'
          ],
          risks: [
            'May miss out on lower rates if they decrease',
            'Conversion fees may apply',
            'Higher monthly payments immediately'
          ],
          alternatives: [
            'Wait and monitor rate trends',
            'Consider refinancing to a new fixed rate',
            'Keep variable rate and make extra payments'
          ],
          priority: rateIncrease > 1.0 ? 'high' : rateIncrease > 0.75 ? 'medium' : 'low',
          createdAt: new Date().toISOString()
        }
      }

      return null
    } catch (error) {
      console.error('Error analyzing rate switch:', error)
      return null
    }
  }

  // Analyze refinancing scenario
  private async analyzeRefinancing(
    calculation: any,
    rateForecasts: any[]
  ): Promise<PrescriptiveRecommendation | null> {
    try {
      const currentRate = calculation.interest_rate
      const currentBalance = calculation.property_price - calculation.down_payment
      
      // Get current market rate (simplified)
      const marketRate = currentRate - 0.5 // Assume 0.5% lower market rate
      
      if (marketRate >= currentRate) return null

      const newMonthlyPayment = this.calculateMonthlyPayment(
        currentBalance,
        marketRate,
        calculation.term_years
      )

      const monthlySavings = calculation.monthly_payment - newMonthlyPayment
      const annualSavings = monthlySavings * 12
      const refinancingCost = 3000 // Estimated closing costs
      const paybackPeriod = refinancingCost / annualSavings

      if (monthlySavings > 100 && paybackPeriod < 3) { // Savings > $100/month, payback < 3 years
        return {
          id: `refinancing_${Date.now()}`,
          userId: calculation.user_id,
          scenario: 'Refinancing',
          action: `Refinance from ${currentRate}% to ${marketRate}%`,
          description: 'Refinancing to a lower rate reduces monthly payments and total interest',
          expectedOutcome: {
            monthlyPaymentChange: -monthlySavings,
            totalInterestChange: -annualSavings * 5, // 5-year savings estimate
            totalCostChange: -annualSavings * 5 + refinancingCost,
            paybackPeriod
          },
          confidence: 0.70,
          reasoning: `Refinancing to ${marketRate}% will save $${monthlySavings.toFixed(0)} monthly and $${annualSavings.toFixed(0)} annually. The $${refinancingCost.toLocaleString()} cost will be recovered in ${paybackPeriod.toFixed(1)} years.`,
          implementationSteps: [
            'Get pre-approved with multiple lenders',
            'Compare rates, fees, and terms',
            'Calculate break-even point',
            'Complete refinancing application',
            'Close on new loan'
          ],
          risks: [
            'Closing costs reduce immediate savings',
            'May reset amortization schedule',
            'Credit score requirements may have changed'
          ],
          alternatives: [
            'Wait for rates to drop further',
            'Make extra payments instead',
            'Consider home equity line of credit'
          ],
          priority: monthlySavings > 200 ? 'high' : monthlySavings > 150 ? 'medium' : 'low',
          createdAt: new Date().toISOString()
        }
      }

      return null
    } catch (error) {
      console.error('Error analyzing refinancing:', error)
      return null
    }
  }

  // Analyze property optimization scenario
  private async analyzePropertyOptimization(
    calculation: any,
    propertyForecasts: any[]
  ): Promise<PrescriptiveRecommendation | null> {
    try {
      if (propertyForecasts.length === 0) return null

      const currentValue = calculation.property_price
      const forecastedValue = propertyForecasts[0].predictedValue
      const appreciationRate = (forecastedValue - currentValue) / currentValue

      if (appreciationRate > 0.05) { // 5% appreciation expected
        return {
          id: `property_optimization_${Date.now()}`,
          userId: calculation.user_id,
          scenario: 'Property Value Optimization',
          action: 'Consider property improvements to maximize appreciation',
          description: 'Strategic improvements can increase property value and equity',
          expectedOutcome: {
            monthlyPaymentChange: 0,
            totalInterestChange: 0,
            totalCostChange: forecastedValue - currentValue,
            paybackPeriod: 0
          },
          confidence: 0.60,
          reasoning: `Your property is expected to appreciate by ${(appreciationRate * 100).toFixed(1)}%. Strategic improvements could further increase this appreciation and build more equity.`,
          implementationSteps: [
            'Assess current property condition',
            'Identify high-ROI improvement opportunities',
            'Get quotes for recommended improvements',
            'Plan improvement timeline and budget',
            'Monitor property value changes'
          ],
          risks: [
            'Improvement costs may exceed value increase',
            'Market conditions may change',
            'Time and effort required for improvements'
          ],
          alternatives: [
            'Sell and upgrade to better property',
            'Rent out property for additional income',
            'Wait for natural market appreciation'
          ],
          priority: appreciationRate > 0.1 ? 'high' : appreciationRate > 0.07 ? 'medium' : 'low',
          createdAt: new Date().toISOString()
        }
      }

      return null
    } catch (error) {
      console.error('Error analyzing property optimization:', error)
      return null
    }
  }

  // Generate AI-powered recommendations
  private async generateRecommendations(
    userId: string,
    baseScenario: any,
    modifications: any[]
  ): Promise<PrescriptiveRecommendation[]> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a financial advisor analyzing mortgage scenarios. Generate specific, actionable recommendations based on the scenario analysis. Be practical and consider the user's financial situation.`
          },
          {
            role: 'user',
            content: `Analyze these mortgage scenario modifications and provide recommendations:

Base Scenario: ${JSON.stringify(baseScenario, null, 2)}

Modifications: ${JSON.stringify(modifications, null, 2)}

Provide 2-3 specific recommendations with clear reasoning and implementation steps.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })

      // Parse AI response and create recommendations
      const aiResponse = response.choices[0].message.content || ''
      
      // This is a simplified implementation - in production, you'd parse the AI response more carefully
      const recommendations: PrescriptiveRecommendation[] = [
        {
          id: `ai_rec_${Date.now()}`,
          userId,
          scenario: 'AI Analysis',
          action: 'Follow AI recommendations',
          description: aiResponse.substring(0, 200) + '...',
          expectedOutcome: {
            monthlyPaymentChange: 0,
            totalInterestChange: 0,
            totalCostChange: 0,
            paybackPeriod: 0
          },
          confidence: 0.75,
          reasoning: aiResponse,
          implementationSteps: ['Review AI recommendations', 'Consult with financial advisor', 'Implement chosen strategy'],
          risks: ['AI recommendations may not fit personal situation', 'Requires careful evaluation'],
          alternatives: ['Manual analysis', 'Professional consultation'],
          priority: 'medium',
          createdAt: new Date().toISOString()
        }
      ]

      return recommendations
    } catch (error) {
      console.error('Error generating AI recommendations:', error)
      return []
    }
  }

  // Calculate scenario results
  private async calculateScenarioResults(scenario: any): Promise<any> {
    // Simplified calculation - in production, use the full scenario manager
    const principal = scenario.parameters.propertyPrice - scenario.parameters.downPayment
    const rate = scenario.parameters.interestRate
    const term = scenario.parameters.termYears

    const monthlyPayment = this.calculateMonthlyPayment(principal, rate, term)
    const totalInterest = (monthlyPayment * term * 12) - principal

    return {
      monthlyPayment,
      totalInterest,
      qualificationResult: true // Simplified
    }
  }

  // Calculate monthly payment
  private calculateMonthlyPayment(principal: number, rate: number, termYears: number): number {
    const monthlyRate = rate / 100 / 12
    const numPayments = termYears * 12
    
    if (monthlyRate === 0) {
      return principal / numPayments
    }
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1)
  }

  // Calculate amortization schedule
  private calculateAmortizationSchedule(
    principal: number,
    rate: number,
    termYears: number,
    extraPayment: number = 0
  ): any[] {
    const monthlyRate = rate / 100 / 12
    const numPayments = termYears * 12
    const baseMonthlyPayment = this.calculateMonthlyPayment(principal, rate, termYears)
    const totalMonthlyPayment = baseMonthlyPayment + extraPayment

    const schedule = []
    let balance = principal
    let cumulativeInterest = 0
    let cumulativePrincipal = 0

    for (let month = 1; month <= numPayments; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = Math.min(totalMonthlyPayment - interestPayment, balance)
      balance -= principalPayment
      cumulativeInterest += interestPayment
      cumulativePrincipal += principalPayment

      schedule.push({
        month,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
        cumulativeInterest,
        cumulativePrincipal,
      })

      if (balance <= 0) break
    }

    return schedule
  }

  // Calculate payback period
  private calculatePaybackPeriod(extraPayment: number, totalSavings: number): number {
    return totalSavings / (extraPayment * 12)
  }

  // Store recommendations in database
  private async storeRecommendations(recommendations: PrescriptiveRecommendation[]): Promise<void> {
    try {
      // Store in a recommendations table (would need to be created)
      console.log('Storing recommendations:', recommendations.length)
    } catch (error) {
      console.error('Error storing recommendations:', error)
    }
  }
}
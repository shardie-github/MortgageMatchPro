import { supabaseAdmin } from '../supabase'
import { ForecastingAgent } from './forecasting-agent'

export interface SimulationParameters {
  baseScenario: any
  iterations: number
  rateVolatility: number
  propertyVolatility: number
  incomeVolatility: number
  timeHorizon: number // months
}

export interface SimulationResult {
  iteration: number
  monthlyPayments: number[]
  propertyValues: number[]
  interestRates: number[]
  incomes: number[]
  equity: number[]
  defaultProbability: number
  refinanceProbability: number
}

export interface SimulationSummary {
  simulationId: string
  simulationType: string
  iterations: number
  results: {
    monthlyPayment: {
      mean: number
      median: number
      p10: number
      p90: number
      min: number
      max: number
    }
    propertyValue: {
      mean: number
      median: number
      p10: number
      p90: number
      min: number
      max: number
    }
    equity: {
      mean: number
      median: number
      p10: number
      p90: number
      min: number
      max: number
    }
    defaultRate: number
    refinanceRate: number
  }
  stressTestResults: {
    rateShock: {
      scenario: string
      impact: number
    }
    propertyDecline: {
      scenario: string
      impact: number
    }
    incomeReduction: {
      scenario: string
      impact: number
    }
  }
}

export class ScenarioSimulator {
  private forecastingAgent: ForecastingAgent

  constructor() {
    this.forecastingAgent = new ForecastingAgent()
  }

  // Run Monte Carlo simulation for stress testing
  async runStressTestSimulation(
    userId: string,
    parameters: SimulationParameters
  ): Promise<SimulationSummary> {
    try {
      const simulationId = `stress_test_${userId}_${Date.now()}`
      const results: SimulationResult[] = []

      // Run Monte Carlo iterations
      for (let i = 0; i < parameters.iterations; i++) {
        const result = await this.runSingleSimulation(parameters, i)
        results.push(result)
      }

      // Calculate summary statistics
      const summary = this.calculateSummaryStatistics(simulationId, 'stress_test', results, parameters)

      // Store simulation results
      await this.storeSimulationResults(simulationId, userId, 'stress_test', results, summary)

      return summary
    } catch (error) {
      console.error('Error running stress test simulation:', error)
      throw error
    }
  }

  // Run rate shock simulation
  async runRateShockSimulation(
    userId: string,
    baseScenario: any,
    shockScenarios: Array<{ name: string; rateIncrease: number }>
  ): Promise<SimulationSummary> {
    try {
      const simulationId = `rate_shock_${userId}_${Date.now()}`
      const results: SimulationResult[] = []

      for (const shock of shockScenarios) {
        const parameters: SimulationParameters = {
          baseScenario,
          iterations: 1000,
          rateVolatility: shock.rateIncrease,
          propertyVolatility: 0.1,
          incomeVolatility: 0.05,
          timeHorizon: 60 // 5 years
        }

        const result = await this.runSingleSimulation(parameters, 0)
        results.push(result)
      }

      const summary = this.calculateSummaryStatistics(simulationId, 'rate_shock', results, parameters)
      await this.storeSimulationResults(simulationId, userId, 'rate_shock', results, summary)

      return summary
    } catch (error) {
      console.error('Error running rate shock simulation:', error)
      throw error
    }
  }

  // Run property decline simulation
  async runPropertyDeclineSimulation(
    userId: string,
    baseScenario: any,
    declineScenarios: Array<{ name: string; declinePercent: number }>
  ): Promise<SimulationSummary> {
    try {
      const simulationId = `property_decline_${userId}_${Date.now()}`
      const results: SimulationResult[] = []

      for (const decline of declineScenarios) {
        const parameters: SimulationParameters = {
          baseScenario,
          iterations: 1000,
          rateVolatility: 0.02,
          propertyVolatility: decline.declinePercent,
          incomeVolatility: 0.05,
          timeHorizon: 60
        }

        const result = await this.runSingleSimulation(parameters, 0)
        results.push(result)
      }

      const summary = this.calculateSummaryStatistics(simulationId, 'property_decline', results, parameters)
      await this.storeSimulationResults(simulationId, userId, 'property_decline', results, summary)

      return summary
    } catch (error) {
      console.error('Error running property decline simulation:', error)
      throw error
    }
  }

  // Run income variance simulation
  async runIncomeVarianceSimulation(
    userId: string,
    baseScenario: any,
    varianceScenarios: Array<{ name: string; incomeChange: number }>
  ): Promise<SimulationSummary> {
    try {
      const simulationId = `income_variance_${userId}_${Date.now()}`
      const results: SimulationResult[] = []

      for (const variance of varianceScenarios) {
        const parameters: SimulationParameters = {
          baseScenario,
          iterations: 1000,
          rateVolatility: 0.02,
          propertyVolatility: 0.1,
          incomeVolatility: Math.abs(variance.incomeChange),
          timeHorizon: 60
        }

        const result = await this.runSingleSimulation(parameters, 0)
        results.push(result)
      }

      const summary = this.calculateSummaryStatistics(simulationId, 'income_variance', results, parameters)
      await this.storeSimulationResults(simulationId, userId, 'income_variance', results, summary)

      return summary
    } catch (error) {
      console.error('Error running income variance simulation:', error)
      throw error
    }
  }

  // Run a single simulation iteration
  private async runSingleSimulation(
    parameters: SimulationParameters,
    iteration: number
  ): Promise<SimulationResult> {
    const { baseScenario, rateVolatility, propertyVolatility, incomeVolatility, timeHorizon } = parameters
    
    const monthlyPayments: number[] = []
    const propertyValues: number[] = []
    const interestRates: number[] = []
    const incomes: number[] = []
    const equity: number[] = []

    // Initialize values
    let currentRate = baseScenario.parameters.interestRate
    let currentPropertyValue = baseScenario.parameters.propertyPrice
    let currentIncome = baseScenario.parameters.income || 75000
    let currentBalance = baseScenario.parameters.propertyPrice - baseScenario.parameters.downPayment

    for (let month = 0; month < timeHorizon; month++) {
      // Simulate interest rate changes (random walk with drift)
      const rateChange = this.generateRandomWalk(0, rateVolatility)
      currentRate = Math.max(0.01, currentRate + rateChange) // Minimum 1% rate

      // Simulate property value changes
      const propertyChange = this.generateRandomWalk(0.001, propertyVolatility) // Slight upward drift
      currentPropertyValue *= (1 + propertyChange)

      // Simulate income changes
      const incomeChange = this.generateRandomWalk(0.002, incomeVolatility) // Slight upward drift
      currentIncome *= (1 + incomeChange)

      // Calculate monthly payment with current rate
      const monthlyPayment = this.calculateMonthlyPayment(currentBalance, currentRate, baseScenario.parameters.termYears)
      monthlyPayments.push(monthlyPayment)

      propertyValues.push(currentPropertyValue)
      interestRates.push(currentRate)
      incomes.push(currentIncome)

      // Calculate equity (simplified - assumes no principal payments for now)
      const currentEquity = currentPropertyValue - currentBalance
      equity.push(currentEquity)

      // Update balance (simplified amortization)
      const principalPayment = monthlyPayment - (currentBalance * currentRate / 100 / 12)
      currentBalance = Math.max(0, currentBalance - principalPayment)
    }

    // Calculate probabilities
    const defaultProbability = this.calculateDefaultProbability(monthlyPayments, incomes)
    const refinanceProbability = this.calculateRefinanceProbability(currentRate, baseScenario.parameters.interestRate)

    return {
      iteration,
      monthlyPayments,
      propertyValues,
      interestRates,
      incomes,
      equity,
      defaultProbability,
      refinanceProbability
    }
  }

  // Generate random walk for Monte Carlo simulation
  private generateRandomWalk(drift: number, volatility: number): number {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    
    return drift + volatility * z0
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

  // Calculate default probability based on payment-to-income ratio
  private calculateDefaultProbability(monthlyPayments: number[], incomes: number[]): number {
    let defaultCount = 0
    
    for (let i = 0; i < monthlyPayments.length; i++) {
      const paymentToIncomeRatio = (monthlyPayments[i] * 12) / incomes[i]
      if (paymentToIncomeRatio > 0.4) { // DTI > 40% indicates high default risk
        defaultCount++
      }
    }
    
    return defaultCount / monthlyPayments.length
  }

  // Calculate refinance probability based on rate difference
  private calculateRefinanceProbability(currentRate: number, originalRate: number): number {
    const rateDifference = originalRate - currentRate
    if (rateDifference > 0.5) return 0.8
    if (rateDifference > 0.25) return 0.6
    if (rateDifference > 0.1) return 0.4
    return 0.2
  }

  // Calculate summary statistics from simulation results
  private calculateSummaryStatistics(
    simulationId: string,
    simulationType: string,
    results: SimulationResult[],
    parameters: SimulationParameters
  ): SimulationSummary {
    const allMonthlyPayments = results.flatMap(r => r.monthlyPayments)
    const allPropertyValues = results.flatMap(r => r.propertyValues)
    const allEquity = results.flatMap(r => r.equity)
    const allDefaultRates = results.map(r => r.defaultProbability)
    const allRefinanceRates = results.map(r => r.refinanceProbability)

    return {
      simulationId,
      simulationType,
      iterations: parameters.iterations,
      results: {
        monthlyPayment: this.calculatePercentiles(allMonthlyPayments),
        propertyValue: this.calculatePercentiles(allPropertyValues),
        equity: this.calculatePercentiles(allEquity),
        defaultRate: allDefaultRates.reduce((a, b) => a + b, 0) / allDefaultRates.length,
        refinanceRate: allRefinanceRates.reduce((a, b) => a + b, 0) / allRefinanceRates.length
      },
      stressTestResults: {
        rateShock: {
          scenario: 'Rate +200 bps',
          impact: this.calculateRateShockImpact(results, 2.0)
        },
        propertyDecline: {
          scenario: 'Property -10%',
          impact: this.calculatePropertyDeclineImpact(results, -0.1)
        },
        incomeReduction: {
          scenario: 'Income -20%',
          impact: this.calculateIncomeReductionImpact(results, -0.2)
        }
      }
    }
  }

  // Calculate percentiles for a dataset
  private calculatePercentiles(data: number[]): {
    mean: number
    median: number
    p10: number
    p90: number
    min: number
    max: number
  } {
    const sorted = [...data].sort((a, b) => a - b)
    const n = sorted.length

    return {
      mean: data.reduce((a, b) => a + b, 0) / n,
      median: sorted[Math.floor(n / 2)],
      p10: sorted[Math.floor(n * 0.1)],
      p90: sorted[Math.floor(n * 0.9)],
      min: sorted[0],
      max: sorted[n - 1]
    }
  }

  // Calculate rate shock impact
  private calculateRateShockImpact(results: SimulationResult[], shockBps: number): number {
    // Simplified calculation - in production, run actual shock scenarios
    return shockBps * 0.1 // 10% impact per 100 bps
  }

  // Calculate property decline impact
  private calculatePropertyDeclineImpact(results: SimulationResult[], declinePercent: number): number {
    return declinePercent * 0.8 // 80% impact on equity
  }

  // Calculate income reduction impact
  private calculateIncomeReductionImpact(results: SimulationResult[], reductionPercent: number): number {
    return Math.abs(reductionPercent) * 0.5 // 50% impact on payment capacity
  }

  // Store simulation results in database
  private async storeSimulationResults(
    simulationId: string,
    userId: string,
    simulationType: string,
    results: SimulationResult[],
    summary: SimulationSummary
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('scenario_simulations')
        .insert({
          id: simulationId,
          user_id: userId,
          simulation_type: simulationType,
          iterations: results.length,
          results: results,
          summary_stats: summary.results
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing simulation results:', error)
      throw error
    }
  }

  // Get simulation results for a user
  async getSimulationResults(userId: string, simulationType?: string): Promise<SimulationSummary[]> {
    try {
      let query = supabaseAdmin
        .from('scenario_simulations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (simulationType) {
        query = query.eq('simulation_type', simulationType)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(row => ({
        simulationId: row.id,
        simulationType: row.simulation_type,
        iterations: row.iterations,
        results: row.summary_stats,
        stressTestResults: {
          rateShock: { scenario: 'Rate +200 bps', impact: 0.2 },
          propertyDecline: { scenario: 'Property -10%', impact: -0.08 },
          incomeReduction: { scenario: 'Income -20%', impact: -0.1 }
        }
      }))
    } catch (error) {
      console.error('Error getting simulation results:', error)
      return []
    }
  }

  // Run comprehensive stress test with multiple scenarios
  async runComprehensiveStressTest(userId: string, baseScenario: any): Promise<SimulationSummary[]> {
    try {
      const results: SimulationSummary[] = []

      // Base stress test
      const stressTestParams: SimulationParameters = {
        baseScenario,
        iterations: 1000,
        rateVolatility: 0.02,
        propertyVolatility: 0.1,
        incomeVolatility: 0.05,
        timeHorizon: 60
      }
      results.push(await this.runStressTestSimulation(userId, stressTestParams))

      // Rate shock scenarios
      const rateShocks = [
        { name: 'Mild Shock', rateIncrease: 1.0 },
        { name: 'Moderate Shock', rateIncrease: 2.0 },
        { name: 'Severe Shock', rateIncrease: 3.0 }
      ]
      results.push(await this.runRateShockSimulation(userId, baseScenario, rateShocks))

      // Property decline scenarios
      const propertyDeclines = [
        { name: 'Mild Decline', declinePercent: -0.05 },
        { name: 'Moderate Decline', declinePercent: -0.10 },
        { name: 'Severe Decline', declinePercent: -0.20 }
      ]
      results.push(await this.runPropertyDeclineSimulation(userId, baseScenario, propertyDeclines))

      // Income variance scenarios
      const incomeVariances = [
        { name: 'Income Reduction', incomeChange: -0.10 },
        { name: 'Severe Income Reduction', incomeChange: -0.20 },
        { name: 'Income Growth', incomeChange: 0.10 }
      ]
      results.push(await this.runIncomeVarianceSimulation(userId, baseScenario, incomeVariances))

      return results
    } catch (error) {
      console.error('Error running comprehensive stress test:', error)
      throw error
    }
  }
}
import { ScenarioInput, ScenarioResult, ScenarioComparison, ScenarioSnapshot, WhatIfAnalysis } from './scenario-types'
import { AffordabilityAgent, ScenarioAnalysisAgent } from './openai'
import { supabaseAdmin } from './supabase'

export class ScenarioManager {
  private affordabilityAgent: AffordabilityAgent
  private scenarioAgent: ScenarioAnalysisAgent

  constructor() {
    this.affordabilityAgent = new AffordabilityAgent()
    this.scenarioAgent = new ScenarioAnalysisAgent()
  }

  // Create a new scenario
  async createScenario(input: ScenarioInput): Promise<ScenarioResult> {
    const scenarioId = input.id || `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate scenario results
    const result = await this.calculateScenarioResult({
      ...input,
      id: scenarioId,
    })

    // Save to database
    await this.saveScenario(input, result)

    return result
  }

  // Calculate scenario results
  async calculateScenarioResult(scenario: ScenarioInput): Promise<ScenarioResult> {
    const { parameters } = scenario
    
    // Calculate affordability
    const affordability = await this.affordabilityAgent.calculateAffordability({
      country: 'CA', // This should be determined from location
      income: parameters.propertyPrice * 0.3, // Estimate from property price
      debts: 500, // This should come from user input
      downPayment: parameters.downPayment,
      propertyPrice: parameters.propertyPrice,
      interestRate: parameters.interestRate,
      termYears: parameters.termYears,
      location: parameters.location,
      taxes: parameters.taxes,
      insurance: parameters.insurance,
      hoa: parameters.hoa,
    })

    // Calculate amortization schedule
    const amortizationSchedule = this.calculateAmortizationSchedule(
      parameters.propertyPrice - parameters.downPayment,
      parameters.interestRate,
      parameters.termYears
    )

    // Calculate risk factors
    const riskFactors = this.assessRiskFactors(parameters, affordability)

    // Check compliance
    const compliance = this.checkCompliance(parameters, affordability)

    return {
      scenarioId: scenario.id!,
      monthlyPayment: affordability.monthlyPayment,
      totalInterest: amortizationSchedule[amortizationSchedule.length - 1].cumulativeInterest,
      totalCost: parameters.propertyPrice + amortizationSchedule[amortizationSchedule.length - 1].cumulativeInterest,
      principalPaid: amortizationSchedule[amortizationSchedule.length - 1].cumulativePrincipal,
      interestPaid: amortizationSchedule[amortizationSchedule.length - 1].cumulativeInterest,
      remainingBalance: 0,
      breakEvenPoint: this.calculateBreakEvenPoint(amortizationSchedule),
      gdsRatio: affordability.gdsRatio,
      tdsRatio: affordability.tdsRatio,
      dtiRatio: affordability.dtiRatio,
      qualificationResult: affordability.qualificationResult,
      amortizationSchedule,
      riskFactors,
      compliance,
    }
  }

  // Compare multiple scenarios
  async compareScenarios(scenarios: ScenarioInput[]): Promise<ScenarioComparison> {
    const scenarioResults = await Promise.all(
      scenarios.map(scenario => this.calculateScenarioResult(scenario))
    )

    // Use AI agent for comparison
    const comparison = await this.scenarioAgent.compareScenarios({
      scenarios: scenarios.map(s => ({
        name: s.name,
        rate: s.parameters.interestRate,
        term: s.parameters.termYears,
        type: s.parameters.rateType,
        propertyPrice: s.parameters.propertyPrice,
        downPayment: s.parameters.downPayment,
      }))
    })

    // Generate AI insights
    const aiInsights = await this.generateAIInsights(scenarioResults, scenarios)

    return {
      id: `comparison_${Date.now()}`,
      name: `Comparison of ${scenarios.length} scenarios`,
      scenarios: scenarioResults,
      comparison: {
        bestOption: comparison.recommendation.bestOption,
        worstOption: this.findWorstOption(scenarioResults),
        savings: comparison.recommendation.savings,
        riskAssessment: this.assessOverallRisk(scenarioResults),
        recommendations: this.generateRecommendations(scenarioResults),
      },
      aiInsights,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: scenarios[0]?.metadata.userId,
        isShared: false,
      },
    }
  }

  // What-if analysis
  async performWhatIfAnalysis(
    baseScenario: ScenarioInput,
    modifications: Array<{ parameter: string; newValue: number }>
  ): Promise<WhatIfAnalysis> {
    const baseResult = await this.calculateScenarioResult(baseScenario)
    
    // Apply modifications
    const modifiedScenario = { ...baseScenario }
    modifications.forEach(mod => {
      if (mod.parameter in modifiedScenario.parameters) {
        (modifiedScenario.parameters as any)[mod.parameter] = mod.newValue
      }
    })

    const modifiedResult = await this.calculateScenarioResult(modifiedScenario)

    // Calculate impacts
    const impactModifications = modifications.map(mod => ({
      parameter: mod.parameter,
      originalValue: (baseScenario.parameters as any)[mod.parameter],
      newValue: mod.newValue,
      impact: {
        monthlyPaymentChange: modifiedResult.monthlyPayment - baseResult.monthlyPayment,
        totalInterestChange: modifiedResult.totalInterest - baseResult.totalInterest,
        qualificationImpact: modifiedResult.qualificationResult !== baseResult.qualificationResult,
      },
    }))

    // Perform sensitivity analysis on the first modification
    const sensitivityAnalysis = await this.performSensitivityAnalysis(
      baseScenario,
      modifications[0]?.parameter || 'interestRate'
    )

    return {
      id: `whatif_${Date.now()}`,
      baseScenarioId: baseScenario.id!,
      modifications: impactModifications,
      results: modifiedResult,
      sensitivityAnalysis,
    }
  }

  // Create scenario snapshot
  async createSnapshot(
    comparison: ScenarioComparison,
    name: string,
    notes?: string
  ): Promise<ScenarioSnapshot> {
    const snapshot: ScenarioSnapshot = {
      id: `snapshot_${Date.now()}`,
      name,
      timestamp: new Date().toISOString(),
      scenarios: comparison.scenarios,
      comparison: comparison.comparison,
      notes,
    }

    // Save snapshot
    await this.saveSnapshot(snapshot)

    return snapshot
  }

  // Private helper methods
  private calculateAmortizationSchedule(
    principal: number,
    annualRate: number,
    termYears: number
  ) {
    const monthlyRate = annualRate / 100 / 12
    const numPayments = termYears * 12
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1)

    const schedule = []
    let balance = principal
    let cumulativeInterest = 0
    let cumulativePrincipal = 0

    for (let month = 1; month <= numPayments; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
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
    }

    return schedule
  }

  private calculateBreakEvenPoint(schedule: any[]): number {
    // Find when cumulative principal exceeds cumulative interest
    for (let i = 0; i < schedule.length; i++) {
      if (schedule[i].cumulativePrincipal > schedule[i].cumulativeInterest) {
        return i
      }
    }
    return schedule.length
  }

  private assessRiskFactors(parameters: any, affordability: any) {
    const risks = []

    // Rate risk for variable rates
    if (parameters.rateType === 'variable') {
      risks.push({
        type: 'rate_risk' as const,
        severity: 'medium' as const,
        description: 'Variable rates can increase, affecting monthly payments',
        mitigation: 'Consider fixed rate or rate cap options',
      })
    }

    // Payment shock risk
    if (affordability.gdsRatio > 0.3) {
      risks.push({
        type: 'payment_shock' as const,
        severity: 'high' as const,
        description: 'High debt service ratio increases payment shock risk',
        mitigation: 'Consider increasing down payment or reducing property price',
      })
    }

    // Qualification risk
    if (!affordability.qualificationResult) {
      risks.push({
        type: 'qualification_risk' as const,
        severity: 'high' as const,
        description: 'May not qualify for mortgage under current parameters',
        mitigation: 'Improve credit score, increase down payment, or reduce property price',
      })
    }

    return risks
  }

  private checkCompliance(parameters: any, affordability: any) {
    return {
      osfiCompliant: affordability.gdsRatio <= 0.32 && affordability.tdsRatio <= 0.44,
      cfpbCompliant: affordability.dtiRatio <= 0.43,
      stressTestPassed: affordability.qualificationResult,
      warnings: affordability.disclaimers || [],
    }
  }

  private async generateAIInsights(scenarios: ScenarioResult[], inputs: ScenarioInput[]) {
    // This would use GPT-4 to generate personalized insights
    return {
      summary: `Based on your financial profile, we've analyzed ${scenarios.length} mortgage scenarios.`,
      pros: [
        'Fixed rate provides payment stability',
        'Variable rate offers potential savings',
      ],
      cons: [
        'Variable rate carries interest rate risk',
        'Higher down payment reduces monthly payments',
      ],
      nextSteps: [
        'Get pre-approved with your preferred lender',
        'Consider rate lock options',
        'Review closing costs and fees',
      ],
      personalizedAdvice: 'Given your financial situation, we recommend the fixed rate option for stability.',
    }
  }

  private findWorstOption(scenarios: ScenarioResult[]): string {
    return scenarios.reduce((worst, current) => 
      current.totalCost > worst.totalCost ? current : worst
    ).scenarioId
  }

  private assessOverallRisk(scenarios: ScenarioResult[]) {
    const riskCounts = scenarios.reduce((acc, scenario) => {
      scenario.riskFactors.forEach(risk => {
        acc[risk.severity] = (acc[risk.severity] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    if (riskCounts.high > 0) return { lowestRisk: 'low', highestRisk: 'high', overallRisk: 'high' as const }
    if (riskCounts.medium > 0) return { lowestRisk: 'low', highestRisk: 'medium', overallRisk: 'medium' as const }
    return { lowestRisk: 'low', highestRisk: 'low', overallRisk: 'low' as const }
  }

  private generateRecommendations(scenarios: ScenarioResult[]) {
    return [
      {
        type: 'optimization' as const,
        priority: 'high' as const,
        title: 'Consider increasing down payment',
        description: 'A higher down payment can reduce monthly payments and total interest',
        action: 'Try scenarios with 20% down payment',
      },
      {
        type: 'risk_mitigation' as const,
        priority: 'medium' as const,
        title: 'Evaluate rate type carefully',
        description: 'Fixed rates provide stability, variable rates offer potential savings',
        action: 'Compare both rate types in your analysis',
      },
    ]
  }

  private async performSensitivityAnalysis(
    baseScenario: ScenarioInput,
    parameter: string
  ): Promise<any> {
    const values = this.getSensitivityValues(parameter)
    const impacts = []

    for (const value of values) {
      const modifiedScenario = { ...baseScenario }
      ;(modifiedScenario.parameters as any)[parameter] = value
      const result = await this.calculateScenarioResult(modifiedScenario)
      
      impacts.push({
        value,
        monthlyPayment: result.monthlyPayment,
        totalInterest: result.totalInterest,
        qualificationResult: result.qualificationResult,
      })
    }

    return {
      parameter,
      values,
      impacts,
    }
  }

  private getSensitivityValues(parameter: string): number[] {
    switch (parameter) {
      case 'interestRate':
        return [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0]
      case 'downPayment':
        return [50000, 75000, 100000, 125000, 150000, 175000, 200000]
      case 'propertyPrice':
        return [400000, 450000, 500000, 550000, 600000, 650000, 700000]
      default:
        return []
    }
  }

  private async saveScenario(input: ScenarioInput, result: ScenarioResult) {
    // Save to Supabase
    const { error } = await supabaseAdmin
      .from('scenarios')
      .insert({
        id: input.id,
        name: input.name,
        description: input.description,
        parameters: input.parameters,
        results: result,
        metadata: input.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save scenario: ${error.message}`)
    }
  }

  private async saveSnapshot(snapshot: ScenarioSnapshot) {
    const { error } = await supabaseAdmin
      .from('scenario_snapshots')
      .insert({
        id: snapshot.id,
        name: snapshot.name,
        timestamp: snapshot.timestamp,
        scenarios: snapshot.scenarios,
        comparison: snapshot.comparison,
        notes: snapshot.notes,
        created_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save snapshot: ${error.message}`)
    }
  }
}
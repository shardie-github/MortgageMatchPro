import OpenAI from 'openai'
import { ScenarioResult, ScenarioComparison } from './scenario-types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class ExplainabilityAgent {
  private model = 'gpt-4o'

  // Generate natural language explanation for a single scenario
  async explainScenario(
    scenario: ScenarioResult,
    userContext?: {
      income: number
      debts: number
      riskTolerance: 'low' | 'medium' | 'high'
      goals: string[]
    }
  ): Promise<{
    summary: string
    keyInsights: string[]
    pros: string[]
    cons: string[]
    recommendations: string[]
    riskAssessment: string
    complianceNotes: string[]
  }> {
    const prompt = this.buildScenarioExplanationPrompt(scenario, userContext)
    
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert mortgage advisor with 20+ years of experience. Provide clear, personalized explanations of mortgage scenarios that help users make informed decisions. Use simple language and avoid jargon.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    return this.parseScenarioExplanation(response.choices[0].message.content || '')
  }

  // Generate comparison explanation
  async explainComparison(
    comparison: ScenarioComparison,
    userContext?: {
      income: number
      debts: number
      riskTolerance: 'low' | 'medium' | 'high'
      goals: string[]
    }
  ): Promise<{
    executiveSummary: string
    detailedComparison: string
    bestOptionExplanation: string
    worstOptionExplanation: string
    savingsBreakdown: string
    riskAnalysis: string
    personalizedRecommendation: string
    nextSteps: string[]
  }> {
    const prompt = this.buildComparisonExplanationPrompt(comparison, userContext)
    
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert mortgage advisor providing detailed scenario comparisons. Help users understand the trade-offs between different mortgage options and make the best choice for their situation.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    return this.parseComparisonExplanation(response.choices[0].message.content || '')
  }

  // Generate what-if analysis explanation
  async explainWhatIfAnalysis(
    baseScenario: ScenarioResult,
    modifiedScenario: ScenarioResult,
    changes: Array<{ parameter: string; oldValue: number; newValue: number }>
  ): Promise<{
    changeSummary: string
    impactAnalysis: string
    sensitivityInsights: string
    recommendations: string[]
  }> {
    const prompt = this.buildWhatIfExplanationPrompt(baseScenario, modifiedScenario, changes)
    
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a mortgage expert explaining the impact of parameter changes. Help users understand how different factors affect their mortgage.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    })

    return this.parseWhatIfExplanation(response.choices[0].message.content || '')
  }

  // Generate compliance and regulatory explanation
  async explainCompliance(
    scenario: ScenarioResult,
    country: 'CA' | 'US'
  ): Promise<{
    complianceStatus: string
    regulatoryExplanation: string
    warnings: string[]
    recommendations: string[]
  }> {
    const prompt = this.buildComplianceExplanationPrompt(scenario, country)
    
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a mortgage compliance expert. Explain regulatory requirements and compliance status in simple terms.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 600,
    })

    return this.parseComplianceExplanation(response.choices[0].message.content || '')
  }

  // Private helper methods
  private buildScenarioExplanationPrompt(
    scenario: ScenarioResult,
    userContext?: any
  ): string {
    return `
Analyze this mortgage scenario and provide a clear explanation:

SCENARIO DATA:
- Monthly Payment: $${scenario.monthlyPayment.toLocaleString()}
- Total Interest: $${scenario.totalInterest.toLocaleString()}
- Total Cost: $${scenario.totalCost.toLocaleString()}
- GDS Ratio: ${(scenario.gdsRatio * 100).toFixed(1)}%
- TDS Ratio: ${(scenario.tdsRatio * 100).toFixed(1)}%
- Qualification: ${scenario.qualificationResult ? 'Approved' : 'Not Approved'}
- Risk Factors: ${scenario.riskFactors.map(r => r.description).join(', ')}

USER CONTEXT:
${userContext ? `
- Income: $${userContext.income.toLocaleString()}
- Monthly Debts: $${userContext.debts.toLocaleString()}
- Risk Tolerance: ${userContext.riskTolerance}
- Goals: ${userContext.goals.join(', ')}
` : 'No user context provided'}

Provide a comprehensive explanation covering:
1. Summary of the scenario
2. Key insights about affordability and qualification
3. Pros and cons
4. Specific recommendations
5. Risk assessment
6. Compliance notes
`
  }

  private buildComparisonExplanationPrompt(
    comparison: ScenarioComparison,
    userContext?: any
  ): string {
    return `
Compare these mortgage scenarios and provide detailed analysis:

SCENARIOS:
${comparison.scenarios.map((s, i) => `
Scenario ${i + 1}:
- Monthly Payment: $${s.monthlyPayment.toLocaleString()}
- Total Interest: $${s.totalInterest.toLocaleString()}
- Total Cost: $${s.totalCost.toLocaleString()}
- GDS Ratio: ${(s.gdsRatio * 100).toFixed(1)}%
- Qualification: ${s.qualificationResult ? 'Approved' : 'Not Approved'}
`).join('\n')}

COMPARISON RESULTS:
- Best Option: ${comparison.comparison.bestOption}
- Worst Option: ${comparison.comparison.worstOption}
- Potential Savings: $${comparison.comparison.savings.toLocaleString()}
- Overall Risk: ${comparison.comparison.riskAssessment.overallRisk}

USER CONTEXT:
${userContext ? `
- Income: $${userContext.income.toLocaleString()}
- Risk Tolerance: ${userContext.riskTolerance}
- Goals: ${userContext.goals.join(', ')}
` : 'No user context provided'}

Provide detailed analysis covering:
1. Executive summary
2. Detailed comparison of each scenario
3. Explanation of why one is best/worst
4. Savings breakdown
5. Risk analysis
6. Personalized recommendation
7. Next steps
`
  }

  private buildWhatIfExplanationPrompt(
    baseScenario: ScenarioResult,
    modifiedScenario: ScenarioResult,
    changes: Array<{ parameter: string; oldValue: number; newValue: number }>
  ): string {
    return `
Analyze the impact of these parameter changes:

CHANGES MADE:
${changes.map(c => `- ${c.parameter}: $${c.oldValue.toLocaleString()} → $${c.newValue.toLocaleString()}`).join('\n')}

BEFORE:
- Monthly Payment: $${baseScenario.monthlyPayment.toLocaleString()}
- Total Interest: $${baseScenario.totalInterest.toLocaleString()}
- Total Cost: $${baseScenario.totalCost.toLocaleString()}

AFTER:
- Monthly Payment: $${modifiedScenario.monthlyPayment.toLocaleString()}
- Total Interest: $${modifiedScenario.totalInterest.toLocaleString()}
- Total Cost: $${modifiedScenario.totalCost.toLocaleString()}

IMPACT:
- Monthly Payment Change: $${(modifiedScenario.monthlyPayment - baseScenario.monthlyPayment).toLocaleString()}
- Total Interest Change: $${(modifiedScenario.totalInterest - baseScenario.totalInterest).toLocaleString()}
- Qualification Impact: ${modifiedScenario.qualificationResult !== baseScenario.qualificationResult ? 'Changed' : 'Unchanged'}

Provide analysis covering:
1. Summary of changes and their impact
2. Detailed impact analysis
3. Sensitivity insights
4. Recommendations
`
  }

  private buildComplianceExplanationPrompt(
    scenario: ScenarioResult,
    country: 'CA' | 'US'
  ): string {
    const compliance = scenario.compliance
    return `
Explain the compliance status for this mortgage scenario:

SCENARIO:
- GDS Ratio: ${(scenario.gdsRatio * 100).toFixed(1)}%
- TDS Ratio: ${(scenario.tdsRatio * 100).toFixed(1)}%
- DTI Ratio: ${(scenario.dtiRatio * 100).toFixed(1)}%
- Qualification: ${scenario.qualificationResult ? 'Approved' : 'Not Approved'}

COMPLIANCE STATUS:
- OSFI Compliant: ${compliance.osfiCompliant ? 'Yes' : 'No'}
- CFPB Compliant: ${compliance.cfpbCompliant ? 'Yes' : 'No'}
- Stress Test Passed: ${compliance.stressTestPassed ? 'Yes' : 'No'}
- Warnings: ${compliance.warnings.join(', ')}

COUNTRY: ${country}

Explain:
1. Overall compliance status
2. Regulatory requirements explanation
3. Any warnings or issues
4. Recommendations for improvement
`
  }

  private parseScenarioExplanation(content: string) {
    // Parse the AI response into structured format
    // This is a simplified parser - in production, you'd want more robust parsing
    const lines = content.split('\n').filter(line => line.trim())
    
    return {
      summary: lines.find(line => line.includes('Summary') || line.includes('summary')) || 'No summary provided',
      keyInsights: lines.filter(line => line.includes('•') || line.includes('-')).map(line => line.replace(/^[•\-]\s*/, '')),
      pros: lines.filter(line => line.toLowerCase().includes('pro') || line.includes('✓')).map(line => line.replace(/^[•\-]\s*/, '')),
      cons: lines.filter(line => line.toLowerCase().includes('con') || line.includes('✗')).map(line => line.replace(/^[•\-]\s*/, '')),
      recommendations: lines.filter(line => line.toLowerCase().includes('recommend') || line.includes('suggest')).map(line => line.replace(/^[•\-]\s*/, '')),
      riskAssessment: lines.find(line => line.toLowerCase().includes('risk')) || 'No risk assessment provided',
      complianceNotes: lines.filter(line => line.toLowerCase().includes('compliance') || line.toLowerCase().includes('regulation')).map(line => line.replace(/^[•\-]\s*/, '')),
    }
  }

  private parseComparisonExplanation(content: string) {
    const lines = content.split('\n').filter(line => line.trim())
    
    return {
      executiveSummary: lines.find(line => line.includes('Executive') || line.includes('Summary')) || 'No summary provided',
      detailedComparison: lines.find(line => line.includes('Detailed') || line.includes('Comparison')) || 'No detailed comparison provided',
      bestOptionExplanation: lines.find(line => line.includes('Best') || line.includes('Recommended')) || 'No best option explanation provided',
      worstOptionExplanation: lines.find(line => line.includes('Worst') || line.includes('Avoid')) || 'No worst option explanation provided',
      savingsBreakdown: lines.find(line => line.includes('Savings') || line.includes('Cost')) || 'No savings breakdown provided',
      riskAnalysis: lines.find(line => line.includes('Risk') || line.includes('Risk Analysis')) || 'No risk analysis provided',
      personalizedRecommendation: lines.find(line => line.includes('Recommendation') || line.includes('Advice')) || 'No recommendation provided',
      nextSteps: lines.filter(line => line.includes('Step') || line.includes('Next')).map(line => line.replace(/^[•\-]\s*/, '')),
    }
  }

  private parseWhatIfExplanation(content: string) {
    const lines = content.split('\n').filter(line => line.trim())
    
    return {
      changeSummary: lines.find(line => line.includes('Change') || line.includes('Summary')) || 'No change summary provided',
      impactAnalysis: lines.find(line => line.includes('Impact') || line.includes('Analysis')) || 'No impact analysis provided',
      sensitivityInsights: lines.find(line => line.includes('Sensitivity') || line.includes('Insight')) || 'No sensitivity insights provided',
      recommendations: lines.filter(line => line.includes('Recommend') || line.includes('Suggest')).map(line => line.replace(/^[•\-]\s*/, '')),
    }
  }

  private parseComplianceExplanation(content: string) {
    const lines = content.split('\n').filter(line => line.trim())
    
    return {
      complianceStatus: lines.find(line => line.includes('Status') || line.includes('Compliant')) || 'No compliance status provided',
      regulatoryExplanation: lines.find(line => line.includes('Regulatory') || line.includes('Requirement')) || 'No regulatory explanation provided',
      warnings: lines.filter(line => line.includes('Warning') || line.includes('Issue')).map(line => line.replace(/^[•\-]\s*/, '')),
      recommendations: lines.filter(line => line.includes('Recommend') || line.includes('Improve')).map(line => line.replace(/^[•\-]\s*/, '')),
    }
  }
}
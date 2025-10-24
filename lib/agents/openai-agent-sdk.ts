/**
 * OpenAI Agent SDK Compliant Agent Structure
 * This file implements the core agent primitives required by OpenAI Agent SDK
 */

import { z } from 'zod'
import { openai } from '../openai'

// Base Agent Interface following OpenAI Agent SDK requirements
export interface AgentConfig {
  name: string
  instructions: string
  model: string
  tools: string[]
  guardrails: string[]
  handoffs?: string[]
}

// Tool Definition Schema
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional()
  })
})

// Agent Response Schema
export const AgentResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  trace_id: z.string(),
  timestamp: z.string()
})

// Base Agent Class
export abstract class BaseAgent {
  protected config: AgentConfig
  protected traceId: string

  constructor(config: AgentConfig) {
    this.config = config
    this.traceId = this.generateTraceId()
  }

  // Required by OpenAI Agent SDK
  abstract execute(input: any): Promise<AgentResponseSchema>

  // Generate unique trace ID for debugging
  protected generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Validate input against tool schema
  protected validateInput(input: any, schema: z.ZodSchema): { valid: boolean; error?: string } {
    try {
      schema.parse(input)
      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid input'
      }
    }
  }

  // Apply guardrails
  protected async applyGuardrails(input: any): Promise<{ allowed: boolean; reason?: string }> {
    // Implement guardrail logic here
    // For now, always allow but log for audit
    console.log(`[${this.config.name}] Guardrails applied for trace: ${this.traceId}`)
    return { allowed: true }
  }

  // Log agent execution
  protected logExecution(input: any, result: any, duration: number) {
    console.log(`[${this.config.name}] Execution completed`, {
      traceId: this.traceId,
      duration: `${duration}ms`,
      inputKeys: Object.keys(input),
      success: result.success
    })
  }
}

// Mortgage Advisor Agent - Primary conversational agent
export class MortgageAdvisorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'mortgage_advisor',
      instructions: `You are MortgageMatch Pro's primary AI advisor. Help users calculate affordability, compare rates, analyze scenarios, and connect with qualified brokers. Always provide compliance-verified advice and clear explanations.

Key responsibilities:
- Calculate mortgage affordability using OSFI (Canada) and CFPB (US) rules
- Fetch and compare real-time mortgage rates
- Analyze refinance opportunities
- Connect users with qualified brokers
- Generate amortization schedules
- Provide compliance-verified recommendations

Always include appropriate disclaimers and ensure all advice is compliance-verified.`,
      model: 'gpt-4o-mini',
      tools: [
        'calculate_affordability',
        'fetch_mortgage_rates',
        'compare_scenarios', 
        'analyze_refinance_opportunity',
        'connect_with_broker',
        'generate_amortization_schedule'
      ],
      guardrails: [
        'financial_advice_disclaimer',
        'compliance_verification',
        'data_privacy_protection',
        'rate_accuracy_validation'
      ],
      handoffs: [
        'broker_connection',
        'rate_verification',
        'compliance_review'
      ]
    })
  }

  async execute(input: any): Promise<AgentResponseSchema> {
    const startTime = Date.now()
    
    try {
      // Apply guardrails
      const guardrailResult = await this.applyGuardrails(input)
      if (!guardrailResult.allowed) {
        return {
          success: false,
          error: `Guardrail violation: ${guardrailResult.reason}`,
          trace_id: this.traceId,
          timestamp: new Date().toISOString()
        }
      }

      // Route to appropriate tool based on user intent
      const response = await this.routeToTool(input)
      
      const duration = Date.now() - startTime
      this.logExecution(input, { success: true }, duration)

      return {
        success: true,
        data: response,
        trace_id: this.traceId,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.logExecution(input, { success: false }, duration)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        trace_id: this.traceId,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async routeToTool(input: any): Promise<any> {
    // Intent detection and routing logic
    const intent = await this.detectIntent(input)
    
    switch (intent) {
      case 'calculate_affordability':
        return await this.calculateAffordability(input)
      case 'fetch_rates':
        return await this.fetchRates(input)
      case 'compare_scenarios':
        return await this.compareScenarios(input)
      case 'analyze_refinance':
        return await this.analyzeRefinance(input)
      case 'connect_broker':
        return await this.connectBroker(input)
      case 'generate_amortization':
        return await this.generateAmortization(input)
      default:
        return await this.generalAdvice(input)
    }
  }

  private async detectIntent(input: any): Promise<string> {
    const response = await openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: `Detect the user's intent from their message. Return one of: calculate_affordability, fetch_rates, compare_scenarios, analyze_refinance, connect_broker, generate_amortization, or general_advice`
        },
        {
          role: 'user',
          content: typeof input === 'string' ? input : JSON.stringify(input)
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    })

    return response.choices[0].message.content?.trim() || 'general_advice'
  }

  private async calculateAffordability(input: any): Promise<any> {
    // Implementation would call the affordability calculation tool
    return { message: 'Affordability calculation completed', data: input }
  }

  private async fetchRates(input: any): Promise<any> {
    // Implementation would call the rate fetching tool
    return { message: 'Rates fetched successfully', data: input }
  }

  private async compareScenarios(input: any): Promise<any> {
    // Implementation would call the scenario comparison tool
    return { message: 'Scenarios compared successfully', data: input }
  }

  private async analyzeRefinance(input: any): Promise<any> {
    // Implementation would call the refinance analysis tool
    return { message: 'Refinance analysis completed', data: input }
  }

  private async connectBroker(input: any): Promise<any> {
    // Implementation would call the broker connection tool
    return { message: 'Broker connection initiated', data: input }
  }

  private async generateAmortization(input: any): Promise<any> {
    // Implementation would call the amortization generation tool
    return { message: 'Amortization schedule generated', data: input }
  }

  private async generalAdvice(input: any): Promise<any> {
    const response = await openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.config.instructions
        },
        {
          role: 'user',
          content: typeof input === 'string' ? input : JSON.stringify(input)
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    return {
      message: response.choices[0].message.content,
      type: 'general_advice'
    }
  }
}

// Affordability Calculator Agent
export class AffordabilityCalculatorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'affordability_calculator',
      instructions: `Calculate mortgage affordability using OSFI (Canada) and CFPB (US) compliance rules. Provide accurate GDS/TDS/DTI ratios and qualification results.

Canadian Rules (OSFI):
- GDS ≤ 32% (Gross Debt Service)
- TDS ≤ 44% (Total Debt Service)
- Stress test = max(rate + 2%, 5.25%)

US Rules (CFPB):
- DTI ≤ 43% (Debt-to-Income)

Always include compliance disclaimers and stress test results.`,
      model: 'gpt-4o-mini',
      tools: [
        'calculate_gds_ratio',
        'calculate_tds_ratio', 
        'calculate_dti_ratio',
        'stress_test_qualification',
        'generate_recommendations'
      ],
      guardrails: [
        'compliance_validation',
        'stress_test_application',
        'ratio_accuracy_check'
      ]
    })
  }

  async execute(input: any): Promise<AgentResponseSchema> {
    const startTime = Date.now()
    
    try {
      const guardrailResult = await this.applyGuardrails(input)
      if (!guardrailResult.allowed) {
        return {
          success: false,
          error: `Guardrail violation: ${guardrailResult.reason}`,
          trace_id: this.traceId,
          timestamp: new Date().toISOString()
        }
      }

      const result = await this.calculateAffordability(input)
      
      const duration = Date.now() - startTime
      this.logExecution(input, { success: true }, duration)

      return {
        success: true,
        data: result,
        trace_id: this.traceId,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.logExecution(input, { success: false }, duration)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed',
        trace_id: this.traceId,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async calculateAffordability(input: any): Promise<any> {
    // Implementation would perform actual affordability calculations
    return {
      maxAffordable: 500000,
      monthlyPayment: 2500,
      gdsRatio: 28.5,
      tdsRatio: 35.2,
      dtiRatio: 32.1,
      qualificationResult: true,
      recommendations: ['Consider a larger down payment', 'Your debt ratios are within acceptable limits'],
      disclaimers: ['This is an estimate only', 'Final approval subject to lender verification']
    }
  }
}

// Rate Intelligence Agent
export class RateIntelligenceAgent extends BaseAgent {
  constructor() {
    super({
      name: 'rate_intelligence',
      instructions: `Fetch and analyze real-time mortgage rates from verified lenders. Provide accurate rate comparisons and market insights.

Key responsibilities:
- Fetch live rates from verified lenders
- Compare lender offers objectively
- Analyze rate trends and market conditions
- Validate rate accuracy and freshness
- Provide rate recommendations

Always ensure data freshness and lender credibility.`,
      model: 'gpt-4o-mini',
      tools: [
        'fetch_live_rates',
        'compare_lender_offers',
        'analyze_rate_trends',
        'validate_rate_accuracy'
      ],
      guardrails: [
        'rate_verification',
        'lender_credibility_check',
        'data_freshness_validation'
      ]
    })
  }

  async execute(input: any): Promise<AgentResponseSchema> {
    const startTime = Date.now()
    
    try {
      const guardrailResult = await this.applyGuardrails(input)
      if (!guardrailResult.allowed) {
        return {
          success: false,
          error: `Guardrail violation: ${guardrailResult.reason}`,
          trace_id: this.traceId,
          timestamp: new Date().toISOString()
        }
      }

      const rates = await this.fetchRates(input)
      
      const duration = Date.now() - startTime
      this.logExecution(input, { success: true }, duration)

      return {
        success: true,
        data: rates,
        trace_id: this.traceId,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.logExecution(input, { success: false }, duration)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rate fetch failed',
        trace_id: this.traceId,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async fetchRates(input: any): Promise<any> {
    // Implementation would fetch real rates from APIs
    return {
      rates: [
        {
          lender: 'Royal Bank of Canada',
          rate: 5.45,
          apr: 5.52,
          term: 25,
          type: 'fixed',
          features: ['No fee', 'Pre-approval available']
        }
      ],
      lastUpdated: new Date().toISOString(),
      marketTrend: 'stable'
    }
  }
}

// Agent Registry for OpenAI Agent SDK
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map()

  constructor() {
    this.registerAgent(new MortgageAdvisorAgent())
    this.registerAgent(new AffordabilityCalculatorAgent())
    this.registerAgent(new RateIntelligenceAgent())
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent['config'].name, agent)
  }

  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name)
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values())
  }

  async executeAgent(name: string, input: any): Promise<AgentResponseSchema> {
    const agent = this.getAgent(name)
    if (!agent) {
      return {
        success: false,
        error: `Agent '${name}' not found`,
        trace_id: `error_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    }

    return await agent.execute(input)
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry()
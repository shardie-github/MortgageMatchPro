import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Zod schemas for type-safe API responses
export const AffordabilitySchema = z.object({
  maxAffordable: z.number(),
  monthlyPayment: z.number(),
  gdsRatio: z.number(),
  tdsRatio: z.number(),
  dtiRatio: z.number(),
  qualifyingRate: z.number(),
  qualificationResult: z.boolean(),
  breakdown: z.object({
    principal: z.number(),
    interest: z.number(),
    taxes: z.number(),
    insurance: z.number(),
    pmi: z.number().optional(),
  }),
  recommendations: z.array(z.string()),
  disclaimers: z.array(z.string()),
})

export const RateSchema = z.object({
  lender: z.string(),
  rate: z.number(),
  apr: z.number(),
  term: z.number(),
  type: z.enum(['fixed', 'variable']),
  paymentEstimate: z.number(),
  features: z.array(z.string()),
  contactInfo: z.object({
    phone: z.string(),
    email: z.string(),
    website: z.string(),
  }),
})

export const ScenarioComparisonSchema = z.object({
  scenarios: z.array(z.object({
    name: z.string(),
    rate: z.number(),
    term: z.number(),
    type: z.enum(['fixed', 'variable']),
    monthlyPayment: z.number(),
    totalInterest: z.number(),
    totalCost: z.number(),
    amortizationSchedule: z.array(z.object({
      month: z.number(),
      principal: z.number(),
      interest: z.number(),
      balance: z.number(),
    })),
  })),
  recommendation: z.object({
    bestOption: z.string(),
    savings: z.number(),
    reasoning: z.string(),
  }),
})

export const LeadSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  leadData: z.object({
    income: z.number(),
    debts: z.number(),
    downPayment: z.number(),
    propertyPrice: z.number(),
    creditScore: z.number().optional(),
    employmentType: z.string(),
    location: z.string(),
  }),
  leadScore: z.number(),
  brokerRecommendations: z.array(z.object({
    brokerId: z.string(),
    name: z.string(),
    company: z.string(),
    commissionRate: z.number(),
    matchReason: z.string(),
  })),
})

export type AffordabilityResult = z.infer<typeof AffordabilitySchema>
export type RateResult = z.infer<typeof RateSchema>
export type ScenarioComparison = z.infer<typeof ScenarioComparisonSchema>
export type LeadData = z.infer<typeof LeadSchema>

// Agent 1: Affordability Agent
export class AffordabilityAgent {
  async calculateAffordability(input: {
    country: 'CA' | 'US'
    income: number
    debts: number
    downPayment: number
    propertyPrice: number
    interestRate: number
    termYears: number
    location: string
    taxes?: number
    insurance?: number
    hoa?: number
  }): Promise<AffordabilityResult> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the Affordability Agent for MortgageMatch Pro. Calculate mortgage affordability using ${input.country === 'CA' ? 'Canadian OSFI rules' : 'US CFPB rules'}.

Canadian Rules:
- GDS ≤ 32% (Gross Debt Service)
- TDS ≤ 44% (Total Debt Service)  
- Stress test = max(rate + 2%, 5.25%)

US Rules:
- DTI ≤ 43% (Debt-to-Income)

Return valid JSON matching the AffordabilitySchema. Include compliance disclaimers.`,
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return AffordabilitySchema.parse(result)
  }
}

// Agent 2: Rate Intelligence Agent
export class RateIntelligenceAgent {
  async fetchRates(input: {
    country: 'CA' | 'US'
    termYears: number
    rateType: 'fixed' | 'variable'
    propertyPrice: number
    downPayment: number
  }): Promise<RateResult[]> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the Rate Intelligence Agent. Fetch current mortgage rates for ${input.country}.

For Canada: Use Ratehub.ca data, Big 6 banks, credit unions
For US: Use Freddie Mac PMMS, Fannie Mae, major lenders

Return array of rates with lender details, APR, and contact info.`,
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return z.array(RateSchema).parse(result.rates || [])
  }
}

// Agent 3: Scenario Analysis Agent
export class ScenarioAnalysisAgent {
  async compareScenarios(input: {
    scenarios: Array<{
      name: string
      rate: number
      term: number
      type: 'fixed' | 'variable'
      propertyPrice: number
      downPayment: number
    }>
  }): Promise<ScenarioComparison> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the Scenario Analysis Agent. Compare mortgage scenarios and provide detailed analysis including amortization schedules, total costs, and recommendations.`,
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return ScenarioComparisonSchema.parse(result)
  }
}

// Agent 4: Lead Routing Agent
export class LeadRoutingAgent {
  async processLead(input: {
    name: string
    email: string
    phone: string
    leadData: {
      income: number
      debts: number
      downPayment: number
      propertyPrice: number
      creditScore?: number
      employmentType: string
      location: string
    }
  }): Promise<LeadData> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the Lead Routing Agent. Calculate lead score and recommend brokers.

Lead Score Calculation:
- Income > 75k: +20
- Down payment >= 20%: +25  
- Credit >= 700: +30
- TDS < 35%: +10
- Employment = 'salaried': +15

Route high scores (70+) to major lenders, mid (50-69) to brokers, low (<50) to credit improvement advice.`,
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return LeadSchema.parse(result)
  }
}

// Agent 5: Monetization Agent
export class MonetizationAgent {
  async processPayment(input: {
    userId: string
    type: 'rate_check' | 'premium_subscription' | 'broker_white_label'
    amount: number
    currency: 'CAD' | 'USD'
  }): Promise<{
    success: boolean
    paymentIntentId?: string
    clientSecret?: string
    error?: string
  }> {
    // This would integrate with Stripe
    // For now, return a mock response
    return {
      success: true,
      paymentIntentId: `pi_${Date.now()}`,
      clientSecret: `pi_${Date.now()}_secret`,
    }
  }
}

export { openai }
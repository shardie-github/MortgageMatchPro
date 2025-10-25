import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAIKey } from './config/keys'

// Initialize OpenAI with secure key management
const openai = new OpenAI({
  apiKey: getOpenAIKey(),
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
    // For now, return mock data. In production, this would call real APIs
    const mockRates = {
      CA: [
        {
          lender: 'Royal Bank of Canada',
          rate: 5.45,
          apr: 5.52,
          term: input.termYears,
          type: input.rateType,
          paymentEstimate: this.calculatePayment(input.propertyPrice - input.downPayment, 5.45, input.termYears),
          features: ['No fee', 'Pre-approval available', 'Portable'],
          contactInfo: {
            phone: '1-800-769-2511',
            email: 'mortgages@rbc.com',
            website: 'https://rbc.com/mortgages',
          },
        },
        {
          lender: 'TD Canada Trust',
          rate: 5.52,
          apr: 5.59,
          term: input.termYears,
          type: input.rateType,
          paymentEstimate: this.calculatePayment(input.propertyPrice - input.downPayment, 5.52, input.termYears),
          features: ['Rate hold', 'Pre-approval available', 'Cashback'],
          contactInfo: {
            phone: '1-866-222-3456',
            email: 'mortgages@td.com',
            website: 'https://td.com/mortgages',
          },
        },
        {
          lender: 'Scotiabank',
          rate: 5.38,
          apr: 5.45,
          term: input.termYears,
          type: input.rateType,
          paymentEstimate: this.calculatePayment(input.propertyPrice - input.downPayment, 5.38, input.termYears),
          features: ['No fee', 'Rate hold', 'Portable'],
          contactInfo: {
            phone: '1-800-4SCOTIA',
            email: 'mortgages@scotiabank.com',
            website: 'https://scotiabank.com/mortgages',
          },
        },
      ],
      US: [
        {
          lender: 'Wells Fargo',
          rate: 6.25,
          apr: 6.35,
          term: input.termYears,
          type: input.rateType,
          paymentEstimate: this.calculatePayment(input.propertyPrice - input.downPayment, 6.25, input.termYears),
          features: ['No PMI with 20% down', 'Rate lock', 'Online application'],
          contactInfo: {
            phone: '1-800-869-3557',
            email: 'mortgages@wellsfargo.com',
            website: 'https://wellsfargo.com/mortgages',
          },
        },
        {
          lender: 'Bank of America',
          rate: 6.32,
          apr: 6.42,
          term: input.termYears,
          type: input.rateType,
          paymentEstimate: this.calculatePayment(input.propertyPrice - input.downPayment, 6.32, input.termYears),
          features: ['Rate lock', 'Online application', 'Pre-approval'],
          contactInfo: {
            phone: '1-800-900-9000',
            email: 'mortgages@bankofamerica.com',
            website: 'https://bankofamerica.com/mortgages',
          },
        },
        {
          lender: 'Chase Bank',
          rate: 6.18,
          apr: 6.28,
          term: input.termYears,
          type: input.rateType,
          paymentEstimate: this.calculatePayment(input.propertyPrice - input.downPayment, 6.18, input.termYears),
          features: ['No PMI with 20% down', 'Rate lock', 'Online application'],
          contactInfo: {
            phone: '1-800-873-6577',
            email: 'mortgages@chase.com',
            website: 'https://chase.com/mortgages',
          },
        },
      ],
    }

    return mockRates[input.country] || []
  }

  private calculatePayment(principal: number, rate: number, termYears: number): number {
    const monthlyRate = rate / 100 / 12
    const numPayments = termYears * 12
    
    if (monthlyRate === 0) {
      return principal / numPayments
    }
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1)
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

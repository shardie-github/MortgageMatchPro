import { z } from 'zod'

// Enhanced scenario types for interactive modeling
export const ScenarioInputSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.object({
    propertyPrice: z.number(),
    downPayment: z.number(),
    interestRate: z.number(),
    termYears: z.number(),
    rateType: z.enum(['fixed', 'variable', 'arm']),
    location: z.string(),
    taxes: z.number().optional(),
    insurance: z.number().optional(),
    hoa: z.number().optional(),
    pmi: z.number().optional(),
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    userId: z.string().optional(),
    isTemplate: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
})

export const ScenarioResultSchema = z.object({
  scenarioId: z.string(),
  monthlyPayment: z.number(),
  totalInterest: z.number(),
  totalCost: z.number(),
  principalPaid: z.number(),
  interestPaid: z.number(),
  remainingBalance: z.number(),
  breakEvenPoint: z.number().optional(),
  gdsRatio: z.number(),
  tdsRatio: z.number(),
  dtiRatio: z.number(),
  qualificationResult: z.boolean(),
  amortizationSchedule: z.array(z.object({
    month: z.number(),
    principal: z.number(),
    interest: z.number(),
    balance: z.number(),
    cumulativeInterest: z.number(),
    cumulativePrincipal: z.number(),
  })),
  riskFactors: z.array(z.object({
    type: z.enum(['rate_risk', 'payment_shock', 'qualification_risk', 'market_risk']),
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string(),
    mitigation: z.string().optional(),
  })),
  compliance: z.object({
    osfiCompliant: z.boolean(),
    cfpbCompliant: z.boolean(),
    stressTestPassed: z.boolean(),
    warnings: z.array(z.string()),
  }),
})

export const ScenarioComparisonSchema = z.object({
  id: z.string(),
  name: z.string(),
  scenarios: z.array(ScenarioResultSchema),
  comparison: z.object({
    bestOption: z.string(),
    worstOption: z.string(),
    savings: z.number(),
    riskAssessment: z.object({
      lowestRisk: z.string(),
      highestRisk: z.string(),
      overallRisk: z.enum(['low', 'medium', 'high']),
    }),
    recommendations: z.array(z.object({
      type: z.enum(['optimization', 'risk_mitigation', 'compliance', 'financial']),
      priority: z.enum(['low', 'medium', 'high']),
      title: z.string(),
      description: z.string(),
      action: z.string().optional(),
    })),
  }),
  aiInsights: z.object({
    summary: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    nextSteps: z.array(z.string()),
    personalizedAdvice: z.string(),
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    userId: z.string().optional(),
    isShared: z.boolean().default(false),
    shareToken: z.string().optional(),
  }),
})

export const ScenarioSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.string(),
  scenarios: z.array(ScenarioResultSchema),
  comparison: ScenarioComparisonSchema.shape.comparison,
  notes: z.string().optional(),
})

export type ScenarioInput = z.infer<typeof ScenarioInputSchema>
export type ScenarioResult = z.infer<typeof ScenarioResultSchema>
export type ScenarioComparison = z.infer<typeof ScenarioComparisonSchema>
export type ScenarioSnapshot = z.infer<typeof ScenarioSnapshotSchema>

// What-if analysis types
export const WhatIfAnalysisSchema = z.object({
  id: z.string(),
  baseScenarioId: z.string(),
  modifications: z.array(z.object({
    parameter: z.string(),
    originalValue: z.number(),
    newValue: z.number(),
    impact: z.object({
      monthlyPaymentChange: z.number(),
      totalInterestChange: z.number(),
      qualificationImpact: z.boolean(),
    }),
  })),
  results: ScenarioResultSchema,
  sensitivityAnalysis: z.object({
    parameter: z.string(),
    values: z.array(z.number()),
    impacts: z.array(z.object({
      value: z.number(),
      monthlyPayment: z.number(),
      totalInterest: z.number(),
      qualificationResult: z.boolean(),
    })),
  }),
})

export type WhatIfAnalysis = z.infer<typeof WhatIfAnalysisSchema>

// Export and sharing types
export const ExportOptionsSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  includeCharts: z.boolean().default(true),
  includeAmortization: z.boolean().default(true),
  includeAIInsights: z.boolean().default(true),
  branding: z.object({
    companyName: z.string().optional(),
    logo: z.string().optional(),
    colors: z.object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
    }).optional(),
  }).optional(),
})

export type ExportOptions = z.infer<typeof ExportOptionsSchema>
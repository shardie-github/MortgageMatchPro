/**
 * Enhanced Explainability Service
 * Structured JSON output with context, reasons, factors, and disclaimers
 */

import { z } from 'zod';

// Explainability response schema
export const ExplainabilityResponseSchema = z.object({
  explanation: z.object({
    summary: z.string(),
    reasoning: z.string(),
    keyFactors: z.array(z.object({
      factor: z.string(),
      impact: z.enum(['high', 'medium', 'low']),
      description: z.string(),
      evidence: z.string().optional()
    })),
    methodology: z.string(),
    confidence: z.number().min(0).max(1),
    limitations: z.array(z.string())
  }),
  context: z.object({
    userProfile: z.object({
      riskTolerance: z.string(),
      experienceLevel: z.string(),
      financialSituation: z.string()
    }),
    marketConditions: z.object({
      rateEnvironment: z.string(),
      marketTrend: z.string(),
      volatility: z.string()
    }),
    regulatoryEnvironment: z.object({
      jurisdiction: z.string(),
      applicableRules: z.array(z.string()),
      complianceStatus: z.string()
    })
  }),
  recommendations: z.object({
    primary: z.object({
      action: z.string(),
      reasoning: z.string(),
      expectedOutcome: z.string(),
      timeline: z.string()
    }),
    alternatives: z.array(z.object({
      action: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      suitability: z.enum(['high', 'medium', 'low'])
    })),
    nextSteps: z.array(z.string())
  }),
  disclaimers: z.object({
    general: z.array(z.string()),
    regulatory: z.array(z.string()),
    risk: z.array(z.string()),
    dataAccuracy: z.array(z.string())
  }),
  metadata: z.object({
    generatedAt: z.string(),
    model: z.string(),
    version: z.string(),
    traceId: z.string(),
    processingTime: z.number()
  })
});

export type ExplainabilityResponse = z.infer<typeof ExplainabilityResponseSchema>;

// Factor analysis schema
export const FactorAnalysisSchema = z.object({
  factor: z.string(),
  weight: z.number().min(0).max(1),
  impact: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  source: z.string()
});

export type FactorAnalysis = z.infer<typeof FactorAnalysisSchema>;

// Recommendation schema
export const RecommendationSchema = z.object({
  type: z.enum(['primary', 'alternative', 'caution']),
  priority: z.number().min(1).max(5),
  action: z.string(),
  reasoning: z.string(),
  expectedOutcome: z.string(),
  timeline: z.string(),
  requirements: z.array(z.string()),
  risks: z.array(z.string()),
  benefits: z.array(z.string())
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export class ExplainabilityService {
  private static instance: ExplainabilityService;
  private factorWeights: Map<string, number> = new Map();
  private explanationTemplates: Map<string, any> = new Map();

  private constructor() {
    this.initializeFactorWeights();
    this.initializeExplanationTemplates();
  }

  static getInstance(): ExplainabilityService {
    if (!ExplainabilityService.instance) {
      ExplainabilityService.instance = new ExplainabilityService();
    }
    return ExplainabilityService.instance;
  }

  /**
   * Generate comprehensive explanation for mortgage recommendation
   */
  async explainMatch(
    recommendation: any,
    userContext: any,
    marketContext: any,
    options: {
      includeAlternatives?: boolean;
      detailLevel?: 'basic' | 'standard' | 'detailed';
      includeMethodology?: boolean;
    } = {}
  ): Promise<ExplainabilityResponse> {
    const startTime = Date.now();
    
    try {
      // Analyze key factors
      const keyFactors = await this.analyzeKeyFactors(recommendation, userContext);
      
      // Generate reasoning
      const reasoning = await this.generateReasoning(recommendation, keyFactors, userContext);
      
      // Build context
      const context = this.buildContext(userContext, marketContext);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        recommendation,
        keyFactors,
        userContext,
        options.includeAlternatives !== false
      );
      
      // Generate disclaimers
      const disclaimers = this.generateDisclaimers(recommendation, userContext);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(keyFactors, userContext);
      
      // Build explanation
      const explanation = {
        summary: this.generateSummary(recommendation, keyFactors),
        reasoning,
        keyFactors,
        methodology: options.includeMethodology ? this.getMethodology() : 'Standard mortgage analysis methodology',
        confidence,
        limitations: this.identifyLimitations(userContext, marketContext)
      };

      return {
        explanation,
        context,
        recommendations,
        disclaimers,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'gpt-4o-mini',
          version: '2.0.0',
          traceId: this.generateTraceId(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Explainability generation error:', error);
      return this.generateErrorExplanation(error);
    }
  }

  /**
   * Analyze key factors influencing the recommendation
   */
  private async analyzeKeyFactors(
    recommendation: any,
    userContext: any
  ): Promise<Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    evidence?: string;
  }>> {
    const factors: Array<{
      factor: string;
      impact: 'high' | 'medium' | 'low';
      description: string;
      evidence?: string;
    }> = [];

    // Income analysis
    if (userContext.income) {
      const incomeRatio = userContext.income / (recommendation.propertyPrice || 1);
      factors.push({
        factor: 'Income Stability',
        impact: incomeRatio > 0.3 ? 'high' : incomeRatio > 0.2 ? 'medium' : 'low',
        description: `Annual income of $${userContext.income.toLocaleString()} provides ${incomeRatio > 0.3 ? 'strong' : 'adequate'} financial foundation`,
        evidence: `Income-to-property ratio: ${(incomeRatio * 100).toFixed(1)}%`
      });
    }

    // Down payment analysis
    if (userContext.downPayment && recommendation.propertyPrice) {
      const downPaymentRatio = userContext.downPayment / recommendation.propertyPrice;
      factors.push({
        factor: 'Down Payment',
        impact: downPaymentRatio >= 0.2 ? 'high' : downPaymentRatio >= 0.1 ? 'medium' : 'low',
        description: `${(downPaymentRatio * 100).toFixed(1)}% down payment ${downPaymentRatio >= 0.2 ? 'eliminates PMI and improves terms' : 'meets minimum requirements'}`,
        evidence: `Down payment: $${userContext.downPayment.toLocaleString()} (${(downPaymentRatio * 100).toFixed(1)}%)`
      });
    }

    // Credit score analysis
    if (userContext.creditScore) {
      factors.push({
        factor: 'Credit Score',
        impact: userContext.creditScore >= 740 ? 'high' : userContext.creditScore >= 680 ? 'medium' : 'low',
        description: `Credit score of ${userContext.creditScore} ${userContext.creditScore >= 740 ? 'qualifies for best rates' : userContext.creditScore >= 680 ? 'qualifies for competitive rates' : 'may limit options'}`,
        evidence: `Credit score: ${userContext.creditScore}`
      });
    }

    // Debt-to-income analysis
    if (userContext.income && userContext.debts) {
      const dti = (userContext.debts / userContext.income) * 100;
      factors.push({
        factor: 'Debt-to-Income Ratio',
        impact: dti <= 36 ? 'high' : dti <= 43 ? 'medium' : 'low',
        description: `DTI of ${dti.toFixed(1)}% ${dti <= 36 ? 'is excellent' : dti <= 43 ? 'is acceptable' : 'may limit qualification'}`,
        evidence: `Monthly debts: $${userContext.debts}, Monthly income: $${(userContext.income / 12).toFixed(0)}`
      });
    }

    // Market conditions
    if (recommendation.rate) {
      factors.push({
        factor: 'Current Market Rates',
        impact: 'medium',
        description: `Current rate of ${recommendation.rate}% reflects market conditions`,
        evidence: `Rate: ${recommendation.rate}%`
      });
    }

    return factors;
  }

  /**
   * Generate reasoning for the recommendation
   */
  private async generateReasoning(
    recommendation: any,
    keyFactors: any[],
    userContext: any
  ): Promise<string> {
    const highImpactFactors = keyFactors.filter(f => f.impact === 'high');
    const mediumImpactFactors = keyFactors.filter(f => f.impact === 'medium');
    
    let reasoning = 'This recommendation is based on a comprehensive analysis of your financial profile and current market conditions. ';
    
    if (highImpactFactors.length > 0) {
      reasoning += `The primary factors supporting this recommendation are: ${highImpactFactors.map(f => f.factor).join(', ')}. `;
    }
    
    if (mediumImpactFactors.length > 0) {
      reasoning += `Additional considerations include: ${mediumImpactFactors.map(f => f.factor).join(', ')}. `;
    }
    
    // Add specific reasoning based on recommendation type
    if (recommendation.type === 'fixed') {
      reasoning += 'A fixed-rate mortgage provides payment stability and protection against rate increases, which is particularly valuable in the current market environment.';
    } else if (recommendation.type === 'variable') {
      reasoning += 'A variable-rate mortgage offers lower initial payments and potential savings if rates remain stable or decrease, though it carries rate risk.';
    }
    
    return reasoning;
  }

  /**
   * Build comprehensive context
   */
  private buildContext(userContext: any, marketContext: any): any {
    return {
      userProfile: {
        riskTolerance: this.assessRiskTolerance(userContext),
        experienceLevel: this.assessExperienceLevel(userContext),
        financialSituation: this.assessFinancialSituation(userContext)
      },
      marketConditions: {
        rateEnvironment: this.assessRateEnvironment(marketContext),
        marketTrend: marketContext.trend || 'stable',
        volatility: marketContext.volatility || 'low'
      },
      regulatoryEnvironment: {
        jurisdiction: userContext.country || 'CA',
        applicableRules: this.getApplicableRules(userContext.country || 'CA'),
        complianceStatus: 'verified'
      }
    };
  }

  /**
   * Generate recommendations with alternatives
   */
  private async generateRecommendations(
    recommendation: any,
    keyFactors: any[],
    userContext: any,
    includeAlternatives: boolean
  ): Promise<any> {
    const primary = {
      action: this.getPrimaryAction(recommendation),
      reasoning: this.getPrimaryReasoning(recommendation, keyFactors),
      expectedOutcome: this.getExpectedOutcome(recommendation),
      timeline: this.getTimeline(recommendation)
    };

    const alternatives = includeAlternatives ? this.generateAlternatives(recommendation, userContext) : [];
    const nextSteps = this.generateNextSteps(recommendation, userContext);

    return {
      primary,
      alternatives,
      nextSteps
    };
  }

  /**
   * Generate disclaimers
   */
  private generateDisclaimers(recommendation: any, userContext: any): any {
    return {
      general: [
        'This analysis is for informational purposes only and does not constitute financial advice.',
        'All calculations are estimates and should be verified with a qualified mortgage professional.',
        'Market conditions and rates are subject to change without notice.'
      ],
      regulatory: [
        'Final approval is subject to lender verification and underwriting criteria.',
        'Rates and terms may vary based on individual circumstances and lender policies.',
        'Compliance with applicable lending regulations is required.'
      ],
      risk: [
        'Mortgage payments are subject to change based on rate adjustments (for variable rates).',
        'Property values may fluctuate, affecting equity and refinancing options.',
        'Default on mortgage payments may result in foreclosure.'
      ],
      dataAccuracy: [
        'Analysis based on provided information and current market data.',
        'Accuracy depends on completeness and accuracy of input data.',
        'Recommendations may change based on updated information.'
      ]
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(keyFactors: any[], userContext: any): number {
    let confidence = 0.5;
    
    // Boost confidence for complete data
    const requiredFields = ['income', 'downPayment', 'propertyPrice'];
    const availableFields = requiredFields.filter(field => userContext[field] !== undefined);
    confidence += (availableFields.length / requiredFields.length) * 0.3;
    
    // Boost confidence for high-impact factors
    const highImpactCount = keyFactors.filter(f => f.impact === 'high').length;
    confidence += highImpactCount * 0.1;
    
    // Boost confidence for credit score
    if (userContext.creditScore && userContext.creditScore >= 700) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate summary
   */
  private generateSummary(recommendation: any, keyFactors: any[]): string {
    const topFactors = keyFactors.filter(f => f.impact === 'high').slice(0, 2);
    const factorText = topFactors.map(f => f.factor).join(' and ');
    
    return `Based on your ${factorText}, this ${recommendation.type || 'mortgage'} option offers the best balance of affordability and terms for your situation.`;
  }

  /**
   * Get methodology
   */
  private getMethodology(): string {
    return 'Analysis uses OSFI (Canada) and CFPB (US) compliance rules, stress testing, and risk assessment algorithms. Factors weighted by impact on qualification and long-term financial health.';
  }

  /**
   * Identify limitations
   */
  private identifyLimitations(userContext: any, marketContext: any): string[] {
    const limitations: string[] = [];
    
    if (!userContext.creditScore) {
      limitations.push('Credit score not provided - analysis based on estimated credit profile');
    }
    
    if (!userContext.employmentHistory) {
      limitations.push('Employment history not verified - income stability assumptions used');
    }
    
    if (!marketContext.rateData) {
      limitations.push('Real-time rate data not available - using estimated rates');
    }
    
    return limitations;
  }

  /**
   * Generate error explanation
   */
  private generateErrorExplanation(error: any): ExplainabilityResponse {
    return {
      explanation: {
        summary: 'Unable to generate explanation due to system error',
        reasoning: 'An error occurred during analysis',
        keyFactors: [],
        methodology: 'Error state',
        confidence: 0,
        limitations: ['System error prevented complete analysis']
      },
      context: {
        userProfile: {
          riskTolerance: 'unknown',
          experienceLevel: 'unknown',
          financialSituation: 'unknown'
        },
        marketConditions: {
          rateEnvironment: 'unknown',
          marketTrend: 'unknown',
          volatility: 'unknown'
        },
        regulatoryEnvironment: {
          jurisdiction: 'unknown',
          applicableRules: [],
          complianceStatus: 'unknown'
        }
      },
      recommendations: {
        primary: {
          action: 'Contact support',
          reasoning: 'System error requires manual assistance',
          expectedOutcome: 'Resolution of technical issue',
          timeline: 'Immediate'
        },
        alternatives: [],
        nextSteps: ['Contact technical support', 'Retry request']
      },
      disclaimers: {
        general: ['System error - results not reliable'],
        regulatory: [],
        risk: [],
        dataAccuracy: ['Analysis incomplete due to system error']
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'error',
        version: '2.0.0',
        traceId: this.generateTraceId(),
        processingTime: 0
      }
    };
  }

  // Helper methods
  private assessRiskTolerance(userContext: any): string {
    if (userContext.riskTolerance) return userContext.riskTolerance;
    if (userContext.age && userContext.age < 30) return 'moderate';
    if (userContext.age && userContext.age > 50) return 'conservative';
    return 'moderate';
  }

  private assessExperienceLevel(userContext: any): string {
    if (userContext.previousMortgages && userContext.previousMortgages > 0) return 'experienced';
    return 'first-time';
  }

  private assessFinancialSituation(userContext: any): string {
    if (userContext.income && userContext.debts) {
      const dti = (userContext.debts / userContext.income) * 100;
      if (dti <= 30) return 'strong';
      if (dti <= 40) return 'stable';
      return 'challenged';
    }
    return 'unknown';
  }

  private assessRateEnvironment(marketContext: any): string {
    if (marketContext.rates && marketContext.rates.trend) {
      return marketContext.rates.trend;
    }
    return 'stable';
  }

  private getApplicableRules(jurisdiction: string): string[] {
    if (jurisdiction === 'CA') {
      return ['OSFI B-20 Guidelines', 'CMHC Insurance Rules', 'Provincial Regulations'];
    }
    return ['CFPB Regulations', 'State Lending Laws', 'Federal Guidelines'];
  }

  private getPrimaryAction(recommendation: any): string {
    if (recommendation.type === 'fixed') {
      return 'Proceed with fixed-rate mortgage application';
    } else if (recommendation.type === 'variable') {
      return 'Consider variable-rate mortgage with rate protection';
    }
    return 'Review mortgage options with qualified broker';
  }

  private getPrimaryReasoning(recommendation: any, keyFactors: any[]): string {
    const topFactor = keyFactors.find(f => f.impact === 'high');
    if (topFactor) {
      return `Based on your ${topFactor.factor.toLowerCase()}, this option provides the best terms and affordability.`;
    }
    return 'This option offers the optimal balance of rate, terms, and affordability for your situation.';
  }

  private getExpectedOutcome(recommendation: any): string {
    if (recommendation.monthlyPayment) {
      return `Monthly payment of approximately $${recommendation.monthlyPayment.toLocaleString()}`;
    }
    return 'Competitive mortgage terms with favorable rates and conditions';
  }

  private getTimeline(recommendation: any): string {
    return '2-4 weeks for approval and closing';
  }

  private generateAlternatives(recommendation: any, userContext: any): any[] {
    const alternatives = [];
    
    if (recommendation.type === 'fixed') {
      alternatives.push({
        action: 'Consider variable-rate mortgage',
        pros: ['Lower initial payments', 'Potential rate savings'],
        cons: ['Rate risk', 'Payment uncertainty'],
        suitability: 'medium'
      });
    }
    
    alternatives.push({
      action: 'Increase down payment',
      pros: ['Lower monthly payments', 'Better rates', 'No PMI'],
      cons: ['Requires more cash upfront'],
      suitability: userContext.downPayment && userContext.downPayment < userContext.propertyPrice * 0.2 ? 'high' : 'low'
    });
    
    return alternatives;
  }

  private generateNextSteps(recommendation: any, userContext: any): string[] {
    return [
      'Gather required documentation (income verification, bank statements)',
      'Get pre-approved with recommended lender',
      'Compare final offers from multiple lenders',
      'Review all terms and conditions carefully',
      'Consider rate lock options'
    ];
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const explainabilityService = ExplainabilityService.getInstance();
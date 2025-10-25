/**
 * Enhanced AI Prompt Templates
 * Refined for clarity, brevity, and predictability
 */

import { z } from 'zod';

// Enhanced prompt template schema
export const EnhancedPromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  basePrompt: z.string(),
  variables: z.array(z.string()),
  contextRequirements: z.array(z.string()),
  version: z.string(),
  effectiveness: z.number().min(0).max(1).default(0.5),
  usageCount: z.number().default(0),
  lastUpdated: z.string(),
  // Enhanced fields
  clarityScore: z.number().min(0).max(1).default(0.5),
  brevityScore: z.number().min(0).max(1).default(0.5),
  predictabilityScore: z.number().min(0).max(1).default(0.5),
  edgeCaseHandling: z.array(z.string()).default([]),
  fallbackPrompt: z.string().optional(),
  maxTokens: z.number().default(1000),
  temperature: z.number().min(0).max(2).default(0.7)
});

export type EnhancedPromptTemplate = z.infer<typeof EnhancedPromptTemplateSchema>;

// Edge case handling schema
export const EdgeCaseSchema = z.object({
  condition: z.string(),
  handling: z.string(),
  fallbackResponse: z.string()
});

export type EdgeCase = z.infer<typeof EdgeCaseSchema>;

// Enhanced prompt templates with improved clarity and brevity
export const ENHANCED_PROMPT_TEMPLATES: Omit<EnhancedPromptTemplate, 'id' | 'lastUpdated' | 'usageCount' | 'effectiveness' | 'clarityScore' | 'brevityScore' | 'predictabilityScore'>[] = [
  {
    name: 'mortgage_affordability_calculator',
    description: 'Calculate mortgage affordability with clear, structured output',
    basePrompt: `Calculate mortgage affordability for {country} using {rules}.

Input:
- Income: ${income}
- Debts: ${debts}
- Down Payment: ${downPayment}
- Property Price: ${propertyPrice}
- Interest Rate: ${interestRate}
- Term: ${termYears} years
- Location: ${location}

Rules:
{country === 'CA' ? 'Canadian OSFI: GDS ≤ 32%, TDS ≤ 44%, Stress test = max(rate + 2%, 5.25%)' : 'US CFPB: DTI ≤ 43%'}

Output JSON:
{
  "maxAffordable": number,
  "monthlyPayment": number,
  "gdsRatio": number,
  "tdsRatio": number,
  "qualificationResult": boolean,
  "recommendations": [string],
  "disclaimers": [string]
}`,
    variables: ['country', 'income', 'debts', 'downPayment', 'propertyPrice', 'interestRate', 'termYears', 'location'],
    contextRequirements: ['financial_data'],
    version: '2.0.0',
    edgeCaseHandling: [
      'Missing income data: Request clarification',
      'Invalid property price: Use market average',
      'No down payment: Calculate minimum required'
    ],
    fallbackPrompt: 'Provide basic affordability guidance with disclaimers about incomplete data.',
    maxTokens: 800,
    temperature: 0.1
  },
  {
    name: 'rate_explanation_simplified',
    description: 'Explain mortgage rates in simple, clear terms',
    basePrompt: `Explain current mortgage rates in {tone} tone for {audience}.

Current Context:
- Market Rate: ${currentRate}%
- User's Target: ${targetRate}%
- Trend: ${trend}

Keep explanation:
- Under 200 words
- Use simple language
- Include 2-3 key points
- End with actionable advice

Format:
1. Current situation (1 sentence)
2. Why rates are this level (2-3 sentences)
3. What to do now (1-2 sentences)`,
    variables: ['tone', 'audience', 'currentRate', 'targetRate', 'trend'],
    contextRequirements: ['market_data'],
    version: '2.0.0',
    edgeCaseHandling: [
      'No current rate data: Use general market guidance',
      'Extreme rate changes: Add context about volatility'
    ],
    maxTokens: 300,
    temperature: 0.3
  },
  {
    name: 'scenario_comparison_structured',
    description: 'Compare mortgage scenarios with clear structure',
    basePrompt: `Compare these mortgage scenarios:

${scenarios}

User Profile:
- Risk Tolerance: ${riskTolerance}
- Timeline: ${timeline}
- Priority: ${priority}

Provide comparison in this format:

**Best Option: [Name]**
- Monthly Payment: $X
- Total Interest: $X
- Why: [2-3 key reasons]

**Comparison Table:**
| Scenario | Payment | Total Cost | Risk | Best For |
|----------|---------|------------|------|----------|
| [Name]   | $X      | $X         | Low  | [Type]   |

**Recommendation:**
[2-3 sentences explaining choice]`,
    variables: ['scenarios', 'riskTolerance', 'timeline', 'priority'],
    contextRequirements: ['scenario_data', 'user_preferences'],
    version: '2.0.0',
    edgeCaseHandling: [
      'Identical scenarios: Highlight subtle differences',
      'No clear winner: Explain trade-offs'
    ],
    maxTokens: 600,
    temperature: 0.2
  },
  {
    name: 'broker_matching_optimized',
    description: 'Match users with appropriate brokers efficiently',
    basePrompt: `Match user with best broker based on:

User Profile:
- Lead Score: ${leadScore}
- Location: ${location}
- Loan Type: ${loanType}
- Timeline: ${timeline}
- Special Needs: ${specialNeeds}

Available Brokers:
${brokerList}

Match using:
1. Location proximity (30% weight)
2. Loan type expertise (25% weight)
3. Lead score compatibility (25% weight)
4. Availability (20% weight)

Output:
{
  "topMatch": {
    "brokerId": string,
    "name": string,
    "company": string,
    "matchScore": number,
    "reason": string
  },
  "alternatives": [2-3 other options],
  "nextSteps": [string]
}`,
    variables: ['leadScore', 'location', 'loanType', 'timeline', 'specialNeeds', 'brokerList'],
    contextRequirements: ['broker_data', 'user_profile'],
    version: '2.0.0',
    edgeCaseHandling: [
      'No local brokers: Expand search radius',
      'Low lead score: Suggest improvement steps'
    ],
    maxTokens: 500,
    temperature: 0.1
  }
];

// Edge case handlers
export const EDGE_CASE_HANDLERS: Record<string, EdgeCase[]> = {
  'missing_data': [
    {
      condition: 'income is null or undefined',
      handling: 'Request income information with clear explanation of why it\'s needed',
      fallbackResponse: 'I need your income information to calculate affordability accurately. Please provide your annual income.'
    },
    {
      condition: 'property_price is 0 or negative',
      handling: 'Request valid property price or use market average for area',
      fallbackResponse: 'Please provide a valid property price, or I can use the average price for your area.'
    },
    {
      condition: 'down_payment is missing',
      handling: 'Calculate minimum down payment required',
      fallbackResponse: 'I\'ll calculate the minimum down payment required for your situation.'
    }
  ],
  'ambiguous_input': [
    {
      condition: 'multiple loan types mentioned',
      handling: 'Ask for clarification on primary preference',
      fallbackResponse: 'I see you mentioned multiple loan types. Which is your primary preference: fixed or variable rate?'
    },
    {
      condition: 'unclear timeline',
      handling: 'Request specific timeline or use default',
      fallbackResponse: 'When are you looking to secure a mortgage? This helps me provide more relevant recommendations.'
    }
  ],
  'error_conditions': [
    {
      condition: 'calculation_error',
      handling: 'Provide general guidance and suggest manual calculation',
      fallbackResponse: 'I encountered an error with the calculation. Here\'s general guidance: [basic rules]. Consider using a mortgage calculator for precise numbers.'
    },
    {
      condition: 'api_timeout',
      handling: 'Use cached data with freshness warning',
      fallbackResponse: 'I\'m using slightly older data due to a connection issue. Here\'s what I found: [cached data]. Please verify current rates.'
    }
  ]
};

// Prompt optimization utilities
export class PromptOptimizer {
  static calculateClarityScore(prompt: string): number {
    let score = 0.5;
    
    // Check for clear structure
    if (prompt.includes('**') || prompt.includes('##')) score += 0.1;
    if (prompt.includes('1.') && prompt.includes('2.')) score += 0.1;
    
    // Check for specific instructions
    if (prompt.includes('Output JSON:') || prompt.includes('Format:')) score += 0.1;
    
    // Check for clear variable usage
    const variablePattern = /\$\{[^}]+\}/g;
    const variables = prompt.match(variablePattern) || [];
    if (variables.length > 0) score += 0.1;
    
    // Check for examples
    if (prompt.includes('Example:') || prompt.includes('e.g.')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  static calculateBrevityScore(prompt: string): number {
    const wordCount = prompt.split(/\s+/).length;
    
    if (wordCount <= 100) return 1.0;
    if (wordCount <= 200) return 0.8;
    if (wordCount <= 300) return 0.6;
    if (wordCount <= 500) return 0.4;
    return 0.2;
  }

  static calculatePredictabilityScore(prompt: string): number {
    let score = 0.5;
    
    // Check for structured output format
    if (prompt.includes('JSON:') || prompt.includes('Format:')) score += 0.2;
    
    // Check for clear instructions
    if (prompt.includes('Keep explanation:') || prompt.includes('Provide:')) score += 0.1;
    
    // Check for specific constraints
    if (prompt.includes('Under') || prompt.includes('words') || prompt.includes('sentences')) score += 0.1;
    
    // Check for examples
    if (prompt.includes('Example:') || prompt.includes('e.g.')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  static optimizePrompt(prompt: string): string {
    let optimized = prompt;
    
    // Remove redundant phrases
    optimized = optimized.replace(/\b(please|kindly|would you)\s+/gi, '');
    optimized = optimized.replace(/\b(very|really|quite)\s+/gi, '');
    
    // Simplify complex sentences
    optimized = optimized.replace(/In order to/g, 'To');
    optimized = optimized.replace(/It is important to note that/g, 'Note:');
    optimized = optimized.replace(/You should be aware that/g, 'Note:');
    
    // Add structure where missing
    if (!optimized.includes('**') && !optimized.includes('##')) {
      optimized = optimized.replace(/^(.+)$/gm, '**$1**');
    }
    
    return optimized;
  }
}

// Template validation
export class TemplateValidator {
  static validateTemplate(template: EnhancedPromptTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!template.name) errors.push('Template name is required');
    if (!template.basePrompt) errors.push('Base prompt is required');
    if (!template.variables || template.variables.length === 0) errors.push('At least one variable is required');
    
    // Check prompt quality
    const clarityScore = PromptOptimizer.calculateClarityScore(template.basePrompt);
    if (clarityScore < 0.3) errors.push('Prompt clarity score too low');
    
    const brevityScore = PromptOptimizer.calculateBrevityScore(template.basePrompt);
    if (brevityScore < 0.3) errors.push('Prompt is too verbose');
    
    // Check variable usage in prompt
    for (const variable of template.variables) {
      if (!template.basePrompt.includes(`\${${variable}}`)) {
        errors.push(`Variable ${variable} not used in prompt`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default {
  ENHANCED_PROMPT_TEMPLATES,
  EDGE_CASE_HANDLERS,
  PromptOptimizer,
  TemplateValidator
};
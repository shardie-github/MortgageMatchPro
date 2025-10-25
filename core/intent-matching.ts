/**
 * Intent Matching System for Conversational Interface
 * Implements OpenAI's "Conversational Storefront" principles
 */

import { openai } from './openai'

export interface IntentMatch {
  intent: string
  confidence: number
  parameters: Record<string, any>
  suggestedAction: string
  canvasComponent?: string
}

export interface IntentPattern {
  keywords: string[]
  patterns: RegExp[]
  intent: string
  parameters: Record<string, any>
  canvasComponent?: string
}

class IntentMatcher {
  private patterns: IntentPattern[] = [
    // Affordability Intent
    {
      keywords: ['afford', 'affordable', 'budget', 'income', 'qualify', 'qualification'],
      patterns: [
        /can i afford/i,
        /how much can i borrow/i,
        /what's my budget/i,
        /do i qualify/i,
        /affordability/i
      ],
      intent: 'calculate_affordability',
      parameters: {},
      canvasComponent: 'AffordabilityInputPanel'
    },
    
    // Rate Intent
    {
      keywords: ['rate', 'rates', 'interest', 'current', 'today', 'lender'],
      patterns: [
        /current rates/i,
        /mortgage rates/i,
        /interest rates/i,
        /show me rates/i,
        /what are the rates/i
      ],
      intent: 'fetch_rates',
      parameters: {},
      canvasComponent: 'RateComparisonTable'
    },
    
    // Scenario Intent
    {
      keywords: ['compare', 'scenario', 'scenarios', 'option', 'options', 'which'],
      patterns: [
        /compare scenarios/i,
        /which option/i,
        /scenario analysis/i,
        /compare options/i,
        /what's better/i
      ],
      intent: 'compare_scenarios',
      parameters: {},
      canvasComponent: 'ScenarioComparisonChart'
    },
    
    // Refinance Intent
    {
      keywords: ['refinance', 'refi', 'refinancing', 'lower rate', 'save money'],
      patterns: [
        /should i refinance/i,
        /refinance opportunity/i,
        /lower my rate/i,
        /save money/i,
        /refinancing/i
      ],
      intent: 'analyze_refinance',
      parameters: {},
      canvasComponent: 'AmortizationChart'
    },
    
    // Broker Intent
    {
      keywords: ['broker', 'agent', 'lender', 'contact', 'help', 'assistance'],
      patterns: [
        /connect with broker/i,
        /find a broker/i,
        /talk to someone/i,
        /get help/i,
        /contact broker/i
      ],
      intent: 'connect_broker',
      parameters: {},
      canvasComponent: 'LeadGenModal'
    },
    
    // Amortization Intent
    {
      keywords: ['schedule', 'amortization', 'payment', 'payments', 'breakdown'],
      patterns: [
        /payment schedule/i,
        /amortization schedule/i,
        /payment breakdown/i,
        /monthly payments/i,
        /show schedule/i
      ],
      intent: 'generate_amortization',
      parameters: {},
      canvasComponent: 'AmortizationChart'
    }
  ]

  // Match intent from user input
  async matchIntent(userInput: string, context?: any): Promise<IntentMatch> {
    try {
      // First, try pattern matching for quick responses
      const patternMatch = this.matchPatterns(userInput)
      if (patternMatch.confidence > 0.8) {
        return patternMatch
      }

      // Use AI for more complex intent detection
      const aiMatch = await this.matchWithAI(userInput, context)
      if (aiMatch.confidence > patternMatch.confidence) {
        return aiMatch
      }

      return patternMatch
    } catch (error) {
      console.error('Intent matching error:', error)
      return {
        intent: 'general_advice',
        confidence: 0.5,
        parameters: {},
        suggestedAction: 'I can help you with mortgage calculations, rate comparisons, scenario analysis, and connecting with brokers. What would you like to know?'
      }
    }
  }

  // Pattern-based matching
  private matchPatterns(userInput: string): IntentMatch {
    let bestMatch: IntentMatch = {
      intent: 'general_advice',
      confidence: 0,
      parameters: {},
      suggestedAction: 'I can help you with mortgage-related questions. What would you like to know?'
    }

    for (const pattern of this.patterns) {
      // Check keyword matches
      const keywordMatches = pattern.keywords.filter(keyword => 
        userInput.toLowerCase().includes(keyword.toLowerCase())
      ).length

      // Check regex pattern matches
      const regexMatches = pattern.patterns.filter(regex => 
        regex.test(userInput)
      ).length

      // Calculate confidence score
      const keywordScore = keywordMatches / pattern.keywords.length
      const regexScore = regexMatches / pattern.patterns.length
      const confidence = Math.max(keywordScore, regexScore)

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          intent: pattern.intent,
          confidence,
          parameters: { ...pattern.parameters },
          suggestedAction: this.getSuggestedAction(pattern.intent),
          canvasComponent: pattern.canvasComponent
        }
      }
    }

    return bestMatch
  }

  // AI-powered intent matching
  private async matchWithAI(userInput: string, context?: any): Promise<IntentMatch> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an intent detection system for a mortgage application. Analyze the user input and determine their intent.

Available intents:
- calculate_affordability: User wants to calculate how much they can afford
- fetch_rates: User wants to see current mortgage rates
- compare_scenarios: User wants to compare different mortgage options
- analyze_refinance: User wants to analyze refinancing opportunities
- connect_broker: User wants to connect with a mortgage broker
- generate_amortization: User wants to see payment schedules
- general_advice: General mortgage questions or advice

Return a JSON response with:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "parameters": {},
  "reasoning": "brief explanation"
}`
          },
          {
            role: 'user',
            content: `User input: "${userInput}"${context ? `\nContext: ${JSON.stringify(context)}` : ''}`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        intent: result.intent || 'general_advice',
        confidence: result.confidence || 0.5,
        parameters: result.parameters || {},
        suggestedAction: this.getSuggestedAction(result.intent),
        canvasComponent: this.getCanvasComponent(result.intent)
      }
    } catch (error) {
      console.error('AI intent matching error:', error)
      return {
        intent: 'general_advice',
        confidence: 0.3,
        parameters: {},
        suggestedAction: 'I can help you with mortgage questions. What would you like to know?'
      }
    }
  }

  // Get suggested action based on intent
  private getSuggestedAction(intent: string): string {
    const actions = {
      calculate_affordability: 'I can help you calculate how much you can afford to borrow. Let me gather some information about your financial situation.',
      fetch_rates: 'I can show you current mortgage rates from verified lenders. Let me fetch the latest rates for you.',
      compare_scenarios: 'I can help you compare different mortgage scenarios. Let me analyze your options.',
      analyze_refinance: 'I can analyze whether refinancing makes sense for you. Let me check your current situation.',
      connect_broker: 'I can connect you with qualified mortgage brokers in your area. Let me find the best matches for you.',
      generate_amortization: 'I can generate a detailed payment schedule for your mortgage. Let me create that for you.',
      general_advice: 'I can help you with mortgage-related questions. What would you like to know?'
    }

    return actions[intent as keyof typeof actions] || actions.general_advice
  }

  // Get canvas component for intent
  private getCanvasComponent(intent: string): string | undefined {
    const components = {
      calculate_affordability: 'AffordabilityInputPanel',
      fetch_rates: 'RateComparisonTable',
      compare_scenarios: 'ScenarioComparisonChart',
      analyze_refinance: 'AmortizationChart',
      connect_broker: 'LeadGenModal',
      generate_amortization: 'AmortizationChart'
    }

    return components[intent as keyof typeof components]
  }

  // Extract parameters from user input
  async extractParameters(userInput: string, intent: string): Promise<Record<string, any>> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract relevant parameters from the user input for the ${intent} intent. Return a JSON object with the extracted parameters.`
          },
          {
            role: 'user',
            content: userInput
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      })

      return JSON.parse(response.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Parameter extraction error:', error)
      return {}
    }
  }

  // Get context-aware shortcuts
  getContextualShortcuts(context?: any): Array<{ label: string; intent: string; action: string }> {
    const shortcuts = [
      { label: "Can I afford a $600K home?", intent: "calculate_affordability", action: "calculate_affordability" },
      { label: "Show me current rates", intent: "fetch_rates", action: "fetch_rates" },
      { label: "Compare scenarios", intent: "compare_scenarios", action: "compare_scenarios" },
      { label: "Should I refinance?", intent: "analyze_refinance", action: "analyze_refinance" },
      { label: "Connect with broker", intent: "connect_broker", action: "connect_broker" }
    ]

    // Filter shortcuts based on context
    if (context?.hasAffordability) {
      shortcuts.push({ label: "Get current rates", intent: "fetch_rates", action: "fetch_rates" })
    }

    if (context?.hasRates) {
      shortcuts.push({ label: "Compare these rates", intent: "compare_scenarios", action: "compare_scenarios" })
    }

    return shortcuts
  }
}

// Export singleton instance
export const intentMatcher = new IntentMatcher()

// React hook for intent matching
export function useIntentMatching() {
  const matchIntent = async (userInput: string, context?: any) => {
    return await intentMatcher.matchIntent(userInput, context)
  }

  const extractParameters = async (userInput: string, intent: string) => {
    return await intentMatcher.extractParameters(userInput, intent)
  }

  const getShortcuts = (context?: any) => {
    return intentMatcher.getContextualShortcuts(context)
  }

  return {
    matchIntent,
    extractParameters,
    getShortcuts
  }
}
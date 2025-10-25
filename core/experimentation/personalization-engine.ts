import { z } from 'zod'
import { trackEvent, identifyUser } from '../analytics'
import { supabaseAdmin } from '../supabase'
import { openai } from '../openai'

// Personalization schemas
export const UserProfileSchema = z.object({
  userId: z.string(),
  segments: z.array(z.string()),
  attributes: z.record(z.any()),
  preferences: z.record(z.any()),
  behaviorPatterns: z.record(z.any()),
  lastUpdated: z.string()
})

export const PersonalizationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  conditions: z.array(z.object({
    attribute: z.string(),
    operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'in', 'notIn', 'exists', 'notExists']),
    value: z.any()
  })),
  actions: z.array(z.object({
    type: z.enum(['content_personalization', 'ui_adaptation', 'feature_enablement', 'pricing_adjustment', 'recommendation_engine']),
    config: z.record(z.any())
  })),
  priority: z.number(),
  enabled: z.boolean()
})

export const ContentPersonalizationSchema = z.object({
  userId: z.string(),
  contentType: z.enum(['mortgage_advice', 'rate_display', 'onboarding_flow', 'cta_text', 'pricing_page', 'dashboard_layout']),
  personalizedContent: z.record(z.any()),
  personalizationFactors: z.record(z.any()),
  effectiveness: z.number().min(0).max(1),
  lastUpdated: z.string()
})

export type UserProfile = z.infer<typeof UserProfileSchema>
export type PersonalizationRule = z.infer<typeof PersonalizationRuleSchema>
export type ContentPersonalization = z.infer<typeof ContentPersonalizationSchema>

// User segmentation types
export const USER_SEGMENTS = {
  FIRST_TIME_BUYER: 'first_time_buyer',
  REFINANCER: 'refinancer',
  INVESTOR: 'investor',
  BROKER: 'broker',
  HIGH_INCOME: 'high_income',
  LOW_INCOME: 'low_income',
  URBAN: 'urban',
  RURAL: 'rural',
  TECH_SAVVY: 'tech_savvy',
  TRADITIONAL: 'traditional'
} as const

export const PERSONALIZATION_FACTORS = {
  LOCATION: 'location',
  INCOME: 'income',
  PROPERTY_TYPE: 'property_type',
  TIMELINE: 'timeline',
  RISK_TOLERANCE: 'risk_tolerance',
  COMMUNICATION_STYLE: 'communication_style',
  FEATURE_USAGE: 'feature_usage',
  ENGAGEMENT_LEVEL: 'engagement_level'
} as const

export class PersonalizationEngine {
  private userProfiles: Map<string, UserProfile> = new Map()
  private personalizationRules: Map<string, PersonalizationRule> = new Map()
  private contentCache: Map<string, ContentPersonalization> = new Map()

  constructor() {
    this.loadPersonalizationRules()
  }

  /**
   * Update user profile with new data
   */
  async updateUserProfile(
    userId: string,
    attributes: Record<string, any>,
    behaviorData?: Record<string, any>
  ): Promise<void> {
    try {
      // Get existing profile
      let profile = this.userProfiles.get(userId) || {
        userId,
        segments: [],
        attributes: {},
        preferences: {},
        behaviorPatterns: {},
        lastUpdated: new Date().toISOString()
      }

      // Update attributes
      profile.attributes = { ...profile.attributes, ...attributes }
      
      // Update behavior patterns
      if (behaviorData) {
        profile.behaviorPatterns = { ...profile.behaviorPatterns, ...behaviorData }
      }

      // Recalculate segments
      profile.segments = await this.calculateUserSegments(profile)
      
      // Update preferences
      profile.preferences = await this.calculateUserPreferences(profile)
      
      // Update timestamp
      profile.lastUpdated = new Date().toISOString()

      // Store in database
      await supabaseAdmin
        .from('user_profiles')
        .upsert(profile)

      // Update local cache
      this.userProfiles.set(userId, profile)

      // Track profile update
      trackEvent('user_profile_updated', {
        user_id: userId,
        segments: profile.segments,
        attributes_updated: Object.keys(attributes)
      })
    } catch (error) {
      console.error('Error updating user profile:', error)
    }
  }

  /**
   * Get personalized content for a user
   */
  async getPersonalizedContent(
    userId: string,
    contentType: string,
    context: Record<string, any> = {}
  ): Promise<any> {
    try {
      const profile = await this.getUserProfile(userId)
      if (!profile) {
        return this.getDefaultContent(contentType)
      }

      // Check cache first
      const cacheKey = `${userId}_${contentType}`
      const cached = this.contentCache.get(cacheKey)
      if (cached && this.isCacheValid(cached)) {
        return cached.personalizedContent
      }

      // Apply personalization rules
      const personalizedContent = await this.applyPersonalizationRules(
        profile,
        contentType,
        context
      )

      // Store in cache
      const contentPersonalization: ContentPersonalization = {
        userId,
        contentType: contentType as any,
        personalizedContent,
        personalizationFactors: this.extractPersonalizationFactors(profile, context),
        effectiveness: 0, // Will be calculated based on user feedback
        lastUpdated: new Date().toISOString()
      }

      this.contentCache.set(cacheKey, contentPersonalization)

      return personalizedContent
    } catch (error) {
      console.error('Error getting personalized content:', error)
      return this.getDefaultContent(contentType)
    }
  }

  /**
   * Personalize mortgage advice based on user profile
   */
  async personalizeMortgageAdvice(
    userId: string,
    scenario: string,
    context: Record<string, any> = {}
  ): Promise<{
    advice: string
    tone: string
    examples: string[]
    recommendations: string[]
  }> {
    try {
      const profile = await this.getUserProfile(userId)
      if (!profile) {
        return this.getDefaultMortgageAdvice(scenario)
      }

      // Generate personalized advice using AI
      const personalizedAdvice = await this.generatePersonalizedAdvice(profile, scenario, context)

      // Track personalization
      trackEvent('mortgage_advice_personalized', {
        user_id: userId,
        scenario,
        personalization_factors: this.extractPersonalizationFactors(profile, context)
      })

      return personalizedAdvice
    } catch (error) {
      console.error('Error personalizing mortgage advice:', error)
      return this.getDefaultMortgageAdvice(scenario)
    }
  }

  /**
   * Personalize rate display based on user preferences
   */
  async personalizeRateDisplay(
    userId: string,
    rates: any[],
    context: Record<string, any> = {}
  ): Promise<{
    filteredRates: any[]
    preferredLenders: string[]
    displayOrder: string[]
    highlights: Record<string, any>
  }> {
    try {
      const profile = await this.getUserProfile(userId)
      if (!profile) {
        return {
          filteredRates: rates,
          preferredLenders: [],
          displayOrder: ['rate', 'apr', 'payment'],
          highlights: {}
        }
      }

      // Filter rates based on user preferences
      const filteredRates = this.filterRatesByPreferences(rates, profile)
      
      // Determine preferred lenders
      const preferredLenders = this.getPreferredLenders(profile)
      
      // Determine display order
      const displayOrder = this.getDisplayOrder(profile)
      
      // Determine highlights
      const highlights = this.getRateHighlights(profile, filteredRates)

      return {
        filteredRates,
        preferredLenders,
        displayOrder,
        highlights
      }
    } catch (error) {
      console.error('Error personalizing rate display:', error)
      return {
        filteredRates: rates,
        preferredLenders: [],
        displayOrder: ['rate', 'apr', 'payment'],
        highlights: {}
      }
    }
  }

  /**
   * Predict next user action and prepare contextual UI
   */
  async predictNextAction(
    userId: string,
    currentContext: Record<string, any>
  ): Promise<{
    predictedAction: string
    confidence: number
    contextualUI: any
    recommendations: string[]
  }> {
    try {
      const profile = await this.getUserProfile(userId)
      if (!profile) {
        return {
          predictedAction: 'explore_rates',
          confidence: 0.5,
          contextualUI: {},
          recommendations: []
        }
      }

      // Use AI to predict next action
      const prediction = await this.generateActionPrediction(profile, currentContext)
      
      // Generate contextual UI based on prediction
      const contextualUI = await this.generateContextualUI(prediction, profile)
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(profile, prediction)

      return {
        predictedAction: prediction.action,
        confidence: prediction.confidence,
        contextualUI,
        recommendations
      }
    } catch (error) {
      console.error('Error predicting next action:', error)
      return {
        predictedAction: 'explore_rates',
        confidence: 0.5,
        contextualUI: {},
        recommendations: []
      }
    }
  }

  /**
   * Create personalization rule
   */
  async createPersonalizationRule(rule: PersonalizationRule): Promise<string> {
    try {
      const validatedRule = PersonalizationRuleSchema.parse(rule)
      
      // Store in database
      const { data, error } = await supabaseAdmin
        .from('personalization_rules')
        .insert(validatedRule)
        .select()
        .single()

      if (error) throw error

      // Add to local cache
      this.personalizationRules.set(validatedRule.id, validatedRule)

      return data.id
    } catch (error) {
      console.error('Error creating personalization rule:', error)
      throw error
    }
  }

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Check cache first
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!
    }

    // Load from database
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      this.userProfiles.set(userId, data)
      return data
    }

    return null
  }

  private async calculateUserSegments(profile: UserProfile): Promise<string[]> {
    const segments: string[] = []

    // Income-based segmentation
    if (profile.attributes.income) {
      if (profile.attributes.income > 100000) {
        segments.push(USER_SEGMENTS.HIGH_INCOME)
      } else if (profile.attributes.income < 50000) {
        segments.push(USER_SEGMENTS.LOW_INCOME)
      }
    }

    // Location-based segmentation
    if (profile.attributes.location) {
      const location = profile.attributes.location.toLowerCase()
      if (location.includes('city') || location.includes('urban')) {
        segments.push(USER_SEGMENTS.URBAN)
      } else {
        segments.push(USER_SEGMENTS.RURAL)
      }
    }

    // Behavior-based segmentation
    if (profile.behaviorPatterns.featureUsage) {
      const featureCount = Object.keys(profile.behaviorPatterns.featureUsage).length
      if (featureCount > 5) {
        segments.push(USER_SEGMENTS.TECH_SAVVY)
      } else {
        segments.push(USER_SEGMENTS.TRADITIONAL)
      }
    }

    // Goal-based segmentation
    if (profile.attributes.goal) {
      switch (profile.attributes.goal) {
        case 'first_home':
          segments.push(USER_SEGMENTS.FIRST_TIME_BUYER)
          break
        case 'refinance':
          segments.push(USER_SEGMENTS.REFINANCER)
          break
        case 'investment':
          segments.push(USER_SEGMENTS.INVESTOR)
          break
      }
    }

    return segments
  }

  private async calculateUserPreferences(profile: UserProfile): Promise<Record<string, any>> {
    const preferences: Record<string, any> = {}

    // Communication style preference
    if (profile.segments.includes(USER_SEGMENTS.TECH_SAVVY)) {
      preferences.communicationStyle = 'detailed'
      preferences.uiDensity = 'compact'
    } else {
      preferences.communicationStyle = 'simple'
      preferences.uiDensity = 'spacious'
    }

    // Content preference based on segments
    if (profile.segments.includes(USER_SEGMENTS.FIRST_TIME_BUYER)) {
      preferences.contentType = 'educational'
      preferences.examples = 'basic'
    } else if (profile.segments.includes(USER_SEGMENTS.INVESTOR)) {
      preferences.contentType = 'analytical'
      preferences.examples = 'advanced'
    }

    // Risk tolerance
    if (profile.attributes.riskTolerance) {
      preferences.riskTolerance = profile.attributes.riskTolerance
    } else {
      preferences.riskTolerance = 'moderate'
    }

    return preferences
  }

  private async applyPersonalizationRules(
    profile: UserProfile,
    contentType: string,
    context: Record<string, any>
  ): Promise<any> {
    const applicableRules = Array.from(this.personalizationRules.values())
      .filter(rule => rule.enabled && this.matchesConditions(rule.conditions, profile, context))
      .sort((a, b) => b.priority - a.priority)

    let personalizedContent = this.getDefaultContent(contentType)

    for (const rule of applicableRules) {
      for (const action of rule.actions) {
        personalizedContent = await this.applyAction(action, personalizedContent, profile, context)
      }
    }

    return personalizedContent
  }

  private matchesConditions(
    conditions: any[],
    profile: UserProfile,
    context: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const value = this.getAttributeValue(condition.attribute, profile, context)
      return this.evaluateCondition(value, condition.operator, condition.value)
    })
  }

  private getAttributeValue(attribute: string, profile: UserProfile, context: Record<string, any>): any {
    if (attribute.startsWith('profile.')) {
      const key = attribute.substring(8)
      return profile.attributes[key] || profile.behaviorPatterns[key]
    } else if (attribute.startsWith('context.')) {
      const key = attribute.substring(8)
      return context[key]
    } else {
      return profile.attributes[attribute]
    }
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue
      case 'contains':
        return String(value).includes(String(expectedValue))
      case 'startsWith':
        return String(value).startsWith(String(expectedValue))
      case 'endsWith':
        return String(value).endsWith(String(expectedValue))
      case 'greaterThan':
        return Number(value) > Number(expectedValue)
      case 'lessThan':
        return Number(value) < Number(expectedValue)
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(value)
      case 'notIn':
        return Array.isArray(expectedValue) && !expectedValue.includes(value)
      case 'exists':
        return value !== undefined && value !== null
      case 'notExists':
        return value === undefined || value === null
      default:
        return false
    }
  }

  private async applyAction(
    action: any,
    content: any,
    profile: UserProfile,
    context: Record<string, any>
  ): Promise<any> {
    switch (action.type) {
      case 'content_personalization':
        return this.personalizeContent(content, action.config, profile)
      case 'ui_adaptation':
        return this.adaptUI(content, action.config, profile)
      case 'feature_enablement':
        return this.enableFeatures(content, action.config, profile)
      case 'pricing_adjustment':
        return this.adjustPricing(content, action.config, profile)
      case 'recommendation_engine':
        return this.addRecommendations(content, action.config, profile)
      default:
        return content
    }
  }

  private async generatePersonalizedAdvice(
    profile: UserProfile,
    scenario: string,
    context: Record<string, any>
  ): Promise<any> {
    const prompt = `
      Generate personalized mortgage advice for this user:
      
      User Profile:
      - Segments: ${profile.segments.join(', ')}
      - Income: ${profile.attributes.income || 'Not specified'}
      - Location: ${profile.attributes.location || 'Not specified'}
      - Risk Tolerance: ${profile.attributes.riskTolerance || 'moderate'}
      - Communication Style: ${profile.preferences.communicationStyle || 'simple'}
      
      Scenario: ${scenario}
      
      Provide advice that is:
      1. Tailored to their specific situation
      2. Written in their preferred communication style
      3. Includes relevant examples for their segment
      4. Provides actionable recommendations
      
      Return as JSON with advice, tone, examples, and recommendations fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })

      return JSON.parse(completion.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Error generating personalized advice:', error)
      return this.getDefaultMortgageAdvice(scenario)
    }
  }

  private getDefaultContent(contentType: string): any {
    const defaultContent = {
      mortgage_advice: {
        advice: 'Please provide more details about your mortgage needs.',
        tone: 'professional',
        examples: [],
        recommendations: []
      },
      rate_display: {
        layout: 'cards',
        sortBy: 'rate',
        highlights: {}
      },
      onboarding_flow: {
        steps: ['welcome', 'goals', 'budget', 'demo'],
        order: 'sequential'
      },
      cta_text: {
        primary: 'Get Started',
        secondary: 'Learn More'
      },
      pricing_page: {
        layout: 'cards',
        highlight: 'most_popular'
      },
      dashboard_layout: {
        layout: 'standard',
        widgets: ['affordability', 'rates', 'scenarios']
      }
    }

    return defaultContent[contentType] || {}
  }

  private getDefaultMortgageAdvice(scenario: string): any {
    return {
      advice: `Based on your scenario: ${scenario}, I recommend consulting with a mortgage professional for personalized guidance.`,
      tone: 'professional',
      examples: [],
      recommendations: ['Speak with a mortgage broker', 'Get pre-approved', 'Compare rates from multiple lenders']
    }
  }

  private filterRatesByPreferences(rates: any[], profile: UserProfile): any[] {
    // Filter rates based on user preferences
    let filteredRates = [...rates]

    // Filter by preferred lenders if specified
    if (profile.preferences.preferredLenders) {
      filteredRates = filteredRates.filter(rate => 
        profile.preferences.preferredLenders.includes(rate.lender)
      )
    }

    // Filter by rate type if specified
    if (profile.preferences.rateType) {
      filteredRates = filteredRates.filter(rate => 
        rate.type === profile.preferences.rateType
      )
    }

    return filteredRates
  }

  private getPreferredLenders(profile: UserProfile): string[] {
    return profile.preferences.preferredLenders || []
  }

  private getDisplayOrder(profile: UserProfile): string[] {
    if (profile.segments.includes(USER_SEGMENTS.TECH_SAVVY)) {
      return ['rate', 'apr', 'payment', 'features']
    } else {
      return ['rate', 'payment', 'apr', 'features']
    }
  }

  private getRateHighlights(profile: UserProfile, rates: any[]): Record<string, any> {
    const highlights: Record<string, any> = {}

    if (rates.length > 0) {
      const lowestRate = Math.min(...rates.map(r => r.rate))
      const lowestRateLender = rates.find(r => r.rate === lowestRate)
      
      highlights.lowestRate = {
        lender: lowestRateLender?.lender,
        rate: lowestRate
      }
    }

    return highlights
  }

  private async generateActionPrediction(
    profile: UserProfile,
    context: Record<string, any>
  ): Promise<any> {
    // Use AI to predict next action based on user behavior patterns
    const prompt = `
      Predict the next most likely action for this user:
      
      User Profile:
      - Segments: ${profile.segments.join(', ')}
      - Recent Activity: ${JSON.stringify(profile.behaviorPatterns.recentActivity || {})}
      - Feature Usage: ${JSON.stringify(profile.behaviorPatterns.featureUsage || {})}
      
      Current Context:
      - Page: ${context.page || 'unknown'}
      - Action: ${context.action || 'unknown'}
      - Time on Page: ${context.timeOnPage || 0}
      
      Predict the next action and confidence level (0-1).
      Return as JSON with action and confidence fields.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      })

      return JSON.parse(completion.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Error generating action prediction:', error)
      return { action: 'explore_rates', confidence: 0.5 }
    }
  }

  private async generateContextualUI(prediction: any, profile: UserProfile): Promise<any> {
    // Generate contextual UI based on predicted action
    const contextualUI = {
      suggestedActions: [],
      highlightedFeatures: [],
      personalizedContent: {}
    }

    switch (prediction.action) {
      case 'calculate_affordability':
        contextualUI.suggestedActions = ['Use Affordability Calculator', 'Enter Income Details']
        contextualUI.highlightedFeatures = ['affordability_calculator']
        break
      case 'compare_rates':
        contextualUI.suggestedActions = ['View Rate Comparison', 'Filter by Lender']
        contextualUI.highlightedFeatures = ['rate_comparison', 'rate_filters']
        break
      case 'save_scenario':
        contextualUI.suggestedActions = ['Save Current Scenario', 'Create New Scenario']
        contextualUI.highlightedFeatures = ['scenario_saver']
        break
    }

    return contextualUI
  }

  private async generateRecommendations(profile: UserProfile, prediction: any): Promise<string[]> {
    const recommendations: string[] = []

    if (profile.segments.includes(USER_SEGMENTS.FIRST_TIME_BUYER)) {
      recommendations.push('Get pre-approved before house hunting')
      recommendations.push('Consider first-time buyer programs')
    }

    if (profile.segments.includes(USER_SEGMENTS.REFINANCER)) {
      recommendations.push('Check if refinancing makes sense for your situation')
      recommendations.push('Compare current rate with market rates')
    }

    if (profile.segments.includes(USER_SEGMENTS.HIGH_INCOME)) {
      recommendations.push('Consider jumbo loan options')
      recommendations.push('Explore premium lender programs')
    }

    return recommendations
  }

  private extractPersonalizationFactors(profile: UserProfile, context: Record<string, any>): Record<string, any> {
    return {
      segments: profile.segments,
      keyAttributes: Object.keys(profile.attributes),
      preferences: Object.keys(profile.preferences),
      contextKeys: Object.keys(context)
    }
  }

  private isCacheValid(cached: ContentPersonalization): boolean {
    const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime()
    return cacheAge < 30 * 60 * 1000 // 30 minutes
  }

  private async loadPersonalizationRules(): Promise<void> {
    const { data } = await supabaseAdmin
      .from('personalization_rules')
      .select('*')
      .eq('enabled', true)

    if (data) {
      data.forEach(rule => {
        this.personalizationRules.set(rule.id, rule)
      })
    }
  }

  // Action implementations
  private personalizeContent(content: any, config: any, profile: UserProfile): any {
    // Implement content personalization logic
    return content
  }

  private adaptUI(content: any, config: any, profile: UserProfile): any {
    // Implement UI adaptation logic
    return content
  }

  private enableFeatures(content: any, config: any, profile: UserProfile): any {
    // Implement feature enablement logic
    return content
  }

  private adjustPricing(content: any, config: any, profile: UserProfile): any {
    // Implement pricing adjustment logic
    return content
  }

  private addRecommendations(content: any, config: any, profile: UserProfile): any {
    // Implement recommendation engine logic
    return content
  }
}

// Singleton instance
export const personalizationEngine = new PersonalizationEngine()
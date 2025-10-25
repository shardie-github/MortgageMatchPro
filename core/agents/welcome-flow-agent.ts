import { supabaseAdmin } from '../supabase'
import { trackEvent, identifyUser } from '../analytics'
import { openai } from '../openai'

export interface UserGoal {
  type: 'buy_home' | 'refinance' | 'investment' | 'compare_lenders' | 'get_pre_approval'
  timeline: 'immediate' | '3_months' | '6_months' | '1_year' | 'flexible'
  budget?: number
  location?: string
  property_type?: 'single_family' | 'condo' | 'townhouse' | 'multi_family'
  priority?: string[]
}

export interface OnboardingStep {
  id: string
  title: string
  description: string
  type: 'question' | 'tutorial' | 'demo' | 'setup'
  content: any
  required: boolean
  order: number
}

export interface OnboardingFlow {
  id: string
  flowType: 'first_time_homebuyer' | 'broker' | 'refinance' | 'investment' | 'custom'
  steps: OnboardingStep[]
  userGoals: UserGoal[]
  personalizationFactors: Record<string, any>
}

export class WelcomeFlowAgent {
  private userId: string
  private userEmail: string
  private userSegment: string

  constructor(userId: string, userEmail: string, userSegment: string = 'homebuyer') {
    this.userId = userId
    this.userEmail = userEmail
    this.userSegment = userSegment
  }

  /**
   * Initialize the onboarding flow for a new user
   */
  async initializeOnboarding(): Promise<OnboardingFlow> {
    try {
      // Determine flow type based on user segment and behavior
      const flowType = await this.determineFlowType()
      
      // Generate personalized steps using AI
      const steps = await this.generatePersonalizedSteps(flowType)
      
      // Collect user goals through interactive questions
      const userGoals = await this.collectUserGoals()
      
      // Create onboarding flow record
      const { data: flowData, error } = await supabaseAdmin
        .from('user_onboarding_flows')
        .insert({
          user_id: this.userId,
          flow_type: flowType,
          total_steps: steps.length,
          user_goals: userGoals,
          preferences: {},
          completion_percentage: 0.00
        })
        .select()
        .single()

      if (error) throw error

      // Track onboarding start
      trackEvent('onboarding_started', {
        user_id: this.userId,
        flow_type: flowType,
        step_count: steps.length,
        user_segment: this.userSegment
      })

      return {
        id: flowData.id,
        flowType,
        steps,
        userGoals,
        personalizationFactors: {}
      }
    } catch (error) {
      console.error('Error initializing onboarding:', error)
      throw new Error('Failed to initialize onboarding flow')
    }
  }

  /**
   * Process user response to an onboarding step
   */
  async processStepResponse(stepId: string, response: any): Promise<{
    nextStep?: OnboardingStep
    isComplete: boolean
    recommendations?: string[]
  }> {
    try {
      // Update step completion
      await this.updateStepCompletion(stepId, response)
      
      // Analyze response for personalization
      const personalizationData = await this.analyzeResponse(stepId, response)
      
      // Update user preferences
      await this.updateUserPreferences(personalizationData)
      
      // Determine next step
      const nextStep = await this.determineNextStep(stepId, response)
      
      // Check if onboarding is complete
      const isComplete = await this.checkOnboardingComplete()
      
      // Generate recommendations if needed
      const recommendations = isComplete ? await this.generateRecommendations() : undefined

      // Track step completion
      trackEvent('onboarding_step_completed', {
        user_id: this.userId,
        step_id: stepId,
        response_type: typeof response,
        is_complete: isComplete
      })

      return {
        nextStep,
        isComplete,
        recommendations
      }
    } catch (error) {
      console.error('Error processing step response:', error)
      throw new Error('Failed to process step response')
    }
  }

  /**
   * Generate contextual tooltips and help content
   */
  async generateContextualHelp(feature: string, context: any): Promise<{
    tooltip: string
    walkthrough?: any
    qa?: Array<{ question: string; answer: string }>
  }> {
    try {
      const prompt = `
        Generate contextual help for a mortgage platform user.
        Feature: ${feature}
        Context: ${JSON.stringify(context)}
        User Segment: ${this.userSegment}
        
        Provide:
        1. A helpful tooltip (max 100 characters)
        2. Optional walkthrough steps if complex
        3. 2-3 common Q&A pairs
        
        Format as JSON.
      `

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })

      const helpContent = JSON.parse(completion.choices[0].message.content || '{}')
      
      // Store in personalized content
      await supabaseAdmin
        .from('personalized_content')
        .insert({
          user_id: this.userId,
          content_type: 'tooltip',
          content_key: feature,
          content_data: helpContent,
          personalization_factors: { user_segment: this.userSegment, context }
        })

      return helpContent
    } catch (error) {
      console.error('Error generating contextual help:', error)
      return {
        tooltip: 'Click here for more information',
        qa: []
      }
    }
  }

  /**
   * Detect drop-off points and adjust flow dynamically
   */
  async detectDropOff(): Promise<{
    hasDropOff: boolean
    dropOffStep?: string
    suggestions: string[]
  }> {
    try {
      const { data: flowData } = await supabaseAdmin
        .from('user_onboarding_flows')
        .select('*')
        .eq('user_id', this.userId)
        .single()

      if (!flowData) {
        return { hasDropOff: false, suggestions: [] }
      }

      const timeSinceLastActivity = Date.now() - new Date(flowData.last_activity_at).getTime()
      const hasDropOff = timeSinceLastActivity > 24 * 60 * 60 * 1000 // 24 hours

      if (hasDropOff) {
        // Analyze drop-off patterns using AI
        const suggestions = await this.generateDropOffSuggestions(flowData)
        
        // Update drop-off tracking
        await supabaseAdmin
          .from('user_onboarding_flows')
          .update({
            drop_off_points: [...(flowData.drop_off_points || []), {
              step: flowData.current_step,
              timestamp: new Date().toISOString(),
              time_since_last_activity: timeSinceLastActivity
            }]
          })
          .eq('id', flowData.id)

        return {
          hasDropOff: true,
          dropOffStep: flowData.current_step.toString(),
          suggestions
        }
      }

      return { hasDropOff: false, suggestions: [] }
    } catch (error) {
      console.error('Error detecting drop-off:', error)
      return { hasDropOff: false, suggestions: [] }
    }
  }

  private async determineFlowType(): Promise<string> {
    // Use AI to determine the best flow type based on user data
    const prompt = `
      Determine the best onboarding flow for a mortgage platform user.
      User email: ${this.userEmail}
      User segment: ${this.userSegment}
      
      Available flows:
      - first_time_homebuyer: New to home buying
      - broker: Mortgage broker/agent
      - refinance: Looking to refinance existing mortgage
      - investment: Real estate investor
      - custom: Specialized needs
      
      Return only the flow type name.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 50
      })

      return completion.choices[0].message.content?.trim() || 'first_time_homebuyer'
    } catch (error) {
      console.error('Error determining flow type:', error)
      return 'first_time_homebuyer'
    }
  }

  private async generatePersonalizedSteps(flowType: string): Promise<OnboardingStep[]> {
    const baseSteps = {
      first_time_homebuyer: [
        {
          id: 'welcome',
          title: 'Welcome to MortgageMatch Pro!',
          description: 'Let\'s get you started on your home buying journey',
          type: 'tutorial',
          content: { video: '/tutorials/welcome.mp4' },
          required: true,
          order: 1
        },
        {
          id: 'goals',
          title: 'What are your home buying goals?',
          description: 'Help us personalize your experience',
          type: 'question',
          content: {
            type: 'multiple_choice',
            options: [
              'Buy my first home',
              'Upgrade to a larger home',
              'Downsize',
              'Investment property',
              'Refinance existing mortgage'
            ]
          },
          required: true,
          order: 2
        },
        {
          id: 'budget',
          title: 'What\'s your budget range?',
          description: 'This helps us show you relevant properties and rates',
          type: 'question',
          content: {
            type: 'slider',
            min: 200000,
            max: 2000000,
            step: 25000
          },
          required: true,
          order: 3
        },
        {
          id: 'affordability_demo',
          title: 'Try our affordability calculator',
          description: 'See how much you can afford to borrow',
          type: 'demo',
          content: { feature: 'affordability_calculator' },
          required: false,
          order: 4
        }
      ],
      broker: [
        {
          id: 'broker_welcome',
          title: 'Welcome, Broker!',
          description: 'Set up your white-label mortgage platform',
          type: 'tutorial',
          content: { video: '/tutorials/broker-welcome.mp4' },
          required: true,
          order: 1
        },
        {
          id: 'company_setup',
          title: 'Company Information',
          description: 'Tell us about your brokerage',
          type: 'question',
          content: {
            type: 'form',
            fields: ['company_name', 'license_number', 'provinces_states', 'commission_rate']
          },
          required: true,
          order: 2
        },
        {
          id: 'white_label_demo',
          title: 'Customize your platform',
          description: 'Set up your branding and domain',
          type: 'demo',
          content: { feature: 'white_label_setup' },
          required: true,
          order: 3
        },
        {
          id: 'lead_dashboard_demo',
          title: 'Lead Management Dashboard',
          description: 'Learn how to manage your leads',
          type: 'demo',
          content: { feature: 'lead_dashboard' },
          required: false,
          order: 4
        }
      ]
    }

    return baseSteps[flowType as keyof typeof baseSteps] || baseSteps.first_time_homebuyer
  }

  private async collectUserGoals(): Promise<UserGoal[]> {
    // This would be populated through the interactive onboarding steps
    return []
  }

  private async updateStepCompletion(stepId: string, response: any): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_onboarding_flows')
      .update({
        completed_steps: supabaseAdmin.raw(`completed_steps || '["${stepId}"]'::jsonb`),
        current_step: supabaseAdmin.raw('current_step + 1'),
        last_activity_at: new Date().toISOString()
      })
      .eq('user_id', this.userId)

    if (error) throw error
  }

  private async analyzeResponse(stepId: string, response: any): Promise<Record<string, any>> {
    // Use AI to analyze user responses for personalization insights
    const prompt = `
      Analyze this user response for personalization insights:
      Step: ${stepId}
      Response: ${JSON.stringify(response)}
      User Segment: ${this.userSegment}
      
      Extract:
      - User preferences
      - Behavioral patterns
      - Personalization opportunities
      
      Return as JSON.
    `

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 300
      })

      return JSON.parse(completion.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Error analyzing response:', error)
      return {}
    }
  }

  private async updateUserPreferences(data: Record<string, any>): Promise<void> {
    await supabaseAdmin
      .from('user_onboarding_flows')
      .update({
        preferences: supabaseAdmin.raw(`preferences || '${JSON.stringify(data)}'::jsonb`)
      })
      .eq('user_id', this.userId)
  }

  private async determineNextStep(currentStepId: string, response: any): Promise<OnboardingStep | undefined> {
    // Logic to determine the next step based on current step and response
    // This would be implemented based on the specific flow logic
    return undefined
  }

  private async checkOnboardingComplete(): Promise<boolean> {
    const { data: flowData } = await supabaseAdmin
      .from('user_onboarding_flows')
      .select('current_step, total_steps')
      .eq('user_id', this.userId)
      .single()

    return flowData ? flowData.current_step >= flowData.total_steps : false
  }

  private async generateRecommendations(): Promise<string[]> {
    // Generate personalized recommendations based on user goals and preferences
    return [
      'Start by calculating your affordability',
      'Check current mortgage rates',
      'Connect with local brokers',
      'Save your scenarios for comparison'
    ]
  }

  private async generateDropOffSuggestions(flowData: any): Promise<string[]> {
    return [
      'Complete your profile to get personalized recommendations',
      'Try our quick affordability calculator',
      'Browse current mortgage rates in your area',
      'Connect with a mortgage expert for guidance'
    ]
  }
}
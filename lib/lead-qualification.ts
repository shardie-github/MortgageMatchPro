import { z } from 'zod'
import { supabaseAdmin } from './supabase'

// Lead qualification scoring criteria
export const LEAD_SCORING_CRITERIA = {
  INCOME_THRESHOLD: 75000,
  INCOME_SCORE: 20,
  DOWN_PAYMENT_PERCENTAGE: 20,
  DOWN_PAYMENT_SCORE: 25,
  CREDIT_SCORE_THRESHOLD: 700,
  CREDIT_SCORE_SCORE: 30,
  TDS_THRESHOLD: 35,
  TDS_SCORE: 10,
  SALARIED_EMPLOYMENT_SCORE: 15,
} as const

// Lead routing tiers
export const LEAD_ROUTING_TIERS = {
  PREMIUM: { minScore: 70, maxScore: 100, label: 'Premium Lenders' },
  STANDARD: { minScore: 50, maxScore: 69, label: 'National Broker Pool' },
  COACHING: { minScore: 0, maxScore: 49, label: 'Financial Coaching' },
} as const

export interface LeadQualificationInput {
  name: string
  email: string
  phone: string
  propertyValue: number
  downPayment: number
  income: number
  employmentType: 'salaried' | 'self-employed' | 'contract' | 'unemployed'
  creditScore: number
  preferredLender?: string
  additionalInfo?: string
  consentToShare: boolean
  consentToContact: boolean
}

export interface LeadQualificationResult {
  leadId: string
  leadScore: number
  qualificationTier: keyof typeof LEAD_ROUTING_TIERS
  brokerRecommendations: BrokerRecommendation[]
  routingDecision: string
  nextSteps: string[]
  disclaimers: string[]
}

export interface BrokerRecommendation {
  brokerId: string
  name: string
  company: string
  phone: string
  email: string
  commissionRate: number
  matchReason: string
  tier: 'premium' | 'standard' | 'coaching'
}

export class LeadQualificationService {
  /**
   * Calculate lead score based on defined criteria
   */
  calculateLeadScore(input: LeadQualificationInput): number {
    let score = 0

    // Income scoring
    if (input.income > LEAD_SCORING_CRITERIA.INCOME_THRESHOLD) {
      score += LEAD_SCORING_CRITERIA.INCOME_SCORE
    }

    // Down payment percentage scoring
    const downPaymentPercentage = (input.downPayment / input.propertyValue) * 100
    if (downPaymentPercentage >= LEAD_SCORING_CRITERIA.DOWN_PAYMENT_PERCENTAGE) {
      score += LEAD_SCORING_CRITERIA.DOWN_PAYMENT_SCORE
    }

    // Credit score scoring
    if (input.creditScore >= LEAD_SCORING_CRITERIA.CREDIT_SCORE_THRESHOLD) {
      score += LEAD_SCORING_CRITERIA.CREDIT_SCORE_SCORE
    }

    // TDS calculation and scoring
    const monthlyIncome = input.income / 12
    const monthlyDebts = this.estimateMonthlyDebts(input.income, input.propertyValue, input.downPayment)
    const tdsRatio = (monthlyDebts / monthlyIncome) * 100
    
    if (tdsRatio < LEAD_SCORING_CRITERIA.TDS_THRESHOLD) {
      score += LEAD_SCORING_CRITERIA.TDS_SCORE
    }

    // Employment type scoring
    if (input.employmentType === 'salaried') {
      score += LEAD_SCORING_CRITERIA.SALARIED_EMPLOYMENT_SCORE
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Estimate monthly debt payments for TDS calculation
   */
  private estimateMonthlyDebts(income: number, propertyValue: number, downPayment: number): number {
    const mortgageAmount = propertyValue - downPayment
    const interestRate = 0.06 // Assume 6% for estimation
    const termYears = 25
    
    // Calculate monthly mortgage payment
    const monthlyRate = interestRate / 12
    const numPayments = termYears * 12
    const monthlyPayment = mortgageAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1)
    
    // Add estimated property taxes, insurance, and other debts (simplified)
    const propertyTaxes = (propertyValue * 0.01) / 12 // 1% annually
    const insurance = 100 // Estimated monthly insurance
    const otherDebts = income * 0.05 / 12 // Assume 5% of income for other debts
    
    return monthlyPayment + propertyTaxes + insurance + otherDebts
  }

  /**
   * Determine qualification tier based on score
   */
  getQualificationTier(score: number): keyof typeof LEAD_ROUTING_TIERS {
    if (score >= LEAD_ROUTING_TIERS.PREMIUM.minScore) return 'PREMIUM'
    if (score >= LEAD_ROUTING_TIERS.STANDARD.minScore) return 'STANDARD'
    return 'COACHING'
  }

  /**
   * Get broker recommendations based on qualification tier
   */
  async getBrokerRecommendations(
    tier: keyof typeof LEAD_ROUTING_TIERS,
    preferredLender?: string
  ): Promise<BrokerRecommendation[]> {
    const { data: brokers, error } = await supabaseAdmin
      .from('brokers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error || !brokers) {
      console.error('Error fetching brokers:', error)
      return []
    }

    // Filter brokers based on tier and preferences
    let filteredBrokers = brokers

    if (preferredLender) {
      filteredBrokers = brokers.filter(broker => 
        broker.company.toLowerCase().includes(preferredLender.toLowerCase()) ||
        broker.name.toLowerCase().includes(preferredLender.toLowerCase())
      )
    }

    // If no preferred lender matches, use all brokers for the tier
    if (filteredBrokers.length === 0) {
      filteredBrokers = brokers
    }

    // Map to recommendations
    return filteredBrokers.slice(0, 3).map(broker => ({
      brokerId: broker.id,
      name: broker.name,
      company: broker.company,
      phone: broker.phone,
      email: broker.email,
      commissionRate: broker.commission_rate,
      matchReason: this.getMatchReason(tier, broker),
      tier: tier.toLowerCase() as 'premium' | 'standard' | 'coaching'
    }))
  }

  /**
   * Generate match reason for broker recommendation
   */
  private getMatchReason(tier: keyof typeof LEAD_ROUTING_TIERS, broker: any): string {
    switch (tier) {
      case 'PREMIUM':
        return `High-quality lead matched with premium lender ${broker.company}`
      case 'STANDARD':
        return `Qualified lead routed to experienced broker ${broker.name}`
      case 'COACHING':
        return `Financial guidance specialist ${broker.name} for credit improvement`
      default:
        return `Recommended broker ${broker.name} based on your profile`
    }
  }

  /**
   * Generate routing decision and next steps
   */
  generateRoutingDecision(tier: keyof typeof LEAD_ROUTING_TIERS, score: number): {
    routingDecision: string
    nextSteps: string[]
    disclaimers: string[]
  } {
    const tierInfo = LEAD_ROUTING_TIERS[tier]
    
    let routingDecision = ''
    let nextSteps: string[] = []
    let disclaimers: string[] = []

    switch (tier) {
      case 'PREMIUM':
        routingDecision = `Your lead score of ${score} qualifies you for premium lender access. You'll be connected with top-tier mortgage professionals who can offer the best rates and terms.`
        nextSteps = [
          'Premium broker will contact you within 2 hours',
          'Pre-approval process can begin immediately',
          'Access to exclusive rates and products',
          'Dedicated mortgage specialist assigned'
        ]
        disclaimers = [
          'Sharing information with lenders does not guarantee mortgage approval',
          'Rates and terms subject to final credit and income verification',
          'All lenders are licensed and regulated professionals'
        ]
        break

      case 'STANDARD':
        routingDecision = `Your lead score of ${score} qualifies you for our national broker network. You'll be matched with experienced mortgage professionals who can help you secure competitive rates.`
        nextSteps = [
          'Broker will contact you within 4 hours',
          'Multiple lender options will be presented',
          'Pre-qualification process can begin',
          'Rate shopping assistance provided'
        ]
        disclaimers = [
          'Sharing information with lenders does not guarantee mortgage approval',
          'Rates and terms subject to final credit and income verification',
          'Broker fees may apply - discuss with your assigned broker'
        ]
        break

      case 'COACHING':
        routingDecision = `Your lead score of ${score} indicates you may benefit from financial coaching before applying for a mortgage. We'll connect you with specialists who can help improve your financial profile.`
        nextSteps = [
          'Financial coach will contact you within 24 hours',
          'Credit improvement plan will be created',
          'Debt reduction strategies will be discussed',
          'Re-apply for mortgage assistance in 3-6 months'
        ]
        disclaimers = [
          'Financial coaching is educational and does not guarantee mortgage approval',
          'Improvement timeline varies based on individual circumstances',
          'No obligation to use our mortgage services after coaching'
        ]
        break
    }

    return { routingDecision, nextSteps, disclaimers }
  }

  /**
   * Process complete lead qualification
   */
  async processLeadQualification(input: LeadQualificationInput): Promise<LeadQualificationResult> {
    // Calculate lead score
    const leadScore = this.calculateLeadScore(input)
    
    // Determine qualification tier
    const qualificationTier = this.getQualificationTier(leadScore)
    
    // Get broker recommendations
    const brokerRecommendations = await this.getBrokerRecommendations(
      qualificationTier,
      input.preferredLender
    )
    
    // Generate routing decision
    const { routingDecision, nextSteps, disclaimers } = this.generateRoutingDecision(
      qualificationTier,
      leadScore
    )

    // Generate unique lead ID
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      leadId,
      leadScore,
      qualificationTier,
      brokerRecommendations,
      routingDecision,
      nextSteps,
      disclaimers
    }
  }

  /**
   * Save lead to database
   */
  async saveLead(
    userId: string,
    input: LeadQualificationInput,
    result: LeadQualificationResult
  ): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        user_id: userId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        lead_data: {
          propertyValue: input.propertyValue,
          downPayment: input.downPayment,
          income: input.income,
          employmentType: input.employmentType,
          creditScore: input.creditScore,
          preferredLender: input.preferredLender,
          additionalInfo: input.additionalInfo,
          consentToShare: input.consentToShare,
          consentToContact: input.consentToContact,
        },
        lead_score: result.leadScore,
        status: 'pending',
        broker_id: result.brokerRecommendations[0]?.brokerId || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save lead: ${error.message}`)
    }

    return data.id
  }
}

// Export singleton instance
export const leadQualificationService = new LeadQualificationService()
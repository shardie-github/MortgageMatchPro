import { buildSchema } from 'graphql'
import { AffordabilityAgent, RateIntelligenceAgent, ScenarioAnalysisAgent, LeadRoutingAgent, MonetizationAgent } from '../openai'
import { supabaseAdmin } from '../supabase'

export const schema = buildSchema(`
  type Query {
    health: String
    user(id: ID!): User
    mortgageCalculations(userId: ID!): [MortgageCalculation!]!
    rateChecks(userId: ID!): [RateCheck!]!
    leads(userId: ID!): [Lead!]!
    brokers: [Broker!]!
  }

  type Mutation {
    calculateAffordability(input: AffordabilityInput!): AffordabilityResult!
    fetchRates(input: RateInput!): [RateResult!]!
    compareScenarios(input: ScenarioInput!): ScenarioComparison!
    processLead(input: LeadInput!): LeadData!
    createPaymentIntent(input: PaymentInput!): PaymentResult!
    saveCalculation(input: SaveCalculationInput!): MortgageCalculation!
    saveRateCheck(input: SaveRateCheckInput!): RateCheck!
  }

  type User {
    id: ID!
    email: String!
    subscriptionTier: String!
    createdAt: String!
  }

  type MortgageCalculation {
    id: ID!
    userId: ID!
    country: String!
    income: Float!
    debts: Float!
    downPayment: Float!
    propertyPrice: Float!
    interestRate: Float!
    termYears: Int!
    gdsRatio: Float!
    tdsRatio: Float!
    dtiRatio: Float!
    maxAffordable: Float!
    monthlyPayment: Float!
    qualifyingRate: Float!
    createdAt: String!
  }

  type RateCheck {
    id: ID!
    userId: ID!
    country: String!
    termYears: Int!
    rateType: String!
    rates: String!
    createdAt: String!
    expiresAt: String!
  }

  type Lead {
    id: ID!
    userId: ID!
    name: String!
    email: String!
    phone: String!
    leadData: String!
    leadScore: Int!
    status: String!
    brokerId: String
    createdAt: String!
  }

  type Broker {
    id: ID!
    name: String!
    email: String!
    phone: String!
    company: String!
    licenseNumber: String!
    provincesStates: [String!]!
    commissionRate: Float!
    isActive: Boolean!
  }

  type AffordabilityResult {
    maxAffordable: Float!
    monthlyPayment: Float!
    gdsRatio: Float!
    tdsRatio: Float!
    dtiRatio: Float!
    qualifyingRate: Float!
    qualificationResult: Boolean!
    breakdown: PaymentBreakdown!
    recommendations: [String!]!
    disclaimers: [String!]!
  }

  type PaymentBreakdown {
    principal: Float!
    interest: Float!
    taxes: Float!
    insurance: Float!
    pmi: Float
  }

  type RateResult {
    lender: String!
    rate: Float!
    apr: Float!
    term: Int!
    type: String!
    paymentEstimate: Float!
    features: [String!]!
    contactInfo: ContactInfo!
  }

  type ContactInfo {
    phone: String!
    email: String!
    website: String!
  }

  type ScenarioComparison {
    scenarios: [Scenario!]!
    recommendation: Recommendation!
  }

  type Scenario {
    name: String!
    rate: Float!
    term: Int!
    type: String!
    monthlyPayment: Float!
    totalInterest: Float!
    totalCost: Float!
    amortizationSchedule: [AmortizationEntry!]!
  }

  type AmortizationEntry {
    month: Int!
    principal: Float!
    interest: Float!
    balance: Float!
  }

  type Recommendation {
    bestOption: String!
    savings: Float!
    reasoning: String!
  }

  type LeadData {
    name: String!
    email: String!
    phone: String!
    leadData: LeadDataInput!
    leadScore: Int!
    brokerRecommendations: [BrokerRecommendation!]!
  }

  type LeadDataInput {
    income: Float!
    debts: Float!
    downPayment: Float!
    propertyPrice: Float!
    creditScore: Int
    employmentType: String!
    location: String!
  }

  type BrokerRecommendation {
    brokerId: String!
    name: String!
    company: String!
    commissionRate: Float!
    matchReason: String!
  }

  type PaymentResult {
    success: Boolean!
    paymentIntentId: String
    clientSecret: String
    error: String
  }

  input AffordabilityInput {
    country: String!
    income: Float!
    debts: Float!
    downPayment: Float!
    propertyPrice: Float!
    interestRate: Float!
    termYears: Int!
    location: String!
    taxes: Float
    insurance: Float
    hoa: Float
  }

  input RateInput {
    country: String!
    termYears: Int!
    rateType: String!
    propertyPrice: Float!
    downPayment: Float!
  }

  input ScenarioInput {
    scenarios: [ScenarioInputItem!]!
  }

  input ScenarioInputItem {
    name: String!
    rate: Float!
    term: Int!
    type: String!
    propertyPrice: Float!
    downPayment: Float!
  }

  input LeadInput {
    name: String!
    email: String!
    phone: String!
    leadData: LeadDataInputType!
  }

  input LeadDataInputType {
    income: Float!
    debts: Float!
    downPayment: Float!
    propertyPrice: Float!
    creditScore: Int
    employmentType: String!
    location: String!
  }

  input PaymentInput {
    userId: ID!
    type: String!
    amount: Float!
    currency: String!
  }

  input SaveCalculationInput {
    userId: ID!
    country: String!
    income: Float!
    debts: Float!
    downPayment: Float!
    propertyPrice: Float!
    interestRate: Float!
    termYears: Int!
    gdsRatio: Float!
    tdsRatio: Float!
    dtiRatio: Float!
    maxAffordable: Float!
    monthlyPayment: Float!
    qualifyingRate: Float!
  }

  input SaveRateCheckInput {
    userId: ID!
    country: String!
    termYears: Int!
    rateType: String!
    rates: String!
    expiresAt: String!
  }
`)

export const resolvers = {
  Query: {
    health: () => 'MortgageMatch Pro API is running',
    
    user: async (_: any, { id }: { id: string }) => {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw new Error(error.message)
      return data
    },

    mortgageCalculations: async (_: any, { userId }: { userId: string }) => {
      const { data, error } = await supabaseAdmin
        .from('mortgage_calculations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw new Error(error.message)
      return data
    },

    rateChecks: async (_: any, { userId }: { userId: string }) => {
      const { data, error } = await supabaseAdmin
        .from('rate_checks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw new Error(error.message)
      return data
    },

    leads: async (_: any, { userId }: { userId: string }) => {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw new Error(error.message)
      return data
    },

    brokers: async () => {
      const { data, error } = await supabaseAdmin
        .from('brokers')
        .select('*')
        .eq('is_active', true)
        .order('commission_rate', { ascending: false })
      
      if (error) throw new Error(error.message)
      return data
    },
  },

  Mutation: {
    calculateAffordability: async (_: any, { input }: { input: any }) => {
      const agent = new AffordabilityAgent()
      return await agent.calculateAffordability(input)
    },

    fetchRates: async (_: any, { input }: { input: any }) => {
      const agent = new RateIntelligenceAgent()
      return await agent.fetchRates(input)
    },

    compareScenarios: async (_: any, { input }: { input: any }) => {
      const agent = new ScenarioAnalysisAgent()
      return await agent.compareScenarios(input)
    },

    processLead: async (_: any, { input }: { input: any }) => {
      const agent = new LeadRoutingAgent()
      return await agent.processLead(input)
    },

    createPaymentIntent: async (_: any, { input }: { input: any }) => {
      const agent = new MonetizationAgent()
      return await agent.processPayment(input)
    },

    saveCalculation: async (_: any, { input }: { input: any }) => {
      const { data, error } = await supabaseAdmin
        .from('mortgage_calculations')
        .insert({
          user_id: input.userId,
          country: input.country,
          income: input.income,
          debts: input.debts,
          down_payment: input.downPayment,
          property_price: input.propertyPrice,
          interest_rate: input.interestRate,
          term_years: input.termYears,
          gds_ratio: input.gdsRatio,
          tds_ratio: input.tdsRatio,
          dti_ratio: input.dtiRatio,
          max_affordable: input.maxAffordable,
          monthly_payment: input.monthlyPayment,
          qualifying_rate: input.qualifyingRate,
        })
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      return data
    },

    saveRateCheck: async (_: any, { input }: { input: any }) => {
      const { data, error } = await supabaseAdmin
        .from('rate_checks')
        .insert({
          user_id: input.userId,
          country: input.country,
          term_years: input.termYears,
          rate_type: input.rateType,
          rates: input.rates,
          expires_at: input.expiresAt,
        })
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      return data
    },
  },
}
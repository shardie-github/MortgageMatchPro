import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AffordabilityResult, RateResult, ScenarioComparison, LeadData } from '@/lib/openai'

interface MortgageState {
  // User data (now managed by auth context)
  user: {
    id: string | null
    email: string | null
    subscriptionTier: 'free' | 'premium' | 'broker'
  }
  
  // Affordability calculations
  affordabilityResults: AffordabilityResult[]
  currentAffordability: AffordabilityResult | null
  
  // Rate data
  rateResults: RateResult[]
  rateChecks: Array<{
    id: string
    country: 'CA' | 'US'
    termYears: number
    rateType: 'fixed' | 'variable'
    rates: RateResult[]
    createdAt: string
    expiresAt: string
  }>
  
  // Scenario comparisons
  scenarioComparisons: ScenarioComparison[]
  currentComparison: ScenarioComparison | null
  
  // Lead data
  leads: LeadData[]
  currentLead: LeadData | null
  
  // UI state
  loading: {
    affordability: boolean
    rates: boolean
    scenarios: boolean
    leads: boolean
  }
  
  // Error state
  errors: {
    affordability: string | null
    rates: string | null
    scenarios: string | null
    leads: string | null
  }
  
  // Actions
  setUser: (user: { id: string | null; email: string | null; subscriptionTier: 'free' | 'premium' | 'broker' }) => void
  setAffordabilityResult: (result: AffordabilityResult) => void
  setRateResults: (results: RateResult[]) => void
  setScenarioComparison: (comparison: ScenarioComparison) => void
  setLeadData: (lead: LeadData) => void
  setLoading: (key: keyof MortgageState['loading'], loading: boolean) => void
  setError: (key: keyof MortgageState['errors'], error: string | null) => void
  clearError: (key: keyof MortgageState['errors']) => void
  clearAllData: () => void
}

export const useMortgageStore = create<MortgageState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: {
        id: null,
        email: null,
        subscriptionTier: 'free',
      },
      
      affordabilityResults: [],
      currentAffordability: null,
      
      rateResults: [],
      rateChecks: [],
      
      scenarioComparisons: [],
      currentComparison: null,
      
      leads: [],
      currentLead: null,
      
      loading: {
        affordability: false,
        rates: false,
        scenarios: false,
        leads: false,
      },
      
      errors: {
        affordability: null,
        rates: null,
        scenarios: null,
        leads: null,
      },
      
      // Actions
      setUser: (user) => set({ user }),
      
      setAffordabilityResult: (result) => set((state) => ({
        affordabilityResults: [result, ...state.affordabilityResults],
        currentAffordability: result,
      })),
      
      setRateResults: (results) => set((state) => ({
        rateResults: results,
        rateChecks: [{
          id: `rate_${Date.now()}`,
          country: 'CA', // This should be determined from context
          termYears: 25, // This should be determined from context
          rateType: 'fixed', // This should be determined from context
          rates: results,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        }, ...state.rateChecks],
      })),
      
      setScenarioComparison: (comparison) => set((state) => ({
        scenarioComparisons: [comparison, ...state.scenarioComparisons],
        currentComparison: comparison,
      })),
      
      setLeadData: (lead) => set((state) => ({
        leads: [lead, ...state.leads],
        currentLead: lead,
      })),
      
      setLoading: (key, loading) => set((state) => ({
        loading: { ...state.loading, [key]: loading },
      })),
      
      setError: (key, error) => set((state) => ({
        errors: { ...state.errors, [key]: error },
      })),
      
      clearError: (key) => set((state) => ({
        errors: { ...state.errors, [key]: null },
      })),
      
      clearAllData: () => set({
        affordabilityResults: [],
        currentAffordability: null,
        rateResults: [],
        rateChecks: [],
        scenarioComparisons: [],
        currentComparison: null,
        leads: [],
        currentLead: null,
        loading: {
          affordability: false,
          rates: false,
          scenarios: false,
          leads: false,
        },
        errors: {
          affordability: null,
          rates: null,
          scenarios: null,
          leads: null,
        },
      }),
    }),
    {
      name: 'mortgage-store',
      partialize: (state) => ({
        user: state.user,
        affordabilityResults: state.affordabilityResults.slice(0, 10), // Keep only last 10
        rateChecks: state.rateChecks.slice(0, 5), // Keep only last 5
        scenarioComparisons: state.scenarioComparisons.slice(0, 5), // Keep only last 5
        leads: state.leads.slice(0, 10), // Keep only last 10
      }),
    }
  )
)
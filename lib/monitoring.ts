// Monitoring and analytics utilities
export const analytics = {
  trackAffordabilityCalculation: (data: {
    country: string
    income: number
    propertyPrice: number
    qualificationResult: boolean
  }) => {
    console.log('Analytics: Affordability Calculation', data)
    // In production, send to analytics service
  },

  trackRateCheck: (data: {
    country: string
    termYears: number
    rateType: string
    ratesCount: number
  }) => {
    console.log('Analytics: Rate Check', data)
    // In production, send to analytics service
  },

  trackScenarioComparison: (data: {
    scenarioCount: number
    bestOption: string
  }) => {
    console.log('Analytics: Scenario Comparison', data)
    // In production, send to analytics service
  },

  trackLeadSubmission: (data: {
    leadScore: number
    brokerCount: number
  }) => {
    console.log('Analytics: Lead Submission', data)
    // In production, send to analytics service
  },
}

export const errorTracking = {
  captureException: (error: Error, context?: Record<string, any>) => {
    console.error('Error Tracking:', error.message, context)
    // In production, send to error tracking service like Sentry
  },
}
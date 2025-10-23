import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

// Initialize Sentry
export function initSentry() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    })
  }
}

// Initialize PostHog
export function initPostHog() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
    })
  }
}

// Analytics tracking functions
export const analytics = {
  trackAffordabilityCalculation: (data: {
    country: string
    income: number
    propertyPrice: number
    qualificationResult: boolean
  }) => {
    if (typeof window !== 'undefined') {
      posthog.capture('affordability_calculated', {
        country: data.country,
        income_range: Math.floor(data.income / 10000) * 10000,
        property_price_range: Math.floor(data.propertyPrice / 50000) * 50000,
        qualified: data.qualificationResult,
      })
    }
  },

  trackRateCheck: (data: {
    country: string
    termYears: number
    rateType: string
    ratesCount: number
  }) => {
    if (typeof window !== 'undefined') {
      posthog.capture('rate_check_performed', {
        country: data.country,
        term_years: data.termYears,
        rate_type: data.rateType,
        rates_found: data.ratesCount,
      })
    }
  },

  trackScenarioComparison: (data: {
    scenariosCount: number
    bestOption: string
    savings: number
  }) => {
    if (typeof window !== 'undefined') {
      posthog.capture('scenarios_compared', {
        scenarios_count: data.scenariosCount,
        best_option: data.bestOption,
        potential_savings: data.savings,
      })
    }
  },

  trackLeadSubmission: (data: {
    leadScore: number
    brokerCount: number
    country: string
  }) => {
    if (typeof window !== 'undefined') {
      posthog.capture('lead_submitted', {
        lead_score: data.leadScore,
        broker_recommendations: data.brokerCount,
        country: data.country,
      })
    }
  },

  trackPayment: (data: {
    type: string
    amount: number
    currency: string
    success: boolean
  }) => {
    if (typeof window !== 'undefined') {
      posthog.capture('payment_processed', {
        payment_type: data.type,
        amount: data.amount,
        currency: data.currency,
        success: data.success,
      })
    }
  },

  identifyUser: (userId: string, properties: Record<string, any> = {}) => {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, properties)
    }
  },

  setUserProperties: (properties: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.people.set(properties)
    }
  },
}

// Error tracking
export const errorTracking = {
  captureException: (error: Error, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        tags: context,
      })
    } else {
      console.error('Error captured:', error, context)
    }
  },

  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, level)
    } else {
      console.log(`[${level.toUpperCase()}]`, message)
    }
  },
}

// Performance monitoring
export const performance = {
  startTransaction: (name: string, op: string = 'custom') => {
    if (process.env.NODE_ENV === 'production') {
      return Sentry.startTransaction({ name, op })
    }
    return null
  },

  finishTransaction: (transaction: any) => {
    if (transaction) {
      transaction.finish()
    }
  },

  addBreadcrumb: (message: string, category: string = 'custom', level: 'info' | 'warning' | 'error' = 'info') => {
    if (process.env.NODE_ENV === 'production') {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
      })
    }
  },
}
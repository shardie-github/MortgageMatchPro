import posthog from 'posthog-js'

// Initialize PostHog
export const initAnalytics = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll capture pageviews manually
      capture_pageleave: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('PostHog loaded')
        }
      }
    })
  }
}

// Analytics event types
export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  distinctId?: string
}

// Core analytics functions
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.capture(event, {
      ...properties,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent,
    })
  }
}

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.identify(userId, properties)
  }
}

export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.people.set(properties)
  }
}

export const resetUser = () => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.reset()
  }
}

// Specific event tracking functions
export const trackCanvasOpen = (canvasType: 'affordability' | 'rates' | 'scenarios' | 'leads') => {
  trackEvent('canvas_opened', {
    canvas_type: canvasType,
    timestamp: new Date().toISOString(),
  })
}

export const trackRateCheckPurchase = (userId: string, amount: number, currency: string) => {
  trackEvent('rate_check_purchased', {
    user_id: userId,
    amount,
    currency,
    timestamp: new Date().toISOString(),
  })
}

export const trackLeadSubmission = (userId: string, leadScore: number, brokerId?: string) => {
  trackEvent('lead_submitted', {
    user_id: userId,
    lead_score: leadScore,
    broker_id: brokerId,
    timestamp: new Date().toISOString(),
  })
}

export const trackSubscriptionUpgrade = (userId: string, fromTier: string, toTier: string, amount: number) => {
  trackEvent('subscription_upgraded', {
    user_id: userId,
    from_tier: fromTier,
    to_tier: toTier,
    amount,
    timestamp: new Date().toISOString(),
  })
}

export const trackBrokerLogin = (brokerId: string, company: string) => {
  trackEvent('broker_logged_in', {
    broker_id: brokerId,
    company,
    timestamp: new Date().toISOString(),
  })
}

export const trackScenarioSave = (userId: string, scenarioType: string, propertyPrice: number) => {
  trackEvent('scenario_saved', {
    user_id: userId,
    scenario_type: scenarioType,
    property_price: propertyPrice,
    timestamp: new Date().toISOString(),
  })
}

export const trackAffordabilityCalculation = (userId: string, income: number, propertyPrice: number, gdsRatio: number) => {
  trackEvent('affordability_calculated', {
    user_id: userId,
    income,
    property_price: propertyPrice,
    gds_ratio: gdsRatio,
    timestamp: new Date().toISOString(),
  })
}

export const trackRateCheck = (userId: string, country: string, termYears: number, rateType: string) => {
  trackEvent('rate_check_requested', {
    user_id: userId,
    country,
    term_years: termYears,
    rate_type: rateType,
    timestamp: new Date().toISOString(),
  })
}

export const trackScenarioComparison = (userId: string, scenarioCount: number, bestOption: string) => {
  trackEvent('scenario_comparison', {
    user_id: userId,
    scenario_count: scenarioCount,
    best_option: bestOption,
    timestamp: new Date().toISOString(),
  })
}

export const trackDashboardView = (userId: string, dashboardType: 'user' | 'broker' | 'admin') => {
  trackEvent('dashboard_viewed', {
    user_id: userId,
    dashboard_type: dashboardType,
    timestamp: new Date().toISOString(),
  })
}

export const trackReportExport = (userId: string, reportType: string, format: 'pdf' | 'csv') => {
  trackEvent('report_exported', {
    user_id: userId,
    report_type: reportType,
    format,
    timestamp: new Date().toISOString(),
  })
}

// Funnel tracking
export const trackFunnelStep = (userId: string, funnelName: string, step: string, stepNumber: number) => {
  trackEvent('funnel_step', {
    user_id: userId,
    funnel_name: funnelName,
    step,
    step_number: stepNumber,
    timestamp: new Date().toISOString(),
  })
}

// Error tracking
export const trackError = (error: Error, context?: Record<string, any>) => {
  trackEvent('error_occurred', {
    error_message: error.message,
    error_stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })
}

// Performance tracking
export const trackPerformance = (metric: string, value: number, unit: string = 'ms') => {
  trackEvent('performance_metric', {
    metric,
    value,
    unit,
    timestamp: new Date().toISOString(),
  })
}

// Privacy controls
export const setAnalyticsConsent = (consent: boolean) => {
  if (typeof window !== 'undefined' && posthog) {
    if (consent) {
      posthog.opt_in_capturing()
    } else {
      posthog.opt_out_capturing()
    }
  }
}

export const getAnalyticsConsent = (): boolean => {
  if (typeof window !== 'undefined' && posthog) {
    return !posthog.has_opted_out_capturing()
  }
  return false
}

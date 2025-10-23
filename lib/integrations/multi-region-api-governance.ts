import axios from 'axios'
import { z } from 'zod'

// Regional API Configuration Schema
export const RegionalConfigSchema = z.object({
  region: z.string(),
  baseURL: z.string(),
  apiVersion: z.string(),
  supportedCurrencies: z.array(z.string()),
  supportedLanguages: z.array(z.string()),
  timezone: z.string(),
  dataResidency: z.string(),
  complianceFrameworks: z.array(z.string()),
  kycRequirements: z.object({
    minimumAge: z.number(),
    requiredDocuments: z.array(z.string()),
    verificationLevel: z.enum(['basic', 'enhanced', 'maximum']),
  }),
  privacySettings: z.object({
    dataRetentionDays: z.number(),
    gdprCompliant: z.boolean(),
    dataProcessingBasis: z.string(),
    consentRequired: z.boolean(),
  }),
  bankingRules: z.object({
    maxTransactionAmount: z.number(),
    dailyLimit: z.number(),
    monthlyLimit: z.number(),
    reportingThreshold: z.number(),
  }),
  rateLimits: z.object({
    requestsPerMinute: z.number(),
    requestsPerHour: z.number(),
    requestsPerDay: z.number(),
    burstLimit: z.number(),
  }),
  endpoints: z.record(z.string(), z.object({
    url: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    authentication: z.enum(['none', 'api_key', 'oauth2', 'jwt']),
    rateLimit: z.number(),
    timeout: z.number(),
  })),
})

// API Gateway Configuration
export const APIGatewayConfigSchema = z.object({
  gatewayId: z.string(),
  region: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  domains: z.array(z.string()),
  sslCertificates: z.array(z.string()),
  loadBalancers: z.array(z.string()),
  cdnConfig: z.object({
    enabled: z.boolean(),
    provider: z.string(),
    cachePolicy: z.string(),
    edgeLocations: z.array(z.string()),
  }),
  security: z.object({
    wafEnabled: z.boolean(),
    ddosProtection: z.boolean(),
    rateLimiting: z.boolean(),
    ipWhitelisting: z.boolean(),
    corsPolicy: z.object({
      allowedOrigins: z.array(z.string()),
      allowedMethods: z.array(z.string()),
      allowedHeaders: z.array(z.string()),
    }),
  }),
  monitoring: z.object({
    loggingEnabled: z.boolean(),
    metricsEnabled: z.boolean(),
    tracingEnabled: z.boolean(),
    alertingEnabled: z.boolean(),
  }),
})

// Localization Schema
export const LocalizationSchema = z.object({
  language: z.string(),
  currency: z.string(),
  dateFormat: z.string(),
  numberFormat: z.object({
    decimalSeparator: z.string(),
    thousandsSeparator: z.string(),
    currencySymbol: z.string(),
    currencyPosition: z.enum(['before', 'after']),
  }),
  addressFormat: z.object({
    country: z.string(),
    state: z.string(),
    city: z.string(),
    postalCode: z.string(),
    street: z.string(),
  }),
  regulatoryText: z.object({
    termsOfService: z.string(),
    privacyPolicy: z.string(),
    riskDisclosure: z.string(),
    complianceNotice: z.string(),
  }),
})

export type RegionalConfig = z.infer<typeof RegionalConfigSchema>
export type APIGatewayConfig = z.infer<typeof APIGatewayConfigSchema>
export type Localization = z.infer<typeof LocalizationSchema>

// Multi-Region API Governance Service
export class MultiRegionAPIGovernance {
  private regionalConfigs: Map<string, RegionalConfig>
  private apiGateways: Map<string, APIGatewayConfig>
  private localizations: Map<string, Localization>
  private globalConfig: {
    defaultRegion: string
    fallbackRegions: string[]
    globalEndpoints: string[]
  }

  constructor() {
    this.regionalConfigs = new Map()
    this.apiGateways = new Map()
    this.localizations = new Map()
    this.globalConfig = {
      defaultRegion: 'us-east-1',
      fallbackRegions: ['eu-west-1', 'ap-southeast-1'],
      globalEndpoints: ['/health', '/version', '/status'],
    }
    
    this.initializeRegionalConfigs()
  }

  private initializeRegionalConfigs(): void {
    // North America - US
    this.regionalConfigs.set('us-east-1', {
      region: 'us-east-1',
      baseURL: 'https://api-us.mortgagematchpro.com',
      apiVersion: 'v1',
      supportedCurrencies: ['USD'],
      supportedLanguages: ['en-US', 'es-US'],
      timezone: 'America/New_York',
      dataResidency: 'US',
      complianceFrameworks: ['CFPB', 'PSD2', 'PCI-DSS', 'SOC2'],
      kycRequirements: {
        minimumAge: 18,
        requiredDocuments: ['SSN', 'Driver License', 'Bank Statement'],
        verificationLevel: 'enhanced',
      },
      privacySettings: {
        dataRetentionDays: 2555, // 7 years
        gdprCompliant: false,
        dataProcessingBasis: 'legitimate_interest',
        consentRequired: true,
      },
      bankingRules: {
        maxTransactionAmount: 1000000,
        dailyLimit: 100000,
        monthlyLimit: 1000000,
        reportingThreshold: 10000,
      },
      rateLimits: {
        requestsPerMinute: 1000,
        requestsPerHour: 10000,
        requestsPerDay: 100000,
        burstLimit: 2000,
      },
      endpoints: {
        '/affordability': {
          url: '/affordability',
          method: 'POST',
          authentication: 'api_key',
          rateLimit: 100,
          timeout: 5000,
        },
        '/rates': {
          url: '/rates',
          method: 'GET',
          authentication: 'api_key',
          rateLimit: 200,
          timeout: 3000,
        },
      },
    })

    // Europe - EU
    this.regionalConfigs.set('eu-west-1', {
      region: 'eu-west-1',
      baseURL: 'https://api-eu.mortgagematchpro.com',
      apiVersion: 'v1',
      supportedCurrencies: ['EUR', 'GBP', 'CHF'],
      supportedLanguages: ['en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT'],
      timezone: 'Europe/London',
      dataResidency: 'EU',
      complianceFrameworks: ['GDPR', 'PSD2', 'MiCA', 'DORA', 'PCI-DSS'],
      kycRequirements: {
        minimumAge: 18,
        requiredDocuments: ['Passport', 'National ID', 'Proof of Address'],
        verificationLevel: 'maximum',
      },
      privacySettings: {
        dataRetentionDays: 1095, // 3 years
        gdprCompliant: true,
        dataProcessingBasis: 'consent',
        consentRequired: true,
      },
      bankingRules: {
        maxTransactionAmount: 500000,
        dailyLimit: 50000,
        monthlyLimit: 500000,
        reportingThreshold: 10000,
      },
      rateLimits: {
        requestsPerMinute: 800,
        requestsPerHour: 8000,
        requestsPerDay: 80000,
        burstLimit: 1500,
      },
      endpoints: {
        '/affordability': {
          url: '/affordability',
          method: 'POST',
          authentication: 'oauth2',
          rateLimit: 80,
          timeout: 5000,
        },
        '/rates': {
          url: '/rates',
          method: 'GET',
          authentication: 'oauth2',
          rateLimit: 150,
          timeout: 3000,
        },
      },
    })

    // Asia Pacific - Singapore
    this.regionalConfigs.set('ap-southeast-1', {
      region: 'ap-southeast-1',
      baseURL: 'https://api-ap.mortgagematchpro.com',
      apiVersion: 'v1',
      supportedCurrencies: ['SGD', 'AUD', 'JPY', 'HKD'],
      supportedLanguages: ['en-SG', 'zh-CN', 'zh-TW', 'ja-JP'],
      timezone: 'Asia/Singapore',
      dataResidency: 'SG',
      complianceFrameworks: ['MAS', 'PDPA', 'PCI-DSS'],
      kycRequirements: {
        minimumAge: 21,
        requiredDocuments: ['NRIC', 'Passport', 'Proof of Address'],
        verificationLevel: 'enhanced',
      },
      privacySettings: {
        dataRetentionDays: 1825, // 5 years
        gdprCompliant: false,
        dataProcessingBasis: 'legitimate_interest',
        consentRequired: true,
      },
      bankingRules: {
        maxTransactionAmount: 2000000,
        dailyLimit: 200000,
        monthlyLimit: 2000000,
        reportingThreshold: 20000,
      },
      rateLimits: {
        requestsPerMinute: 1200,
        requestsPerHour: 12000,
        requestsPerDay: 120000,
        burstLimit: 2500,
      },
      endpoints: {
        '/affordability': {
          url: '/affordability',
          method: 'POST',
          authentication: 'jwt',
          rateLimit: 120,
          timeout: 5000,
        },
        '/rates': {
          url: '/rates',
          method: 'GET',
          authentication: 'jwt',
          rateLimit: 250,
          timeout: 3000,
        },
      },
    })

    // Canada
    this.regionalConfigs.set('ca-central-1', {
      region: 'ca-central-1',
      baseURL: 'https://api-ca.mortgagematchpro.com',
      apiVersion: 'v1',
      supportedCurrencies: ['CAD'],
      supportedLanguages: ['en-CA', 'fr-CA'],
      timezone: 'America/Toronto',
      dataResidency: 'CA',
      complianceFrameworks: ['OSFI', 'PIPEDA', 'PCI-DSS', 'SOC2'],
      kycRequirements: {
        minimumAge: 18,
        requiredDocuments: ['SIN', 'Driver License', 'Bank Statement'],
        verificationLevel: 'enhanced',
      },
      privacySettings: {
        dataRetentionDays: 2555, // 7 years
        gdprCompliant: false,
        dataProcessingBasis: 'legitimate_interest',
        consentRequired: true,
      },
      bankingRules: {
        maxTransactionAmount: 1000000,
        dailyLimit: 100000,
        monthlyLimit: 1000000,
        reportingThreshold: 10000,
      },
      rateLimits: {
        requestsPerMinute: 900,
        requestsPerHour: 9000,
        requestsPerDay: 90000,
        burstLimit: 1800,
      },
      endpoints: {
        '/affordability': {
          url: '/affordability',
          method: 'POST',
          authentication: 'api_key',
          rateLimit: 90,
          timeout: 5000,
        },
        '/rates': {
          url: '/rates',
          method: 'GET',
          authentication: 'api_key',
          rateLimit: 180,
          timeout: 3000,
        },
      },
    })
  }

  // Get regional configuration
  getRegionalConfig(region: string): RegionalConfig | null {
    return this.regionalConfigs.get(region) || null
  }

  // Get optimal region for request
  getOptimalRegion(request: {
    userLocation?: string
    currency: string
    language: string
    complianceLevel: 'basic' | 'enhanced' | 'maximum'
  }): string {
    // Simple region selection logic - in production, this would be more sophisticated
    const regionMap: Record<string, string> = {
      'US': 'us-east-1',
      'CA': 'ca-central-1',
      'EU': 'eu-west-1',
      'GB': 'eu-west-1',
      'SG': 'ap-southeast-1',
      'AU': 'ap-southeast-1',
      'JP': 'ap-southeast-1',
    }

    // Check if user location matches a specific region
    if (request.userLocation) {
      const country = request.userLocation.split(',')[1]?.trim()
      if (country && regionMap[country]) {
        return regionMap[country]
      }
    }

    // Fallback to currency-based selection
    const currencyRegionMap: Record<string, string> = {
      'USD': 'us-east-1',
      'CAD': 'ca-central-1',
      'EUR': 'eu-west-1',
      'GBP': 'eu-west-1',
      'SGD': 'ap-southeast-1',
      'AUD': 'ap-southeast-1',
      'JPY': 'ap-southeast-1',
    }

    return currencyRegionMap[request.currency] || this.globalConfig.defaultRegion
  }

  // Localize API response
  localizeResponse(response: any, region: string, language: string): any {
    const config = this.getRegionalConfig(region)
    if (!config) return response

    // Apply currency formatting
    if (response.amount) {
      response.formattedAmount = this.formatCurrency(
        response.amount,
        config.supportedCurrencies[0],
        language
      )
    }

    // Apply date formatting
    if (response.date) {
      response.formattedDate = this.formatDate(response.date, region, language)
    }

    // Apply regulatory disclaimers
    response.regulatoryDisclaimers = this.getRegulatoryDisclaimers(region, language)

    return response
  }

  // Format currency based on region and language
  private formatCurrency(amount: number, currency: string, language: string): string {
    const locale = this.getLocaleFromLanguage(language)
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  // Format date based on region and language
  private formatDate(date: string, region: string, language: string): string {
    const locale = this.getLocaleFromLanguage(language)
    const config = this.getRegionalConfig(region)
    const timezone = config?.timezone || 'UTC'
    
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  }

  // Get regulatory disclaimers for region and language
  private getRegulatoryDisclaimers(region: string, language: string): string[] {
    const disclaimers: Record<string, Record<string, string[]>> = {
      'us-east-1': {
        'en-US': [
          'This calculation is for informational purposes only and does not constitute a loan offer.',
          'Rates and terms are subject to change without notice.',
          'Actual rates may vary based on creditworthiness and other factors.',
        ],
        'es-US': [
          'Este cálculo es solo para fines informativos y no constituye una oferta de préstamo.',
          'Las tasas y términos están sujetos a cambios sin previo aviso.',
          'Las tasas reales pueden variar según la solvencia crediticia y otros factores.',
        ],
      },
      'eu-west-1': {
        'en-GB': [
          'This calculation is for informational purposes only and does not constitute a loan offer.',
          'Rates and terms are subject to change without notice.',
          'Your home may be repossessed if you do not keep up repayments on your mortgage.',
        ],
        'de-DE': [
          'Diese Berechnung dient nur zu Informationszwecken und stellt kein Darlehensangebot dar.',
          'Zinssätze und Bedingungen können sich ohne Vorankündigung ändern.',
          'Ihr Zuhause kann zwangsversteigert werden, wenn Sie die Hypothekenzahlungen nicht einhalten.',
        ],
      },
    }

    return disclaimers[region]?.[language] || disclaimers['us-east-1']['en-US']
  }

  // Get locale from language code
  private getLocaleFromLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      'en-US': 'en-US',
      'en-CA': 'en-CA',
      'en-GB': 'en-GB',
      'en-SG': 'en-SG',
      'es-US': 'es-US',
      'es-ES': 'es-ES',
      'fr-CA': 'fr-CA',
      'fr-FR': 'fr-FR',
      'de-DE': 'de-DE',
      'it-IT': 'it-IT',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'ja-JP': 'ja-JP',
    }

    return languageMap[language] || 'en-US'
  }

  // Route request to appropriate regional endpoint
  async routeRequest(request: {
    endpoint: string
    method: string
    data?: any
    headers?: Record<string, string>
    region?: string
    userLocation?: string
    currency?: string
    language?: string
  }): Promise<{
    success: boolean
    data?: any
    region: string
    endpoint: string
    responseTime: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Determine optimal region
      const region = request.region || this.getOptimalRegion({
        userLocation: request.userLocation,
        currency: request.currency || 'USD',
        language: request.language || 'en-US',
        complianceLevel: 'enhanced',
      })

      const config = this.getRegionalConfig(region)
      if (!config) {
        throw new Error(`No configuration found for region: ${region}`)
      }

      // Get endpoint configuration
      const endpointConfig = config.endpoints[request.endpoint]
      if (!endpointConfig) {
        throw new Error(`Endpoint not found: ${request.endpoint}`)
      }

      // Build full URL
      const fullURL = `${config.baseURL}${endpointConfig.url}`
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Version': config.apiVersion,
        'X-Region': region,
        'X-Language': request.language || 'en-US',
        ...request.headers,
      }

      // Add authentication header
      if (endpointConfig.authentication === 'api_key') {
        headers['X-API-Key'] = process.env.API_KEY || ''
      } else if (endpointConfig.authentication === 'oauth2') {
        headers['Authorization'] = `Bearer ${process.env.OAUTH_TOKEN || ''}`
      } else if (endpointConfig.authentication === 'jwt') {
        headers['Authorization'] = `Bearer ${process.env.JWT_TOKEN || ''}`
      }

      // Make request
      const response = await axios({
        method: endpointConfig.method as any,
        url: fullURL,
        data: request.data,
        headers,
        timeout: endpointConfig.timeout,
      })

      // Localize response
      const localizedResponse = this.localizeResponse(
        response.data,
        region,
        request.language || 'en-US'
      )

      return {
        success: true,
        data: localizedResponse,
        region,
        endpoint: fullURL,
        responseTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        region: request.region || this.globalConfig.defaultRegion,
        endpoint: request.endpoint,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Health check for all regions
  async healthCheck(): Promise<Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy'
    responseTime: number
    lastChecked: string
    error?: string
  }>> {
    const results: Record<string, any> = {}

    for (const [region, config] of this.regionalConfigs) {
      try {
        const startTime = Date.now()
        const response = await axios.get(`${config.baseURL}/health`, {
          timeout: 5000,
          headers: {
            'X-API-Version': config.apiVersion,
          },
        })

        results[region] = {
          status: response.status === 200 ? 'healthy' : 'degraded',
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
        }
      } catch (error) {
        results[region] = {
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    return results
  }

  // Get API usage statistics
  async getUsageStatistics(region: string, timeRange: 'hour' | 'day' | 'week' | 'month'): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    topEndpoints: Array<{
      endpoint: string
      requests: number
      averageResponseTime: number
    }>
    errorRate: number
  }> {
    // This would integrate with actual monitoring systems like CloudWatch, DataDog, etc.
    // For now, return mock data
    return {
      totalRequests: 10000,
      successfulRequests: 9500,
      failedRequests: 500,
      averageResponseTime: 250,
      topEndpoints: [
        { endpoint: '/affordability', requests: 4000, averageResponseTime: 300 },
        { endpoint: '/rates', requests: 3500, averageResponseTime: 200 },
        { endpoint: '/scenarios', requests: 1500, averageResponseTime: 400 },
        { endpoint: '/leads', requests: 1000, averageResponseTime: 150 },
      ],
      errorRate: 0.05, // 5%
    }
  }
}
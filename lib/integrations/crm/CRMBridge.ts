/**
 * CRM Bridge - Generic Lead Export System
 * v1.2.0 - Exports leads to various CRM platforms and lead management systems
 */

import { z } from 'zod'
import axios, { AxiosInstance } from 'axios'

// CRM integration schemas
export const CRMLeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  leadData: z.object({
    income: z.number(),
    debts: z.number(),
    downPayment: z.number(),
    propertyPrice: z.number(),
    creditScore: z.number().optional(),
    employmentType: z.string(),
    location: z.string(),
    loanType: z.string(),
    timeline: z.string(),
    propertyType: z.string()
  }),
  leadScore: z.number().min(0).max(100),
  matchConfidence: z.number().min(0).max(1),
  source: z.string(),
  createdAt: z.string(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional()
})

export const CRMIntegrationConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['zapier', 'hubspot', 'salesforce', 'pipedrive', 'custom']),
  enabled: z.boolean(),
  configuration: z.object({
    webhookUrl: z.string().optional(),
    apiKey: z.string().optional(),
    apiUrl: z.string().optional(),
    customHeaders: z.record(z.string()).optional(),
    fieldMapping: z.record(z.string()).optional(),
    leadScoreThreshold: z.number().min(0).max(100).default(50)
  }),
  lastSync: z.string().optional(),
  syncCount: z.number().default(0),
  errorCount: z.number().default(0)
})

export type CRMLead = z.infer<typeof CRMLeadSchema>
export type CRMIntegrationConfig = z.infer<typeof CRMIntegrationConfigSchema>

export class CRMBridge {
  private static instance: CRMBridge
  private integrations: Map<string, CRMIntegrationConfig> = new Map()
  private clients: Map<string, AxiosInstance> = new Map()

  private constructor() {
    this.initializeDefaultIntegrations()
  }

  static getInstance(): CRMBridge {
    if (!CRMBridge.instance) {
      CRMBridge.instance = new CRMBridge()
    }
    return CRMBridge.instance
  }

  /**
   * Register CRM integration
   */
  async registerIntegration(config: CRMIntegrationConfig): Promise<void> {
    try {
      const validatedConfig = CRMIntegrationConfigSchema.parse(config)
      this.integrations.set(config.id, validatedConfig)

      // Create HTTP client for this integration
      if (config.type !== 'zapier') {
        this.createClient(config)
      }

      console.log(`✅ Registered CRM integration: ${config.name}`)

    } catch (error) {
      console.error('Error registering CRM integration:', error)
      throw error
    }
  }

  /**
   * Export lead to CRM
   */
  async exportLead(
    integrationId: string,
    lead: CRMLead
  ): Promise<{
    success: boolean
    externalId?: string
    error?: string
    responseTime: number
  }> {
    const startTime = Date.now()

    try {
      const integration = this.integrations.get(integrationId)
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`)
      }

      if (!integration.enabled) {
        throw new Error(`Integration ${integrationId} is disabled`)
      }

      // Check lead score threshold
      if (lead.leadScore < integration.configuration.leadScoreThreshold) {
        throw new Error(`Lead score ${lead.leadScore} below threshold ${integration.configuration.leadScoreThreshold}`)
      }

      let result: any

      switch (integration.type) {
        case 'zapier':
          result = await this.exportToZapier(integration, lead)
          break
        case 'hubspot':
          result = await this.exportToHubSpot(integration, lead)
          break
        case 'salesforce':
          result = await this.exportToSalesforce(integration, lead)
          break
        case 'pipedrive':
          result = await this.exportToPipedrive(integration, lead)
          break
        case 'custom':
          result = await this.exportToCustom(integration, lead)
          break
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`)
      }

      // Update integration stats
      integration.syncCount++
      integration.lastSync = new Date().toISOString()
      this.integrations.set(integrationId, integration)

      return {
        success: true,
        externalId: result.externalId,
        responseTime: Date.now() - startTime
      }

    } catch (error) {
      // Update error count
      const integration = this.integrations.get(integrationId)
      if (integration) {
        integration.errorCount++
        this.integrations.set(integrationId, integration)
      }

      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Export lead to all enabled integrations
   */
  async exportLeadToAll(lead: CRMLead): Promise<{
    successful: string[]
    failed: Array<{ integrationId: string; error: string }>
    totalTime: number
  }> {
    const startTime = Date.now()
    const successful: string[] = []
    const failed: Array<{ integrationId: string; error: string }> = []

    const enabledIntegrations = Array.from(this.integrations.values())
      .filter(integration => integration.enabled)

    // Export to all integrations in parallel
    const exportPromises = enabledIntegrations.map(async (integration) => {
      const result = await this.exportLead(integration.id, lead)
      
      if (result.success) {
        successful.push(integration.id)
      } else {
        failed.push({
          integrationId: integration.id,
          error: result.error || 'Unknown error'
        })
      }
    })

    await Promise.all(exportPromises)

    return {
      successful,
      failed,
      totalTime: Date.now() - startTime
    }
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(integrationId: string): {
    exists: boolean
    enabled: boolean
    lastSync?: string
    syncCount: number
    errorCount: number
    errorRate: number
  } {
    const integration = this.integrations.get(integrationId)
    
    if (!integration) {
      return {
        exists: false,
        enabled: false,
        syncCount: 0,
        errorCount: 0,
        errorRate: 0
      }
    }

    const errorRate = integration.syncCount > 0 
      ? integration.errorCount / integration.syncCount 
      : 0

    return {
      exists: true,
      enabled: integration.enabled,
      lastSync: integration.lastSync,
      syncCount: integration.syncCount,
      errorCount: integration.errorCount,
      errorRate
    }
  }

  /**
   * Get all integrations
   */
  getAllIntegrations(): CRMIntegrationConfig[] {
    return Array.from(this.integrations.values())
  }

  /**
   * Update integration configuration
   */
  async updateIntegration(
    integrationId: string,
    updates: Partial<CRMIntegrationConfig>
  ): Promise<void> {
    try {
      const integration = this.integrations.get(integrationId)
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`)
      }

      const updatedIntegration = {
        ...integration,
        ...updates,
        id: integrationId // Ensure ID doesn't change
      }

      const validatedConfig = CRMIntegrationConfigSchema.parse(updatedIntegration)
      this.integrations.set(integrationId, validatedConfig)

      // Recreate client if configuration changed
      if (updates.configuration) {
        this.createClient(validatedConfig)
      }

      console.log(`✅ Updated integration: ${integrationId}`)

    } catch (error) {
      console.error('Error updating integration:', error)
      throw error
    }
  }

  /**
   * Test integration connection
   */
  async testIntegration(integrationId: string): Promise<{
    success: boolean
    responseTime: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      const integration = this.integrations.get(integrationId)
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`)
      }

      // Create test lead
      const testLead: CRMLead = {
        id: 'test-lead',
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-0123',
        leadData: {
          income: 75000,
          debts: 15000,
          downPayment: 50000,
          propertyPrice: 300000,
          creditScore: 750,
          employmentType: 'salaried',
          location: 'Test City',
          loanType: 'fixed',
          timeline: '3-6 months',
          propertyType: 'primary'
        },
        leadScore: 85,
        matchConfidence: 0.9,
        source: 'test',
        createdAt: new Date().toISOString()
      }

      // Test export
      const result = await this.exportLead(integrationId, testLead)

      return {
        success: result.success,
        responseTime: Date.now() - startTime,
        error: result.error
      }

    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  // Private helper methods

  private initializeDefaultIntegrations(): void {
    // Initialize with empty integrations
    // In production, these would be loaded from a database
  }

  private createClient(integration: CRMIntegrationConfig): void {
    if (integration.type === 'zapier') return // Zapier uses webhooks

    const client = axios.create({
      baseURL: integration.configuration.apiUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${integration.configuration.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MortgageMatchPro/1.2.0',
        ...integration.configuration.customHeaders
      }
    })

    this.clients.set(integration.id, client)
  }

  private async exportToZapier(integration: CRMIntegrationConfig, lead: CRMLead): Promise<any> {
    if (!integration.configuration.webhookUrl) {
      throw new Error('Zapier webhook URL not configured')
    }

    const payload = this.formatLeadForZapier(lead)
    
    const response = await axios.post(integration.configuration.webhookUrl, payload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return {
      externalId: response.data.id || `zapier_${Date.now()}`
    }
  }

  private async exportToHubSpot(integration: CRMIntegrationConfig, lead: CRMLead): Promise<any> {
    const client = this.clients.get(integration.id)
    if (!client) throw new Error('HubSpot client not initialized')

    const payload = this.formatLeadForHubSpot(lead)
    
    const response = await client.post('/crm/v3/objects/contacts', payload)
    
    return {
      externalId: response.data.id
    }
  }

  private async exportToSalesforce(integration: CRMIntegrationConfig, lead: CRMLead): Promise<any> {
    const client = this.clients.get(integration.id)
    if (!client) throw new Error('Salesforce client not initialized')

    const payload = this.formatLeadForSalesforce(lead)
    
    const response = await client.post('/services/data/v58.0/sobjects/Lead', payload)
    
    return {
      externalId: response.data.id
    }
  }

  private async exportToPipedrive(integration: CRMIntegrationConfig, lead: CRMLead): Promise<any> {
    const client = this.clients.get(integration.id)
    if (!client) throw new Error('Pipedrive client not initialized')

    const payload = this.formatLeadForPipedrive(lead)
    
    const response = await client.post('/v1/persons', payload)
    
    return {
      externalId: response.data.data.id
    }
  }

  private async exportToCustom(integration: CRMIntegrationConfig, lead: CRMLead): Promise<any> {
    const client = this.clients.get(integration.id)
    if (!client) throw new Error('Custom integration client not initialized')

    const payload = this.formatLeadForCustom(lead, integration.configuration.fieldMapping)
    
    const response = await client.post('/leads', payload)
    
    return {
      externalId: response.data.id || response.data.externalId
    }
  }

  private formatLeadForZapier(lead: CRMLead): any {
    return {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      lead_score: lead.leadScore,
      match_confidence: lead.matchConfidence,
      income: lead.leadData.income,
      debts: lead.leadData.debts,
      down_payment: lead.leadData.downPayment,
      property_price: lead.leadData.propertyPrice,
      credit_score: lead.leadData.creditScore,
      employment_type: lead.leadData.employmentType,
      location: lead.leadData.location,
      loan_type: lead.leadData.loanType,
      timeline: lead.leadData.timeline,
      property_type: lead.leadData.propertyType,
      source: lead.source,
      created_at: lead.createdAt,
      tags: lead.tags || [],
      custom_fields: lead.customFields || {}
    }
  }

  private formatLeadForHubSpot(lead: CRMLead): any {
    return {
      properties: {
        firstname: lead.name.split(' ')[0],
        lastname: lead.name.split(' ').slice(1).join(' '),
        email: lead.email,
        phone: lead.phone,
        lead_score: lead.leadScore.toString(),
        match_confidence: lead.matchConfidence.toString(),
        income: lead.leadData.income.toString(),
        debts: lead.leadData.debts.toString(),
        down_payment: lead.leadData.downPayment.toString(),
        property_price: lead.leadData.propertyPrice.toString(),
        credit_score: lead.leadData.creditScore?.toString(),
        employment_type: lead.leadData.employmentType,
        location: lead.leadData.location,
        loan_type: lead.leadData.loanType,
        timeline: lead.leadData.timeline,
        property_type: lead.leadData.propertyType,
        source: lead.source,
        ...lead.customFields
      }
    }
  }

  private formatLeadForSalesforce(lead: CRMLead): any {
    return {
      FirstName: lead.name.split(' ')[0],
      LastName: lead.name.split(' ').slice(1).join(' '),
      Email: lead.email,
      Phone: lead.phone,
      Lead_Score__c: lead.leadScore,
      Match_Confidence__c: lead.matchConfidence,
      Income__c: lead.leadData.income,
      Debts__c: lead.leadData.debts,
      Down_Payment__c: lead.leadData.downPayment,
      Property_Price__c: lead.leadData.propertyPrice,
      Credit_Score__c: lead.leadData.creditScore,
      Employment_Type__c: lead.leadData.employmentType,
      Location__c: lead.leadData.location,
      Loan_Type__c: lead.leadData.loanType,
      Timeline__c: lead.leadData.timeline,
      Property_Type__c: lead.leadData.propertyType,
      Source: lead.source,
      ...lead.customFields
    }
  }

  private formatLeadForPipedrive(lead: CRMLead): any {
    return {
      name: lead.name,
      email: [
        {
          value: lead.email,
          primary: true
        }
      ],
      phone: [
        {
          value: lead.phone,
          primary: true
        }
      ],
      custom_fields: {
        lead_score: lead.leadScore,
        match_confidence: lead.matchConfidence,
        income: lead.leadData.income,
        debts: lead.leadData.debts,
        down_payment: lead.leadData.downPayment,
        property_price: lead.leadData.propertyPrice,
        credit_score: lead.leadData.creditScore,
        employment_type: lead.leadData.employmentType,
        location: lead.leadData.location,
        loan_type: lead.leadData.loanType,
        timeline: lead.leadData.timeline,
        property_type: lead.leadData.propertyType,
        source: lead.source,
        ...lead.customFields
      }
    }
  }

  private formatLeadForCustom(lead: CRMLead, fieldMapping?: Record<string, string>): any {
    const basePayload = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      leadScore: lead.leadScore,
      matchConfidence: lead.matchConfidence,
      leadData: lead.leadData,
      source: lead.source,
      createdAt: lead.createdAt,
      tags: lead.tags,
      customFields: lead.customFields
    }

    if (!fieldMapping) return basePayload

    // Apply field mapping
    const mappedPayload: any = {}
    for (const [key, mappedKey] of Object.entries(fieldMapping)) {
      if (key in basePayload) {
        mappedPayload[mappedKey] = basePayload[key as keyof typeof basePayload]
      }
    }

    return mappedPayload
  }
}

// Export singleton instance
export const crmBridge = CRMBridge.getInstance()

// Convenience functions
export const registerCRMIntegration = (config: CRMIntegrationConfig) =>
  crmBridge.registerIntegration(config)

export const exportLead = (integrationId: string, lead: CRMLead) =>
  crmBridge.exportLead(integrationId, lead)

export const exportLeadToAll = (lead: CRMLead) =>
  crmBridge.exportLeadToAll(lead)

export const getCRMIntegrationStatus = (integrationId: string) =>
  crmBridge.getIntegrationStatus(integrationId)

export const testCRMIntegration = (integrationId: string) =>
  crmBridge.testIntegration(integrationId)
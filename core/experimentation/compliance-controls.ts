import { z } from 'zod'
import { trackEvent } from '../analytics'
import { supabaseAdmin } from '../supabase'

// Compliance schemas
export const ComplianceRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['financial_disclosure', 'ai_transparency', 'data_privacy', 'experiment_ethics', 'regulatory_compliance']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'greaterThan', 'lessThan', 'exists', 'notExists']),
    value: z.any()
  })),
  actions: z.array(z.object({
    type: z.enum(['require_disclosure', 'block_experiment', 'log_event', 'send_alert', 'require_consent']),
    config: z.record(z.any())
  })),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  enabled: z.boolean()
})

export const ComplianceEventSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  eventType: z.string(),
  userId: z.string(),
  experimentId: z.string().optional(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  data: z.record(z.any()),
  resolved: z.boolean(),
  resolvedAt: z.string().optional(),
  createdAt: z.string()
})

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string(),
  changes: z.record(z.any()),
  metadata: z.record(z.any()),
  timestamp: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
})

export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>
export type ComplianceEvent = z.infer<typeof ComplianceEventSchema>
export type AuditLog = z.infer<typeof AuditLogSchema>

// Financial compliance types
export const FINANCIAL_DISCLOSURES = {
  AI_PERSONALIZATION: 'ai_personalization',
  EXPERIMENTAL_FEATURES: 'experimental_features',
  RATE_ACCURACY: 'rate_accuracy',
  RECOMMENDATION_BIAS: 'recommendation_bias',
  DATA_USAGE: 'data_usage'
}

export const REGULATORY_FRAMEWORKS = {
  CFPB: 'cfpb', // Consumer Financial Protection Bureau (US)
  OSFI: 'osfi', // Office of the Superintendent of Financial Institutions (Canada)
  GDPR: 'gdpr', // General Data Protection Regulation (EU)
  PIPEDA: 'pipeda' // Personal Information Protection and Electronic Documents Act (Canada)
}

export class ComplianceControlSystem {
  private complianceRules: Map<string, ComplianceRule> = new Map()
  private auditLogs: AuditLog[] = []
  private complianceEvents: ComplianceEvent[] = []

  constructor() {
    this.loadComplianceRules()
    this.initializeDefaultRules()
  }

  /**
   * Check compliance before running an experiment
   */
  async checkExperimentCompliance(
    experimentId: string,
    userId: string,
    experimentConfig: any
  ): Promise<{
    compliant: boolean
    violations: ComplianceEvent[]
    requiredDisclosures: string[]
    requiredConsents: string[]
  }> {
    try {
      const violations: ComplianceEvent[] = []
      const requiredDisclosures: string[] = []
      const requiredConsents: string[] = []

      // Check all compliance rules
      for (const rule of this.complianceRules.values()) {
        if (!rule.enabled) continue

        const violation = await this.checkRuleCompliance(rule, experimentId, userId, experimentConfig)
        if (violation) {
          violations.push(violation)
          
          // Collect required disclosures and consents
          for (const action of rule.actions) {
            if (action.type === 'require_disclosure') {
              requiredDisclosures.push(action.config.disclosureType)
            }
            if (action.type === 'require_consent') {
              requiredConsents.push(action.config.consentType)
            }
          }
        }
      }

      const compliant = violations.length === 0

      // Log compliance check
      await this.logAuditEvent({
        userId,
        action: 'experiment_compliance_check',
        resource: 'experiment',
        resourceId: experimentId,
        changes: { compliant, violations: violations.length },
        metadata: { experimentConfig }
      })

      return {
        compliant,
        violations,
        requiredDisclosures,
        requiredConsents
      }
    } catch (error) {
      console.error('Error checking experiment compliance:', error)
      throw error
    }
  }

  /**
   * Check compliance for AI personalization
   */
  async checkAIPersonalizationCompliance(
    userId: string,
    personalizationData: any,
    context: Record<string, any> = {}
  ): Promise<{
    compliant: boolean
    requiredDisclosures: string[]
    auditTrail: string[]
  }> {
    try {
      const requiredDisclosures: string[] = []
      const auditTrail: string[] = []

      // Check if AI personalization affects financial recommendations
      if (this.affectsFinancialRecommendations(personalizationData)) {
        requiredDisclosures.push(FINANCIAL_DISCLOSURES.AI_PERSONALIZATION)
        auditTrail.push('AI personalization affects financial recommendations')
      }

      // Check if experimental features are being used
      if (context.experimentalFeatures) {
        requiredDisclosures.push(FINANCIAL_DISCLOSURES.EXPERIMENTAL_FEATURES)
        auditTrail.push('Experimental features in use')
      }

      // Check data usage compliance
      if (this.usesPersonalData(personalizationData)) {
        requiredDisclosures.push(FINANCIAL_DISCLOSURES.DATA_USAGE)
        auditTrail.push('Personal data used for personalization')
      }

      const compliant = requiredDisclosures.length === 0 || 
                       this.hasRequiredConsents(userId, requiredDisclosures)

      // Log AI personalization compliance check
      await this.logAuditEvent({
        userId,
        action: 'ai_personalization_compliance_check',
        resource: 'personalization',
        resourceId: userId,
        changes: { compliant, requiredDisclosures },
        metadata: { personalizationData, context }
      })

      return {
        compliant,
        requiredDisclosures,
        auditTrail
      }
    } catch (error) {
      console.error('Error checking AI personalization compliance:', error)
      throw error
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: string,
    endDate: string
  ): Promise<{
    summary: any
    violations: ComplianceEvent[]
    auditTrail: AuditLog[]
    recommendations: string[]
  }> {
    try {
      // Get compliance events in date range
      const { data: violations } = await supabaseAdmin
        .from('compliance_events')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // Get audit logs in date range
      const { data: auditTrail } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)

      // Generate summary
      const summary = this.generateComplianceSummary(violations || [], auditTrail || [])

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(violations || [])

      return {
        summary,
        violations: violations || [],
        auditTrail: auditTrail || [],
        recommendations
      }
    } catch (error) {
      console.error('Error generating compliance report:', error)
      throw error
    }
  }

  /**
   * Log audit event
   */
  async logAuditEvent(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: `audit_${Date.now()}`,
        ...auditData,
        timestamp: new Date().toISOString()
      }

      // Store in database
      await supabaseAdmin
        .from('audit_logs')
        .insert(auditLog)

      // Store in memory for quick access
      this.auditLogs.push(auditLog)

      // Track audit event
      trackEvent('audit_event_logged', {
        user_id: auditData.userId,
        action: auditData.action,
        resource: auditData.resource
      })
    } catch (error) {
      console.error('Error logging audit event:', error)
    }
  }

  /**
   * Create compliance rule
   */
  async createComplianceRule(rule: ComplianceRule): Promise<string> {
    try {
      const validatedRule = ComplianceRuleSchema.parse(rule)

      // Store in database
      const { data, error } = await supabaseAdmin
        .from('compliance_rules')
        .insert(validatedRule)
        .select()
        .single()

      if (error) throw error

      // Add to local cache
      this.complianceRules.set(validatedRule.id, validatedRule)

      return data.id
    } catch (error) {
      console.error('Error creating compliance rule:', error)
      throw error
    }
  }

  /**
   * Tag financial explanations for traceability
   */
  async tagFinancialExplanation(
    explanationId: string,
    userId: string,
    explanation: string,
    context: Record<string, any> = {}
  ): Promise<{
    tags: string[]
    complianceFlags: string[]
    auditTrail: string[]
  }> {
    try {
      const tags: string[] = []
      const complianceFlags: string[] = []
      const auditTrail: string[] = []

      // Analyze explanation for financial content
      if (this.containsFinancialAdvice(explanation)) {
        tags.push('financial_advice')
        complianceFlags.push('requires_disclaimer')
        auditTrail.push('Financial advice detected in explanation')
      }

      if (this.containsRateInformation(explanation)) {
        tags.push('rate_information')
        complianceFlags.push('requires_accuracy_disclaimer')
        auditTrail.push('Rate information detected in explanation')
      }

      if (this.containsPersonalizedRecommendation(explanation)) {
        tags.push('personalized_recommendation')
        complianceFlags.push('requires_ai_disclosure')
        auditTrail.push('Personalized recommendation detected')
      }

      // Store tagged explanation
      await supabaseAdmin
        .from('tagged_explanations')
        .insert({
          explanation_id: explanationId,
          user_id: userId,
          explanation,
          tags,
          compliance_flags: complianceFlags,
          context,
          created_at: new Date().toISOString()
        })

      // Log tagging event
      await this.logAuditEvent({
        userId,
        action: 'financial_explanation_tagged',
        resource: 'explanation',
        resourceId: explanationId,
        changes: { tags, complianceFlags },
        metadata: { explanation, context }
      })

      return {
        tags,
        complianceFlags,
        auditTrail
      }
    } catch (error) {
      console.error('Error tagging financial explanation:', error)
      throw error
    }
  }

  private async checkRuleCompliance(
    rule: ComplianceRule,
    experimentId: string,
    userId: string,
    experimentConfig: any
  ): Promise<ComplianceEvent | null> {
    // Check if rule conditions are met
    const conditionsMet = rule.conditions.every(condition => {
      const value = this.getFieldValue(experimentConfig, condition.field)
      return this.evaluateCondition(value, condition.operator, condition.value)
    })

    if (!conditionsMet) return null

    // Create compliance event
    const event: ComplianceEvent = {
      id: `compliance_event_${Date.now()}`,
      ruleId: rule.id,
      eventType: 'experiment_violation',
      userId,
      experimentId,
      description: `Compliance rule violated: ${rule.name}`,
      severity: rule.severity,
      data: { experimentConfig, ruleId: rule.id },
      resolved: false,
      createdAt: new Date().toISOString()
    }

    // Store compliance event
    await supabaseAdmin
      .from('compliance_events')
      .insert(event)

    return event
  }

  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((current, key) => current?.[key], obj)
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue
      case 'contains':
        return String(value).includes(String(expectedValue))
      case 'greaterThan':
        return Number(value) > Number(expectedValue)
      case 'lessThan':
        return Number(value) < Number(expectedValue)
      case 'exists':
        return value !== undefined && value !== null
      case 'notExists':
        return value === undefined || value === null
      default:
        return false
    }
  }

  private affectsFinancialRecommendations(personalizationData: any): boolean {
    // Check if personalization affects financial recommendations
    const financialFields = ['rate', 'payment', 'affordability', 'lender', 'mortgage']
    return Object.keys(personalizationData).some(key => 
      financialFields.some(field => key.toLowerCase().includes(field))
    )
  }

  private usesPersonalData(personalizationData: any): boolean {
    // Check if personal data is being used
    const personalFields = ['income', 'location', 'age', 'employment', 'credit']
    return Object.keys(personalizationData).some(key => 
      personalFields.some(field => key.toLowerCase().includes(field))
    )
  }

  private hasRequiredConsents(userId: string, requiredDisclosures: string[]): boolean {
    // Check if user has given required consents
    // This would query the consent management system
    return true // Placeholder
  }

  private containsFinancialAdvice(explanation: string): boolean {
    const financialAdviceKeywords = [
      'recommend', 'suggest', 'advise', 'should', 'best', 'optimal',
      'choose', 'select', 'prefer', 'avoid', 'consider'
    ]
    return financialAdviceKeywords.some(keyword => 
      explanation.toLowerCase().includes(keyword)
    )
  }

  private containsRateInformation(explanation: string): boolean {
    const rateKeywords = ['rate', 'apr', 'interest', 'percentage', '%']
    return rateKeywords.some(keyword => 
      explanation.toLowerCase().includes(keyword)
    )
  }

  private containsPersonalizedRecommendation(explanation: string): boolean {
    const personalKeywords = ['your', 'based on', 'personalized', 'tailored', 'customized']
    return personalKeywords.some(keyword => 
      explanation.toLowerCase().includes(keyword)
    )
  }

  private generateComplianceSummary(violations: ComplianceEvent[], auditTrail: AuditLog[]): any {
    const totalViolations = violations.length
    const criticalViolations = violations.filter(v => v.severity === 'critical').length
    const resolvedViolations = violations.filter(v => v.resolved).length
    const totalAuditEvents = auditTrail.length

    return {
      totalViolations,
      criticalViolations,
      resolvedViolations,
      resolutionRate: totalViolations > 0 ? resolvedViolations / totalViolations : 1,
      totalAuditEvents,
      complianceScore: this.calculateComplianceScore(violations)
    }
  }

  private calculateComplianceScore(violations: ComplianceEvent[]): number {
    if (violations.length === 0) return 100

    const criticalViolations = violations.filter(v => v.severity === 'critical').length
    const highViolations = violations.filter(v => v.severity === 'high').length
    const mediumViolations = violations.filter(v => v.severity === 'medium').length
    const lowViolations = violations.filter(v => v.severity === 'low').length

    const penalty = (criticalViolations * 20) + (highViolations * 10) + (mediumViolations * 5) + (lowViolations * 1)
    return Math.max(0, 100 - penalty)
  }

  private generateComplianceRecommendations(violations: ComplianceEvent[]): string[] {
    const recommendations: string[] = []

    const criticalViolations = violations.filter(v => v.severity === 'critical')
    if (criticalViolations.length > 0) {
      recommendations.push('Address critical compliance violations immediately')
    }

    const unresolvedViolations = violations.filter(v => !v.resolved)
    if (unresolvedViolations.length > 0) {
      recommendations.push('Resolve outstanding compliance violations')
    }

    const frequentViolations = this.getFrequentViolationTypes(violations)
    if (frequentViolations.length > 0) {
      recommendations.push(`Review and update rules for: ${frequentViolations.join(', ')}`)
    }

    recommendations.push('Implement automated compliance monitoring')
    recommendations.push('Regular compliance training for development team')

    return recommendations
  }

  private getFrequentViolationTypes(violations: ComplianceEvent[]): string[] {
    const violationTypes: Record<string, number> = {}
    
    violations.forEach(violation => {
      const type = violation.description.split(':')[0]
      violationTypes[type] = (violationTypes[type] || 0) + 1
    })

    return Object.entries(violationTypes)
      .filter(([_, count]) => count > 1)
      .map(([type, _]) => type)
  }

  private async loadComplianceRules(): Promise<void> {
    const { data } = await supabaseAdmin
      .from('compliance_rules')
      .select('*')
      .eq('enabled', true)

    if (data) {
      data.forEach(rule => {
        this.complianceRules.set(rule.id, rule as ComplianceRule)
      })
    }
  }

  private async initializeDefaultRules(): Promise<void> {
    const defaultRules: ComplianceRule[] = [
      {
        id: 'financial_disclosure_rule',
        name: 'Financial Disclosure Requirement',
        description: 'Require disclosure when AI affects financial recommendations',
        type: 'financial_disclosure',
        conditions: [
          { field: 'affectsFinancialRecommendations', operator: 'equals', value: true }
        ],
        actions: [
          { type: 'require_disclosure', config: { disclosureType: FINANCIAL_DISCLOSURES.AI_PERSONALIZATION } }
        ],
        severity: 'high',
        enabled: true
      },
      {
        id: 'experimental_features_rule',
        name: 'Experimental Features Disclosure',
        description: 'Require disclosure when using experimental features',
        type: 'experiment_ethics',
        conditions: [
          { field: 'experimentalFeatures', operator: 'exists', value: true }
        ],
        actions: [
          { type: 'require_disclosure', config: { disclosureType: FINANCIAL_DISCLOSURES.EXPERIMENTAL_FEATURES } }
        ],
        severity: 'medium',
        enabled: true
      },
      {
        id: 'data_privacy_rule',
        name: 'Data Privacy Protection',
        description: 'Ensure proper consent for personal data usage',
        type: 'data_privacy',
        conditions: [
          { field: 'usesPersonalData', operator: 'equals', value: true }
        ],
        actions: [
          { type: 'require_consent', config: { consentType: 'data_usage' } }
        ],
        severity: 'high',
        enabled: true
      }
    ]

    for (const rule of defaultRules) {
      if (!this.complianceRules.has(rule.id)) {
        await this.createComplianceRule(rule)
      }
    }
  }
}

// Singleton instance
export const complianceControlSystem = new ComplianceControlSystem()
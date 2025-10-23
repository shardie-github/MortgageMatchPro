import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { z } from 'zod'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// RegTech Schemas
export const ComplianceRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  jurisdiction: z.enum(['CA', 'US', 'EU', 'GLOBAL']),
  regulation: z.string(), // e.g., 'OSFI', 'CFPB', 'Basel III', 'TILA', 'RESPA'
  category: z.enum(['lending', 'privacy', 'fairness', 'disclosure', 'reporting']),
  requirements: z.array(z.string()),
  penalties: z.array(z.string()),
  effectiveDate: z.string(),
  lastUpdated: z.string(),
  status: z.enum(['active', 'superseded', 'proposed', 'repealed']),
  keywords: z.array(z.string()),
  impact: z.enum(['high', 'medium', 'low'])
})

export const ComplianceCheckSchema = z.object({
  checkId: z.string(),
  ruleId: z.string(),
  userId: z.string(),
  transactionId: z.string().optional(),
  status: z.enum(['compliant', 'non_compliant', 'requires_review', 'exempt']),
  violations: z.array(z.string()),
  recommendations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  checkedAt: z.string(),
  details: z.record(z.any())
})

export const RegulatoryUpdateSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  jurisdiction: z.string(),
  regulation: z.string(),
  category: z.string(),
  effectiveDate: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  affectedRules: z.array(z.string()),
  changes: z.array(z.string()),
  actionRequired: z.string(),
  source: z.string(),
  publishedAt: z.string()
})

export const ComplianceReportSchema = z.object({
  reportId: z.string(),
  userId: z.string(),
  period: z.string(),
  totalChecks: z.number(),
  compliantChecks: z.number(),
  nonCompliantChecks: z.number(),
  requiresReview: z.number(),
  complianceRate: z.number(),
  violations: z.array(z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    count: z.number(),
    severity: z.enum(['high', 'medium', 'low'])
  })),
  recommendations: z.array(z.string()),
  generatedAt: z.string()
})

export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>
export type RegulatoryUpdate = z.infer<typeof RegulatoryUpdateSchema>
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>

export interface ComplianceCheckRequest {
  userId: string
  transactionData: Record<string, any>
  rules?: string[]
  jurisdiction: 'CA' | 'US' | 'EU'
}

export interface RegulatoryMonitoringConfig {
  jurisdictions: string[]
  regulations: string[]
  categories: string[]
  updateFrequency: 'hourly' | 'daily' | 'weekly'
  alertThresholds: {
    highImpact: boolean
    mediumImpact: boolean
    lowImpact: boolean
  }
}

export class RegTechAgent {
  private model = 'gpt-4o'
  private embeddingModel = 'text-embedding-3-small'

  // Monitor regulatory updates using RAG
  async monitorRegulatoryUpdates(config: RegulatoryMonitoringConfig): Promise<RegulatoryUpdate[]> {
    try {
      console.log('Monitoring regulatory updates...')

      // Get latest updates from knowledge base
      const updates = await this.fetchRegulatoryUpdates(config)
      
      // Process updates with AI analysis
      const processedUpdates = await Promise.all(
        updates.map(update => this.processRegulatoryUpdate(update))
      )

      // Store updates in database
      await this.storeRegulatoryUpdates(processedUpdates)

      return processedUpdates
    } catch (error) {
      console.error('Error monitoring regulatory updates:', error)
      throw error
    }
  }

  // Check compliance for a transaction
  async checkCompliance(request: ComplianceCheckRequest): Promise<ComplianceCheck> {
    try {
      console.log(`Checking compliance for user ${request.userId}`)

      // Get applicable rules
      const applicableRules = await this.getApplicableRules(request.jurisdiction, request.rules)

      // Perform compliance checks
      const checkResults = await Promise.all(
        applicableRules.map(rule => this.checkRuleCompliance(rule, request.transactionData))
      )

      // Generate compliance summary
      const complianceCheck = await this.generateComplianceSummary(
        request.userId,
        checkResults,
        request.transactionData
      )

      // Store compliance check
      await this.storeComplianceCheck(complianceCheck)

      return complianceCheck
    } catch (error) {
      console.error('Error checking compliance:', error)
      throw error
    }
  }

  // Generate compliance report
  async generateComplianceReport(
    userId: string,
    period: { start: string; end: string }
  ): Promise<ComplianceReport> {
    try {
      console.log(`Generating compliance report for user ${userId}`)

      // Get compliance checks for period
      const checks = await this.getComplianceChecks(userId, period)

      // Analyze compliance patterns
      const analysis = await this.analyzeCompliancePatterns(checks)

      // Generate report
      const report = await this.generateComplianceReportContent(userId, period, analysis)

      // Store report
      await this.storeComplianceReport(report)

      return report
    } catch (error) {
      console.error('Error generating compliance report:', error)
      throw error
    }
  }

  // Update compliance rules based on regulatory changes
  async updateComplianceRules(regulatoryUpdate: RegulatoryUpdate): Promise<void> {
    try {
      console.log(`Updating compliance rules for ${regulatoryUpdate.regulation}`)

      // Get affected rules
      const affectedRules = await this.getAffectedRules(regulatoryUpdate.affectedRules)

      // Update rules based on regulatory changes
      const updatedRules = await Promise.all(
        affectedRules.map(rule => this.updateRuleBasedOnRegulation(rule, regulatoryUpdate))
      )

      // Store updated rules
      await this.storeUpdatedRules(updatedRules)

      // Notify stakeholders
      await this.notifyStakeholders(regulatoryUpdate, updatedRules)
    } catch (error) {
      console.error('Error updating compliance rules:', error)
      throw error
    }
  }

  // Get transparency portal data for regulators
  async getTransparencyPortalData(
    jurisdiction: string,
    period: { start: string; end: string }
  ): Promise<{
    complianceSummary: any
    ruleViolations: any[]
    auditTrail: any[]
    modelDecisions: any[]
    regulatoryUpdates: RegulatoryUpdate[]
  }> {
    try {
      const [complianceSummary, ruleViolations, auditTrail, modelDecisions, regulatoryUpdates] = await Promise.all([
        this.getComplianceSummary(jurisdiction, period),
        this.getRuleViolations(jurisdiction, period),
        this.getAuditTrail(jurisdiction, period),
        this.getModelDecisions(jurisdiction, period),
        this.getRegulatoryUpdates(jurisdiction, period)
      ])

      return {
        complianceSummary,
        ruleViolations,
        auditTrail,
        modelDecisions,
        regulatoryUpdates
      }
    } catch (error) {
      console.error('Error getting transparency portal data:', error)
      throw error
    }
  }

  // Private helper methods
  private async fetchRegulatoryUpdates(config: RegulatoryMonitoringConfig): Promise<any[]> {
    // Simulate fetching from regulatory sources
    // In production, integrate with actual regulatory APIs
    const mockUpdates = [
      {
        title: 'OSFI Updates Mortgage Stress Test Guidelines',
        summary: 'New guidelines for mortgage stress testing effective January 2025',
        jurisdiction: 'CA',
        regulation: 'OSFI',
        category: 'lending',
        effectiveDate: '2025-01-01',
        impact: 'high',
        source: 'OSFI Official Website',
        publishedAt: new Date().toISOString()
      },
      {
        title: 'CFPB Issues New Fair Lending Rules',
        summary: 'Updated fair lending requirements for mortgage originators',
        jurisdiction: 'US',
        regulation: 'CFPB',
        category: 'fairness',
        effectiveDate: '2025-03-01',
        impact: 'medium',
        source: 'CFPB Federal Register',
        publishedAt: new Date().toISOString()
      }
    ]

    return mockUpdates.filter(update => 
      config.jurisdictions.includes(update.jurisdiction) &&
      config.regulations.includes(update.regulation)
    )
  }

  private async processRegulatoryUpdate(update: any): Promise<RegulatoryUpdate> {
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a regulatory compliance expert. Analyze regulatory updates and extract key information for compliance monitoring.`
        },
        {
          role: 'user',
          content: `Process this regulatory update:

Title: ${update.title}
Summary: ${update.summary}
Jurisdiction: ${update.jurisdiction}
Regulation: ${update.regulation}
Category: ${update.category}
Effective Date: ${update.effectiveDate}
Impact: ${update.impact}

Extract:
1. Affected rules
2. Specific changes
3. Action required
4. Keywords for monitoring

Return JSON matching RegulatoryUpdateSchema.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000
    })

    const processed = JSON.parse(response.choices[0].message.content || '{}')
    return RegulatoryUpdateSchema.parse({
      ...processed,
      ...update
    })
  }

  private async getApplicableRules(jurisdiction: string, ruleIds?: string[]): Promise<ComplianceRule[]> {
    let query = supabaseAdmin
      .from('compliance_rules')
      .select('*')
      .eq('jurisdiction', jurisdiction)
      .eq('status', 'active')

    if (ruleIds && ruleIds.length > 0) {
      query = query.in('id', ruleIds)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []).map(rule => ComplianceRuleSchema.parse(rule))
  }

  private async checkRuleCompliance(
    rule: ComplianceRule,
    transactionData: Record<string, any>
  ): Promise<{
    ruleId: string
    status: 'compliant' | 'non_compliant' | 'requires_review'
    violations: string[]
    recommendations: string[]
    confidence: number
  }> {
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a compliance expert. Check if transaction data complies with regulatory rules. Be thorough and accurate.`
        },
        {
          role: 'user',
          content: `Check compliance with this rule:

Rule: ${rule.name}
Description: ${rule.description}
Requirements: ${rule.requirements.join(', ')}
Penalties: ${rule.penalties.join(', ')}

Transaction Data: ${JSON.stringify(transactionData, null, 2)}

Determine:
1. Compliance status
2. Any violations
3. Recommendations
4. Confidence level

Return JSON with ruleId, status, violations, recommendations, and confidence.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return {
      ruleId: rule.id,
      status: result.status || 'requires_review',
      violations: result.violations || [],
      recommendations: result.recommendations || [],
      confidence: result.confidence || 0.5
    }
  }

  private async generateComplianceSummary(
    userId: string,
    checkResults: any[],
    transactionData: Record<string, any>
  ): Promise<ComplianceCheck> {
    const violations = checkResults.flatMap(result => result.violations)
    const recommendations = checkResults.flatMap(result => result.recommendations)
    
    const status = violations.length === 0 ? 'compliant' : 
                  violations.some(v => v.includes('high')) ? 'non_compliant' : 'requires_review'

    const confidence = checkResults.reduce((sum, result) => sum + result.confidence, 0) / checkResults.length

    return ComplianceCheckSchema.parse({
      checkId: `check_${Date.now()}`,
      ruleId: checkResults.map(r => r.ruleId).join(','),
      userId,
      status,
      violations,
      recommendations,
      confidence,
      checkedAt: new Date().toISOString(),
      details: {
        transactionData,
        checkResults
      }
    })
  }

  private async analyzeCompliancePatterns(checks: ComplianceCheck[]): Promise<any> {
    const totalChecks = checks.length
    const compliantChecks = checks.filter(c => c.status === 'compliant').length
    const nonCompliantChecks = checks.filter(c => c.status === 'non_compliant').length
    const requiresReview = checks.filter(c => c.status === 'requires_review').length

    const violations = checks.flatMap(c => c.violations)
    const violationCounts = violations.reduce((acc, violation) => {
      acc[violation] = (acc[violation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalChecks,
      compliantChecks,
      nonCompliantChecks,
      requiresReview,
      complianceRate: totalChecks > 0 ? compliantChecks / totalChecks : 0,
      violationCounts,
      recommendations: [...new Set(checks.flatMap(c => c.recommendations))]
    }
  }

  private async generateComplianceReportContent(
    userId: string,
    period: { start: string; end: string },
    analysis: any
  ): Promise<ComplianceReport> {
    const violations = Object.entries(analysis.violationCounts).map(([rule, count]) => ({
      ruleId: rule,
      ruleName: rule,
      count: count as number,
      severity: count > 5 ? 'high' : count > 2 ? 'medium' : 'low'
    }))

    return ComplianceReportSchema.parse({
      reportId: `report_${Date.now()}`,
      userId,
      period: `${period.start} to ${period.end}`,
      totalChecks: analysis.totalChecks,
      compliantChecks: analysis.compliantChecks,
      nonCompliantChecks: analysis.nonCompliantChecks,
      requiresReview: analysis.requiresReview,
      complianceRate: analysis.complianceRate,
      violations,
      recommendations: analysis.recommendations,
      generatedAt: new Date().toISOString()
    })
  }

  private async storeRegulatoryUpdates(updates: RegulatoryUpdate[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('regulatory_updates')
        .upsert(updates.map(update => ({
          id: update.id,
          title: update.title,
          summary: update.summary,
          jurisdiction: update.jurisdiction,
          regulation: update.regulation,
          category: update.category,
          effective_date: update.effectiveDate,
          impact: update.impact,
          affected_rules: update.affectedRules,
          changes: update.changes,
          action_required: update.actionRequired,
          source: update.source,
          published_at: update.publishedAt,
          created_at: new Date().toISOString()
        })))

      if (error) throw error
    } catch (error) {
      console.error('Error storing regulatory updates:', error)
      throw error
    }
  }

  private async storeComplianceCheck(check: ComplianceCheck): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_checks')
        .insert({
          id: check.checkId,
          rule_id: check.ruleId,
          user_id: check.userId,
          transaction_id: check.transactionId,
          status: check.status,
          violations: check.violations,
          recommendations: check.recommendations,
          confidence: check.confidence,
          checked_at: check.checkedAt,
          details: check.details,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing compliance check:', error)
      throw error
    }
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_reports')
        .insert({
          id: report.reportId,
          user_id: report.userId,
          period: report.period,
          total_checks: report.totalChecks,
          compliant_checks: report.compliantChecks,
          non_compliant_checks: report.nonCompliantChecks,
          requires_review: report.requiresReview,
          compliance_rate: report.complianceRate,
          violations: report.violations,
          recommendations: report.recommendations,
          generated_at: report.generatedAt,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing compliance report:', error)
      throw error
    }
  }

  private async getComplianceChecks(
    userId: string,
    period: { start: string; end: string }
  ): Promise<ComplianceCheck[]> {
    const { data, error } = await supabaseAdmin
      .from('compliance_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('checked_at', period.start)
      .lte('checked_at', period.end)

    if (error) throw error
    return (data || []).map(check => ComplianceCheckSchema.parse(check))
  }

  private async getAffectedRules(ruleIds: string[]): Promise<ComplianceRule[]> {
    const { data, error } = await supabaseAdmin
      .from('compliance_rules')
      .select('*')
      .in('id', ruleIds)

    if (error) throw error
    return (data || []).map(rule => ComplianceRuleSchema.parse(rule))
  }

  private async updateRuleBasedOnRegulation(
    rule: ComplianceRule,
    update: RegulatoryUpdate
  ): Promise<ComplianceRule> {
    // Simulate rule update based on regulatory change
    const updatedRule = {
      ...rule,
      lastUpdated: new Date().toISOString(),
      requirements: [...rule.requirements, ...update.changes],
      keywords: [...rule.keywords, ...update.title.split(' ')]
    }

    return ComplianceRuleSchema.parse(updatedRule)
  }

  private async storeUpdatedRules(rules: ComplianceRule[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_rules')
        .upsert(rules.map(rule => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          jurisdiction: rule.jurisdiction,
          regulation: rule.regulation,
          category: rule.category,
          requirements: rule.requirements,
          penalties: rule.penalties,
          effective_date: rule.effectiveDate,
          last_updated: rule.lastUpdated,
          status: rule.status,
          keywords: rule.keywords,
          impact: rule.impact,
          updated_at: new Date().toISOString()
        })))

      if (error) throw error
    } catch (error) {
      console.error('Error storing updated rules:', error)
      throw error
    }
  }

  private async notifyStakeholders(
    update: RegulatoryUpdate,
    rules: ComplianceRule[]
  ): Promise<void> {
    // Send notifications to compliance team, legal team, etc.
    console.log(`Notifying stakeholders about regulatory update: ${update.title}`)
  }

  private async getComplianceSummary(jurisdiction: string, period: any): Promise<any> {
    // Get compliance summary data
    return { jurisdiction, period, summary: 'Compliance summary data' }
  }

  private async getRuleViolations(jurisdiction: string, period: any): Promise<any[]> {
    // Get rule violations data
    return []
  }

  private async getAuditTrail(jurisdiction: string, period: any): Promise<any[]> {
    // Get audit trail data
    return []
  }

  private async getModelDecisions(jurisdiction: string, period: any): Promise<any[]> {
    // Get model decisions data
    return []
  }

  private async getRegulatoryUpdates(jurisdiction: string, period: any): Promise<RegulatoryUpdate[]> {
    // Get regulatory updates data
    return []
  }
}
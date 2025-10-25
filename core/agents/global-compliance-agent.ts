import { z } from 'zod'
import { supabaseAdmin } from '../supabase'

// Compliance Framework Schemas
export const ComplianceRuleSchema = z.object({
  ruleId: z.string(),
  framework: z.enum(['GDPR', 'DORA', 'MiCA', 'OSFI', 'CFPB', 'PSD2', 'PCI-DSS', 'SOC2']),
  region: z.string(),
  category: z.enum(['data_protection', 'financial_services', 'crypto', 'banking', 'privacy', 'security']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  requirements: z.array(z.string()),
  applicableTo: z.array(z.string()),
  enforcementDate: z.string(),
  penalties: z.object({
    monetary: z.number().optional(),
    operational: z.array(z.string()).optional(),
  }),
  implementation: z.object({
    technical: z.array(z.string()),
    procedural: z.array(z.string()),
    documentation: z.array(z.string()),
  }),
})

export const TransactionComplianceSchema = z.object({
  transactionId: z.string(),
  userId: z.string(),
  amount: number,
  currency: string,
  sourceCountry: string,
  destinationCountry: string,
  transactionType: z.enum(['payment', 'transfer', 'conversion', 'settlement']),
  complianceChecks: z.array(z.object({
    checkType: z.string(),
    status: z.enum(['passed', 'failed', 'pending', 'exempt']),
    details: z.string(),
    timestamp: z.string(),
    ruleId: z.string(),
  })),
  riskScore: z.number().min(0).max(100),
  requiredActions: z.array(z.string()),
  auditTrail: z.array(z.object({
    action: z.string(),
    timestamp: z.string(),
    userId: z.string(),
    details: z.string(),
  })),
  status: z.enum(['pending', 'approved', 'rejected', 'requires_review']),
})

export const ComplianceViolationSchema = z.object({
  violationId: z.string(),
  transactionId: z.string(),
  ruleId: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  detectedAt: z.string(),
  status: z.enum(['open', 'investigating', 'resolved', 'false_positive']),
  assignedTo: z.string().optional(),
  resolution: z.string().optional(),
  resolvedAt: z.string().optional(),
  correctiveActions: z.array(z.string()).optional(),
})

export const RegulatoryReportSchema = z.object({
  reportId: z.string(),
  reportType: z.enum(['transaction_report', 'suspicious_activity', 'compliance_audit', 'data_breach']),
  jurisdiction: z.string(),
  reportingPeriod: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  data: z.record(z.any()),
  submittedAt: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'accepted', 'rejected']),
  regulatoryBody: z.string(),
  referenceNumber: z.string().optional(),
})

export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>
export type TransactionCompliance = z.infer<typeof TransactionComplianceSchema>
export type ComplianceViolation = z.infer<typeof ComplianceViolationSchema>
export type RegulatoryReport = z.infer<typeof RegulatoryReportSchema>

// Global Compliance Agent
export class GlobalComplianceAgent {
  private complianceRules: Map<string, ComplianceRule>
  private activeViolations: Map<string, ComplianceViolation>
  private reportingThresholds: Record<string, number>

  constructor() {
    this.complianceRules = new Map()
    this.activeViolations = new Map()
    this.reportingThresholds = {
      'US': 10000, // $10,000
      'CA': 10000, // $10,000 CAD
      'EU': 10000, // €10,000
      'SG': 20000, // S$20,000
    }
    
    this.initializeComplianceRules()
  }

  private initializeComplianceRules(): void {
    // GDPR Rules
    this.complianceRules.set('GDPR-001', {
      ruleId: 'GDPR-001',
      framework: 'GDPR',
      region: 'EU',
      category: 'data_protection',
      severity: 'critical',
      description: 'Personal data processing consent requirement',
      requirements: [
        'Explicit consent must be obtained before processing personal data',
        'Consent must be specific, informed, and unambiguous',
        'Data subjects must be able to withdraw consent easily',
        'Consent records must be maintained for audit purposes',
      ],
      applicableTo: ['data_collection', 'data_processing', 'data_sharing'],
      enforcementDate: '2018-05-25',
      penalties: {
        monetary: 20000000, // €20M or 4% of annual turnover
        operational: ['data_processing_suspension', 'regulatory_investigation'],
      },
      implementation: {
        technical: [
          'Implement consent management system',
          'Add consent checkpoints in data flows',
          'Create data subject rights portal',
        ],
        procedural: [
          'Update privacy policies',
          'Train staff on GDPR requirements',
          'Establish data protection officer role',
        ],
        documentation: [
          'Data processing agreements',
          'Consent records',
          'Data protection impact assessments',
        ],
      },
    })

    // DORA Rules
    this.complianceRules.set('DORA-001', {
      ruleId: 'DORA-001',
      framework: 'DORA',
      region: 'EU',
      category: 'financial_services',
      severity: 'high',
      description: 'Operational resilience requirements for financial entities',
      requirements: [
        'Implement comprehensive ICT risk management framework',
        'Conduct regular business continuity testing',
        'Maintain incident reporting procedures',
        'Ensure third-party risk management',
      ],
      applicableTo: ['ict_systems', 'business_continuity', 'incident_management'],
      enforcementDate: '2025-01-17',
      penalties: {
        monetary: 10000000, // €10M or 2% of annual turnover
        operational: ['operational_restrictions', 'regulatory_supervision'],
      },
      implementation: {
        technical: [
          'Implement ICT risk management tools',
          'Deploy monitoring and alerting systems',
          'Create incident response automation',
        ],
        procedural: [
          'Develop business continuity plans',
          'Establish incident response procedures',
          'Create third-party risk assessments',
        ],
        documentation: [
          'ICT risk management policies',
          'Business continuity documentation',
          'Incident response procedures',
        ],
      },
    })

    // MiCA Rules
    this.complianceRules.set('MICA-001', {
      ruleId: 'MICA-001',
      framework: 'MiCA',
      region: 'EU',
      category: 'crypto',
      severity: 'high',
      description: 'Crypto-asset service provider authorization requirements',
      requirements: [
        'Obtain authorization from competent authority',
        'Implement anti-money laundering procedures',
        'Maintain adequate capital requirements',
        'Ensure consumer protection measures',
      ],
      applicableTo: ['crypto_services', 'stablecoin_operations', 'crypto_trading'],
      enforcementDate: '2024-12-30',
      penalties: {
        monetary: 5000000, // €5M or 3% of annual turnover
        operational: ['service_suspension', 'license_revocation'],
      },
      implementation: {
        technical: [
          'Implement AML/KYC systems',
          'Create transaction monitoring tools',
          'Deploy risk assessment systems',
        ],
        procedural: [
          'Apply for regulatory authorization',
          'Establish compliance monitoring',
          'Create consumer protection policies',
        ],
        documentation: [
          'Authorization applications',
          'AML/KYC procedures',
          'Consumer protection documentation',
        ],
      },
    })

    // OSFI EDGE Rules
    this.complianceRules.set('OSFI-001', {
      ruleId: 'OSFI-001',
      framework: 'OSFI',
      region: 'CA',
      category: 'banking',
      severity: 'high',
      description: 'Enhanced due diligence requirements for high-risk customers',
      requirements: [
        'Conduct enhanced due diligence for high-risk customers',
        'Implement ongoing monitoring procedures',
        'Maintain detailed customer risk profiles',
        'Report suspicious transactions promptly',
      ],
      applicableTo: ['customer_onboarding', 'transaction_monitoring', 'risk_assessment'],
      enforcementDate: '2023-06-01',
      penalties: {
        monetary: 1000000, // $1M CAD
        operational: ['regulatory_supervision', 'compliance_review'],
      },
      implementation: {
        technical: [
          'Implement risk scoring systems',
          'Create customer risk profiles',
          'Deploy transaction monitoring tools',
        ],
        procedural: [
          'Develop enhanced due diligence procedures',
          'Establish ongoing monitoring protocols',
          'Create suspicious transaction reporting',
        ],
        documentation: [
          'Customer risk assessments',
          'Due diligence procedures',
          'Monitoring reports',
        ],
      },
    })

    // CFPB Rules
    this.complianceRules.set('CFPB-001', {
      ruleId: 'CFPB-001',
      framework: 'CFPB',
      region: 'US',
      category: 'financial_services',
      severity: 'high',
      description: 'Fair lending and equal opportunity requirements',
      requirements: [
        'Ensure fair and equal access to credit',
        'Implement non-discriminatory lending practices',
        'Maintain detailed lending records',
        'Conduct regular fair lending audits',
      ],
      applicableTo: ['lending_decisions', 'credit_assessment', 'loan_pricing'],
      enforcementDate: '2011-07-21',
      penalties: {
        monetary: 25000000, // $25M
        operational: ['lending_restrictions', 'regulatory_oversight'],
      },
      implementation: {
        technical: [
          'Implement fair lending algorithms',
          'Create bias detection systems',
          'Deploy audit trail systems',
        ],
        procedural: [
          'Develop fair lending policies',
          'Establish monitoring procedures',
          'Create training programs',
        ],
        documentation: [
          'Fair lending policies',
          'Audit reports',
          'Training records',
        ],
      },
    })
  }

  // Map transaction to jurisdictional requirements
  async mapTransactionToRequirements(transaction: {
    amount: number
    currency: string
    sourceCountry: string
    destinationCountry: string
    transactionType: string
    userId: string
  }): Promise<{
    applicableRules: ComplianceRule[]
    requiredChecks: string[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    recommendations: string[]
  }> {
    const applicableRules: ComplianceRule[] = []
    const requiredChecks: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Determine applicable jurisdictions
    const jurisdictions = this.getApplicableJurisdictions(transaction.sourceCountry, transaction.destinationCountry)
    
    // Find applicable rules
    for (const [ruleId, rule] of this.complianceRules) {
      if (jurisdictions.includes(rule.region) || rule.region === 'GLOBAL') {
        applicableRules.push(rule)
        
        // Add required checks based on rule requirements
        if (rule.category === 'data_protection') {
          requiredChecks.push('consent_verification', 'data_minimization', 'purpose_limitation')
        }
        if (rule.category === 'financial_services') {
          requiredChecks.push('kyc_verification', 'aml_screening', 'sanctions_check')
        }
        if (rule.category === 'crypto') {
          requiredChecks.push('crypto_aml_check', 'wallet_verification', 'transaction_monitoring')
        }
        if (rule.category === 'banking') {
          requiredChecks.push('enhanced_due_diligence', 'ongoing_monitoring', 'suspicious_activity_reporting')
        }
      }
    }

    // Determine risk level
    if (transaction.amount > this.reportingThresholds[transaction.sourceCountry] * 10) {
      riskLevel = 'critical'
    } else if (transaction.amount > this.reportingThresholds[transaction.sourceCountry] * 5) {
      riskLevel = 'high'
    } else if (transaction.amount > this.reportingThresholds[transaction.sourceCountry]) {
      riskLevel = 'medium'
    }

    // Generate recommendations
    const recommendations = this.generateComplianceRecommendations(applicableRules, riskLevel)

    return {
      applicableRules,
      requiredChecks,
      riskLevel,
      recommendations,
    }
  }

  // Detect anomalies in cross-border flows
  async detectAnomalies(transaction: {
    transactionId: string
    amount: number
    currency: string
    sourceCountry: string
    destinationCountry: string
    userId: string
    timestamp: string
  }): Promise<{
    anomalies: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      confidence: number
      recommendedAction: string
    }>
    riskScore: number
  }> {
    const anomalies: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      confidence: number
      recommendedAction: string
    }> = []

    let riskScore = 0

    // Check for unusual transaction patterns
    const userHistory = await this.getUserTransactionHistory(transaction.userId)
    
    // Amount anomaly detection
    const avgAmount = userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length
    if (transaction.amount > avgAmount * 5) {
      anomalies.push({
        type: 'unusual_amount',
        severity: 'high',
        description: `Transaction amount (${transaction.amount}) is 5x higher than user's average (${avgAmount})`,
        confidence: 0.85,
        recommendedAction: 'Enhanced due diligence required',
      })
      riskScore += 30
    }

    // Frequency anomaly detection
    const recentTransactions = userHistory.filter(t => 
      new Date(t.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    )
    if (recentTransactions.length > 10) {
      anomalies.push({
        type: 'high_frequency',
        severity: 'medium',
        description: `User has made ${recentTransactions.length} transactions in the last 24 hours`,
        confidence: 0.70,
        recommendedAction: 'Review transaction patterns',
      })
      riskScore += 20
    }

    // Geographic anomaly detection
    const uniqueCountries = new Set(userHistory.map(t => t.destinationCountry))
    if (uniqueCountries.size > 5) {
      anomalies.push({
        type: 'multiple_jurisdictions',
        severity: 'medium',
        description: `User has transacted with ${uniqueCountries.size} different countries`,
        confidence: 0.60,
        recommendedAction: 'Verify business purpose',
      })
      riskScore += 15
    }

    // Currency anomaly detection
    const currencyPattern = userHistory.map(t => t.currency)
    const uniqueCurrencies = new Set(currencyPattern)
    if (uniqueCurrencies.size > 3) {
      anomalies.push({
        type: 'multiple_currencies',
        severity: 'low',
        description: `User has transacted in ${uniqueCurrencies.size} different currencies`,
        confidence: 0.50,
        recommendedAction: 'Monitor currency usage',
      })
      riskScore += 10
    }

    // Time-based anomaly detection
    const hour = new Date(transaction.timestamp).getHours()
    if (hour < 6 || hour > 22) {
      anomalies.push({
        type: 'unusual_timing',
        severity: 'low',
        description: `Transaction occurred at unusual hour: ${hour}:00`,
        confidence: 0.40,
        recommendedAction: 'Verify transaction legitimacy',
      })
      riskScore += 5
    }

    return {
      anomalies,
      riskScore: Math.min(riskScore, 100),
    }
  }

  // Generate real-time regulatory audit trails
  async generateAuditTrail(transaction: TransactionCompliance): Promise<{
    auditTrailId: string
    transactionId: string
    events: Array<{
      timestamp: string
      event: string
      details: string
      userId: string
      system: string
    }>
    complianceStatus: string
    nextReviewDate: string
  }> {
    const auditTrailId = `AUDIT${Date.now()}${Math.random().toString(36).substr(2, 6)}`
    
    const events = [
      {
        timestamp: new Date().toISOString(),
        event: 'transaction_initiated',
        details: `Transaction ${transaction.transactionId} initiated for ${transaction.amount} ${transaction.currency}`,
        userId: transaction.userId,
        system: 'payment_rails',
      },
      {
        timestamp: new Date().toISOString(),
        event: 'compliance_checks_started',
        details: `Started compliance checks for transaction ${transaction.transactionId}`,
        userId: 'system',
        system: 'compliance_agent',
      },
    ]

    // Add compliance check events
    for (const check of transaction.complianceChecks) {
      events.push({
        timestamp: check.timestamp,
        event: `compliance_check_${check.status}`,
        details: `${check.checkType}: ${check.details}`,
        userId: 'system',
        system: 'compliance_agent',
      })
    }

    // Add risk assessment event
    events.push({
      timestamp: new Date().toISOString(),
      event: 'risk_assessment_completed',
      details: `Risk score: ${transaction.riskScore}/100`,
      userId: 'system',
      system: 'risk_engine',
    })

    // Add final status event
    events.push({
      timestamp: new Date().toISOString(),
      event: 'transaction_processed',
      details: `Transaction ${transaction.transactionId} ${transaction.status}`,
      userId: 'system',
      system: 'payment_rails',
    })

    // Determine compliance status
    const failedChecks = transaction.complianceChecks.filter(c => c.status === 'failed')
    const complianceStatus = failedChecks.length === 0 ? 'compliant' : 'non_compliant'

    // Calculate next review date (30 days for high-risk, 90 days for medium-risk, 1 year for low-risk)
    const reviewDays = transaction.riskScore > 70 ? 30 : transaction.riskScore > 40 ? 90 : 365
    const nextReviewDate = new Date(Date.now() + reviewDays * 24 * 60 * 60 * 1000).toISOString()

    return {
      auditTrailId,
      transactionId: transaction.transactionId,
      events,
      complianceStatus,
      nextReviewDate,
    }
  }

  // Generate breach alerts
  async generateBreachAlert(violation: ComplianceViolation): Promise<{
    alertId: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    affectedSystems: string[]
    recommendedActions: string[]
    escalationPath: string[]
    deadline: string
  }> {
    const alertId = `ALERT${Date.now()}${Math.random().toString(36).substr(2, 6)}`
    
    const rule = this.complianceRules.get(violation.ruleId)
    if (!rule) {
      throw new Error(`Rule not found: ${violation.ruleId}`)
    }

    const severity = violation.severity
    const title = `Compliance Violation: ${rule.description}`
    const description = `Violation detected in transaction ${violation.transactionId}: ${violation.description}`

    const affectedSystems = this.getAffectedSystems(rule.category)
    const recommendedActions = this.getRecommendedActions(rule, violation)
    const escalationPath = this.getEscalationPath(severity)
    
    // Calculate deadline based on severity
    const deadlineHours = {
      'low': 72,
      'medium': 24,
      'high': 8,
      'critical': 2,
    }
    const deadline = new Date(Date.now() + deadlineHours[severity] * 60 * 60 * 1000).toISOString()

    return {
      alertId,
      severity,
      title,
      description,
      affectedSystems,
      recommendedActions,
      escalationPath,
      deadline,
    }
  }

  // Generate regulatory reports
  async generateRegulatoryReport(reportType: string, jurisdiction: string, data: any): Promise<RegulatoryReport> {
    const reportId = `RPT${Date.now()}${Math.random().toString(36).substr(2, 6)}`
    
    const reportingPeriod = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    }

    const regulatoryBody = this.getRegulatoryBody(jurisdiction)
    
    const report: RegulatoryReport = {
      reportId,
      reportType: reportType as any,
      jurisdiction,
      reportingPeriod,
      data,
      status: 'draft',
      regulatoryBody,
    }

    // Store report in database
    await supabaseAdmin
      .from('regulatory_reports')
      .insert([report])

    return report
  }

  // Helper methods
  private getApplicableJurisdictions(sourceCountry: string, destinationCountry: string): string[] {
    const jurisdictions = new Set<string>()
    
    // Add source country jurisdiction
    if (sourceCountry === 'US') jurisdictions.add('US')
    if (sourceCountry === 'CA') jurisdictions.add('CA')
    if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'LU'].includes(sourceCountry)) {
      jurisdictions.add('EU')
    }
    if (['SG', 'AU', 'JP', 'HK', 'NZ'].includes(sourceCountry)) {
      jurisdictions.add('APAC')
    }

    // Add destination country jurisdiction
    if (destinationCountry === 'US') jurisdictions.add('US')
    if (destinationCountry === 'CA') jurisdictions.add('CA')
    if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'LU'].includes(destinationCountry)) {
      jurisdictions.add('EU')
    }
    if (['SG', 'AU', 'JP', 'HK', 'NZ'].includes(destinationCountry)) {
      jurisdictions.add('APAC')
    }

    // Add global jurisdiction for cross-border transactions
    if (sourceCountry !== destinationCountry) {
      jurisdictions.add('GLOBAL')
    }

    return Array.from(jurisdictions)
  }

  private generateComplianceRecommendations(rules: ComplianceRule[], riskLevel: string): string[] {
    const recommendations: string[] = []

    for (const rule of rules) {
      if (rule.severity === 'critical' || riskLevel === 'critical') {
        recommendations.push(`CRITICAL: Implement ${rule.description} immediately`)
      } else if (rule.severity === 'high' || riskLevel === 'high') {
        recommendations.push(`HIGH: Address ${rule.description} within 24 hours`)
      } else if (rule.severity === 'medium' || riskLevel === 'medium') {
        recommendations.push(`MEDIUM: Review ${rule.description} within 7 days`)
      } else {
        recommendations.push(`LOW: Monitor ${rule.description} ongoing`)
      }
    }

    return recommendations
  }

  private async getUserTransactionHistory(userId: string): Promise<Array<{
    amount: number
    currency: string
    destinationCountry: string
    timestamp: string
  }>> {
    // This would query the actual database
    // For now, return mock data
    return [
      { amount: 1000, currency: 'USD', destinationCountry: 'US', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      { amount: 500, currency: 'CAD', destinationCountry: 'CA', timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
      { amount: 750, currency: 'EUR', destinationCountry: 'DE', timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() },
    ]
  }

  private getAffectedSystems(category: string): string[] {
    const systemMap: Record<string, string[]> = {
      'data_protection': ['user_management', 'data_storage', 'api_gateway'],
      'financial_services': ['payment_rails', 'risk_engine', 'compliance_agent'],
      'crypto': ['stablecoin_service', 'wallet_service', 'blockchain_monitor'],
      'banking': ['kyc_service', 'aml_service', 'transaction_monitor'],
      'privacy': ['consent_manager', 'data_processor', 'audit_logger'],
      'security': ['authentication', 'authorization', 'encryption'],
    }
    return systemMap[category] || []
  }

  private getRecommendedActions(rule: ComplianceRule, violation: ComplianceViolation): string[] {
    const actions: string[] = []
    
    actions.push(`Review and update ${rule.category} procedures`)
    actions.push(`Implement additional monitoring for ${violation.ruleId}`)
    actions.push(`Conduct staff training on ${rule.framework} requirements`)
    
    if (rule.severity === 'critical') {
      actions.push('Immediately suspend affected operations')
      actions.push('Notify senior management and legal team')
    }
    
    return actions
  }

  private getEscalationPath(severity: string): string[] {
    const escalationMap: Record<string, string[]> = {
      'low': ['compliance_team'],
      'medium': ['compliance_team', 'risk_management'],
      'high': ['compliance_team', 'risk_management', 'legal_team'],
      'critical': ['compliance_team', 'risk_management', 'legal_team', 'executive_team', 'regulatory_affairs'],
    }
    return escalationMap[severity] || []
  }

  private getRegulatoryBody(jurisdiction: string): string {
    const bodyMap: Record<string, string> = {
      'US': 'CFPB',
      'CA': 'OSFI',
      'EU': 'EBA',
      'GB': 'FCA',
      'SG': 'MAS',
      'AU': 'ASIC',
    }
    return bodyMap[jurisdiction] || 'UNKNOWN'
  }
}
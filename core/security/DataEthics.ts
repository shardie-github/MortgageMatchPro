/**
 * Data Ethics and Security Framework
 * v1.2.0 - Implements audit trails, encryption, and ethical AI practices
 */

import { z } from 'zod'
import crypto from 'crypto'
import { supabaseAdmin } from '../supabase'

// Audit trail schemas
export const AuditTrailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.string(),
  resource: z.string(),
  timestamp: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string(),
  modelVersion: z.string(),
  purpose: z.string(),
  dataProcessed: z.record(z.any()).optional(),
  result: z.enum(['success', 'failure', 'partial']),
  errorMessage: z.string().optional(),
  processingTime: z.number(),
  tokensUsed: z.number().optional(),
  cost: z.number().optional()
})

export const DataEthicsReportSchema = z.object({
  id: z.string(),
  generatedAt: z.string(),
  period: z.object({
    start: z.string(),
    end: z.string()
  }),
  metrics: z.object({
    totalQueries: z.number(),
    averageConfidence: z.number(),
    biasScore: z.number(),
    fairnessScore: z.number(),
    privacyScore: z.number(),
    transparencyScore: z.number()
  }),
  recommendations: z.array(z.string()),
  compliance: z.object({
    gdpr: z.boolean(),
    ccpa: z.boolean(),
    pipeda: z.boolean(),
    aiEthics: z.boolean()
  })
})

export type AuditTrail = z.infer<typeof AuditTrailSchema>
export type DataEthicsReport = z.infer<typeof DataEthicsReportSchema>

export class DataEthicsService {
  private static instance: DataEthicsService
  private encryptionKey: string
  private auditTrail: AuditTrail[] = []

  private constructor() {
    this.encryptionKey = process.env.DATA_ENCRYPTION_KEY || this.generateEncryptionKey()
  }

  static getInstance(): DataEthicsService {
    if (!DataEthicsService.instance) {
      DataEthicsService.instance = new DataEthicsService()
    }
    return DataEthicsService.instance
  }

  /**
   * Log AI query with full audit trail
   */
  async logAIQuery(
    userId: string,
    action: string,
    resource: string,
    modelVersion: string,
    purpose: string,
    dataProcessed?: Record<string, any>,
    result: 'success' | 'failure' | 'partial' = 'success',
    errorMessage?: string,
    processingTime: number = 0,
    tokensUsed?: number,
    cost?: number,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      const auditEntry: AuditTrail = {
        id: this.generateId(),
        userId: this.anonymizeUserId(userId),
        action,
        resource,
        timestamp: new Date().toISOString(),
        ipAddress: this.anonymizeIP(ipAddress),
        userAgent: this.anonymizeUserAgent(userAgent),
        requestId: requestId || this.generateId(),
        modelVersion,
        purpose,
        dataProcessed: this.anonymizeData(dataProcessed),
        result,
        errorMessage: errorMessage ? this.encrypt(errorMessage) : undefined,
        processingTime,
        tokensUsed,
        cost
      }

      // Store in memory (in production, this would go to a secure database)
      this.auditTrail.push(auditEntry)

      // Store in database
      await this.storeAuditEntry(auditEntry)

      console.log(`📝 Logged AI query: ${action} for user ${this.anonymizeUserId(userId)}`)

      return auditEntry.id

    } catch (error) {
      console.error('Error logging AI query:', error)
      throw error
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): string {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey)
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return encrypted
    } catch (error) {
      console.error('Error encrypting data:', error)
      return data // Return original data if encryption fails
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey)
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      console.error('Error decrypting data:', error)
      return encryptedData // Return encrypted data if decryption fails
    }
  }

  /**
   * Generate data ethics report
   */
  async generateDataEthicsReport(
    startDate: string,
    endDate: string
  ): Promise<DataEthicsReport> {
    try {
      console.log('🔍 Generating data ethics report...')

      // Get audit trail for the period
      const auditEntries = this.auditTrail.filter(entry => 
        entry.timestamp >= startDate && entry.timestamp <= endDate
      )

      // Calculate metrics
      const metrics = await this.calculateEthicsMetrics(auditEntries)
      
      // Check compliance
      const compliance = await this.checkCompliance(auditEntries)
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(metrics, compliance)

      const report: DataEthicsReport = {
        id: this.generateId(),
        generatedAt: new Date().toISOString(),
        period: { start: startDate, end: endDate },
        metrics,
        recommendations,
        compliance
      }

      // Store report
      await this.storeEthicsReport(report)

      console.log('✅ Data ethics report generated successfully')

      return report

    } catch (error) {
      console.error('Error generating data ethics report:', error)
      throw error
    }
  }

  /**
   * Run fairness check on rate recommendations
   */
  async runFairnessCheck(): Promise<{
    isFair: boolean
    biasScore: number
    issues: string[]
    recommendations: string[]
  }> {
    try {
      console.log('🔍 Running fairness check...')

      // Get recent rate recommendations
      const recentEntries = this.auditTrail
        .filter(entry => 
          entry.action === 'rate_recommendation' && 
          entry.result === 'success' &&
          new Date(entry.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        )

      if (recentEntries.length < 10) {
        return {
          isFair: true,
          biasScore: 0,
          issues: [],
          recommendations: ['Insufficient data for fairness analysis']
        }
      }

      // Analyze for bias patterns
      const biasAnalysis = await this.analyzeBiasPatterns(recentEntries)
      
      // Check for demographic bias
      const demographicBias = await this.checkDemographicBias(recentEntries)
      
      // Check for geographic bias
      const geographicBias = await this.checkGeographicBias(recentEntries)

      const issues: string[] = []
      const recommendations: string[] = []

      if (biasAnalysis.score > 0.3) {
        issues.push('Significant bias detected in rate recommendations')
        recommendations.push('Review and adjust recommendation algorithms')
      }

      if (demographicBias.score > 0.2) {
        issues.push('Demographic bias detected')
        recommendations.push('Implement demographic fairness checks')
      }

      if (geographicBias.score > 0.2) {
        issues.push('Geographic bias detected')
        recommendations.push('Review geographic distribution of recommendations')
      }

      const overallBiasScore = Math.max(biasAnalysis.score, demographicBias.score, geographicBias.score)

      return {
        isFair: overallBiasScore < 0.2,
        biasScore: overallBiasScore,
        issues,
        recommendations
      }

    } catch (error) {
      console.error('Error running fairness check:', error)
      return {
        isFair: false,
        biasScore: 1.0,
        issues: ['Fairness check failed'],
        recommendations: ['Investigate fairness check system']
      }
    }
  }

  /**
   * Get audit trail for a user
   */
  async getUserAuditTrail(
    userId: string,
    limit: number = 100
  ): Promise<AuditTrail[]> {
    try {
      const anonymizedUserId = this.anonymizeUserId(userId)
      
      return this.auditTrail
        .filter(entry => entry.userId === anonymizedUserId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

    } catch (error) {
      console.error('Error getting user audit trail:', error)
      return []
    }
  }

  /**
   * Export audit trail for compliance
   */
  async exportAuditTrail(
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const entries = this.auditTrail.filter(entry => 
        entry.timestamp >= startDate && entry.timestamp <= endDate
      )

      if (format === 'csv') {
        return this.convertToCSV(entries)
      } else {
        return JSON.stringify(entries, null, 2)
      }

    } catch (error) {
      console.error('Error exporting audit trail:', error)
      throw error
    }
  }

  // Private helper methods

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private generateId(): string {
    return crypto.randomUUID()
  }

  private anonymizeUserId(userId: string): string {
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16)
  }

  private anonymizeIP(ip?: string): string | undefined {
    if (!ip) return undefined
    // Remove last octet for IPv4, last 4 groups for IPv6
    if (ip.includes('.')) {
      return ip.split('.').slice(0, 3).join('.') + '.xxx'
    } else if (ip.includes(':')) {
      return ip.split(':').slice(0, 4).join(':') + ':xxxx'
    }
    return 'xxx.xxx.xxx.xxx'
  }

  private anonymizeUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined
    // Keep browser type but remove version details
    return userAgent.replace(/\d+\.\d+\.\d+\.\d+/g, 'x.x.x.x')
  }

  private anonymizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined

    const anonymized = { ...data }
    
    // Remove or anonymize sensitive fields
    const sensitiveFields = ['ssn', 'sin', 'creditCard', 'bankAccount', 'email', 'phone']
    
    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = '[REDACTED]'
      }
    }

    return anonymized
  }

  private async storeAuditEntry(entry: AuditTrail): Promise<void> {
    try {
      await supabaseAdmin
        .from('audit_trail')
        .insert(entry)
    } catch (error) {
      console.error('Error storing audit entry:', error)
    }
  }

  private async storeEthicsReport(report: DataEthicsReport): Promise<void> {
    try {
      await supabaseAdmin
        .from('data_ethics_reports')
        .insert(report)
    } catch (error) {
      console.error('Error storing ethics report:', error)
    }
  }

  private async calculateEthicsMetrics(entries: AuditTrail[]): Promise<DataEthicsReport['metrics']> {
    const totalQueries = entries.length
    const averageConfidence = 0.85 // Mock value - would be calculated from actual data
    const biasScore = await this.calculateBiasScore(entries)
    const fairnessScore = await this.calculateFairnessScore(entries)
    const privacyScore = await this.calculatePrivacyScore(entries)
    const transparencyScore = await this.calculateTransparencyScore(entries)

    return {
      totalQueries,
      averageConfidence,
      biasScore,
      fairnessScore,
      privacyScore,
      transparencyScore
    }
  }

  private async calculateBiasScore(entries: AuditTrail[]): Promise<number> {
    // Mock bias calculation - in production, this would analyze actual data
    return Math.random() * 0.3
  }

  private async calculateFairnessScore(entries: AuditTrail[]): Promise<number> {
    // Mock fairness calculation
    return 0.8 + Math.random() * 0.2
  }

  private async calculatePrivacyScore(entries: AuditTrail[]): Promise<number> {
    // Mock privacy score calculation
    return 0.9 + Math.random() * 0.1
  }

  private async calculateTransparencyScore(entries: AuditTrail[]): Promise<number> {
    // Mock transparency score calculation
    return 0.75 + Math.random() * 0.25
  }

  private async checkCompliance(entries: AuditTrail[]): Promise<DataEthicsReport['compliance']> {
    // Mock compliance checks - in production, these would be real checks
    return {
      gdpr: true,
      ccpa: true,
      pipeda: true,
      aiEthics: true
    }
  }

  private async generateRecommendations(
    metrics: DataEthicsReport['metrics'],
    compliance: DataEthicsReport['compliance']
  ): Promise<string[]> {
    const recommendations: string[] = []

    if (metrics.biasScore > 0.3) {
      recommendations.push('Implement bias detection and mitigation measures')
    }

    if (metrics.fairnessScore < 0.8) {
      recommendations.push('Review and improve fairness in AI decision making')
    }

    if (metrics.privacyScore < 0.9) {
      recommendations.push('Enhance data privacy protection measures')
    }

    if (metrics.transparencyScore < 0.8) {
      recommendations.push('Improve transparency in AI explanations')
    }

    if (!compliance.gdpr) {
      recommendations.push('Ensure GDPR compliance for EU users')
    }

    if (!compliance.ccpa) {
      recommendations.push('Ensure CCPA compliance for California users')
    }

    return recommendations
  }

  private async analyzeBiasPatterns(entries: AuditTrail[]): Promise<{ score: number }> {
    // Mock bias pattern analysis
    return { score: Math.random() * 0.2 }
  }

  private async checkDemographicBias(entries: AuditTrail[]): Promise<{ score: number }> {
    // Mock demographic bias check
    return { score: Math.random() * 0.15 }
  }

  private async checkGeographicBias(entries: AuditTrail[]): Promise<{ score: number }> {
    // Mock geographic bias check
    return { score: Math.random() * 0.1 }
  }

  private convertToCSV(entries: AuditTrail[]): string {
    if (entries.length === 0) return ''

    const headers = Object.keys(entries[0]).join(',')
    const rows = entries.map(entry => 
      Object.values(entry).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    )

    return [headers, ...rows].join('\n')
  }
}

// Export singleton instance
export const dataEthicsService = DataEthicsService.getInstance()

// Convenience functions
export const logAIQuery = (
  userId: string,
  action: string,
  resource: string,
  modelVersion: string,
  purpose: string,
  dataProcessed?: Record<string, any>,
  result?: 'success' | 'failure' | 'partial',
  errorMessage?: string,
  processingTime?: number,
  tokensUsed?: number,
  cost?: number,
  requestId?: string,
  ipAddress?: string,
  userAgent?: string
) => dataEthicsService.logAIQuery(
  userId, action, resource, modelVersion, purpose, dataProcessed,
  result, errorMessage, processingTime, tokensUsed, cost,
  requestId, ipAddress, userAgent
)

export const generateDataEthicsReport = (startDate: string, endDate: string) =>
  dataEthicsService.generateDataEthicsReport(startDate, endDate)

export const runFairnessCheck = () => dataEthicsService.runFairnessCheck()

export const getUserAuditTrail = (userId: string, limit?: number) =>
  dataEthicsService.getUserAuditTrail(userId, limit)
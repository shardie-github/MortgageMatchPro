import { supabaseAdmin } from './supabase'
import { errorTracking } from './monitoring'

export interface ConsentRecord {
  leadId: string
  userId?: string
  consentType: 'data_sharing' | 'marketing' | 'analytics' | 'broker_contact'
  granted: boolean
  timestamp: string
  ipAddress: string
  userAgent: string
  consentVersion: string
  withdrawalTimestamp?: string
}

export interface DataRetentionPolicy {
  leadData: number // days
  auditLogs: number // days
  conversionEvents: number // days
  personalData: number // days
}

export class ComplianceService {
  private readonly RETENTION_POLICIES: DataRetentionPolicy = {
    leadData: 2555, // 7 years for financial records
    auditLogs: 2555, // 7 years for compliance
    conversionEvents: 2555, // 7 years for financial records
    personalData: 1095, // 3 years for general personal data
  }

  /**
   * Record user consent for data processing
   */
  async recordConsent(
    leadId: string,
    userId: string | undefined,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      const consentRecord: ConsentRecord = {
        leadId,
        userId,
        consentType,
        granted,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent,
        consentVersion: '1.0',
      }

      const { error } = await supabaseAdmin
        .from('consent_records')
        .insert(consentRecord)

      if (error) {
        throw new Error(`Failed to record consent: ${error.message}`)
      }

      // Log consent event for audit
      await this.logAuditEvent('consent_recorded', userId, {
        leadId,
        consentType,
        granted,
        ipAddress
      })

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'compliance',
        operation: 'record_consent',
        leadId,
        userId
      })
      throw error
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(
    leadId: string,
    userId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('consent_records')
        .update({
          granted: false,
          withdrawalTimestamp: new Date().toISOString()
        })
        .eq('lead_id', leadId)
        .eq('user_id', userId)
        .eq('consent_type', consentType)

      if (error) {
        throw new Error(`Failed to withdraw consent: ${error.message}`)
      }

      // Log withdrawal event for audit
      await this.logAuditEvent('consent_withdrawn', userId, {
        leadId,
        consentType
      })

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'compliance',
        operation: 'withdraw_consent',
        leadId,
        userId
      })
      throw error
    }
  }

  /**
   * Check if user has valid consent for data processing
   */
  async hasValidConsent(
    leadId: string,
    userId: string | undefined,
    consentType: ConsentRecord['consentType']
  ): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('consent_records')
        .select('*')
        .eq('lead_id', leadId)
        .eq('consent_type', consentType)
        .eq('granted', true)
        .order('timestamp', { ascending: false })
        .limit(1)

      if (error) {
        throw new Error(`Failed to check consent: ${error.message}`)
      }

      if (!data || data.length === 0) {
        return false
      }

      const consent = data[0]
      
      // Check if consent was withdrawn
      if (consent.withdrawalTimestamp) {
        return false
      }

      // Check if consent is still valid (not expired)
      const consentAge = Date.now() - new Date(consent.timestamp).getTime()
      const maxAge = 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
      
      return consentAge < maxAge

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'compliance',
        operation: 'check_consent',
        leadId,
        userId
      })
      return false
    }
  }

  /**
   * Anonymize personal data for compliance
   */
  async anonymizePersonalData(leadId: string): Promise<void> {
    try {
      // Anonymize lead data
      const { error: leadError } = await supabaseAdmin
        .from('leads')
        .update({
          name: 'ANONYMIZED',
          email: 'anonymized@example.com',
          phone: '000-000-0000',
          lead_data: {
            ...req.body.leadData,
            anonymized: true,
            anonymizedAt: new Date().toISOString()
          }
        })
        .eq('id', leadId)

      if (leadError) {
        throw new Error(`Failed to anonymize lead data: ${leadError.message}`)
      }

      // Log anonymization event
      await this.logAuditEvent('data_anonymized', undefined, {
        leadId,
        reason: 'user_request'
      })

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'compliance',
        operation: 'anonymize_data',
        leadId
      })
      throw error
    }
  }

  /**
   * Delete personal data (GDPR Right to be Forgotten)
   */
  async deletePersonalData(leadId: string, userId: string): Promise<void> {
    try {
      // Verify user has right to delete this data
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('user_id')
        .eq('id', leadId)
        .single()

      if (leadError || !lead || lead.user_id !== userId) {
        throw new Error('Unauthorized to delete this data')
      }

      // Delete lead data
      const { error: deleteError } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (deleteError) {
        throw new Error(`Failed to delete lead data: ${deleteError.message}`)
      }

      // Delete consent records
      await supabaseAdmin
        .from('consent_records')
        .delete()
        .eq('lead_id', leadId)

      // Log deletion event
      await this.logAuditEvent('data_deleted', userId, {
        leadId,
        reason: 'gdpr_request'
      })

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'compliance',
        operation: 'delete_personal_data',
        leadId,
        userId
      })
      throw error
    }
  }

  /**
   * Clean up expired data based on retention policies
   */
  async cleanupExpiredData(): Promise<{
    deletedLeads: number
    deletedAuditLogs: number
    deletedConsentRecords: number
  }> {
    try {
      const now = new Date()
      let deletedLeads = 0
      let deletedAuditLogs = 0
      let deletedConsentRecords = 0

      // Clean up expired lead data
      const leadCutoff = new Date(now.getTime() - this.RETENTION_POLICIES.leadData * 24 * 60 * 60 * 1000)
      const { data: expiredLeads } = await supabaseAdmin
        .from('leads')
        .select('id')
        .lt('created_at', leadCutoff.toISOString())

      if (expiredLeads && expiredLeads.length > 0) {
        const { error: leadDeleteError } = await supabaseAdmin
          .from('leads')
          .delete()
          .lt('created_at', leadCutoff.toISOString())

        if (!leadDeleteError) {
          deletedLeads = expiredLeads.length
        }
      }

      // Clean up expired audit logs
      const auditCutoff = new Date(now.getTime() - this.RETENTION_POLICIES.auditLogs * 24 * 60 * 60 * 1000)
      const { data: expiredAuditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('id')
        .lt('timestamp', auditCutoff.toISOString())

      if (expiredAuditLogs && expiredAuditLogs.length > 0) {
        const { error: auditDeleteError } = await supabaseAdmin
          .from('audit_logs')
          .delete()
          .lt('timestamp', auditCutoff.toISOString())

        if (!auditDeleteError) {
          deletedAuditLogs = expiredAuditLogs.length
        }
      }

      // Clean up expired consent records
      const consentCutoff = new Date(now.getTime() - this.RETENTION_POLICIES.personalData * 24 * 60 * 60 * 1000)
      const { data: expiredConsentRecords } = await supabaseAdmin
        .from('consent_records')
        .select('id')
        .lt('timestamp', consentCutoff.toISOString())

      if (expiredConsentRecords && expiredConsentRecords.length > 0) {
        const { error: consentDeleteError } = await supabaseAdmin
          .from('consent_records')
          .delete()
          .lt('timestamp', consentCutoff.toISOString())

        if (!consentDeleteError) {
          deletedConsentRecords = expiredConsentRecords.length
        }
      }

      // Log cleanup event
      await this.logAuditEvent('data_cleanup', undefined, {
        deletedLeads,
        deletedAuditLogs,
        deletedConsentRecords,
        cutoffDate: now.toISOString()
      })

      return {
        deletedLeads,
        deletedAuditLogs,
        deletedConsentRecords
      }

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'compliance',
        operation: 'cleanup_expired_data'
      })
      throw error
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<{
    totalLeads: number
    activeConsents: number
    withdrawnConsents: number
    dataRetentionStatus: {
      leadsWithinRetention: number
      leadsExpired: number
      auditLogsWithinRetention: number
      auditLogsExpired: number
    }
    privacyRequests: {
      anonymizationRequests: number
      deletionRequests: number
      consentWithdrawals: number
    }
  }> {
    try {
      // Get lead statistics
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('id, created_at')

      // Get consent statistics
      const { data: consents } = await supabaseAdmin
        .from('consent_records')
        .select('granted, withdrawal_timestamp')

      // Get audit log statistics
      const { data: auditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('id, timestamp, event')

      const now = new Date()
      const leadCutoff = new Date(now.getTime() - this.RETENTION_POLICIES.leadData * 24 * 60 * 60 * 1000)
      const auditCutoff = new Date(now.getTime() - this.RETENTION_POLICIES.auditLogs * 24 * 60 * 60 * 1000)

      const totalLeads = leads?.length || 0
      const activeConsents = consents?.filter(c => c.granted && !c.withdrawal_timestamp).length || 0
      const withdrawnConsents = consents?.filter(c => c.withdrawal_timestamp).length || 0

      const leadsWithinRetention = leads?.filter(lead => 
        new Date(lead.created_at) >= leadCutoff
      ).length || 0
      const leadsExpired = totalLeads - leadsWithinRetention

      const auditLogsWithinRetention = auditLogs?.filter(log => 
        new Date(log.timestamp) >= auditCutoff
      ).length || 0
      const auditLogsExpired = (auditLogs?.length || 0) - auditLogsWithinRetention

      const anonymizationRequests = auditLogs?.filter(log => 
        log.event === 'data_anonymized'
      ).length || 0
      const deletionRequests = auditLogs?.filter(log => 
        log.event === 'data_deleted'
      ).length || 0
      const consentWithdrawals = withdrawnConsents

      return {
        totalLeads,
        activeConsents,
        withdrawnConsents,
        dataRetentionStatus: {
          leadsWithinRetention,
          leadsExpired,
          auditLogsWithinRetention,
          auditLogsExpired
        },
        privacyRequests: {
          anonymizationRequests,
          deletionRequests,
          consentWithdrawals
        }
      }

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'compliance',
        operation: 'generate_compliance_report'
      })
      throw error
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    event: string,
    userId: string | undefined,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          event,
          user_id: userId,
          details,
          timestamp: new Date().toISOString(),
          ip_address: 'system'
        })
    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }
}

// Export singleton instance
export const complianceService = new ComplianceService()
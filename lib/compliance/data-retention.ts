/**
 * Data Retention Policy Implementation - MortgageMatchPro v1.4.0
 * 
 * This module implements automated data retention and purging policies
 * to ensure compliance with GDPR, CCPA, and other data protection regulations.
 */

import { EventBus } from '../events/event-bus';
import { DatabaseService } from '../database/database-service';

export interface DataRetentionRule {
  id: string;
  dataType: string;
  retentionPeriod: number; // in days
  purgeAction: 'anonymize' | 'delete' | 'archive';
  conditions?: {
    status?: string;
    lastAccessed?: Date;
    createdBefore?: Date;
  };
  legalBasis: string;
  description: string;
}

export interface RetentionAuditLog {
  id: string;
  ruleId: string;
  dataType: string;
  action: 'retained' | 'anonymized' | 'deleted' | 'archived';
  recordCount: number;
  timestamp: Date;
  reason: string;
  legalBasis: string;
}

export class DataRetentionService {
  private eventBus: EventBus;
  private database: DatabaseService;
  private retentionRules: DataRetentionRule[] = [];
  private auditLogs: RetentionAuditLog[] = [];

  constructor(eventBus: EventBus, database: DatabaseService) {
    this.eventBus = eventBus;
    this.database = database;
    this.initializeRetentionRules();
  }

  /**
   * Initialize default data retention rules
   */
  private initializeRetentionRules(): void {
    this.retentionRules = [
      // Personal Data Rules
      {
        id: 'user-account-data',
        dataType: 'user_accounts',
        retentionPeriod: 2555, // 7 years
        purgeAction: 'anonymize',
        legalBasis: 'Legal obligation (tax and audit requirements)',
        description: 'User account data retained for 7 years after account closure'
      },
      {
        id: 'transaction-data',
        dataType: 'transactions',
        retentionPeriod: 2555, // 7 years
        purgeAction: 'archive',
        legalBasis: 'Legal obligation (tax and audit requirements)',
        description: 'Transaction data retained for 7 years for tax and audit purposes'
      },
      {
        id: 'communication-data',
        dataType: 'communications',
        retentionPeriod: 1095, // 3 years
        purgeAction: 'delete',
        legalBasis: 'Legitimate interest (customer service)',
        description: 'Communication data retained for 3 years'
      },
      {
        id: 'marketing-data',
        dataType: 'marketing_consent',
        retentionPeriod: 0, // Until consent withdrawn
        purgeAction: 'delete',
        conditions: {
          status: 'withdrawn'
        },
        legalBasis: 'Consent',
        description: 'Marketing data retained until consent is withdrawn'
      },
      {
        id: 'analytics-data',
        dataType: 'analytics_events',
        retentionPeriod: 730, // 2 years
        purgeAction: 'anonymize',
        legalBasis: 'Legitimate interest (business analytics)',
        description: 'Analytics data anonymized after 2 years'
      },

      // Business Data Rules
      {
        id: 'financial-records',
        dataType: 'financial_records',
        retentionPeriod: 2555, // 7 years
        purgeAction: 'archive',
        legalBasis: 'Legal obligation (financial regulations)',
        description: 'Financial records retained for 7 years'
      },
      {
        id: 'audit-logs',
        dataType: 'audit_logs',
        retentionPeriod: 1095, // 3 years
        purgeAction: 'delete',
        legalBasis: 'Legal obligation (compliance requirements)',
        description: 'Audit logs retained for 3 years'
      },
      {
        id: 'system-logs',
        dataType: 'system_logs',
        retentionPeriod: 365, // 1 year
        purgeAction: 'delete',
        legalBasis: 'Legitimate interest (system monitoring)',
        description: 'System logs retained for 1 year'
      },
      {
        id: 'backup-data',
        dataType: 'backup_data',
        retentionPeriod: 365, // 1 year
        purgeAction: 'delete',
        legalBasis: 'Legitimate interest (disaster recovery)',
        description: 'Backup data retained for 1 year'
      },

      // Special Categories
      {
        id: 'health-data',
        dataType: 'health_information',
        retentionPeriod: 2555, // 7 years
        purgeAction: 'anonymize',
        legalBasis: 'Legal obligation (healthcare regulations)',
        description: 'Health information retained for 7 years'
      },
      {
        id: 'biometric-data',
        dataType: 'biometric_data',
        retentionPeriod: 365, // 1 year
        purgeAction: 'delete',
        legalBasis: 'Consent',
        description: 'Biometric data retained for 1 year'
      }
    ];
  }

  /**
   * Process data retention for all rules
   */
  async processDataRetention(): Promise<void> {
    console.log('🔄 Processing data retention policies...');

    for (const rule of this.retentionRules) {
      try {
        await this.processRetentionRule(rule);
      } catch (error) {
        console.error(`❌ Error processing retention rule ${rule.id}:`, error);
        await this.logAuditEvent(rule.id, rule.dataType, 'error', 0, `Error: ${error.message}`, rule.legalBasis);
      }
    }

    console.log('✅ Data retention processing completed');
  }

  /**
   * Process a specific retention rule
   */
  private async processRetentionRule(rule: DataRetentionRule): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - rule.retentionPeriod);

    // Get records that need processing
    const recordsToProcess = await this.getRecordsForRetention(rule, cutoffDate);

    if (recordsToProcess.length === 0) {
      console.log(`   No records to process for rule: ${rule.id}`);
      return;
    }

    console.log(`   Processing ${recordsToProcess.length} records for rule: ${rule.id}`);

    // Process records based on purge action
    switch (rule.purgeAction) {
      case 'anonymize':
        await this.anonymizeRecords(rule, recordsToProcess);
        break;
      case 'delete':
        await this.deleteRecords(rule, recordsToProcess);
        break;
      case 'archive':
        await this.archiveRecords(rule, recordsToProcess);
        break;
    }

    // Log audit event
    await this.logAuditEvent(
      rule.id,
      rule.dataType,
      rule.purgeAction,
      recordsToProcess.length,
      `Processed ${recordsToProcess.length} records`,
      rule.legalBasis
    );
  }

  /**
   * Get records that need retention processing
   */
  private async getRecordsForRetention(rule: DataRetentionRule, cutoffDate: Date): Promise<any[]> {
    // This is a simplified implementation
    // In a real system, this would query the database based on the rule conditions
    
    const query = {
      table: rule.dataType,
      conditions: {
        created_at: { $lt: cutoffDate },
        ...rule.conditions
      }
    };

    // Simulate database query
    return await this.database.query(query);
  }

  /**
   * Anonymize records
   */
  private async anonymizeRecords(rule: DataRetentionRule, records: any[]): Promise<void> {
    console.log(`   Anonymizing ${records.length} records for rule: ${rule.id}`);

    for (const record of records) {
      const anonymizedRecord = this.anonymizeRecord(record, rule.dataType);
      await this.database.update(rule.dataType, record.id, anonymizedRecord);
    }

    // Publish anonymization event
    await this.eventBus.publish('data.retention.anonymized', {
      ruleId: rule.id,
      dataType: rule.dataType,
      recordCount: records.length,
      timestamp: new Date()
    });
  }

  /**
   * Delete records
   */
  private async deleteRecords(rule: DataRetentionRule, records: any[]): Promise<void> {
    console.log(`   Deleting ${records.length} records for rule: ${rule.id}`);

    for (const record of records) {
      await this.database.delete(rule.dataType, record.id);
    }

    // Publish deletion event
    await this.eventBus.publish('data.retention.deleted', {
      ruleId: rule.id,
      dataType: rule.dataType,
      recordCount: records.length,
      timestamp: new Date()
    });
  }

  /**
   * Archive records
   */
  private async archiveRecords(rule: DataRetentionRule, records: any[]): Promise<void> {
    console.log(`   Archiving ${records.length} records for rule: ${rule.id}`);

    for (const record of records) {
      const archivedRecord = {
        ...record,
        archived_at: new Date(),
        archive_reason: rule.description,
        original_table: rule.dataType
      };
      
      await this.database.insert('archived_data', archivedRecord);
      await this.database.delete(rule.dataType, record.id);
    }

    // Publish archiving event
    await this.eventBus.publish('data.retention.archived', {
      ruleId: rule.id,
      dataType: rule.dataType,
      recordCount: records.length,
      timestamp: new Date()
    });
  }

  /**
   * Anonymize a record based on data type
   */
  private anonymizeRecord(record: any, dataType: string): any {
    const anonymized = { ...record };

    // Define anonymization patterns for different data types
    const anonymizationPatterns = {
      user_accounts: {
        email: 'user@anonymized.com',
        phone: '***-***-****',
        name: 'Anonymized User',
        address: 'Anonymized Address'
      },
      analytics_events: {
        user_id: 'anonymized_user_id',
        ip_address: '***.***.***.***',
        user_agent: 'Anonymized User Agent'
      },
      health_information: {
        medical_condition: 'Anonymized',
        treatment_history: 'Anonymized',
        personal_notes: 'Anonymized'
      }
    };

    const patterns = anonymizationPatterns[dataType] || {};
    
    for (const [field, value] of Object.entries(patterns)) {
      if (anonymized[field]) {
        anonymized[field] = value;
      }
    }

    // Add anonymization metadata
    anonymized.anonymized_at = new Date();
    anonymized.anonymization_reason = 'Data retention policy';
    anonymized.original_data_hash = this.generateDataHash(record);

    return anonymized;
  }

  /**
   * Generate hash for original data (for audit purposes)
   */
  private generateDataHash(record: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(record, Object.keys(record).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    ruleId: string,
    dataType: string,
    action: string,
    recordCount: number,
    reason: string,
    legalBasis: string
  ): Promise<void> {
    const auditLog: RetentionAuditLog = {
      id: this.generateId(),
      ruleId,
      dataType,
      action: action as any,
      recordCount,
      timestamp: new Date(),
      reason,
      legalBasis
    };

    this.auditLogs.push(auditLog);

    // Store in database
    await this.database.insert('retention_audit_logs', auditLog);

    // Publish audit event
    await this.eventBus.publish('data.retention.audit', auditLog);
  }

  /**
   * Get retention audit logs
   */
  async getAuditLogs(filters?: {
    ruleId?: string;
    dataType?: string;
    action?: string;
    from?: Date;
    to?: Date;
  }): Promise<RetentionAuditLog[]> {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.ruleId) {
        logs = logs.filter(log => log.ruleId === filters.ruleId);
      }
      if (filters.dataType) {
        logs = logs.filter(log => log.dataType === filters.dataType);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.from) {
        logs = logs.filter(log => log.timestamp >= filters.from!);
      }
      if (filters.to) {
        logs = logs.filter(log => log.timestamp <= filters.to!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get retention rules
   */
  getRetentionRules(): DataRetentionRule[] {
    return [...this.retentionRules];
  }

  /**
   * Add new retention rule
   */
  async addRetentionRule(rule: Omit<DataRetentionRule, 'id'>): Promise<DataRetentionRule> {
    const newRule: DataRetentionRule = {
      ...rule,
      id: this.generateId()
    };

    this.retentionRules.push(newRule);

    // Publish rule creation event
    await this.eventBus.publish('data.retention.rule.created', newRule);

    return newRule;
  }

  /**
   * Update retention rule
   */
  async updateRetentionRule(ruleId: string, updates: Partial<DataRetentionRule>): Promise<void> {
    const ruleIndex = this.retentionRules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      throw new Error(`Retention rule not found: ${ruleId}`);
    }

    this.retentionRules[ruleIndex] = {
      ...this.retentionRules[ruleIndex],
      ...updates
    };

    // Publish rule update event
    await this.eventBus.publish('data.retention.rule.updated', this.retentionRules[ruleIndex]);
  }

  /**
   * Delete retention rule
   */
  async deleteRetentionRule(ruleId: string): Promise<void> {
    const ruleIndex = this.retentionRules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      throw new Error(`Retention rule not found: ${ruleId}`);
    }

    const deletedRule = this.retentionRules.splice(ruleIndex, 1)[0];

    // Publish rule deletion event
    await this.eventBus.publish('data.retention.rule.deleted', deletedRule);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `retention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get data retention statistics
   */
  async getRetentionStatistics(): Promise<{
    totalRules: number;
    totalAuditLogs: number;
    recordsProcessedToday: number;
    recordsProcessedThisWeek: number;
    recordsProcessedThisMonth: number;
    topDataTypes: Array<{ dataType: string; count: number }>;
    recentActions: Array<{ action: string; count: number; timestamp: Date }>;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayLogs = this.auditLogs.filter(log => log.timestamp >= today);
    const weekLogs = this.auditLogs.filter(log => log.timestamp >= weekAgo);
    const monthLogs = this.auditLogs.filter(log => log.timestamp >= monthAgo);

    // Count records by data type
    const dataTypeCounts = this.auditLogs.reduce((acc, log) => {
      acc[log.dataType] = (acc[log.dataType] || 0) + log.recordCount;
      return acc;
    }, {} as Record<string, number>);

    const topDataTypes = Object.entries(dataTypeCounts)
      .map(([dataType, count]) => ({ dataType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count recent actions
    const recentActions = this.auditLogs
      .filter(log => log.timestamp >= weekAgo)
      .reduce((acc, log) => {
        const key = `${log.action}_${log.timestamp.toDateString()}`;
        acc[key] = (acc[key] || 0) + log.recordCount;
        return acc;
      }, {} as Record<string, number>);

    const recentActionsArray = Object.entries(recentActions)
      .map(([key, count]) => {
        const [action, dateStr] = key.split('_');
        return {
          action,
          count,
          timestamp: new Date(dateStr)
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalRules: this.retentionRules.length,
      totalAuditLogs: this.auditLogs.length,
      recordsProcessedToday: todayLogs.reduce((sum, log) => sum + log.recordCount, 0),
      recordsProcessedThisWeek: weekLogs.reduce((sum, log) => sum + log.recordCount, 0),
      recordsProcessedThisMonth: monthLogs.reduce((sum, log) => sum + log.recordCount, 0),
      topDataTypes,
      recentActions: recentActionsArray
    };
  }
}

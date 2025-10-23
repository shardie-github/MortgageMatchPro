/**
 * Operational Readiness Program
 * Implements enterprise-scale operational readiness with 99.95% uptime targets
 */

import { supabaseAdmin } from '../supabase'
import { captureException, captureMessage } from '../monitoring'
import { sreMetrics, SREMetric } from './sre-metrics'
import { loadBalancer, Region } from './load-balancer'

export interface OperationalReadinessMetrics {
  uptime_percentage: number
  mttr_minutes: number
  error_budget_remaining: number
  cost_per_transaction: number
  regional_availability: Record<string, number>
  sla_compliance: Record<string, boolean>
  last_updated: Date
}

export interface DisasterRecoveryPlan {
  id: string
  name: string
  description: string
  rto_minutes: number // Recovery Time Objective
  rpo_minutes: number // Recovery Point Objective
  procedures: string[]
  contacts: string[]
  last_tested: Date
  next_test: Date
  status: 'active' | 'draft' | 'deprecated'
}

export interface BusinessContinuityModel {
  id: string
  scenario: string
  impact_level: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  mitigation_strategy: string
  contingency_plan: string
  owner: string
  last_reviewed: Date
}

export interface VendorContract {
  id: string
  vendor_name: string
  service_type: string
  contract_value: number
  renewal_date: Date
  sla_requirements: Record<string, any>
  penalty_clauses: string[]
  escalation_contacts: string[]
  status: 'active' | 'expiring' | 'terminated'
}

export class OperationalReadinessManager {
  private uptimeTarget = 99.95 // 99.95% uptime target
  private mttrTarget = 10 // 10 minutes MTTR target
  private errorBudgetTarget = 1.0 // 1% error budget

  /**
   * Calculate current operational readiness metrics
   */
  async calculateReadinessMetrics(): Promise<OperationalReadinessMetrics> {
    try {
      const timeRange = '24h'
      const summary = await sreMetrics.getMetricsSummary('api', timeRange)
      const loadBalancerStatus = loadBalancer.getStatus()

      // Calculate uptime percentage
      const uptimePercentage = summary.availability

      // Calculate MTTR in minutes
      const mttrMinutes = summary.mttr / (1000 * 60)

      // Calculate error budget remaining
      const errorBudgetRemaining = Math.max(0, this.errorBudgetTarget - summary.errorRate)

      // Calculate cost per transaction (simplified)
      const costPerTransaction = await this.calculateCostPerTransaction()

      // Calculate regional availability
      const regionalAvailability: Record<string, number> = {}
      loadBalancerStatus.regions.forEach(region => {
        regionalAvailability[region.id] = region.is_active ? 100 : 0
      })

      // Calculate SLA compliance
      const slaCompliance = {
        uptime: uptimePercentage >= this.uptimeTarget,
        mttr: mttrMinutes <= this.mttrTarget,
        error_budget: errorBudgetRemaining > 0,
        regional_availability: Object.values(regionalAvailability).every(av => av >= 99.0),
      }

      const metrics: OperationalReadinessMetrics = {
        uptime_percentage: uptimePercentage,
        mttr_minutes: mttrMinutes,
        error_budget_remaining: errorBudgetRemaining,
        cost_per_transaction: costPerTransaction,
        regional_availability: regionalAvailability,
        sla_compliance: slaCompliance,
        last_updated: new Date(),
      }

      // Store metrics in database
      await this.storeReadinessMetrics(metrics)

      return metrics
    } catch (error) {
      captureException(error as Error, { context: 'calculate_readiness_metrics' })
      throw error
    }
  }

  /**
   * Calculate cost per transaction
   */
  private async calculateCostPerTransaction(): Promise<number> {
    try {
      // This would integrate with your cost tracking system
      // For now, return a placeholder value
      return 0.05 // $0.05 per transaction
    } catch (error) {
      captureException(error as Error, { context: 'calculate_cost_per_transaction' })
      return 0
    }
  }

  /**
   * Store readiness metrics in database
   */
  private async storeReadinessMetrics(metrics: OperationalReadinessMetrics): Promise<void> {
    try {
      await supabaseAdmin
        .from('operational_readiness_metrics')
        .insert({
          ...metrics,
          last_updated: metrics.last_updated.toISOString(),
        })
    } catch (error) {
      captureException(error as Error, { context: 'store_readiness_metrics', metrics })
    }
  }

  /**
   * Get disaster recovery plans
   */
  async getDisasterRecoveryPlans(): Promise<DisasterRecoveryPlan[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('disaster_recovery_plans')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      return data?.map(plan => ({
        ...plan,
        last_tested: new Date(plan.last_tested),
        next_test: new Date(plan.next_test),
      })) || []
    } catch (error) {
      captureException(error as Error, { context: 'get_disaster_recovery_plans' })
      return []
    }
  }

  /**
   * Create or update disaster recovery plan
   */
  async upsertDisasterRecoveryPlan(plan: Omit<DisasterRecoveryPlan, 'id'>): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin
        .from('disaster_recovery_plans')
        .upsert({
          ...plan,
          last_tested: plan.last_tested.toISOString(),
          next_test: plan.next_test.toISOString(),
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      captureException(error as Error, { context: 'upsert_disaster_recovery_plan', plan })
      throw error
    }
  }

  /**
   * Get business continuity models
   */
  async getBusinessContinuityModels(): Promise<BusinessContinuityModel[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('business_continuity_models')
        .select('*')
        .order('impact_level', { ascending: false })

      if (error) throw error
      return data?.map(model => ({
        ...model,
        last_reviewed: new Date(model.last_reviewed),
      })) || []
    } catch (error) {
      captureException(error as Error, { context: 'get_business_continuity_models' })
      return []
    }
  }

  /**
   * Create or update business continuity model
   */
  async upsertBusinessContinuityModel(model: Omit<BusinessContinuityModel, 'id'>): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin
        .from('business_continuity_models')
        .upsert({
          ...model,
          last_reviewed: model.last_reviewed.toISOString(),
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      captureException(error as Error, { context: 'upsert_business_continuity_model', model })
      throw error
    }
  }

  /**
   * Get vendor contracts
   */
  async getVendorContracts(): Promise<VendorContract[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('vendor_contracts')
        .select('*')
        .order('renewal_date')

      if (error) throw error
      return data?.map(contract => ({
        ...contract,
        renewal_date: new Date(contract.renewal_date),
      })) || []
    } catch (error) {
      captureException(error as Error, { context: 'get_vendor_contracts' })
      return []
    }
  }

  /**
   * Create or update vendor contract
   */
  async upsertVendorContract(contract: Omit<VendorContract, 'id'>): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin
        .from('vendor_contracts')
        .upsert({
          ...contract,
          renewal_date: contract.renewal_date.toISOString(),
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      captureException(error as Error, { context: 'upsert_vendor_contract', contract })
      throw error
    }
  }

  /**
   * Check if contracts are expiring soon
   */
  async checkExpiringContracts(daysAhead: number = 90): Promise<VendorContract[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

      const contracts = await this.getVendorContracts()
      return contracts.filter(contract => 
        contract.renewal_date <= cutoffDate && 
        contract.status === 'active'
      )
    } catch (error) {
      captureException(error as Error, { context: 'check_expiring_contracts', daysAhead })
      return []
    }
  }

  /**
   * Generate operational readiness report
   */
  async generateReadinessReport(): Promise<{
    metrics: OperationalReadinessMetrics
    dr_plans: DisasterRecoveryPlan[]
    continuity_models: BusinessContinuityModel[]
    expiring_contracts: VendorContract[]
    recommendations: string[]
  }> {
    try {
      const metrics = await this.calculateReadinessMetrics()
      const drPlans = await this.getDisasterRecoveryPlans()
      const continuityModels = await this.getBusinessContinuityModels()
      const expiringContracts = await this.checkExpiringContracts()

      // Generate recommendations
      const recommendations: string[] = []

      if (metrics.uptime_percentage < this.uptimeTarget) {
        recommendations.push(`Uptime is ${metrics.uptime_percentage.toFixed(2)}%, below target of ${this.uptimeTarget}%`)
      }

      if (metrics.mttr_minutes > this.mttrTarget) {
        recommendations.push(`MTTR is ${metrics.mttr_minutes.toFixed(2)} minutes, above target of ${this.mttrTarget} minutes`)
      }

      if (metrics.error_budget_remaining < 0.5) {
        recommendations.push(`Error budget remaining is ${metrics.error_budget_remaining.toFixed(2)}%, consider reducing error rate`)
      }

      if (expiringContracts.length > 0) {
        recommendations.push(`${expiringContracts.length} vendor contracts expiring within 90 days`)
      }

      const drPlansNeedingTest = drPlans.filter(plan => 
        new Date(plan.next_test) <= new Date()
      )
      if (drPlansNeedingTest.length > 0) {
        recommendations.push(`${drPlansNeedingTest.length} disaster recovery plans need testing`)
      }

      return {
        metrics,
        dr_plans: drPlans,
        continuity_models: continuityModels,
        expiring_contracts: expiringContracts,
        recommendations,
      }
    } catch (error) {
      captureException(error as Error, { context: 'generate_readiness_report' })
      throw error
    }
  }

  /**
   * Initialize default operational readiness data
   */
  async initializeDefaultData(): Promise<void> {
    try {
      // Initialize default disaster recovery plans
      const defaultDRPlans: Omit<DisasterRecoveryPlan, 'id'>[] = [
        {
          name: 'Database Failure Recovery',
          description: 'Recovery procedures for database failures',
          rto_minutes: 15,
          rpo_minutes: 5,
          procedures: [
            'Switch to backup database',
            'Update DNS records',
            'Verify data integrity',
            'Notify stakeholders',
          ],
          contacts: ['cto@mortgagematch.com', 'ops@mortgagematch.com'],
          last_tested: new Date(),
          next_test: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          status: 'active',
        },
        {
          name: 'Regional Outage Recovery',
          description: 'Recovery procedures for regional outages',
          rto_minutes: 30,
          rpo_minutes: 10,
          procedures: [
            'Activate failover region',
            'Update load balancer configuration',
            'Verify service availability',
            'Monitor performance metrics',
          ],
          contacts: ['cto@mortgagematch.com', 'ops@mortgagematch.com'],
          last_tested: new Date(),
          next_test: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          status: 'active',
        },
      ]

      for (const plan of defaultDRPlans) {
        await this.upsertDisasterRecoveryPlan(plan)
      }

      // Initialize default business continuity models
      const defaultContinuityModels: Omit<BusinessContinuityModel, 'id'>[] = [
        {
          scenario: 'Cloud Provider Outage',
          impact_level: 'critical',
          probability: 0.05,
          mitigation_strategy: 'Multi-region deployment with automatic failover',
          contingency_plan: 'Switch to backup region within 15 minutes',
          owner: 'CTO',
          last_reviewed: new Date(),
        },
        {
          scenario: 'Database Corruption',
          impact_level: 'high',
          probability: 0.02,
          mitigation_strategy: 'Regular backups and point-in-time recovery',
          contingency_plan: 'Restore from latest backup within 30 minutes',
          owner: 'Database Team',
          last_reviewed: new Date(),
        },
        {
          scenario: 'API Rate Limiting',
          impact_level: 'medium',
          probability: 0.1,
          mitigation_strategy: 'Multiple API providers and caching',
          contingency_plan: 'Switch to backup provider and implement caching',
          owner: 'API Team',
          last_reviewed: new Date(),
        },
      ]

      for (const model of defaultContinuityModels) {
        await this.upsertBusinessContinuityModel(model)
      }

      // Initialize default vendor contracts
      const defaultContracts: Omit<VendorContract, 'id'>[] = [
        {
          vendor_name: 'Supabase',
          service_type: 'Database',
          contract_value: 5000,
          renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          sla_requirements: {
            uptime: 99.9,
            response_time: 100,
          },
          penalty_clauses: ['Service credits for downtime'],
          escalation_contacts: ['support@supabase.com'],
          status: 'active',
        },
        {
          vendor_name: 'OpenAI',
          service_type: 'AI Services',
          contract_value: 10000,
          renewal_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
          sla_requirements: {
            uptime: 99.5,
            response_time: 2000,
          },
          penalty_clauses: ['Service credits for downtime'],
          escalation_contacts: ['support@openai.com'],
          status: 'active',
        },
      ]

      for (const contract of defaultContracts) {
        await this.upsertVendorContract(contract)
      }

      await captureMessage('Initialized default operational readiness data', 'info')
    } catch (error) {
      captureException(error as Error, { context: 'initialize_default_data' })
    }
  }

  /**
   * Monitor operational readiness continuously
   */
  startMonitoring(): void {
    // Calculate metrics every hour
    setInterval(async () => {
      try {
        await this.calculateReadinessMetrics()
      } catch (error) {
        captureException(error as Error, { context: 'operational_readiness_monitoring' })
      }
    }, 60 * 60 * 1000) // 1 hour

    // Check expiring contracts daily
    setInterval(async () => {
      try {
        const expiringContracts = await this.checkExpiringContracts(30) // 30 days
        if (expiringContracts.length > 0) {
          await captureMessage(
            `${expiringContracts.length} vendor contracts expiring within 30 days`,
            'warning',
            { contracts: expiringContracts.map(c => c.vendor_name) }
          )
        }
      } catch (error) {
        captureException(error as Error, { context: 'contract_expiry_monitoring' })
      }
    }, 24 * 60 * 60 * 1000) // 24 hours
  }
}

// Initialize operational readiness manager
export const operationalReadiness = new OperationalReadinessManager()

// Start monitoring in production
if (process.env.NODE_ENV === 'production') {
  operationalReadiness.startMonitoring()
}

// Export utility functions
export const calculateReadinessMetrics = operationalReadiness.calculateReadinessMetrics.bind(operationalReadiness)
export const generateReadinessReport = operationalReadiness.generateReadinessReport.bind(operationalReadiness)
export const getDisasterRecoveryPlans = operationalReadiness.getDisasterRecoveryPlans.bind(operationalReadiness)
export const getBusinessContinuityModels = operationalReadiness.getBusinessContinuityModels.bind(operationalReadiness)
export const getVendorContracts = operationalReadiness.getVendorContracts.bind(operationalReadiness)
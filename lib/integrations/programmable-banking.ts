import { supabaseAdmin } from '../supabase'
import { z } from 'zod'

// Smart Contract and Automation Types
export type TriggerEvent = 
  | 'loan_approved'
  | 'appraisal_complete'
  | 'compliance_verified'
  | 'payment_received'
  | 'milestone_reached'
  | 'deadline_approaching'
  | 'risk_threshold_exceeded'
  | 'user_action'

export type ActionType = 
  | 'disburse_funds'
  | 'send_notification'
  | 'update_status'
  | 'create_task'
  | 'trigger_workflow'
  | 'calculate_fees'
  | 'generate_report'
  | 'escalate_alert'

export interface SmartContract {
  id: string
  name: string
  description: string
  triggerEvents: TriggerEvent[]
  conditions: ContractCondition[]
  actions: ContractAction[]
  isActive: boolean
  executionCount: number
  lastExecutedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ContractCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export interface ContractAction {
  type: ActionType
  parameters: Record<string, any>
  delay?: number // milliseconds
  retryCount?: number
  maxRetries?: number
}

export interface ContractExecution {
  id: string
  contractId: string
  triggerEvent: TriggerEvent
  triggerData: Record<string, any>
  executionStatus: 'pending' | 'success' | 'failed'
  errorMessage?: string
  executionTimeMs?: number
  createdAt: string
  completedAt?: string
}

// Programmable Banking Service
export class ProgrammableBankingService {
  // Create a new smart contract
  async createSmartContract(contract: Omit<SmartContract, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'>): Promise<{
    success: boolean
    contractId?: string
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('smart_contracts')
        .insert({
          name: contract.name,
          description: contract.description,
          trigger_events: contract.triggerEvents,
          conditions: contract.conditions,
          actions: contract.actions,
          is_active: contract.isActive,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        contractId: data.id,
      }
    } catch (error) {
      console.error('Smart contract creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Smart contract creation failed',
      }
    }
  }

  // Execute smart contract based on trigger event
  async executeContract(contractId: string, triggerEvent: TriggerEvent, triggerData: Record<string, any>): Promise<{
    success: boolean
    executionId?: string
    error?: string
  }> {
    try {
      // Get contract details
      const { data: contract, error: contractError } = await supabaseAdmin
        .from('smart_contracts')
        .select('*')
        .eq('id', contractId)
        .eq('is_active', true)
        .single()

      if (contractError || !contract) {
        throw new Error('Contract not found or inactive')
      }

      // Check if trigger event matches
      if (!contract.trigger_events.includes(triggerEvent)) {
        throw new Error('Trigger event not supported by this contract')
      }

      // Create execution record
      const { data: execution, error: executionError } = await supabaseAdmin
        .from('contract_executions')
        .insert({
          contract_id: contractId,
          trigger_event: triggerEvent,
          trigger_data: triggerData,
          execution_status: 'pending',
        })
        .select()
        .single()

      if (executionError) {
        throw new Error(`Execution record creation failed: ${executionError.message}`)
      }

      // Execute contract asynchronously
      this.executeContractActions(contract, triggerData, execution.id)

      return {
        success: true,
        executionId: execution.id,
      }
    } catch (error) {
      console.error('Contract execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Contract execution failed',
      }
    }
  }

  // Execute contract actions
  private async executeContractActions(contract: any, triggerData: Record<string, any>, executionId: string) {
    const startTime = Date.now()

    try {
      // Check conditions
      const conditionsMet = await this.checkConditions(contract.conditions, triggerData)
      
      if (!conditionsMet) {
        await this.updateExecutionStatus(executionId, 'failed', 'Conditions not met')
        return
      }

      // Execute actions
      for (const action of contract.actions) {
        await this.executeAction(action, triggerData, executionId)
        
        // Add delay if specified
        if (action.delay) {
          await new Promise(resolve => setTimeout(resolve, action.delay))
        }
      }

      // Update execution status
      const executionTime = Date.now() - startTime
      await this.updateExecutionStatus(executionId, 'success', undefined, executionTime)

      // Update contract execution count
      await supabaseAdmin
        .from('smart_contracts')
        .update({ 
          execution_count: contract.execution_count + 1,
          last_executed_at: new Date().toISOString()
        })
        .eq('id', contract.id)

    } catch (error) {
      console.error('Contract actions execution failed:', error)
      await this.updateExecutionStatus(executionId, 'failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Check if conditions are met
  private async checkConditions(conditions: ContractCondition[], triggerData: Record<string, any>): Promise<boolean> {
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i]
      const fieldValue = this.getNestedValue(triggerData, condition.field)
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value)

      if (i === 0) {
        // First condition
        if (!conditionMet) return false
      } else {
        // Subsequent conditions with logical operators
        const prevCondition = conditions[i - 1]
        const logicalOp = condition.logicalOperator || 'AND'

        if (logicalOp === 'AND' && !conditionMet) return false
        if (logicalOp === 'OR' && conditionMet) return true
      }
    }

    return true
  }

  // Get nested value from object
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Evaluate single condition
  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue
      case 'not_equals':
        return fieldValue !== expectedValue
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue)
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue)
      case 'contains':
        return String(fieldValue).includes(String(expectedValue))
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue)
      default:
        return false
    }
  }

  // Execute individual action
  private async executeAction(action: ContractAction, triggerData: Record<string, any>, executionId: string) {
    try {
      switch (action.type) {
        case 'disburse_funds':
          await this.disburseFunds(action.parameters, triggerData)
          break
        case 'send_notification':
          await this.sendNotification(action.parameters, triggerData)
          break
        case 'update_status':
          await this.updateStatus(action.parameters, triggerData)
          break
        case 'create_task':
          await this.createTask(action.parameters, triggerData)
          break
        case 'trigger_workflow':
          await this.triggerWorkflow(action.parameters, triggerData)
          break
        case 'calculate_fees':
          await this.calculateFees(action.parameters, triggerData)
          break
        case 'generate_report':
          await this.generateReport(action.parameters, triggerData)
          break
        case 'escalate_alert':
          await this.escalateAlert(action.parameters, triggerData)
          break
        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }
    } catch (error) {
      console.error(`Action execution failed: ${action.type}`, error)
      throw error
    }
  }

  // Action implementations
  private async disburseFunds(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would integrate with payment providers
    console.log('Disbursing funds:', parameters, triggerData)
  }

  private async sendNotification(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would integrate with notification services
    console.log('Sending notification:', parameters, triggerData)
  }

  private async updateStatus(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would update database records
    console.log('Updating status:', parameters, triggerData)
  }

  private async createTask(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would create tasks in task management system
    console.log('Creating task:', parameters, triggerData)
  }

  private async triggerWorkflow(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would trigger other workflows
    console.log('Triggering workflow:', parameters, triggerData)
  }

  private async calculateFees(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would calculate and store fees
    console.log('Calculating fees:', parameters, triggerData)
  }

  private async generateReport(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would generate reports
    console.log('Generating report:', parameters, triggerData)
  }

  private async escalateAlert(parameters: Record<string, any>, triggerData: Record<string, any>) {
    // This would escalate alerts
    console.log('Escalating alert:', parameters, triggerData)
  }

  // Update execution status
  private async updateExecutionStatus(executionId: string, status: string, errorMessage?: string, executionTime?: number) {
    await supabaseAdmin
      .from('contract_executions')
      .update({
        execution_status: status,
        error_message: errorMessage,
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
  }

  // Get contract executions
  async getContractExecutions(contractId: string, limit = 50): Promise<{
    success: boolean
    executions?: ContractExecution[]
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('contract_executions')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        executions: data || [],
      }
    } catch (error) {
      console.error('Get contract executions failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get contract executions failed',
      }
    }
  }

  // Get all smart contracts
  async getSmartContracts(): Promise<{
    success: boolean
    contracts?: SmartContract[]
    error?: string
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('smart_contracts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        contracts: data || [],
      }
    } catch (error) {
      console.error('Get smart contracts failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get smart contracts failed',
      }
    }
  }

  // Update smart contract
  async updateSmartContract(contractId: string, updates: Partial<SmartContract>): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await supabaseAdmin
        .from('smart_contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Update smart contract failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update smart contract failed',
      }
    }
  }

  // Delete smart contract
  async deleteSmartContract(contractId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await supabaseAdmin
        .from('smart_contracts')
        .delete()
        .eq('id', contractId)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Delete smart contract failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete smart contract failed',
      }
    }
  }

  // Create predefined smart contracts for common scenarios
  async createPredefinedContracts(): Promise<{
    success: boolean
    contractsCreated?: number
    error?: string
  }> {
    try {
      const predefinedContracts = [
        {
          name: 'Loan Approval Disbursement',
          description: 'Automatically disburse funds when loan is approved and all conditions are met',
          triggerEvents: ['loan_approved'] as TriggerEvent[],
          conditions: [
            { field: 'loan.status', operator: 'equals' as const, value: 'approved' },
            { field: 'loan.amount', operator: 'greater_than' as const, value: 0 },
            { field: 'compliance.verified', operator: 'equals' as const, value: true }
          ],
          actions: [
            { type: 'disburse_funds' as ActionType, parameters: { method: 'wire_transfer' } },
            { type: 'send_notification' as ActionType, parameters: { type: 'email', template: 'loan_disbursed' } }
          ],
          isActive: true
        },
        {
          name: 'Appraisal Complete Workflow',
          description: 'Trigger next steps when appraisal is complete',
          triggerEvents: ['appraisal_complete'] as TriggerEvent[],
          conditions: [
            { field: 'appraisal.status', operator: 'equals' as const, value: 'complete' },
            { field: 'appraisal.value', operator: 'greater_than' as const, value: 0 }
          ],
          actions: [
            { type: 'update_status' as ActionType, parameters: { field: 'loan.appraisal_status', value: 'complete' } },
            { type: 'create_task' as ActionType, parameters: { type: 'compliance_review', assignee: 'compliance_team' } }
          ],
          isActive: true
        },
        {
          name: 'Payment Received Processing',
          description: 'Process payments and update loan status',
          triggerEvents: ['payment_received'] as TriggerEvent[],
          conditions: [
            { field: 'payment.amount', operator: 'greater_than' as const, value: 0 },
            { field: 'payment.status', operator: 'equals' as const, value: 'confirmed' }
          ],
          actions: [
            { type: 'update_status' as ActionType, parameters: { field: 'loan.last_payment_date', value: '{{payment.date}}' } },
            { type: 'calculate_fees' as ActionType, parameters: { type: 'late_fee', threshold: 30 } },
            { type: 'send_notification' as ActionType, parameters: { type: 'sms', template: 'payment_confirmed' } }
          ],
          isActive: true
        },
        {
          name: 'Risk Threshold Alert',
          description: 'Escalate when risk thresholds are exceeded',
          triggerEvents: ['risk_threshold_exceeded'] as TriggerEvent[],
          conditions: [
            { field: 'risk.score', operator: 'greater_than' as const, value: 0.8 }
          ],
          actions: [
            { type: 'escalate_alert' as ActionType, parameters: { level: 'high', department: 'risk_management' } },
            { type: 'create_task' as ActionType, parameters: { type: 'risk_review', priority: 'urgent' } }
          ],
          isActive: true
        }
      ]

      let contractsCreated = 0
      for (const contract of predefinedContracts) {
        const result = await this.createSmartContract(contract)
        if (result.success) {
          contractsCreated++
        }
      }

      return {
        success: true,
        contractsCreated,
      }
    } catch (error) {
      console.error('Create predefined contracts failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Create predefined contracts failed',
      }
    }
  }
}

// Factory function
export function createProgrammableBankingService(): ProgrammableBankingService {
  return new ProgrammableBankingService()
}

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

// Workflow automation schemas
export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['data_ingestion', 'model_training', 'prediction', 'validation', 'notification', 'reporting']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  dependencies: z.array(z.string()),
  parameters: z.record(z.any()),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  duration: z.number().optional()
})

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'archived']),
  steps: z.array(WorkflowStepSchema),
  triggers: z.array(z.object({
    type: z.enum(['schedule', 'event', 'manual', 'api']),
    config: z.record(z.any())
  })),
  retryPolicy: z.object({
    maxRetries: z.number(),
    backoffStrategy: z.enum(['linear', 'exponential', 'fixed']),
    retryDelay: z.number()
  }),
  timeout: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastRun: z.string().optional(),
  nextRun: z.string().optional()
})

export const DataDriftDetectionSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  featureName: z.string(),
  driftType: z.enum(['statistical', 'concept', 'data_quality']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  score: z.number(),
  threshold: z.number(),
  detectedAt: z.string(),
  status: z.enum(['detected', 'investigating', 'resolved', 'ignored']),
  details: z.record(z.any()),
  recommendations: z.array(z.string())
})

export const ModelRetrainingTriggerSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  triggerType: z.enum(['data_drift', 'performance_degradation', 'schedule', 'manual']),
  threshold: z.number(),
  currentValue: z.number(),
  triggeredAt: z.string(),
  status: z.enum(['triggered', 'in_progress', 'completed', 'failed']),
  retrainingJobId: z.string().optional(),
  estimatedDuration: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
})

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>
export type Workflow = z.infer<typeof WorkflowSchema>
export type DataDriftDetection = z.infer<typeof DataDriftDetectionSchema>
export type ModelRetrainingTrigger = z.infer<typeof ModelRetrainingTriggerSchema>

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  duration?: number
  steps: WorkflowStep[]
  logs: string[]
  metrics: Record<string, any>
}

export interface HumanInLoopReview {
  id: string
  type: 'model_change' | 'prompt_update' | 'workflow_modification' | 'compliance_review'
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes'
  requestedBy: string
  reviewedBy?: string
  reviewData: Record<string, any>
  comments: string[]
  createdAt: string
  updatedAt: string
  deadline: string
}

export class WorkflowAutomationAgent {
  private model = 'gpt-4o'

  // Create workflow for AI operations
  async createWorkflow(
    name: string,
    description: string,
    steps: Omit<WorkflowStep, 'id' | 'status' | 'startedAt' | 'completedAt' | 'duration'>[],
    triggers: any[],
    retryPolicy: any
  ): Promise<Workflow> {
    try {
      console.log(`Creating workflow: ${name}`)

      const workflow: Workflow = {
        id: this.generateId(),
        name,
        description,
        version: '1.0.0',
        status: 'draft',
        steps: steps.map(step => ({
          ...step,
          id: this.generateId(),
          status: 'pending'
        })),
        triggers,
        retryPolicy,
        timeout: 3600, // 1 hour default
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Store workflow
      await this.storeWorkflow(workflow)

      return workflow
    } catch (error) {
      console.error('Error creating workflow:', error)
      throw error
    }
  }

  // Execute workflow
  async executeWorkflow(workflowId: string, parameters?: Record<string, any>): Promise<WorkflowExecution> {
    try {
      console.log(`Executing workflow: ${workflowId}`)

      const workflow = await this.getWorkflow(workflowId)
      if (!workflow) {
        throw new Error('Workflow not found')
      }

      const execution: WorkflowExecution = {
        id: this.generateId(),
        workflowId,
        status: 'running',
        startedAt: new Date().toISOString(),
        steps: workflow.steps.map(step => ({ ...step, status: 'pending' })),
        logs: [],
        metrics: {}
      }

      // Store execution
      await this.storeWorkflowExecution(execution)

      // Execute steps in order
      for (const step of execution.steps) {
        try {
          await this.executeStep(step, parameters)
        } catch (error) {
          console.error(`Error executing step ${step.id}:`, error)
          step.status = 'failed'
          step.error = error.toString()
          execution.logs.push(`Step ${step.name} failed: ${error}`)
          
          // Handle retry policy
          if (workflow.retryPolicy.maxRetries > 0) {
            await this.handleStepRetry(step, workflow.retryPolicy)
          }
        }
      }

      // Update execution status
      const allStepsCompleted = execution.steps.every(step => 
        step.status === 'completed' || step.status === 'skipped'
      )
      
      if (allStepsCompleted) {
        execution.status = 'completed'
        execution.completedAt = new Date().toISOString()
        execution.duration = new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
      } else {
        execution.status = 'failed'
      }

      // Update execution
      await this.updateWorkflowExecution(execution)

      return execution
    } catch (error) {
      console.error('Error executing workflow:', error)
      throw error
    }
  }

  // Detect data drift
  async detectDataDrift(modelId: string): Promise<DataDriftDetection[]> {
    try {
      console.log(`Detecting data drift for model: ${modelId}`)

      // Get model data and recent predictions
      const [modelData, recentData] = await Promise.all([
        this.getModelData(modelId),
        this.getRecentData(modelId)
      ])

      // Calculate drift for each feature
      const driftDetections: DataDriftDetection[] = []

      for (const feature of modelData.features) {
        const driftScore = await this.calculateDriftScore(feature, recentData)
        
        if (driftScore > modelData.driftThreshold) {
          const detection: DataDriftDetection = {
            id: this.generateId(),
            modelId,
            featureName: feature.name,
            driftType: 'statistical',
            severity: this.calculateSeverity(driftScore, modelData.driftThreshold),
            score: driftScore,
            threshold: modelData.driftThreshold,
            detectedAt: new Date().toISOString(),
            status: 'detected',
            details: {
              feature: feature.name,
              driftScore,
              threshold: modelData.driftThreshold,
              sampleSize: recentData.length
            },
            recommendations: await this.generateDriftRecommendations(feature, driftScore)
          }

          driftDetections.push(detection)
        }
      }

      // Store drift detections
      await this.storeDataDriftDetections(driftDetections)

      // Trigger retraining if critical drift detected
      const criticalDrift = driftDetections.filter(d => d.severity === 'critical')
      if (criticalDrift.length > 0) {
        await this.triggerModelRetraining(modelId, 'data_drift', criticalDrift)
      }

      return driftDetections
    } catch (error) {
      console.error('Error detecting data drift:', error)
      throw error
    }
  }

  // Trigger model retraining
  async triggerModelRetraining(
    modelId: string,
    triggerType: 'data_drift' | 'performance_degradation' | 'schedule' | 'manual',
    context?: any
  ): Promise<ModelRetrainingTrigger> {
    try {
      console.log(`Triggering model retraining for: ${modelId}`)

      const trigger: ModelRetrainingTrigger = {
        id: this.generateId(),
        modelId,
        triggerType,
        threshold: 0.8, // Default threshold
        currentValue: context?.driftScore || 0.9,
        triggeredAt: new Date().toISOString(),
        status: 'triggered',
        estimatedDuration: 3600, // 1 hour
        priority: triggerType === 'data_drift' ? 'high' : 'medium'
      }

      // Store trigger
      await this.storeModelRetrainingTrigger(trigger)

      // Start retraining job
      const retrainingJobId = await this.startRetrainingJob(modelId, trigger)
      trigger.retrainingJobId = retrainingJobId
      trigger.status = 'in_progress'

      // Update trigger
      await this.updateModelRetrainingTrigger(trigger)

      return trigger
    } catch (error) {
      console.error('Error triggering model retraining:', error)
      throw error
    }
  }

  // Create human-in-loop review
  async createHumanInLoopReview(
    type: 'model_change' | 'prompt_update' | 'workflow_modification' | 'compliance_review',
    requestedBy: string,
    reviewData: Record<string, any>,
    deadline: string
  ): Promise<HumanInLoopReview> {
    try {
      console.log(`Creating human-in-loop review for: ${type}`)

      const review: HumanInLoopReview = {
        id: this.generateId(),
        type,
        status: 'pending',
        requestedBy,
        reviewData,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deadline
      }

      // Store review
      await this.storeHumanInLoopReview(review)

      // Notify reviewers
      await this.notifyReviewers(review)

      return review
    } catch (error) {
      console.error('Error creating human-in-loop review:', error)
      throw error
    }
  }

  // Process human-in-loop review
  async processHumanInLoopReview(
    reviewId: string,
    reviewedBy: string,
    decision: 'approved' | 'rejected' | 'needs_changes',
    comments: string[]
  ): Promise<void> {
    try {
      console.log(`Processing human-in-loop review: ${reviewId}`)

      const review = await this.getHumanInLoopReview(reviewId)
      if (!review) {
        throw new Error('Review not found')
      }

      review.status = decision
      review.reviewedBy = reviewedBy
      review.comments = [...review.comments, ...comments]
      review.updatedAt = new Date().toISOString()

      // Update review
      await this.updateHumanInLoopReview(review)

      // Execute approved changes
      if (decision === 'approved') {
        await this.executeApprovedChanges(review)
      }
    } catch (error) {
      console.error('Error processing human-in-loop review:', error)
      throw error
    }
  }

  // Monitor workflow health
  async monitorWorkflowHealth(): Promise<{
    activeWorkflows: number
    failedExecutions: number
    averageExecutionTime: number
    healthScore: number
    alerts: string[]
  }> {
    try {
      console.log('Monitoring workflow health...')

      const [activeWorkflows, failedExecutions, averageExecutionTime] = await Promise.all([
        this.getActiveWorkflows(),
        this.getFailedExecutions(),
        this.getAverageExecutionTime()
      ])

      const healthScore = this.calculateHealthScore(activeWorkflows, failedExecutions, averageExecutionTime)
      const alerts = this.generateHealthAlerts(activeWorkflows, failedExecutions, averageExecutionTime)

      return {
        activeWorkflows,
        failedExecutions,
        averageExecutionTime,
        healthScore,
        alerts
      }
    } catch (error) {
      console.error('Error monitoring workflow health:', error)
      throw error
    }
  }

  // Private helper methods
  private async executeStep(step: WorkflowStep, parameters?: Record<string, any>): Promise<void> {
    step.status = 'running'
    step.startedAt = new Date().toISOString()

    try {
      switch (step.type) {
        case 'data_ingestion':
          await this.executeDataIngestionStep(step, parameters)
          break
        case 'model_training':
          await this.executeModelTrainingStep(step, parameters)
          break
        case 'prediction':
          await this.executePredictionStep(step, parameters)
          break
        case 'validation':
          await this.executeValidationStep(step, parameters)
          break
        case 'notification':
          await this.executeNotificationStep(step, parameters)
          break
        case 'reporting':
          await this.executeReportingStep(step, parameters)
          break
        default:
          throw new Error(`Unknown step type: ${step.type}`)
      }

      step.status = 'completed'
      step.completedAt = new Date().toISOString()
      step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
    } catch (error) {
      step.status = 'failed'
      step.error = error.toString()
      throw error
    }
  }

  private async executeDataIngestionStep(step: WorkflowStep, parameters?: Record<string, any>): Promise<void> {
    // Simulate data ingestion
    console.log(`Executing data ingestion step: ${step.name}`)
    await new Promise(resolve => setTimeout(resolve, 1000))
    step.output = { recordsProcessed: 1000, status: 'success' }
  }

  private async executeModelTrainingStep(step: WorkflowStep, parameters?: Record<string, any>): Promise<void> {
    // Simulate model training
    console.log(`Executing model training step: ${step.name}`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    step.output = { modelVersion: 'v1.1.0', accuracy: 0.95, status: 'success' }
  }

  private async executePredictionStep(step: WorkflowStep, parameters?: Record<string, any>): Promise<void> {
    // Simulate prediction
    console.log(`Executing prediction step: ${step.name}`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    step.output = { predictionsGenerated: 100, status: 'success' }
  }

  private async executeValidationStep(step: WorkflowStep, parameters?: Record<string, any>): Promise<void> {
    // Simulate validation
    console.log(`Executing validation step: ${step.name}`)
    await new Promise(resolve => setTimeout(resolve, 1500))
    step.output = { validationPassed: true, status: 'success' }
  }

  private async executeNotificationStep(step: WorkflowStep, parameters?: Record<string, any>): Promise<void> {
    // Simulate notification
    console.log(`Executing notification step: ${step.name}`)
    await new Promise(resolve => setTimeout(resolve, 500))
    step.output = { notificationsSent: 10, status: 'success' }
  }

  private async executeReportingStep(step: WorkflowStep, parameters?: Record<string, any>): Promise<void> {
    // Simulate reporting
    console.log(`Executing reporting step: ${step.name}`)
    await new Promise(resolve => setTimeout(resolve, 3000))
    step.output = { reportsGenerated: 5, status: 'success' }
  }

  private async handleStepRetry(step: WorkflowStep, retryPolicy: any): Promise<void> {
    // Implement retry logic
    console.log(`Retrying step: ${step.name}`)
  }

  private async calculateDriftScore(feature: any, recentData: any[]): Promise<number> {
    // Simulate drift calculation
    return Math.random() * 1.0
  }

  private calculateSeverity(driftScore: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    if (driftScore > threshold * 1.5) return 'critical'
    if (driftScore > threshold * 1.2) return 'high'
    if (driftScore > threshold) return 'medium'
    return 'low'
  }

  private async generateDriftRecommendations(feature: any, driftScore: number): Promise<string[]> {
    return [
      'Retrain model with recent data',
      'Investigate feature distribution changes',
      'Consider feature engineering updates'
    ]
  }

  private async startRetrainingJob(modelId: string, trigger: ModelRetrainingTrigger): Promise<string> {
    // Simulate retraining job start
    return `retraining_${modelId}_${Date.now()}`
  }

  private async executeApprovedChanges(review: HumanInLoopReview): Promise<void> {
    // Execute approved changes based on review type
    console.log(`Executing approved changes for review: ${review.id}`)
  }

  private calculateHealthScore(activeWorkflows: number, failedExecutions: number, averageExecutionTime: number): number {
    // Calculate health score based on metrics
    const failureRate = failedExecutions / Math.max(activeWorkflows, 1)
    const timeScore = Math.max(0, 1 - (averageExecutionTime / 3600000)) // Normalize to hours
    return Math.round((1 - failureRate) * timeScore * 100)
  }

  private generateHealthAlerts(activeWorkflows: number, failedExecutions: number, averageExecutionTime: number): string[] {
    const alerts: string[] = []
    
    if (failedExecutions > 5) {
      alerts.push('High number of failed executions detected')
    }
    
    if (averageExecutionTime > 1800000) { // 30 minutes
      alerts.push('Average execution time is high')
    }
    
    return alerts
  }

  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Database operations
  private async storeWorkflow(workflow: Workflow): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('workflows')
        .insert({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
          status: workflow.status,
          steps: workflow.steps,
          triggers: workflow.triggers,
          retry_policy: workflow.retryPolicy,
          timeout: workflow.timeout,
          created_at: workflow.createdAt,
          updated_at: workflow.updatedAt,
          last_run: workflow.lastRun,
          next_run: workflow.nextRun
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing workflow:', error)
      throw error
    }
  }

  private async getWorkflow(workflowId: string): Promise<Workflow | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (error) throw error
      return data ? WorkflowSchema.parse(data) : null
    } catch (error) {
      console.error('Error getting workflow:', error)
      return null
    }
  }

  private async storeWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('workflow_executions')
        .insert({
          id: execution.id,
          workflow_id: execution.workflowId,
          status: execution.status,
          started_at: execution.startedAt,
          completed_at: execution.completedAt,
          duration: execution.duration,
          steps: execution.steps,
          logs: execution.logs,
          metrics: execution.metrics,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing workflow execution:', error)
      throw error
    }
  }

  private async updateWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('workflow_executions')
        .update({
          status: execution.status,
          completed_at: execution.completedAt,
          duration: execution.duration,
          steps: execution.steps,
          logs: execution.logs,
          metrics: execution.metrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', execution.id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating workflow execution:', error)
      throw error
    }
  }

  private async storeDataDriftDetections(detections: DataDriftDetection[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('data_drift_detections')
        .insert(detections.map(detection => ({
          id: detection.id,
          model_id: detection.modelId,
          feature_name: detection.featureName,
          drift_type: detection.driftType,
          severity: detection.severity,
          score: detection.score,
          threshold: detection.threshold,
          detected_at: detection.detectedAt,
          status: detection.status,
          details: detection.details,
          recommendations: detection.recommendations,
          created_at: new Date().toISOString()
        })))

      if (error) throw error
    } catch (error) {
      console.error('Error storing data drift detections:', error)
      throw error
    }
  }

  private async storeModelRetrainingTrigger(trigger: ModelRetrainingTrigger): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('model_retraining_triggers')
        .insert({
          id: trigger.id,
          model_id: trigger.modelId,
          trigger_type: trigger.triggerType,
          threshold: trigger.threshold,
          current_value: trigger.currentValue,
          triggered_at: trigger.triggeredAt,
          status: trigger.status,
          retraining_job_id: trigger.retrainingJobId,
          estimated_duration: trigger.estimatedDuration,
          priority: trigger.priority,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing model retraining trigger:', error)
      throw error
    }
  }

  private async updateModelRetrainingTrigger(trigger: ModelRetrainingTrigger): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('model_retraining_triggers')
        .update({
          status: trigger.status,
          retraining_job_id: trigger.retrainingJobId,
          updated_at: new Date().toISOString()
        })
        .eq('id', trigger.id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating model retraining trigger:', error)
      throw error
    }
  }

  private async storeHumanInLoopReview(review: HumanInLoopReview): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('human_in_loop_reviews')
        .insert({
          id: review.id,
          type: review.type,
          status: review.status,
          requested_by: review.requestedBy,
          reviewed_by: review.reviewedBy,
          review_data: review.reviewData,
          comments: review.comments,
          created_at: review.createdAt,
          updated_at: review.updatedAt,
          deadline: review.deadline
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing human-in-loop review:', error)
      throw error
    }
  }

  private async getHumanInLoopReview(reviewId: string): Promise<HumanInLoopReview | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('human_in_loop_reviews')
        .select('*')
        .eq('id', reviewId)
        .single()

      if (error) throw error
      return data ? data as HumanInLoopReview : null
    } catch (error) {
      console.error('Error getting human-in-loop review:', error)
      return null
    }
  }

  private async updateHumanInLoopReview(review: HumanInLoopReview): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('human_in_loop_reviews')
        .update({
          status: review.status,
          reviewed_by: review.reviewedBy,
          comments: review.comments,
          updated_at: review.updatedAt
        })
        .eq('id', review.id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating human-in-loop review:', error)
      throw error
    }
  }

  private async notifyReviewers(review: HumanInLoopReview): Promise<void> {
    // Implement notification logic
    console.log(`Notifying reviewers for review: ${review.id}`)
  }

  private async getModelData(modelId: string): Promise<any> {
    // Get model data
    return { features: [], driftThreshold: 0.8 }
  }

  private async getRecentData(modelId: string): Promise<any[]> {
    // Get recent data
    return []
  }

  private async getActiveWorkflows(): Promise<number> {
    // Get active workflows count
    return 5
  }

  private async getFailedExecutions(): Promise<number> {
    // Get failed executions count
    return 2
  }

  private async getAverageExecutionTime(): Promise<number> {
    // Get average execution time
    return 1800000 // 30 minutes
  }
}
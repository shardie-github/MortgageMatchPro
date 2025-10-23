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

// Workflow Schemas
export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['data_ingestion', 'model_training', 'prediction', 'explanation', 'compliance_check', 'notification']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  dependencies: z.array(z.string()),
  inputs: z.record(z.any()),
  outputs: z.record(z.any()),
  error: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3)
})

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'failed']),
  steps: z.array(WorkflowStepSchema),
  triggers: z.array(z.object({
    type: z.enum(['schedule', 'event', 'manual', 'data_drift']),
    config: z.record(z.any())
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  version: z.string()
})

export const DataDriftDetectionSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  featureName: z.string(),
  driftType: z.enum(['statistical', 'concept', 'data_quality']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  score: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1),
  detectedAt: z.string(),
  details: z.record(z.any()),
  actionRequired: z.boolean(),
  actionTaken: z.string().optional()
})

export const ModelRetrainingTriggerSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  triggerType: z.enum(['scheduled', 'drift_detected', 'performance_degradation', 'data_update']),
  config: z.record(z.any()),
  isActive: z.boolean(),
  lastTriggered: z.string().optional(),
  nextScheduled: z.string().optional(),
  createdAt: z.string()
})

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>
export type Workflow = z.infer<typeof WorkflowSchema>
export type DataDriftDetection = z.infer<typeof DataDriftDetectionSchema>
export type ModelRetrainingTrigger = z.infer<typeof ModelRetrainingTriggerSchema>

export interface WorkflowExecutionRequest {
  workflowId: string
  userId: string
  inputs: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface HumanInLoopReview {
  id: string
  stepId: string
  reviewerId: string
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes'
  comments: string
  changes: Record<string, any>
  reviewedAt: string
  deadline: string
}

export class WorkflowAutomationAgent {
  private model = 'gpt-4o'

  // Create a new workflow
  async createWorkflow(
    name: string,
    description: string,
    steps: Omit<WorkflowStep, 'id' | 'status' | 'retryCount'>[],
    triggers: any[],
    createdBy: string
  ): Promise<Workflow> {
    try {
      console.log(`Creating workflow: ${name}`)

      const workflowId = `workflow_${Date.now()}`
      const workflowSteps = steps.map((step, index) => ({
        ...step,
        id: `step_${workflowId}_${index}`,
        status: 'pending' as const,
        retryCount: 0
      }))

      const workflow: Workflow = {
        id: workflowId,
        name,
        description,
        status: 'draft',
        steps: workflowSteps,
        triggers,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy,
        version: '1.0.0'
      }

      // Store workflow
      await this.storeWorkflow(workflow)

      return workflow
    } catch (error) {
      console.error('Error creating workflow:', error)
      throw error
    }
  }

  // Execute a workflow
  async executeWorkflow(request: WorkflowExecutionRequest): Promise<{
    executionId: string
    status: string
    results: Record<string, any>
    errors: string[]
  }> {
    try {
      console.log(`Executing workflow: ${request.workflowId}`)

      const executionId = `exec_${Date.now()}`
      const workflow = await this.getWorkflow(request.workflowId)

      if (!workflow) {
        throw new Error('Workflow not found')
      }

      // Update workflow status
      await this.updateWorkflowStatus(workflow.id, 'active')

      const results: Record<string, any> = {}
      const errors: string[] = []

      // Execute steps in dependency order
      const executedSteps = new Set<string>()
      const stepResults = new Map<string, any>()

      while (executedSteps.size < workflow.steps.length) {
        const readySteps = workflow.steps.filter(step => 
          !executedSteps.has(step.id) &&
          step.dependencies.every(dep => executedSteps.has(dep))
        )

        if (readySteps.length === 0) {
          throw new Error('Circular dependency detected in workflow')
        }

        // Execute ready steps in parallel
        const stepPromises = readySteps.map(async (step) => {
          try {
            const stepResult = await this.executeStep(step, stepResults, request.inputs)
            stepResults.set(step.id, stepResult)
            results[step.id] = stepResult
            executedSteps.add(step.id)
          } catch (error) {
            errors.push(`Step ${step.name}: ${error}`)
            executedSteps.add(step.id)
          }
        })

        await Promise.all(stepPromises)
      }

      // Update workflow status
      const finalStatus = errors.length === 0 ? 'completed' : 'failed'
      await this.updateWorkflowStatus(workflow.id, finalStatus)

      return {
        executionId,
        status: finalStatus,
        results,
        errors
      }
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

      // Perform drift detection
      const driftDetections = await this.performDriftDetection(modelId, modelData, recentData)

      // Store drift detections
      await this.storeDriftDetections(driftDetections)

      // Trigger retraining if critical drift detected
      const criticalDrift = driftDetections.filter(d => d.severity === 'critical')
      if (criticalDrift.length > 0) {
        await this.triggerModelRetraining(modelId, 'drift_detected', {
          driftDetections: criticalDrift
        })
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
    triggerType: 'scheduled' | 'drift_detected' | 'performance_degradation' | 'data_update',
    config: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`Triggering model retraining for: ${modelId}`)

      // Check if retraining is already in progress
      const existingRetraining = await this.getActiveRetraining(modelId)
      if (existingRetraining) {
        console.log('Model retraining already in progress')
        return
      }

      // Create retraining trigger
      const trigger: ModelRetrainingTrigger = {
        id: `retrain_${Date.now()}`,
        modelId,
        triggerType,
        config,
        isActive: true,
        lastTriggered: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }

      // Store trigger
      await this.storeRetrainingTrigger(trigger)

      // Execute retraining workflow
      const retrainingWorkflow = await this.getRetrainingWorkflow(modelId)
      if (retrainingWorkflow) {
        await this.executeWorkflow({
          workflowId: retrainingWorkflow.id,
          userId: 'system',
          inputs: { modelId, triggerType, config },
          priority: 'high'
        })
      }
    } catch (error) {
      console.error('Error triggering model retraining:', error)
      throw error
    }
  }

  // Set up human-in-the-loop review
  async setupHumanReview(
    stepId: string,
    reviewerId: string,
    deadline: string,
    context: Record<string, any>
  ): Promise<HumanInLoopReview> {
    try {
      console.log(`Setting up human review for step: ${stepId}`)

      const review: HumanInLoopReview = {
        id: `review_${Date.now()}`,
        stepId,
        reviewerId,
        status: 'pending',
        comments: '',
        changes: {},
        reviewedAt: '',
        deadline
      }

      // Store review
      await this.storeHumanReview(review)

      // Send notification to reviewer
      await this.notifyReviewer(reviewerId, review, context)

      return review
    } catch (error) {
      console.error('Error setting up human review:', error)
      throw error
    }
  }

  // Process human review
  async processHumanReview(
    reviewId: string,
    status: 'approved' | 'rejected' | 'needs_changes',
    comments: string,
    changes: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`Processing human review: ${reviewId}`)

      // Update review
      await this.updateHumanReview(reviewId, {
        status,
        comments,
        changes,
        reviewedAt: new Date().toISOString()
      })

      // If approved, continue workflow
      if (status === 'approved') {
        const review = await this.getHumanReview(reviewId)
        if (review) {
          await this.continueWorkflowAfterReview(review.stepId, changes)
        }
      }
    } catch (error) {
      console.error('Error processing human review:', error)
      throw error
    }
  }

  // Get workflow execution status
  async getWorkflowStatus(workflowId: string): Promise<{
    status: string
    progress: number
    currentStep: string | null
    completedSteps: number
    totalSteps: number
    errors: string[]
  }> {
    try {
      const workflow = await this.getWorkflow(workflowId)
      if (!workflow) {
        throw new Error('Workflow not found')
      }

      const completedSteps = workflow.steps.filter(s => s.status === 'completed').length
      const failedSteps = workflow.steps.filter(s => s.status === 'failed').length
      const runningSteps = workflow.steps.filter(s => s.status === 'running')
      const currentStep = runningSteps.length > 0 ? runningSteps[0].name : null

      const progress = (completedSteps / workflow.steps.length) * 100
      const status = failedSteps > 0 ? 'failed' : 
                   completedSteps === workflow.steps.length ? 'completed' : 'running'

      return {
        status,
        progress,
        currentStep,
        completedSteps,
        totalSteps: workflow.steps.length,
        errors: workflow.steps.filter(s => s.error).map(s => s.error!)
      }
    } catch (error) {
      console.error('Error getting workflow status:', error)
      throw error
    }
  }

  // Private helper methods
  private async executeStep(
    step: WorkflowStep,
    stepResults: Map<string, any>,
    inputs: Record<string, any>
  ): Promise<any> {
    console.log(`Executing step: ${step.name}`)

    // Update step status
    await this.updateStepStatus(step.id, 'running', { startedAt: new Date().toISOString() })

    try {
      let result: any

      switch (step.type) {
        case 'data_ingestion':
          result = await this.executeDataIngestionStep(step, stepResults, inputs)
          break
        case 'model_training':
          result = await this.executeModelTrainingStep(step, stepResults, inputs)
          break
        case 'prediction':
          result = await this.executePredictionStep(step, stepResults, inputs)
          break
        case 'explanation':
          result = await this.executeExplanationStep(step, stepResults, inputs)
          break
        case 'compliance_check':
          result = await this.executeComplianceCheckStep(step, stepResults, inputs)
          break
        case 'notification':
          result = await this.executeNotificationStep(step, stepResults, inputs)
          break
        default:
          throw new Error(`Unknown step type: ${step.type}`)
      }

      // Update step status
      await this.updateStepStatus(step.id, 'completed', {
        completedAt: new Date().toISOString(),
        outputs: result
      })

      return result
    } catch (error) {
      // Update step status
      await this.updateStepStatus(step.id, 'failed', {
        error: error.toString(),
        retryCount: step.retryCount + 1
      })

      // Retry if within limits
      if (step.retryCount < step.maxRetries) {
        console.log(`Retrying step ${step.name} (attempt ${step.retryCount + 1})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (step.retryCount + 1)))
        return this.executeStep(step, stepResults, inputs)
      }

      throw error
    }
  }

  private async executeDataIngestionStep(
    step: WorkflowStep,
    stepResults: Map<string, any>,
    inputs: Record<string, any>
  ): Promise<any> {
    // Simulate data ingestion
    console.log('Executing data ingestion step')
    return { recordsProcessed: 1000, status: 'success' }
  }

  private async executeModelTrainingStep(
    step: WorkflowStep,
    stepResults: Map<string, any>,
    inputs: Record<string, any>
  ): Promise<any> {
    // Simulate model training
    console.log('Executing model training step')
    return { modelId: `model_${Date.now()}`, accuracy: 0.95, status: 'success' }
  }

  private async executePredictionStep(
    step: WorkflowStep,
    stepResults: Map<string, any>,
    inputs: Record<string, any>
  ): Promise<any> {
    // Simulate prediction
    console.log('Executing prediction step')
    return { predictionId: `pred_${Date.now()}`, result: 0.85, status: 'success' }
  }

  private async executeExplanationStep(
    step: WorkflowStep,
    stepResults: Map<string, any>,
    inputs: Record<string, any>
  ): Promise<any> {
    // Simulate explanation generation
    console.log('Executing explanation step')
    return { explanationId: `exp_${Date.now()}`, status: 'success' }
  }

  private async executeComplianceCheckStep(
    step: WorkflowStep,
    stepResults: Map<string, any>,
    inputs: Record<string, any>
  ): Promise<any> {
    // Simulate compliance check
    console.log('Executing compliance check step')
    return { checkId: `check_${Date.now()}`, status: 'compliant' }
  }

  private async executeNotificationStep(
    step: WorkflowStep,
    stepResults: Map<string, any>,
    inputs: Record<string, any>
  ): Promise<any> {
    // Simulate notification
    console.log('Executing notification step')
    return { notificationId: `notif_${Date.now()}`, status: 'sent' }
  }

  private async performDriftDetection(
    modelId: string,
    modelData: any,
    recentData: any
  ): Promise<DataDriftDetection[]> {
    // Simulate drift detection
    const detections: DataDriftDetection[] = [
      {
        id: `drift_${Date.now()}`,
        modelId,
        featureName: 'income',
        driftType: 'statistical',
        severity: 'medium',
        score: 0.75,
        threshold: 0.7,
        detectedAt: new Date().toISOString(),
        details: { pValue: 0.01, statistic: 2.5 },
        actionRequired: true
      }
    ]

    return detections
  }

  private async storeWorkflow(workflow: Workflow): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('workflows')
        .insert({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          status: workflow.status,
          steps: workflow.steps,
          triggers: workflow.triggers,
          created_at: workflow.createdAt,
          updated_at: workflow.updatedAt,
          created_by: workflow.createdBy,
          version: workflow.version
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

  private async updateWorkflowStatus(workflowId: string, status: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('workflows')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', workflowId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating workflow status:', error)
      throw error
    }
  }

  private async updateStepStatus(
    stepId: string,
    status: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('workflow_steps')
        .update({ 
          status, 
          ...updates,
          updated_at: new Date().toISOString() 
        })
        .eq('id', stepId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating step status:', error)
      throw error
    }
  }

  private async storeDriftDetections(detections: DataDriftDetection[]): Promise<void> {
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
          details: detection.details,
          action_required: detection.actionRequired,
          action_taken: detection.actionTaken,
          created_at: new Date().toISOString()
        })))

      if (error) throw error
    } catch (error) {
      console.error('Error storing drift detections:', error)
      throw error
    }
  }

  private async storeRetrainingTrigger(trigger: ModelRetrainingTrigger): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('model_retraining_triggers')
        .insert({
          id: trigger.id,
          model_id: trigger.modelId,
          trigger_type: trigger.triggerType,
          config: trigger.config,
          is_active: trigger.isActive,
          last_triggered: trigger.lastTriggered,
          next_scheduled: trigger.nextScheduled,
          created_at: trigger.createdAt
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing retraining trigger:', error)
      throw error
    }
  }

  private async getModelData(modelId: string): Promise<any> {
    // Get model data from database
    return { modelId, type: 'mortgage_prediction' }
  }

  private async getRecentData(modelId: string): Promise<any> {
    // Get recent data from database
    return { records: 1000, features: ['income', 'debt', 'credit_score'] }
  }

  private async getActiveRetraining(modelId: string): Promise<any> {
    // Check for active retraining
    return null
  }

  private async getRetrainingWorkflow(modelId: string): Promise<Workflow | null> {
    // Get retraining workflow for model
    return null
  }

  private async storeHumanReview(review: HumanInLoopReview): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('human_reviews')
        .insert({
          id: review.id,
          step_id: review.stepId,
          reviewer_id: review.reviewerId,
          status: review.status,
          comments: review.comments,
          changes: review.changes,
          reviewed_at: review.reviewedAt,
          deadline: review.deadline,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing human review:', error)
      throw error
    }
  }

  private async notifyReviewer(
    reviewerId: string,
    review: HumanInLoopReview,
    context: Record<string, any>
  ): Promise<void> {
    // Send notification to reviewer
    console.log(`Notifying reviewer ${reviewerId} about review ${review.id}`)
  }

  private async updateHumanReview(
    reviewId: string,
    updates: Partial<HumanInLoopReview>
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('human_reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating human review:', error)
      throw error
    }
  }

  private async getHumanReview(reviewId: string): Promise<HumanInLoopReview | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('human_reviews')
        .select('*')
        .eq('id', reviewId)
        .single()

      if (error) throw error
      return data || null
    } catch (error) {
      console.error('Error getting human review:', error)
      return null
    }
  }

  private async continueWorkflowAfterReview(stepId: string, changes: Record<string, any>): Promise<void> {
    // Continue workflow execution after human review
    console.log(`Continuing workflow after review for step: ${stepId}`)
  }
}
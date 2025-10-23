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

// OSFI EDGE Compliance Schemas
export const OSFIEdgeComplianceSchema = z.object({
  explainability: z.object({
    modelTransparency: z.boolean(),
    decisionRationale: z.string(),
    featureImportance: z.array(z.object({
      feature: z.string(),
      importance: z.number(),
      impact: z.string()
    })),
    confidenceLevel: z.number().min(0).max(1)
  }),
  data: z.object({
    dataQuality: z.string(),
    dataLineage: z.array(z.string()),
    biasDetection: z.object({
      demographicBias: z.boolean(),
      geographicBias: z.boolean(),
      temporalBias: z.boolean(),
      biasScore: z.number().min(0).max(1)
    }),
    privacyCompliance: z.boolean()
  }),
  governance: z.object({
    modelVersion: z.string(),
    lastRetrained: z.string(),
    approvalStatus: z.string(),
    riskAssessment: z.string(),
    auditTrail: z.array(z.object({
      timestamp: z.string(),
      action: z.string(),
      user: z.string(),
      details: z.string()
    }))
  }),
  ethics: z.object({
    fairnessScore: z.number().min(0).max(1),
    transparencyScore: z.number().min(0).max(1),
    accountabilityScore: z.number().min(0).max(1),
    ethicalConcerns: z.array(z.string()),
    mitigationStrategies: z.array(z.string())
  })
})

export const SHAPExplanationSchema = z.object({
  predictionId: z.string(),
  baseValue: z.number(),
  shapValues: z.array(z.object({
    feature: z.string(),
    value: z.number(),
    shapValue: z.number(),
    impact: z.string()
  })),
  featureImportance: z.array(z.object({
    feature: z.string(),
    importance: z.number(),
    direction: z.enum(['positive', 'negative', 'neutral'])
  })),
  summary: z.string(),
  visualization: z.object({
    type: z.string(),
    data: z.any()
  })
})

export const LIMEExplanationSchema = z.object({
  predictionId: z.string(),
  explanation: z.array(z.object({
    feature: z.string(),
    weight: z.number(),
    value: z.any(),
    description: z.string()
  })),
  fidelity: z.number(),
  confidence: z.number(),
  summary: z.string()
})

export const ModelCardSchema = z.object({
  modelId: z.string(),
  modelName: z.string(),
  version: z.string(),
  description: z.string(),
  dataSources: z.array(z.string()),
  trainingData: z.object({
    size: z.number(),
    timeRange: z.string(),
    demographics: z.object({
      age: z.string(),
      income: z.string(),
      geography: z.string()
    }),
    qualityMetrics: z.object({
      completeness: z.number(),
      accuracy: z.number(),
      consistency: z.number()
    })
  }),
  performance: z.object({
    accuracy: z.number(),
    precision: z.number(),
    recall: z.number(),
    f1Score: z.number(),
    auc: z.number()
  }),
  limitations: z.array(z.string()),
  biasAssessment: z.object({
    protectedAttributes: z.array(z.string()),
    biasMetrics: z.record(z.number()),
    mitigationMeasures: z.array(z.string())
  }),
  lastUpdated: z.string(),
  nextReview: z.string()
})

export type OSFIEdgeCompliance = z.infer<typeof OSFIEdgeComplianceSchema>
export type SHAPExplanation = z.infer<typeof SHAPExplanationSchema>
export type LIMEExplanation = z.infer<typeof LIMEExplanationSchema>
export type ModelCard = z.infer<typeof ModelCardSchema>

export interface ExplainabilityRequest {
  predictionId: string
  modelType: string
  inputData: Record<string, any>
  userId: string
  explanationType: 'shap' | 'lime' | 'both'
}

export interface GovernanceLogEntry {
  timestamp: string
  userId: string
  action: string
  modelId: string
  predictionId?: string
  details: Record<string, any>
  complianceStatus: 'compliant' | 'flagged' | 'violation'
}

export class EnhancedExplainabilityAgent {
  private model = 'gpt-4o'

  // Generate SHAP explanation for a prediction
  async generateSHAPExplanation(request: ExplainabilityRequest): Promise<SHAPExplanation> {
    try {
      console.log(`Generating SHAP explanation for prediction ${request.predictionId}`)

      // Simulate SHAP calculation (in production, use actual SHAP library)
      const shapValues = await this.calculateSHAPValues(request.inputData, request.modelType)
      
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI explainability expert. Generate clear, actionable explanations of SHAP values for mortgage predictions. Focus on transparency and regulatory compliance.`
          },
          {
            role: 'user',
            content: `Explain this SHAP analysis for a ${request.modelType} prediction:

Input Data: ${JSON.stringify(request.inputData, null, 2)}
SHAP Values: ${JSON.stringify(shapValues, null, 2)}

Provide:
1. Feature importance ranking
2. Clear explanation of each feature's impact
3. Summary of the decision rationale
4. Visualization data for charts

Return JSON matching SHAPExplanationSchema.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500
      })

      const explanation = JSON.parse(response.choices[0].message.content || '{}')
      const shapExplanation = SHAPExplanationSchema.parse({
        ...explanation,
        predictionId: request.predictionId
      })

      // Store explanation in database
      await this.storeExplanation('shap', shapExplanation, request.userId)

      return shapExplanation
    } catch (error) {
      console.error('Error generating SHAP explanation:', error)
      throw error
    }
  }

  // Generate LIME explanation for a prediction
  async generateLIMEExplanation(request: ExplainabilityRequest): Promise<LIMEExplanation> {
    try {
      console.log(`Generating LIME explanation for prediction ${request.predictionId}`)

      // Simulate LIME calculation (in production, use actual LIME library)
      const limeValues = await this.calculateLIMEValues(request.inputData, request.modelType)
      
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI explainability expert. Generate clear, local explanations using LIME for mortgage predictions. Focus on interpretability and user understanding.`
          },
          {
            role: 'user',
            content: `Explain this LIME analysis for a ${request.modelType} prediction:

Input Data: ${JSON.stringify(request.inputData, null, 2)}
LIME Values: ${JSON.stringify(limeValues, null, 2)}

Provide:
1. Local feature weights
2. Clear descriptions of each feature's local impact
3. Fidelity and confidence scores
4. Summary explanation

Return JSON matching LIMEExplanationSchema.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1200
      })

      const explanation = JSON.parse(response.choices[0].message.content || '{}')
      const limeExplanation = LIMEExplanationSchema.parse({
        ...explanation,
        predictionId: request.predictionId
      })

      // Store explanation in database
      await this.storeExplanation('lime', limeExplanation, request.userId)

      return limeExplanation
    } catch (error) {
      console.error('Error generating LIME explanation:', error)
      throw error
    }
  }

  // Generate comprehensive explanation (both SHAP and LIME)
  async generateComprehensiveExplanation(request: ExplainabilityRequest): Promise<{
    shap: SHAPExplanation
    lime: LIMEExplanation
    combined: {
      summary: string
      keyInsights: string[]
      recommendations: string[]
      confidence: number
    }
  }> {
    try {
      const [shapExplanation, limeExplanation] = await Promise.all([
        this.generateSHAPExplanation(request),
        this.generateLIMEExplanation(request)
      ])

      // Generate combined explanation
      const combinedExplanation = await this.generateCombinedExplanation(
        shapExplanation,
        limeExplanation,
        request
      )

      return {
        shap: shapExplanation,
        lime: limeExplanation,
        combined: combinedExplanation
      }
    } catch (error) {
      console.error('Error generating comprehensive explanation:', error)
      throw error
    }
  }

  // Assess OSFI EDGE compliance
  async assessOSFIEdgeCompliance(
    modelId: string,
    predictionId: string,
    userId: string
  ): Promise<OSFIEdgeCompliance> {
    try {
      console.log(`Assessing OSFI EDGE compliance for model ${modelId}`)

      // Get model and prediction data
      const [modelData, predictionData] = await Promise.all([
        this.getModelData(modelId),
        this.getPredictionData(predictionId)
      ])

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a regulatory compliance expert specializing in OSFI EDGE principles. Assess model compliance across Explainability, Data, Governance, and Ethics dimensions.`
          },
          {
            role: 'user',
            content: `Assess OSFI EDGE compliance for this mortgage model:

Model Data: ${JSON.stringify(modelData, null, 2)}
Prediction Data: ${JSON.stringify(predictionData, null, 2)}

Evaluate:
1. EXPLAINABILITY: Model transparency, decision rationale, feature importance
2. DATA: Data quality, lineage, bias detection, privacy compliance
3. GOVERNANCE: Model versioning, approval status, risk assessment, audit trail
4. ETHICS: Fairness, transparency, accountability, ethical concerns

Return JSON matching OSFIEdgeComplianceSchema.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2000
      })

      const compliance = JSON.parse(response.choices[0].message.content || '{}')
      const osfiCompliance = OSFIEdgeComplianceSchema.parse(compliance)

      // Store compliance assessment
      await this.storeComplianceAssessment(modelId, predictionId, osfiCompliance)

      return osfiCompliance
    } catch (error) {
      console.error('Error assessing OSFI EDGE compliance:', error)
      throw error
    }
  }

  // Generate model card
  async generateModelCard(modelId: string): Promise<ModelCard> {
    try {
      console.log(`Generating model card for model ${modelId}`)

      const modelData = await this.getModelData(modelId)
      const performanceData = await this.getModelPerformance(modelId)
      const biasData = await this.getBiasAssessment(modelId)

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a machine learning documentation expert. Generate comprehensive model cards that provide transparency and accountability for mortgage AI models.`
          },
          {
            role: 'user',
            content: `Generate a model card for this mortgage model:

Model Data: ${JSON.stringify(modelData, null, 2)}
Performance: ${JSON.stringify(performanceData, null, 2)}
Bias Assessment: ${JSON.stringify(biasData, null, 2)}

Include:
1. Model description and purpose
2. Data sources and training details
3. Performance metrics
4. Limitations and bias assessment
5. Governance and compliance information

Return JSON matching ModelCardSchema.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2500
      })

      const modelCard = JSON.parse(response.choices[0].message.content || '{}')
      return ModelCardSchema.parse({
        ...modelCard,
        modelId
      })
    } catch (error) {
      console.error('Error generating model card:', error)
      throw error
    }
  }

  // Log governance action
  async logGovernanceAction(entry: GovernanceLogEntry): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('governance_logs')
        .insert({
          timestamp: entry.timestamp,
          user_id: entry.userId,
          action: entry.action,
          model_id: entry.modelId,
          prediction_id: entry.predictionId,
          details: entry.details,
          compliance_status: entry.complianceStatus,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error logging governance action:', error)
      throw error
    }
  }

  // Get transparency portal data for regulators
  async getTransparencyPortalData(modelId: string): Promise<{
    modelCard: ModelCard
    complianceStatus: OSFIEdgeCompliance
    recentDecisions: any[]
    auditTrail: GovernanceLogEntry[]
    biasReports: any[]
  }> {
    try {
      const [modelCard, complianceStatus, recentDecisions, auditTrail, biasReports] = await Promise.all([
        this.generateModelCard(modelId),
        this.assessOSFIEdgeCompliance(modelId, '', ''),
        this.getRecentDecisions(modelId),
        this.getAuditTrail(modelId),
        this.getBiasReports(modelId)
      ])

      return {
        modelCard,
        complianceStatus,
        recentDecisions,
        auditTrail,
        biasReports
      }
    } catch (error) {
      console.error('Error getting transparency portal data:', error)
      throw error
    }
  }

  // Private helper methods
  private async calculateSHAPValues(inputData: Record<string, any>, modelType: string): Promise<any[]> {
    // Simulate SHAP calculation
    // In production, integrate with actual SHAP library
    const features = Object.keys(inputData)
    return features.map(feature => ({
      feature,
      value: inputData[feature],
      shapValue: Math.random() * 2 - 1, // Simulated SHAP value
      importance: Math.abs(Math.random() * 2 - 1)
    }))
  }

  private async calculateLIMEValues(inputData: Record<string, any>, modelType: string): Promise<any[]> {
    // Simulate LIME calculation
    // In production, integrate with actual LIME library
    const features = Object.keys(inputData)
    return features.map(feature => ({
      feature,
      value: inputData[feature],
      weight: Math.random() * 2 - 1, // Simulated LIME weight
      description: `Local impact of ${feature} on prediction`
    }))
  }

  private async generateCombinedExplanation(
    shap: SHAPExplanation,
    lime: LIMEExplanation,
    request: ExplainabilityRequest
  ): Promise<{
    summary: string
    keyInsights: string[]
    recommendations: string[]
    confidence: number
  }> {
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI explainability expert. Combine SHAP and LIME explanations to provide comprehensive, actionable insights for mortgage decisions.`
        },
        {
          role: 'user',
          content: `Combine these explanations for a ${request.modelType} prediction:

SHAP: ${JSON.stringify(shap, null, 2)}
LIME: ${JSON.stringify(lime, null, 2)}

Provide:
1. Combined summary
2. Key insights from both methods
3. Actionable recommendations
4. Overall confidence score

Return JSON with summary, keyInsights, recommendations, and confidence.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  }

  private async storeExplanation(
    type: 'shap' | 'lime',
    explanation: any,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('explanations')
        .insert({
          type,
          explanation_data: explanation,
          user_id: userId,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing explanation:', error)
      throw error
    }
  }

  private async storeComplianceAssessment(
    modelId: string,
    predictionId: string,
    compliance: OSFIEdgeCompliance
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_assessments')
        .insert({
          model_id: modelId,
          prediction_id: predictionId,
          compliance_data: compliance,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing compliance assessment:', error)
      throw error
    }
  }

  private async getModelData(modelId: string): Promise<any> {
    // Get model data from database
    const { data, error } = await supabaseAdmin
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single()

    if (error) throw error
    return data
  }

  private async getPredictionData(predictionId: string): Promise<any> {
    // Get prediction data from database
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('id', predictionId)
      .single()

    if (error) throw error
    return data
  }

  private async getModelPerformance(modelId: string): Promise<any> {
    // Get model performance metrics
    const { data, error } = await supabaseAdmin
      .from('model_performance')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (error) throw error
    return data
  }

  private async getBiasAssessment(modelId: string): Promise<any> {
    // Get bias assessment data
    const { data, error } = await supabaseAdmin
      .from('bias_assessments')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (error) throw error
    return data
  }

  private async getRecentDecisions(modelId: string): Promise<any[]> {
    // Get recent decisions for the model
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  }

  private async getAuditTrail(modelId: string): Promise<GovernanceLogEntry[]> {
    // Get audit trail for the model
    const { data, error } = await supabaseAdmin
      .from('governance_logs')
      .select('*')
      .eq('model_id', modelId)
      .order('timestamp', { ascending: false })
      .limit(1000)

    if (error) throw error
    return data || []
  }

  private async getBiasReports(modelId: string): Promise<any[]> {
    // Get bias reports for the model
    const { data, error } = await supabaseAdmin
      .from('bias_reports')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
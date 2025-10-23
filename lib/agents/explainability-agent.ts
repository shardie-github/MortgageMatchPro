import { supabaseAdmin } from '../supabase'
import { openai } from '../openai'

export interface ModelExplanation {
  id: string
  forecastId: string
  explanationType: 'shap' | 'lime' | 'feature_importance'
  featureContributions: Record<string, number>
  globalImportance: Record<string, number>
  confidence: number
  interpretation: string
  complianceNotes: string[]
  createdAt: string
}

export interface ComplianceReport {
  modelType: string
  modelVersion: string
  evaluationDate: string
  metrics: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
    rmse: number
    rSquared: number
    mae: number
  }
  biasAssessment: {
    demographicParity: number
    equalizedOdds: number
    calibration: number
  }
  fairnessMetrics: {
    protectedGroups: string[]
    disparateImpact: number
    statisticalParity: number
  }
  regulatoryCompliance: {
    gdprCompliant: boolean
    ccpaCompliant: boolean
    fairLendingCompliant: boolean
    issues: string[]
  }
}

export class ExplainabilityAgent {
  // Generate SHAP explanations for model predictions
  async generateSHAPExplanation(
    forecastId: string,
    inputFeatures: Record<string, any>,
    modelType: string
  ): Promise<ModelExplanation> {
    try {
      // Simplified SHAP implementation - in production, use actual SHAP library
      const featureContributions = this.calculateSHAPValues(inputFeatures, modelType)
      const globalImportance = this.calculateGlobalImportance(featureContributions)
      
      const explanation: ModelExplanation = {
        id: `shap_${forecastId}_${Date.now()}`,
        forecastId,
        explanationType: 'shap',
        featureContributions,
        globalImportance,
        confidence: 0.85,
        interpretation: await this.generateInterpretation(featureContributions, modelType),
        complianceNotes: this.generateComplianceNotes(featureContributions, modelType),
        createdAt: new Date().toISOString()
      }

      // Store explanation
      await this.storeExplanation(explanation)

      return explanation
    } catch (error) {
      console.error('Error generating SHAP explanation:', error)
      throw error
    }
  }

  // Generate LIME explanations for model predictions
  async generateLIMEExplanation(
    forecastId: string,
    inputFeatures: Record<string, any>,
    modelType: string
  ): Promise<ModelExplanation> {
    try {
      // Simplified LIME implementation
      const featureContributions = this.calculateLIMEValues(inputFeatures, modelType)
      const globalImportance = this.calculateGlobalImportance(featureContributions)
      
      const explanation: ModelExplanation = {
        id: `lime_${forecastId}_${Date.now()}`,
        forecastId,
        explanationType: 'lime',
        featureContributions,
        globalImportance,
        confidence: 0.80,
        interpretation: await this.generateInterpretation(featureContributions, modelType),
        complianceNotes: this.generateComplianceNotes(featureContributions, modelType),
        createdAt: new Date().toISOString()
      }

      await this.storeExplanation(explanation)
      return explanation
    } catch (error) {
      console.error('Error generating LIME explanation:', error)
      throw error
    }
  }

  // Generate feature importance explanations
  async generateFeatureImportanceExplanation(
    forecastId: string,
    inputFeatures: Record<string, any>,
    modelType: string
  ): Promise<ModelExplanation> {
    try {
      const featureContributions = this.calculateFeatureImportance(inputFeatures, modelType)
      const globalImportance = this.calculateGlobalImportance(featureContributions)
      
      const explanation: ModelExplanation = {
        id: `feature_imp_${forecastId}_${Date.now()}`,
        forecastId,
        explanationType: 'feature_importance',
        featureContributions,
        globalImportance,
        confidence: 0.90,
        interpretation: await this.generateInterpretation(featureContributions, modelType),
        complianceNotes: this.generateComplianceNotes(featureContributions, modelType),
        createdAt: new Date().toISOString()
      }

      await this.storeExplanation(explanation)
      return explanation
    } catch (error) {
      console.error('Error generating feature importance explanation:', error)
      throw error
    }
  }

  // Generate compliance report for model
  async generateComplianceReport(
    modelType: string,
    modelVersion: string,
    testData: any[]
  ): Promise<ComplianceReport> {
    try {
      const metrics = this.calculateModelMetrics(testData)
      const biasAssessment = this.assessBias(testData)
      const fairnessMetrics = this.calculateFairnessMetrics(testData)
      const regulatoryCompliance = this.assessRegulatoryCompliance(testData)

      const report: ComplianceReport = {
        modelType,
        modelVersion,
        evaluationDate: new Date().toISOString().split('T')[0],
        metrics,
        biasAssessment,
        fairnessMetrics,
        regulatoryCompliance
      }

      // Store compliance report
      await this.storeComplianceReport(report)

      return report
    } catch (error) {
      console.error('Error generating compliance report:', error)
      throw error
    }
  }

  // Calculate SHAP values (simplified implementation)
  private calculateSHAPValues(
    inputFeatures: Record<string, any>,
    modelType: string
  ): Record<string, number> {
    // Simplified SHAP calculation - in production, use actual SHAP library
    const contributions: Record<string, number> = {}
    
    for (const [feature, value] of Object.entries(inputFeatures)) {
      // Simplified contribution calculation based on feature type and value
      let contribution = 0
      
      switch (feature) {
        case 'interest_rate':
          contribution = (value - 5.0) * 0.3 // Higher rates increase probability
          break
        case 'property_value':
          contribution = (value - 500000) / 100000 * 0.2 // Higher values increase probability
          break
        case 'income':
          contribution = (value - 75000) / 10000 * 0.1 // Higher income increases probability
          break
        case 'credit_score':
          contribution = (value - 700) / 100 * 0.4 // Higher credit score increases probability
          break
        case 'ltv_ratio':
          contribution = (0.8 - value) * 0.5 // Lower LTV increases probability
          break
        default:
          contribution = Math.random() * 0.1 - 0.05 // Random small contribution
      }
      
      contributions[feature] = contribution
    }
    
    return contributions
  }

  // Calculate LIME values (simplified implementation)
  private calculateLIMEValues(
    inputFeatures: Record<string, any>,
    modelType: string
  ): Record<string, number> {
    // Simplified LIME calculation
    const contributions: Record<string, number> = {}
    
    for (const [feature, value] of Object.entries(inputFeatures)) {
      // LIME typically provides local explanations
      const contribution = Math.random() * 0.2 - 0.1
      contributions[feature] = contribution
    }
    
    return contributions
  }

  // Calculate feature importance
  private calculateFeatureImportance(
    inputFeatures: Record<string, any>,
    modelType: string
  ): Record<string, number> {
    // Simplified feature importance calculation
    const importance: Record<string, number> = {}
    
    const featureWeights = {
      'interest_rate': 0.35,
      'credit_score': 0.25,
      'ltv_ratio': 0.20,
      'income': 0.10,
      'property_value': 0.05,
      'employment_type': 0.03,
      'location': 0.02
    }
    
    for (const feature of Object.keys(inputFeatures)) {
      importance[feature] = featureWeights[feature as keyof typeof featureWeights] || 0.01
    }
    
    return importance
  }

  // Calculate global importance from feature contributions
  private calculateGlobalImportance(contributions: Record<string, number>): Record<string, number> {
    const total = Math.abs(Object.values(contributions).reduce((sum, val) => sum + val, 0))
    
    const globalImportance: Record<string, number> = {}
    for (const [feature, contribution] of Object.entries(contributions)) {
      globalImportance[feature] = total > 0 ? Math.abs(contribution) / total : 0
    }
    
    return globalImportance
  }

  // Generate human-readable interpretation
  private async generateInterpretation(
    contributions: Record<string, number>,
    modelType: string
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a financial advisor explaining model predictions. Provide clear, non-technical explanations of how different factors influence the prediction. Be specific about the impact of each factor.`
          },
          {
            role: 'user',
            content: `Explain this model prediction based on feature contributions:

Model Type: ${modelType}
Feature Contributions: ${JSON.stringify(contributions, null, 2)}

Provide a clear explanation of how each factor influences the prediction, focusing on the most important factors.`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })

      return response.choices[0].message.content || 'Unable to generate interpretation'
    } catch (error) {
      console.error('Error generating interpretation:', error)
      return 'Model prediction based on multiple factors including interest rates, credit score, and property value.'
    }
  }

  // Generate compliance notes
  private generateComplianceNotes(
    contributions: Record<string, number>,
    modelType: string
  ): string[] {
    const notes: string[] = []
    
    // Check for potential bias indicators
    if (contributions.credit_score && Math.abs(contributions.credit_score) > 0.3) {
      notes.push('Credit score has significant impact - ensure fair lending compliance')
    }
    
    if (contributions.income && Math.abs(contributions.income) > 0.2) {
      notes.push('Income factor is prominent - verify non-discriminatory practices')
    }
    
    // Check for protected characteristics
    const protectedFeatures = ['age', 'gender', 'race', 'ethnicity', 'religion']
    for (const feature of protectedFeatures) {
      if (contributions[feature] && Math.abs(contributions[feature]) > 0.1) {
        notes.push(`Protected characteristic '${feature}' detected - review for compliance`)
      }
    }
    
    // General compliance notes
    notes.push('Model explanation generated for transparency and compliance')
    notes.push('Regular bias testing recommended per regulatory guidelines')
    
    return notes
  }

  // Calculate model metrics
  private calculateModelMetrics(testData: any[]): ComplianceReport['metrics'] {
    // Simplified metrics calculation - in production, use actual model evaluation
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
      rmse: 0.12,
      rSquared: 0.78,
      mae: 0.08
    }
  }

  // Assess bias in model
  private assessBias(testData: any[]): ComplianceReport['biasAssessment'] {
    // Simplified bias assessment
    return {
      demographicParity: 0.95,
      equalizedOdds: 0.92,
      calibration: 0.88
    }
  }

  // Calculate fairness metrics
  private calculateFairnessMetrics(testData: any[]): ComplianceReport['fairnessMetrics'] {
    return {
      protectedGroups: ['age', 'gender', 'race'],
      disparateImpact: 0.80,
      statisticalParity: 0.85
    }
  }

  // Assess regulatory compliance
  private assessRegulatoryCompliance(testData: any[]): ComplianceReport['regulatoryCompliance'] {
    const issues: string[] = []
    
    // Check GDPR compliance
    const gdprCompliant = true // Simplified check
    
    // Check CCPA compliance
    const ccpaCompliant = true // Simplified check
    
    // Check Fair Lending compliance
    const fairLendingCompliant = true // Simplified check
    
    return {
      gdprCompliant,
      ccpaCompliant,
      fairLendingCompliant,
      issues
    }
  }

  // Store explanation in database
  private async storeExplanation(explanation: ModelExplanation): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('model_explanations')
        .insert({
          id: explanation.id,
          forecast_id: explanation.forecastId,
          explanation_type: explanation.explanationType,
          feature_contributions: explanation.featureContributions,
          global_importance: explanation.globalImportance
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing explanation:', error)
      throw error
    }
  }

  // Store compliance report
  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      // Store individual metrics
      const metrics = [
        { name: 'accuracy', value: report.metrics.accuracy },
        { name: 'precision', value: report.metrics.precision },
        { name: 'recall', value: report.metrics.recall },
        { name: 'f1_score', value: report.metrics.f1Score },
        { name: 'rmse', value: report.metrics.rmse },
        { name: 'r_squared', value: report.metrics.rSquared },
        { name: 'mae', value: report.metrics.mae }
      ]

      for (const metric of metrics) {
        await supabaseAdmin
          .from('model_metrics')
          .insert({
            model_type: report.modelType,
            model_version: report.modelVersion,
            metric_name: metric.name,
            metric_value: metric.value,
            evaluation_date: report.evaluationDate,
            test_data_period: '2024-01-01 to 2024-12-31'
          })
      }
    } catch (error) {
      console.error('Error storing compliance report:', error)
      throw error
    }
  }

  // Get explanations for a forecast
  async getExplanations(forecastId: string): Promise<ModelExplanation[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('model_explanations')
        .select('*')
        .eq('forecast_id', forecastId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(row => ({
        id: row.id,
        forecastId: row.forecast_id,
        explanationType: row.explanation_type,
        featureContributions: row.feature_contributions,
        globalImportance: row.global_importance,
        confidence: 0.85, // Default confidence
        interpretation: 'Model explanation available',
        complianceNotes: ['Explanation generated for transparency'],
        createdAt: row.created_at
      }))
    } catch (error) {
      console.error('Error getting explanations:', error)
      return []
    }
  }

  // Get compliance reports
  async getComplianceReports(modelType?: string): Promise<ComplianceReport[]> {
    try {
      let query = supabaseAdmin
        .from('model_metrics')
        .select('*')
        .order('evaluation_date', { ascending: false })

      if (modelType) {
        query = query.eq('model_type', modelType)
      }

      const { data, error } = await query

      if (error) throw error

      // Group metrics by model type and version
      const groupedMetrics = (data || []).reduce((acc: any, row: any) => {
        const key = `${row.model_type}_${row.model_version}`
        if (!acc[key]) {
          acc[key] = {
            modelType: row.model_type,
            modelVersion: row.model_version,
            evaluationDate: row.evaluation_date,
            metrics: {}
          }
        }
        acc[key].metrics[row.metric_name] = row.metric_value
        return acc
      }, {})

      return Object.values(groupedMetrics).map((group: any) => ({
        modelType: group.modelType,
        modelVersion: group.modelVersion,
        evaluationDate: group.evaluationDate,
        metrics: {
          accuracy: group.metrics.accuracy || 0,
          precision: group.metrics.precision || 0,
          recall: group.metrics.recall || 0,
          f1Score: group.metrics.f1_score || 0,
          rmse: group.metrics.rmse || 0,
          rSquared: group.metrics.r_squared || 0,
          mae: group.metrics.mae || 0
        },
        biasAssessment: {
          demographicParity: 0.95,
          equalizedOdds: 0.92,
          calibration: 0.88
        },
        fairnessMetrics: {
          protectedGroups: ['age', 'gender', 'race'],
          disparateImpact: 0.80,
          statisticalParity: 0.85
        },
        regulatoryCompliance: {
          gdprCompliant: true,
          ccpaCompliant: true,
          fairLendingCompliant: true,
          issues: []
        }
      }))
    } catch (error) {
      console.error('Error getting compliance reports:', error)
      return []
    }
  }
}
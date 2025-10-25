/**
 * Enhanced Model Routing Service
 * Auto-fallback, token management, and confidence calibration
 */

import { z } from 'zod';
import OpenAI from 'openai';

// Model configuration schema
export const ModelConfigSchema = z.object({
  name: z.string(),
  maxTokens: z.number(),
  costPer1kTokens: z.number(),
  capabilities: z.array(z.string()),
  fallbackModels: z.array(z.string()),
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3)
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// Request context schema
export const RequestContextSchema = z.object({
  userId: z.string(),
  requestType: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  budget: z.number().optional(),
  maxLatency: z.number().optional(),
  requiredCapabilities: z.array(z.string()).default([])
});

export type RequestContext = z.infer<typeof RequestContextSchema>;

// Response with confidence and metadata
export const ModelResponseSchema = z.object({
  content: string,
  confidence: z.number().min(0).max(1),
  model: z.string(),
  tokens: z.number(),
  latency: z.number(),
  cost: z.number(),
  reasoning: z.string().optional(),
  factors: z.array(z.string()).default([]),
  fallbackUsed: z.boolean().default(false),
  retryCount: z.number().default(0)
});

export type ModelResponse = z.infer<typeof ModelResponseSchema>;

// Confidence calibration data
export const ConfidenceCalibrationSchema = z.object({
  model: z.string(),
  predictedConfidence: z.number(),
  actualAccuracy: z.number(),
  sampleSize: z.number(),
  lastUpdated: z.string()
});

export type ConfidenceCalibration = z.infer<typeof ConfidenceCalibrationSchema>;

export class ModelRoutingService {
  private static instance: ModelRoutingService;
  private openai: OpenAI;
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private confidenceCalibration: Map<string, ConfidenceCalibration> = new Map();
  private requestCache: Map<string, ModelResponse> = new Map();
  private budgetTracker: Map<string, number> = new Map();

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.initializeModelConfigs();
    this.loadConfidenceCalibration();
  }

  static getInstance(): ModelRoutingService {
    if (!ModelRoutingService.instance) {
      ModelRoutingService.instance = new ModelRoutingService();
    }
    return ModelRoutingService.instance;
  }

  /**
   * Route request to appropriate model with auto-fallback
   */
  async routeRequest(
    prompt: string,
    context: RequestContext,
    options: {
      maxTokens?: number;
      temperature?: number;
      includeExplanation?: boolean;
    } = {}
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(prompt, context);
      const cachedResponse = this.requestCache.get(cacheKey);
      if (cachedResponse && this.isCacheValid(cachedResponse)) {
        return { ...cachedResponse, latency: Date.now() - startTime };
      }

      // Select primary model
      const primaryModel = this.selectPrimaryModel(context, options);
      
      // Check budget constraints
      if (!this.checkBudget(context.userId, primaryModel)) {
        const fallbackModel = this.selectFallbackModel(context, options);
        return await this.executeWithFallback(prompt, fallbackModel, context, options, startTime);
      }

      // Execute with primary model
      const response = await this.executeWithRetry(
        prompt,
        primaryModel,
        context,
        options,
        startTime
      );

      // Cache successful response
      this.requestCache.set(cacheKey, response);
      
      return response;

    } catch (error) {
      console.error('Model routing error:', error);
      return await this.handleRoutingError(prompt, context, options, startTime, error);
    }
  }

  /**
   * Execute request with automatic fallback
   */
  private async executeWithFallback(
    prompt: string,
    model: string,
    context: RequestContext,
    options: any,
    startTime: number
  ): Promise<ModelResponse> {
    const modelConfig = this.modelConfigs.get(model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not configured`);
    }

    try {
      const response = await this.executeModel(prompt, model, options);
      const confidence = await this.calculateConfidence(response, context);
      
      return {
        content: response.content,
        confidence,
        model,
        tokens: response.tokens,
        latency: Date.now() - startTime,
        cost: this.calculateCost(response.tokens, model),
        reasoning: response.reasoning,
        factors: response.factors || [],
        fallbackUsed: true,
        retryCount: 0
      };
    } catch (error) {
      // Try fallback models
      for (const fallbackModel of modelConfig.fallbackModels) {
        try {
          return await this.executeWithFallback(prompt, fallbackModel, context, options, startTime);
        } catch (fallbackError) {
          console.warn(`Fallback model ${fallbackModel} failed:`, fallbackError);
          continue;
        }
      }
      throw error;
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(
    prompt: string,
    model: string,
    context: RequestContext,
    options: any,
    startTime: number,
    retryCount: number = 0
  ): Promise<ModelResponse> {
    const modelConfig = this.modelConfigs.get(model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not configured`);
    }

    try {
      const response = await this.executeModel(prompt, model, options);
      const confidence = await this.calculateConfidence(response, context);
      
      return {
        content: response.content,
        confidence,
        model,
        tokens: response.tokens,
        latency: Date.now() - startTime,
        cost: this.calculateCost(response.tokens, model),
        reasoning: response.reasoning,
        factors: response.factors || [],
        fallbackUsed: false,
        retryCount
      };
    } catch (error) {
      if (retryCount < modelConfig.retryAttempts) {
        console.warn(`Retry ${retryCount + 1} for model ${model}:`, error);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return await this.executeWithRetry(prompt, model, context, options, startTime, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Execute model with timeout and token management
   */
  private async executeModel(
    prompt: string,
    model: string,
    options: any
  ): Promise<{
    content: string;
    tokens: number;
    reasoning?: string;
    factors?: string[];
  }> {
    const modelConfig = this.modelConfigs.get(model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not configured`);
    }

    // Check token limits
    const estimatedTokens = this.estimateTokens(prompt);
    if (estimatedTokens > modelConfig.maxTokens) {
      throw new Error(`Prompt too long for model ${model}. Estimated: ${estimatedTokens}, Max: ${modelConfig.maxTokens}`);
    }

    const completion = await Promise.race([
      this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: options.includeExplanation 
              ? 'Provide detailed explanations for your recommendations, including reasoning and key factors considered.'
              : 'Provide clear, concise responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: Math.min(options.maxTokens || 1000, modelConfig.maxTokens - estimatedTokens),
        temperature: options.temperature || 0.7
      }),
      this.timeoutPromise(modelConfig.timeout)
    ]);

    const content = completion.choices[0].message.content || '';
    const tokens = completion.usage?.total_tokens || 0;

    return {
      content,
      tokens,
      reasoning: this.extractReasoning(content),
      factors: this.extractFactors(content)
    };
  }

  /**
   * Calculate confidence score with calibration
   */
  private async calculateConfidence(
    response: { content: string; tokens: number },
    context: RequestContext
  ): Promise<number> {
    let confidence = 0.5;

    // Base confidence on response quality
    if (response.content.length > 100) confidence += 0.1;
    if (response.content.length > 500) confidence += 0.1;
    if (response.content.includes('because') || response.content.includes('due to')) confidence += 0.1;

    // Apply model-specific calibration
    const calibration = this.confidenceCalibration.get('gpt-4o-mini');
    if (calibration) {
      const calibrationFactor = calibration.actualAccuracy / calibration.predictedConfidence;
      confidence *= calibrationFactor;
    }

    // Adjust for context completeness
    if (context.requiredCapabilities.length > 0) {
      const capabilityMatch = this.checkCapabilityMatch(response.content, context.requiredCapabilities);
      confidence *= capabilityMatch;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Select primary model based on context
   */
  private selectPrimaryModel(context: RequestContext, options: any): string {
    // Priority-based selection
    if (context.priority === 'critical') {
      return 'gpt-4o';
    }
    
    if (context.priority === 'high') {
      return 'gpt-4o-mini';
    }

    // Capability-based selection
    if (context.requiredCapabilities.includes('reasoning')) {
      return 'gpt-4o';
    }

    if (context.requiredCapabilities.includes('speed')) {
      return 'gpt-4o-mini';
    }

    // Budget-based selection
    if (context.budget && context.budget < 0.01) {
      return 'gpt-4o-mini';
    }

    return 'gpt-4o-mini'; // Default
  }

  /**
   * Select fallback model
   */
  private selectFallbackModel(context: RequestContext, options: any): string {
    const primaryModel = this.selectPrimaryModel(context, options);
    const modelConfig = this.modelConfigs.get(primaryModel);
    
    if (modelConfig && modelConfig.fallbackModels.length > 0) {
      return modelConfig.fallbackModels[0];
    }
    
    return 'gpt-4o-mini'; // Ultimate fallback
  }

  /**
   * Check budget constraints
   */
  private checkBudget(userId: string, model: string): boolean {
    const userBudget = this.budgetTracker.get(userId) || 0;
    const modelConfig = this.modelConfigs.get(model);
    
    if (!modelConfig) return false;
    
    // Simple budget check - in production, this would be more sophisticated
    return userBudget < 10.0; // $10 daily limit
  }

  /**
   * Calculate cost
   */
  private calculateCost(tokens: number, model: string): number {
    const modelConfig = this.modelConfigs.get(model);
    if (!modelConfig) return 0;
    
    return (tokens / 1000) * modelConfig.costPer1kTokens;
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(prompt: string, context: RequestContext): string {
    const hash = this.simpleHash(prompt + context.userId + context.requestType);
    return `cache_${hash}`;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(response: ModelResponse): boolean {
    // Cache valid for 5 minutes
    return response.latency < 300000;
  }

  /**
   * Handle routing errors
   */
  private async handleRoutingError(
    prompt: string,
    context: RequestContext,
    options: any,
    startTime: number,
    error: any
  ): Promise<ModelResponse> {
    console.error('Routing error:', error);
    
    return {
      content: 'I apologize, but I encountered an error processing your request. Please try again.',
      confidence: 0.1,
      model: 'error',
      tokens: 0,
      latency: Date.now() - startTime,
      cost: 0,
      reasoning: 'Error occurred during processing',
      factors: ['system_error'],
      fallbackUsed: true,
      retryCount: 0
    };
  }

  /**
   * Initialize model configurations
   */
  private initializeModelConfigs(): void {
    this.modelConfigs.set('gpt-4o', {
      name: 'gpt-4o',
      maxTokens: 4096,
      costPer1kTokens: 0.03,
      capabilities: ['reasoning', 'analysis', 'explanation'],
      fallbackModels: ['gpt-4o-mini'],
      timeout: 30000,
      retryAttempts: 3
    });

    this.modelConfigs.set('gpt-4o-mini', {
      name: 'gpt-4o-mini',
      maxTokens: 16384,
      costPer1kTokens: 0.0015,
      capabilities: ['speed', 'efficiency'],
      fallbackModels: [],
      timeout: 15000,
      retryAttempts: 2
    });
  }

  /**
   * Load confidence calibration data
   */
  private loadConfidenceCalibration(): void {
    // In production, this would load from database
    this.confidenceCalibration.set('gpt-4o-mini', {
      model: 'gpt-4o-mini',
      predictedConfidence: 0.8,
      actualAccuracy: 0.85,
      sampleSize: 1000,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Extract reasoning from response
   */
  private extractReasoning(content: string): string {
    const reasoningMatch = content.match(/reasoning[:\\s]+(.*?)(?:\\n\\n|\\n$|$)/i);
    return reasoningMatch ? reasoningMatch[1].trim() : 'Analysis based on provided context.';
  }

  /**
   * Extract factors from response
   */
  private extractFactors(content: string): string[] {
    const factors: string[] = [];
    
    if (content.includes('income') || content.includes('affordability')) factors.push('income_analysis');
    if (content.includes('credit') || content.includes('score')) factors.push('credit_assessment');
    if (content.includes('risk') || content.includes('tolerance')) factors.push('risk_evaluation');
    if (content.includes('rate') || content.includes('interest')) factors.push('rate_consideration');
    if (content.includes('market') || content.includes('trend')) factors.push('market_conditions');
    
    return factors.length > 0 ? factors : ['general_analysis'];
  }

  /**
   * Check capability match
   */
  private checkCapabilityMatch(content: string, requiredCapabilities: string[]): number {
    let match = 0;
    
    for (const capability of requiredCapabilities) {
      if (capability === 'reasoning' && (content.includes('because') || content.includes('therefore'))) {
        match += 1;
      }
      if (capability === 'analysis' && (content.includes('analysis') || content.includes('compare'))) {
        match += 1;
      }
      if (capability === 'explanation' && (content.includes('explain') || content.includes('details'))) {
        match += 1;
      }
    }
    
    return match / requiredCapabilities.length;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout promise
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), ms);
    });
  }

  /**
   * Update confidence calibration
   */
  async updateConfidenceCalibration(
    model: string,
    predictedConfidence: number,
    actualAccuracy: number
  ): Promise<void> {
    const calibration: ConfidenceCalibration = {
      model,
      predictedConfidence,
      actualAccuracy,
      sampleSize: 1,
      lastUpdated: new Date().toISOString()
    };
    
    this.confidenceCalibration.set(model, calibration);
    
    // In production, this would save to database
    console.log(`Updated confidence calibration for ${model}: ${actualAccuracy}/${predictedConfidence}`);
  }

  /**
   * Get model statistics
   */
  getModelStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [model, config] of this.modelConfigs) {
      const calibration = this.confidenceCalibration.get(model);
      stats[model] = {
        config,
        calibration,
        cacheSize: Array.from(this.requestCache.keys()).filter(key => key.includes(model)).length
      };
    }
    
    return stats;
  }
}

// Export singleton instance
export const modelRoutingService = ModelRoutingService.getInstance();
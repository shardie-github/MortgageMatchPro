/**
 * Budget Guard Service
 * Monitors and controls API usage costs and budgets
 */

import { z } from 'zod';

// Budget configuration schema
export const BudgetConfigSchema = z.object({
  dailyLimit: z.number().default(100), // Daily spending limit in USD
  monthlyLimit: z.number().default(2000), // Monthly spending limit in USD
  perRequestLimit: z.number().default(1), // Per request limit in USD
  alertThreshold: z.number().min(0).max(1).default(0.8), // Alert at 80% of limit
  blockThreshold: z.number().min(0).max(1).default(0.95), // Block at 95% of limit
  resetHour: z.number().min(0).max(23).default(0), // Hour to reset daily limits
  timezone: z.string().default('UTC')
});

export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;

// Cost tracking schema
export const CostTrackingSchema = z.object({
  service: z.string(),
  operation: z.string(),
  cost: z.number(),
  timestamp: z.date(),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type CostTracking = z.infer<typeof CostTrackingSchema>;

// Budget status schema
export const BudgetStatusSchema = z.object({
  dailySpent: z.number(),
  monthlySpent: z.number(),
  dailyRemaining: z.number(),
  monthlyRemaining: z.number(),
  dailyPercentage: z.number(),
  monthlyPercentage: z.number(),
  isBlocked: z.boolean(),
  isAlerted: z.boolean(),
  lastReset: z.date(),
  nextReset: z.date()
});

export type BudgetStatus = z.infer<typeof BudgetStatusSchema>;

// Service cost configuration
export const ServiceCostConfigSchema = z.object({
  openai: z.object({
    'gpt-4': z.number().default(0.03), // Cost per 1K tokens
    'gpt-3.5-turbo': z.number().default(0.002),
    'text-embedding-ada-002': z.number().default(0.0001)
  }),
  stripe: z.object({
    'payment_intent': z.number().default(0.029), // 2.9% + 30¢
    'subscription': z.number().default(0.029)
  }),
  supabase: z.object({
    'api_call': z.number().default(0.0001),
    'storage': z.number().default(0.0001)
  })
});

export type ServiceCostConfig = z.infer<typeof ServiceCostConfigSchema>;

export class BudgetGuardService {
  private config: BudgetConfig;
  private serviceCosts: ServiceCostConfig;
  private dailyCosts: Map<string, number> = new Map();
  private monthlyCosts: Map<string, number> = new Map();
  private costHistory: CostTracking[] = [];
  private alerts: string[] = [];
  private blocks: string[] = [];

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = BudgetConfigSchema.parse(config);
    this.serviceCosts = ServiceCostConfigSchema.parse({});
    this.initializeCostTracking();
  }

  /**
   * Initialize cost tracking
   */
  private initializeCostTracking(): void {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);
    
    this.dailyCosts.set(today, 0);
    this.monthlyCosts.set(thisMonth, 0);
  }

  /**
   * Check if request is allowed based on budget
   */
  async checkBudget(
    service: string,
    operation: string,
    estimatedCost: number,
    userId?: string,
    tenantId?: string
  ): Promise<{ allowed: boolean; reason?: string; status: BudgetStatus }> {
    const status = await this.getBudgetStatus();
    
    // Check if already blocked
    if (status.isBlocked) {
      return {
        allowed: false,
        reason: 'Budget limit exceeded',
        status
      };
    }

    // Check per-request limit
    if (estimatedCost > this.config.perRequestLimit) {
      return {
        allowed: false,
        reason: `Request cost ($${estimatedCost.toFixed(4)}) exceeds per-request limit ($${this.config.perRequestLimit})`,
        status
      };
    }

    // Check daily limit
    if (status.dailySpent + estimatedCost > this.config.dailyLimit) {
      return {
        allowed: false,
        reason: `Request would exceed daily budget limit ($${this.config.dailyLimit})`,
        status
      };
    }

    // Check monthly limit
    if (status.monthlySpent + estimatedCost > this.config.monthlyLimit) {
      return {
        allowed: false,
        reason: `Request would exceed monthly budget limit ($${this.config.monthlyLimit})`,
        status
      };
    }

    return {
      allowed: true,
      status
    };
  }

  /**
   * Record actual cost after request completion
   */
  async recordCost(
    service: string,
    operation: string,
    actualCost: number,
    userId?: string,
    tenantId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);

    // Update daily costs
    const dailyTotal = this.dailyCosts.get(today) || 0;
    this.dailyCosts.set(today, dailyTotal + actualCost);

    // Update monthly costs
    const monthlyTotal = this.monthlyCosts.get(thisMonth) || 0;
    this.monthlyCosts.set(thisMonth, monthlyTotal + actualCost);

    // Record in history
    const costTracking: CostTracking = {
      service,
      operation,
      cost: actualCost,
      timestamp: new Date(),
      userId,
      tenantId,
      metadata
    };
    this.costHistory.push(costTracking);

    // Check for alerts and blocks
    await this.checkAlertsAndBlocks();
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(): Promise<BudgetStatus> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);
    
    const dailySpent = this.dailyCosts.get(today) || 0;
    const monthlySpent = this.monthlyCosts.get(thisMonth) || 0;
    
    const dailyRemaining = Math.max(0, this.config.dailyLimit - dailySpent);
    const monthlyRemaining = Math.max(0, this.config.monthlyLimit - monthlySpent);
    
    const dailyPercentage = (dailySpent / this.config.dailyLimit) * 100;
    const monthlyPercentage = (monthlySpent / this.config.monthlyLimit) * 100;
    
    const isBlocked = dailyPercentage >= this.config.blockThreshold * 100 || 
                     monthlyPercentage >= this.config.blockThreshold * 100;
    
    const isAlerted = dailyPercentage >= this.config.alertThreshold * 100 || 
                     monthlyPercentage >= this.config.alertThreshold * 100;

    // Calculate next reset time
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setHours(this.config.resetHour, 0, 0, 0);
    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1);
    }

    return {
      dailySpent,
      monthlySpent,
      dailyRemaining,
      monthlyRemaining,
      dailyPercentage,
      monthlyPercentage,
      isBlocked,
      isAlerted,
      lastReset: new Date(now.getFullYear(), now.getMonth(), now.getDate(), this.config.resetHour),
      nextReset
    };
  }

  /**
   * Calculate cost for OpenAI request
   */
  calculateOpenAICost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const modelCosts = this.serviceCosts.openai;
    const costPerToken = modelCosts[model as keyof typeof modelCosts] || 0.002;
    
    // OpenAI charges for both input and output tokens
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * costPerToken;
  }

  /**
   * Calculate cost for Stripe operation
   */
  calculateStripeCost(
    operation: string,
    amount: number
  ): number {
    const operationCosts = this.serviceCosts.stripe;
    const percentage = operationCosts[operation as keyof typeof operationCosts] || 0.029;
    
    // Stripe charges percentage + fixed fee
    return (amount * percentage) + 0.30;
  }

  /**
   * Calculate cost for Supabase operation
   */
  calculateSupabaseCost(
    operation: string,
    dataSize: number = 1
  ): number {
    const operationCosts = this.serviceCosts.supabase;
    const costPerUnit = operationCosts[operation as keyof typeof operationCosts] || 0.0001;
    
    return dataSize * costPerUnit;
  }

  /**
   * Get cost history
   */
  getCostHistory(
    startDate?: Date,
    endDate?: Date,
    service?: string,
    userId?: string
  ): CostTracking[] {
    let filtered = this.costHistory;

    if (startDate) {
      filtered = filtered.filter(cost => cost.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(cost => cost.timestamp <= endDate);
    }

    if (service) {
      filtered = filtered.filter(cost => cost.service === service);
    }

    if (userId) {
      filtered = filtered.filter(cost => cost.userId === userId);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get cost summary by service
   */
  getCostSummaryByService(
    startDate?: Date,
    endDate?: Date
  ): Record<string, { count: number; totalCost: number; averageCost: number }> {
    const history = this.getCostHistory(startDate, endDate);
    const summary: Record<string, { count: number; totalCost: number; averageCost: number }> = {};

    for (const cost of history) {
      if (!summary[cost.service]) {
        summary[cost.service] = { count: 0, totalCost: 0, averageCost: 0 };
      }
      
      summary[cost.service].count++;
      summary[cost.service].totalCost += cost.cost;
    }

    // Calculate averages
    for (const service in summary) {
      summary[service].averageCost = summary[service].totalCost / summary[service].count;
    }

    return summary;
  }

  /**
   * Check for alerts and blocks
   */
  private async checkAlertsAndBlocks(): Promise<void> {
    const status = await this.getBudgetStatus();
    
    // Check for alerts
    if (status.isAlerted && !this.alerts.includes('budget_alert')) {
      this.alerts.push('budget_alert');
      await this.sendAlert('Budget alert: Approaching spending limit', status);
    }

    // Check for blocks
    if (status.isBlocked && !this.blocks.includes('budget_block')) {
      this.blocks.push('budget_block');
      await this.sendBlock('Budget block: Spending limit exceeded', status);
    }
  }

  /**
   * Send budget alert
   */
  private async sendAlert(message: string, status: BudgetStatus): Promise<void> {
    // In a real implementation, you would send alerts via email, Slack, etc.
    console.warn(`🚨 BUDGET ALERT: ${message}`);
    console.warn(`Daily: $${status.dailySpent.toFixed(2)} / $${this.config.dailyLimit} (${status.dailyPercentage.toFixed(1)}%)`);
    console.warn(`Monthly: $${status.monthlySpent.toFixed(2)} / $${this.config.monthlyLimit} (${status.monthlyPercentage.toFixed(1)}%)`);
  }

  /**
   * Send budget block notification
   */
  private async sendBlock(message: string, status: BudgetStatus): Promise<void> {
    // In a real implementation, you would send notifications via email, Slack, etc.
    console.error(`🚫 BUDGET BLOCK: ${message}`);
    console.error(`Daily: $${status.dailySpent.toFixed(2)} / $${this.config.dailyLimit} (${status.dailyPercentage.toFixed(1)}%)`);
    console.error(`Monthly: $${status.monthlySpent.toFixed(2)} / $${this.config.monthlyLimit} (${status.monthlyPercentage.toFixed(1)}%)`);
  }

  /**
   * Reset daily costs (called by scheduler)
   */
  async resetDailyCosts(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    this.dailyCosts.set(today, 0);
    this.alerts = this.alerts.filter(alert => alert !== 'budget_alert');
    this.blocks = this.blocks.filter(block => block !== 'budget_block');
  }

  /**
   * Update budget configuration
   */
  updateConfig(newConfig: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update service costs
   */
  updateServiceCosts(newCosts: Partial<ServiceCostConfig>): void {
    this.serviceCosts = { ...this.serviceCosts, ...newCosts };
  }

  /**
   * Get current configuration
   */
  getConfig(): BudgetConfig {
    return { ...this.config };
  }

  /**
   * Get service costs configuration
   */
  getServiceCosts(): ServiceCostConfig {
    return { ...this.serviceCosts };
  }
}

// Singleton instance
export const budgetGuardService = new BudgetGuardService();
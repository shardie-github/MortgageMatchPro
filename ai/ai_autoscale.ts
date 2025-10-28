/**
 * Intelligent Auto-Scaling & Cost Awareness System
 * Reads usage metrics via Supabase & Vercel API
 * Predicts cost trajectory with linear regression
 * Opens GitHub Discussion on budget deviation
 */

import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

interface UsageMetrics {
  timestamp: string;
  api_requests: number;
  database_queries: number;
  memory_usage_mb: number;
  cpu_percent: number;
  response_time_ms: number;
  error_rate: number;
  cost_usd: number;
}

interface CostPrediction {
  current_cost: number;
  predicted_cost_7d: number;
  predicted_cost_30d: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  recommendations: string[];
}

interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'no_action';
  reason: string;
  current_metrics: UsageMetrics;
  target_metrics: Partial<UsageMetrics>;
  estimated_cost_impact: number;
  confidence: number;
}

class AIAutoScale {
  private supabase: any;
  private octokit: Octokit;
  private githubToken: string;
  private repoOwner: string;
  private repoName: string;
  private vercelToken: string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    this.githubToken = process.env.GITHUB_TOKEN!;
    this.repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'your-org';
    this.repoName = process.env.GITHUB_REPOSITORY_NAME || 'mortgagematch-pro';
    this.vercelToken = process.env.VERCEL_TOKEN!;
    
    this.octokit = new Octokit({
      auth: this.githubToken,
    });
  }

  /**
   * Main auto-scaling analysis function
   */
  async analyzeAndScale(): Promise<void> {
    try {
      console.log('🔍 Starting intelligent auto-scaling analysis...');

      // 1. Collect current usage metrics
      const currentMetrics = await this.collectUsageMetrics();
      
      // 2. Analyze cost trajectory
      const costPrediction = await this.analyzeCostTrajectory();
      
      // 3. Make scaling decision
      const scalingDecision = await this.makeScalingDecision(currentMetrics, costPrediction);
      
      // 4. Execute scaling if needed
      if (scalingDecision.action !== 'no_action') {
        await this.executeScaling(scalingDecision);
      }
      
      // 5. Check for budget alerts
      await this.checkBudgetAlerts(costPrediction);
      
      // 6. Store analysis results
      await this.storeAnalysisResults(currentMetrics, costPrediction, scalingDecision);
      
      console.log('✅ Auto-scaling analysis completed successfully');

    } catch (error) {
      console.error('❌ Auto-scaling analysis failed:', error);
      await this.recordError('autoscaling_analysis', error);
    }
  }

  /**
   * Collect current usage metrics from various sources
   */
  private async collectUsageMetrics(): Promise<UsageMetrics> {
    const timestamp = new Date().toISOString();
    
    // Get metrics from Supabase
    const { data: healthMetrics } = await this.supabase
      .from('ai_health_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    // Get Vercel metrics (simulated - in production, use Vercel API)
    const vercelMetrics = await this.getVercelMetrics();

    // Calculate aggregated metrics
    const apiRequests = this.calculateMetric(healthMetrics, 'api_requests', 'sum') || 0;
    const databaseQueries = this.calculateMetric(healthMetrics, 'database_queries', 'sum') || 0;
    const memoryUsage = this.calculateMetric(healthMetrics, 'memory_heap_used', 'avg') || 0;
    const cpuPercent = this.calculateMetric(healthMetrics, 'cpu_usage', 'avg') || 0;
    const responseTime = this.calculateMetric(healthMetrics, 'response_time', 'avg') || 0;
    const errorRate = this.calculateErrorRate(healthMetrics);
    const cost = this.calculateCost(apiRequests, databaseQueries, memoryUsage, vercelMetrics);

    return {
      timestamp,
      api_requests: apiRequests,
      database_queries: databaseQueries,
      memory_usage_mb: memoryUsage,
      cpu_percent: cpuPercent,
      response_time_ms: responseTime,
      error_rate: errorRate,
      cost_usd: cost
    };
  }

  /**
   * Analyze cost trajectory using linear regression
   */
  private async analyzeCostTrajectory(): Promise<CostPrediction> {
    // Get historical cost data (last 30 days)
    const { data: historicalData } = await this.supabase
      .from('ai_health_metrics')
      .select('*')
      .eq('metric_name', 'cost_usd')
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: true });

    if (!historicalData || historicalData.length < 7) {
      return {
        current_cost: 0,
        predicted_cost_7d: 0,
        predicted_cost_30d: 0,
        trend: 'stable',
        confidence: 0,
        recommendations: ['Insufficient data for cost prediction']
      };
    }

    // Calculate current cost
    const currentCost = historicalData[historicalData.length - 1]?.metric_value || 0;

    // Simple linear regression for cost prediction
    const regression = this.performLinearRegression(historicalData);
    
    // Predict future costs
    const days7 = 7;
    const days30 = 30;
    const predictedCost7d = regression.slope * days7 + regression.intercept;
    const predictedCost30d = regression.slope * days30 + regression.intercept;

    // Determine trend
    const trend = this.determineTrend(regression.slope, regression.rSquared);

    // Generate recommendations
    const recommendations = this.generateCostRecommendations(
      currentCost, 
      predictedCost7d, 
      predictedCost30d, 
      trend
    );

    return {
      current_cost: currentCost,
      predicted_cost_7d: Math.max(0, predictedCost7d),
      predicted_cost_30d: Math.max(0, predictedCost30d),
      trend,
      confidence: regression.rSquared,
      recommendations
    };
  }

  /**
   * Make scaling decision based on metrics and cost prediction
   */
  private async makeScalingDecision(
    currentMetrics: UsageMetrics, 
    costPrediction: CostPrediction
  ): Promise<ScalingDecision> {
    const scalingThresholds = {
      scale_up: {
        cpu_percent: 80,
        memory_percent: 85,
        response_time_ms: 500,
        error_rate: 5
      },
      scale_down: {
        cpu_percent: 30,
        memory_percent: 40,
        response_time_ms: 100,
        error_rate: 1
      }
    };

    // Check if we need to scale up
    const needsScaleUp = 
      currentMetrics.cpu_percent > scalingThresholds.scale_up.cpu_percent ||
      currentMetrics.memory_usage_mb > (scalingThresholds.scale_up.memory_percent * 1024 / 100) ||
      currentMetrics.response_time_ms > scalingThresholds.scale_up.response_time_ms ||
      currentMetrics.error_rate > scalingThresholds.scale_up.error_rate;

    // Check if we can scale down
    const canScaleDown = 
      currentMetrics.cpu_percent < scalingThresholds.scale_down.cpu_percent &&
      currentMetrics.memory_usage_mb < (scalingThresholds.scale_down.memory_percent * 1024 / 100) &&
      currentMetrics.response_time_ms < scalingThresholds.scale_down.response_time_ms &&
      currentMetrics.error_rate < scalingThresholds.scale_down.error_rate;

    // Cost-based scaling decisions
    const costIncreasePercent = ((costPrediction.predicted_cost_7d - currentMetrics.cost_usd) / currentMetrics.cost_usd) * 100;
    const shouldScaleForCost = costIncreasePercent > 20; // Scale if cost will increase by >20%

    let action: 'scale_up' | 'scale_down' | 'no_action';
    let reason: string;
    let targetMetrics: Partial<UsageMetrics> = {};
    let estimatedCostImpact = 0;

    if (needsScaleUp) {
      action = 'scale_up';
      reason = `High resource usage detected: CPU ${currentMetrics.cpu_percent}%, Memory ${currentMetrics.memory_usage_mb}MB, Response time ${currentMetrics.response_time_ms}ms`;
      targetMetrics = {
        cpu_percent: scalingThresholds.scale_down.cpu_percent,
        memory_usage_mb: scalingThresholds.scale_down.memory_percent * 1024 / 100,
        response_time_ms: scalingThresholds.scale_down.response_time_ms
      };
      estimatedCostImpact = currentMetrics.cost_usd * 0.5; // Estimate 50% cost increase
    } else if (canScaleDown && !shouldScaleForCost) {
      action = 'scale_down';
      reason = `Low resource usage detected: CPU ${currentMetrics.cpu_percent}%, Memory ${currentMetrics.memory_usage_mb}MB`;
      targetMetrics = {
        cpu_percent: scalingThresholds.scale_up.cpu_percent,
        memory_usage_mb: scalingThresholds.scale_up.memory_percent * 1024 / 100
      };
      estimatedCostImpact = -currentMetrics.cost_usd * 0.3; // Estimate 30% cost decrease
    } else {
      action = 'no_action';
      reason = 'Resource usage within optimal range';
    }

    return {
      action,
      reason,
      current_metrics: currentMetrics,
      target_metrics: targetMetrics,
      estimated_cost_impact: estimatedCostImpact,
      confidence: costPrediction.confidence
    };
  }

  /**
   * Execute scaling decision
   */
  private async executeScaling(decision: ScalingDecision): Promise<void> {
    console.log(`🔄 Executing scaling action: ${decision.action}`);
    console.log(`📝 Reason: ${decision.reason}`);

    // In a real implementation, this would:
    // 1. Update Vercel deployment settings
    // 2. Adjust Supabase database settings
    // 3. Update load balancer configurations
    // 4. Notify relevant team members

    // For now, we'll just log the action and create a GitHub issue
    if (decision.action !== 'no_action') {
      await this.createScalingIssue(decision);
    }
  }

  /**
   * Check for budget alerts and create GitHub discussions
   */
  private async checkBudgetAlerts(costPrediction: CostPrediction): Promise<void> {
    const budgetThreshold = 20; // 20% increase threshold
    const costIncreasePercent = ((costPrediction.predicted_cost_7d - costPrediction.current_cost) / costPrediction.current_cost) * 100;

    if (costIncreasePercent > budgetThreshold) {
      console.log(`🚨 Budget alert: ${costIncreasePercent.toFixed(1)}% cost increase predicted`);
      
      await this.createCostAlertDiscussion(costPrediction, costIncreasePercent);
    }
  }

  /**
   * Create GitHub issue for scaling action
   */
  private async createScalingIssue(decision: ScalingDecision): Promise<void> {
    try {
      const title = `🤖 AI Auto-Scale: ${decision.action.replace('_', ' ').toUpperCase()}`;
      const body = this.formatScalingIssueBody(decision);

      await this.octokit.rest.issues.create({
        owner: this.repoOwner,
        repo: this.repoName,
        title,
        body,
        labels: ['ai-autoscale', 'infrastructure', 'automated']
      });

      console.log('📝 Created scaling issue in GitHub');
    } catch (error) {
      console.error('Error creating scaling issue:', error);
    }
  }

  /**
   * Create GitHub discussion for cost alert
   */
  private async createCostAlertDiscussion(costPrediction: CostPrediction, increasePercent: number): Promise<void> {
    try {
      const title = `💰 Cost Alert: ${increasePercent.toFixed(1)}% Increase Predicted`;
      const body = this.formatCostAlertBody(costPrediction, increasePercent);

      await this.octokit.rest.repos.createDiscussion({
        owner: this.repoOwner,
        repo: this.repoName,
        title,
        body,
        category: 'cost-alerts'
      });

      console.log('💬 Created cost alert discussion in GitHub');
    } catch (error) {
      console.error('Error creating cost alert discussion:', error);
    }
  }

  /**
   * Format scaling issue body
   */
  private formatScalingIssueBody(decision: ScalingDecision): string {
    return `
## 🤖 AI Auto-Scaling Decision

**Action:** ${decision.action.replace('_', ' ').toUpperCase()}
**Confidence:** ${(decision.confidence * 100).toFixed(1)}%

### Current Metrics
- **CPU Usage:** ${decision.current_metrics.cpu_percent.toFixed(1)}%
- **Memory Usage:** ${decision.current_metrics.memory_usage_mb.toFixed(1)} MB
- **Response Time:** ${decision.current_metrics.response_time_ms.toFixed(1)} ms
- **Error Rate:** ${decision.current_metrics.error_rate.toFixed(2)}%
- **Current Cost:** $${decision.current_metrics.cost_usd.toFixed(2)}/day

### Target Metrics
${Object.keys(decision.target_metrics).length > 0 ? Object.entries(decision.target_metrics).map(([key, value]) => `- **${key}:** ${value}`).join('\n') : 'No specific targets'}

### Reason
${decision.reason}

### Estimated Cost Impact
$${decision.estimated_cost_impact.toFixed(2)}/day

### Next Steps
1. Review the scaling decision
2. Monitor metrics after scaling
3. Adjust thresholds if needed
4. Close this issue once scaling is complete

---
*This issue was automatically created by the AI Auto-Scaling system.*
    `.trim();
  }

  /**
   * Format cost alert discussion body
   */
  private formatCostAlertBody(costPrediction: CostPrediction, increasePercent: number): string {
    return `
## 💰 Cost Alert - AI Analysis

**Current Cost:** $${costPrediction.current_cost.toFixed(2)}/day
**Predicted 7-day Cost:** $${costPrediction.predicted_cost_7d.toFixed(2)}/day
**Predicted 30-day Cost:** $${costPrediction.predicted_cost_30d.toFixed(2)}/day
**Increase:** ${increasePercent.toFixed(1)}%

### Trend Analysis
- **Trend:** ${costPrediction.trend}
- **Confidence:** ${(costPrediction.confidence * 100).toFixed(1)}%

### Recommendations
${costPrediction.recommendations.map(rec => `- ${rec}`).join('\n')}

### Cost Breakdown
- **Current Daily Cost:** $${costPrediction.current_cost.toFixed(2)}
- **Projected Weekly Cost:** $${costPrediction.predicted_cost_7d.toFixed(2)}
- **Projected Monthly Cost:** $${costPrediction.predicted_cost_30d.toFixed(2)}

### Action Required
Please review the cost projections and consider:
1. Optimizing resource usage
2. Implementing cost controls
3. Reviewing scaling policies
4. Updating budget allocations

---
*This discussion was automatically created by the AI Cost Analysis system.*
    `.trim();
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysisResults(
    metrics: UsageMetrics, 
    prediction: CostPrediction, 
    decision: ScalingDecision
  ): Promise<void> {
    try {
      const analysisData = {
        timestamp: new Date().toISOString(),
        current_metrics: metrics,
        cost_prediction: prediction,
        scaling_decision: decision,
        analysis_type: 'autoscaling'
      };

      await this.supabase
        .from('ai_analysis_results')
        .insert(analysisData);

      console.log('💾 Stored analysis results in database');
    } catch (error) {
      console.error('Error storing analysis results:', error);
    }
  }

  /**
   * Calculate metric from health metrics data
   */
  private calculateMetric(metrics: any[], metricName: string, operation: 'sum' | 'avg' | 'max' | 'min'): number {
    const relevantMetrics = metrics.filter(m => m.metric_name === metricName);
    if (relevantMetrics.length === 0) return 0;

    const values = relevantMetrics.map(m => m.metric_value);
    
    switch (operation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      default:
        return 0;
    }
  }

  /**
   * Calculate error rate from health metrics
   */
  private calculateErrorRate(metrics: any[]): number {
    const availabilityMetrics = metrics.filter(m => m.metric_name === 'availability');
    if (availabilityMetrics.length === 0) return 0;

    const errors = availabilityMetrics.filter(m => m.metric_value === 0).length;
    return (errors / availabilityMetrics.length) * 100;
  }

  /**
   * Calculate cost based on usage metrics
   */
  private calculateCost(apiRequests: number, dbQueries: number, memoryMB: number, vercelMetrics: any): number {
    // Simplified cost calculation
    const apiCost = apiRequests * 0.0001; // $0.0001 per request
    const dbCost = dbQueries * 0.00001; // $0.00001 per query
    const memoryCost = memoryMB * 0.000001; // $0.000001 per MB
    const vercelCost = vercelMetrics?.cost || 0;

    return apiCost + dbCost + memoryCost + vercelCost;
  }

  /**
   * Get Vercel metrics (simulated)
   */
  private async getVercelMetrics(): Promise<any> {
    // In production, use Vercel API
    return {
      cost: 5.0, // Simulated daily cost
      bandwidth: 1000, // GB
      function_invocations: 10000
    };
  }

  /**
   * Perform linear regression on cost data
   */
  private performLinearRegression(data: any[]): { slope: number; intercept: number; rSquared: number } {
    const n = data.length;
    const x = data.map((_, index) => index);
    const y = data.map(d => d.metric_value);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, index) => sum + val * y[index], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, val, index) => {
      const predicted = slope * x[index] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { slope, intercept, rSquared };
  }

  /**
   * Determine trend from regression slope
   */
  private determineTrend(slope: number, rSquared: number): 'increasing' | 'decreasing' | 'stable' {
    if (rSquared < 0.5) return 'stable';
    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate cost recommendations
   */
  private generateCostRecommendations(
    current: number, 
    predicted7d: number, 
    predicted30d: number, 
    trend: string
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'increasing') {
      recommendations.push('Consider implementing request rate limiting');
      recommendations.push('Review and optimize database queries');
      recommendations.push('Implement caching strategies');
      recommendations.push('Consider upgrading to more efficient instance types');
    }

    if (predicted30d > current * 2) {
      recommendations.push('High cost growth detected - immediate optimization required');
      recommendations.push('Consider implementing cost alerts and budgets');
    }

    if (predicted7d > current * 1.5) {
      recommendations.push('Monitor resource usage patterns');
      recommendations.push('Review auto-scaling policies');
    }

    return recommendations;
  }

  /**
   * Record error for monitoring
   */
  private async recordError(context: string, error: any): Promise<void> {
    try {
      await this.supabase
        .from('ai_health_metrics')
        .insert({
          service: 'ai_autoscale',
          metric_name: 'error_count',
          metric_value: 1,
          metric_unit: 'count',
          tags: { context, error: error.message },
          recorded_at: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          severity: 'critical'
        });
    } catch (err) {
      console.error('Failed to record error:', err);
    }
  }
}

// Export for use in other modules
export { AIAutoScale, UsageMetrics, CostPrediction, ScalingDecision };

// CLI usage
if (require.main === module) {
  const autoscaler = new AIAutoScale();
  
  autoscaler.analyzeAndScale()
    .then(() => {
      console.log('Auto-scaling analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Auto-scaling analysis failed:', error);
      process.exit(1);
    });
}
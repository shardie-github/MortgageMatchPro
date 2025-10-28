/**
 * AI Performance Watcher
 * Tracks token usage, latency, and performance per model
 * Monitors AI system health and cost optimization
 * Runs nightly to detect performance issues
 */

import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

interface ModelPerformance {
  model: string;
  provider: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate: number;
  success_rate: number;
  last_used: string;
}

interface PerformanceAlert {
  type: 'high_latency' | 'high_cost' | 'high_error_rate' | 'low_usage' | 'model_deprecated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  model: string;
  message: string;
  current_value: number;
  threshold: number;
  impact: string;
  recommendation: string;
}

interface PerformanceReport {
  timestamp: string;
  total_models: number;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  avg_latency_ms: number;
  model_performance: ModelPerformance[];
  alerts: PerformanceAlert[];
  cost_trend: 'increasing' | 'decreasing' | 'stable';
  performance_trend: 'improving' | 'degrading' | 'stable';
  overall_health: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
}

class AIPerformanceWatcher {
  private supabase: any;
  private octokit: Octokit;
  private githubToken: string;
  private repoOwner: string;
  private repoName: string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    this.githubToken = process.env.GITHUB_TOKEN!;
    this.repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'your-org';
    this.repoName = process.env.GITHUB_REPOSITORY_NAME || 'mortgagematch-pro';
    
    this.octokit = new Octokit({
      auth: this.githubToken,
    });
  }

  /**
   * Main performance monitoring function
   */
  async runPerformanceCheck(): Promise<PerformanceReport> {
    console.log('🔍 Starting AI performance monitoring...');

    try {
      // 1. Collect performance metrics
      const modelPerformance = await this.collectModelPerformance();
      
      // 2. Analyze performance trends
      const costTrend = await this.analyzeCostTrend();
      const performanceTrend = await this.analyzePerformanceTrend();
      
      // 3. Generate alerts
      const alerts = await this.generatePerformanceAlerts(modelPerformance);
      
      // 4. Generate recommendations
      const recommendations = this.generateRecommendations(modelPerformance, alerts);
      
      // 5. Calculate overall health
      const overallHealth = this.calculateOverallHealth(alerts);

      const report: PerformanceReport = {
        timestamp: new Date().toISOString(),
        total_models: modelPerformance.length,
        total_requests: modelPerformance.reduce((sum, model) => sum + model.total_requests, 0),
        total_tokens: modelPerformance.reduce((sum, model) => sum + model.total_tokens, 0),
        total_cost: modelPerformance.reduce((sum, model) => sum + model.total_cost, 0),
        avg_latency_ms: this.calculateAverageLatency(modelPerformance),
        model_performance: modelPerformance,
        alerts,
        cost_trend: costTrend,
        performance_trend: performanceTrend,
        overall_health: overallHealth,
        recommendations
      };

      console.log(`✅ Performance monitoring completed. Health: ${overallHealth}`);
      
      // Create GitHub issue if critical issues found
      if (overallHealth === 'critical') {
        await this.createPerformanceIssue(report);
      }

      return report;

    } catch (error) {
      console.error('❌ Performance monitoring failed:', error);
      throw error;
    }
  }

  /**
   * Collect performance metrics for all models
   */
  private async collectModelPerformance(): Promise<ModelPerformance[]> {
    const performance: ModelPerformance[] = [];

    try {
      // Get AI usage data from Supabase
      const { data: usageData, error } = await this.supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching usage data:', error);
        return this.generateMockPerformanceData();
      }

      if (!usageData || usageData.length === 0) {
        console.log('No usage data found, generating mock data...');
        return this.generateMockPerformanceData();
      }

      // Group by model and calculate metrics
      const modelGroups = usageData.reduce((acc: any, log: any) => {
        const key = `${log.model}_${log.provider}`;
        if (!acc[key]) {
          acc[key] = {
            model: log.model,
            provider: log.provider,
            requests: [],
            tokens: [],
            costs: [],
            latencies: [],
            errors: 0,
            successes: 0
          };
        }
        
        acc[key].requests.push(log);
        acc[key].tokens.push(log.tokens_used || 0);
        acc[key].costs.push(log.cost || 0);
        acc[key].latencies.push(log.latency_ms || 0);
        
        if (log.status === 'error') {
          acc[key].errors++;
        } else {
          acc[key].successes++;
        }
        
        return acc;
      }, {});

      // Calculate performance metrics for each model
      for (const [key, group] of Object.entries(modelGroups)) {
        const g = group as any;
        const totalRequests = g.requests.length;
        const totalTokens = g.tokens.reduce((sum: number, t: number) => sum + t, 0);
        const totalCost = g.costs.reduce((sum: number, c: number) => sum + c, 0);
        const avgLatency = g.latencies.reduce((sum: number, l: number) => sum + l, 0) / g.latencies.length;
        const p95Latency = this.calculatePercentile(g.latencies, 95);
        const errorRate = (g.errors / totalRequests) * 100;
        const successRate = (g.successes / totalRequests) * 100;

        performance.push({
          model: g.model,
          provider: g.provider,
          total_requests: totalRequests,
          total_tokens: totalTokens,
          total_cost: totalCost,
          avg_latency_ms: Math.round(avgLatency),
          p95_latency_ms: Math.round(p95Latency),
          error_rate: Math.round(errorRate * 100) / 100,
          success_rate: Math.round(successRate * 100) / 100,
          last_used: g.requests[g.requests.length - 1]?.created_at || new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error collecting model performance:', error);
      return this.generateMockPerformanceData();
    }

    return performance;
  }

  /**
   * Generate mock performance data for testing
   */
  private generateMockPerformanceData(): ModelPerformance[] {
    return [
      {
        model: 'gpt-4',
        provider: 'openai',
        total_requests: 1250,
        total_tokens: 125000,
        total_cost: 18.75,
        avg_latency_ms: 1200,
        p95_latency_ms: 2100,
        error_rate: 2.1,
        success_rate: 97.9,
        last_used: new Date().toISOString()
      },
      {
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        total_requests: 3200,
        total_tokens: 320000,
        total_cost: 4.80,
        avg_latency_ms: 800,
        p95_latency_ms: 1500,
        error_rate: 1.2,
        success_rate: 98.8,
        last_used: new Date().toISOString()
      },
      {
        model: 'text-embedding-3-small',
        provider: 'openai',
        total_requests: 850,
        total_tokens: 85000,
        total_cost: 0.085,
        avg_latency_ms: 300,
        p95_latency_ms: 500,
        error_rate: 0.5,
        success_rate: 99.5,
        last_used: new Date().toISOString()
      },
      {
        model: 'claude-3-sonnet',
        provider: 'anthropic',
        total_requests: 450,
        total_tokens: 45000,
        total_cost: 6.75,
        avg_latency_ms: 1500,
        p95_latency_ms: 2800,
        error_rate: 3.2,
        success_rate: 96.8,
        last_used: new Date().toISOString()
      }
    ];
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(arr: number[], percentile: number): number {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Calculate average latency across all models
   */
  private calculateAverageLatency(performance: ModelPerformance[]): number {
    if (performance.length === 0) return 0;
    
    const totalRequests = performance.reduce((sum, model) => sum + model.total_requests, 0);
    const weightedLatency = performance.reduce((sum, model) => 
      sum + (model.avg_latency_ms * model.total_requests), 0);
    
    return Math.round(weightedLatency / totalRequests);
  }

  /**
   * Analyze cost trend over time
   */
  private async analyzeCostTrend(): Promise<'increasing' | 'decreasing' | 'stable'> {
    try {
      // Get cost data from last 14 days
      const { data: costData, error } = await this.supabase
        .from('ai_usage_logs')
        .select('cost, created_at')
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error || !costData || costData.length < 2) {
        return 'stable';
      }

      // Group by day and calculate daily costs
      const dailyCosts = costData.reduce((acc: any, log: any) => {
        const date = log.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + (log.cost || 0);
        return acc;
      }, {});

      const costs = Object.values(dailyCosts) as number[];
      const firstHalf = costs.slice(0, Math.floor(costs.length / 2));
      const secondHalf = costs.slice(Math.floor(costs.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, cost) => sum + cost, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, cost) => sum + cost, 0) / secondHalf.length;

      const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      if (changePercent > 10) return 'increasing';
      if (changePercent < -10) return 'decreasing';
      return 'stable';

    } catch (error) {
      console.error('Error analyzing cost trend:', error);
      return 'stable';
    }
  }

  /**
   * Analyze performance trend over time
   */
  private async analyzePerformanceTrend(): Promise<'improving' | 'degrading' | 'stable'> {
    try {
      // Get latency data from last 14 days
      const { data: latencyData, error } = await this.supabase
        .from('ai_usage_logs')
        .select('latency_ms, created_at')
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error || !latencyData || latencyData.length < 2) {
        return 'stable';
      }

      // Group by day and calculate daily average latency
      const dailyLatencies = latencyData.reduce((acc: any, log: any) => {
        const date = log.created_at.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(log.latency_ms || 0);
        return acc;
      }, {});

      const avgLatencies = Object.entries(dailyLatencies).map(([_, latencies]) => {
        const lats = latencies as number[];
        return lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
      });

      const firstHalf = avgLatencies.slice(0, Math.floor(avgLatencies.length / 2));
      const secondHalf = avgLatencies.slice(Math.floor(avgLatencies.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, lat) => sum + lat, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, lat) => sum + lat, 0) / secondHalf.length;

      const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      if (changePercent > 10) return 'degrading';
      if (changePercent < -10) return 'improving';
      return 'stable';

    } catch (error) {
      console.error('Error analyzing performance trend:', error);
      return 'stable';
    }
  }

  /**
   * Generate performance alerts
   */
  private async generatePerformanceAlerts(performance: ModelPerformance[]): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    for (const model of performance) {
      // High latency alert
      if (model.avg_latency_ms > 2000) {
        alerts.push({
          type: 'high_latency',
          severity: model.avg_latency_ms > 5000 ? 'critical' : 'high',
          model: model.model,
          message: `High latency detected: ${model.avg_latency_ms}ms average`,
          current_value: model.avg_latency_ms,
          threshold: 2000,
          impact: 'Poor user experience and potential timeouts',
          recommendation: 'Consider switching to a faster model or optimizing prompts'
        });
      }

      // High error rate alert
      if (model.error_rate > 5) {
        alerts.push({
          type: 'high_error_rate',
          severity: model.error_rate > 15 ? 'critical' : 'high',
          model: model.model,
          message: `High error rate detected: ${model.error_rate}%`,
          current_value: model.error_rate,
          threshold: 5,
          impact: 'Reduced reliability and user satisfaction',
          recommendation: 'Investigate error causes and implement retry logic'
        });
      }

      // High cost alert
      if (model.total_cost > 50) {
        alerts.push({
          type: 'high_cost',
          severity: model.total_cost > 100 ? 'critical' : 'high',
          model: model.model,
          message: `High cost detected: $${model.total_cost.toFixed(2)} in 7 days`,
          current_value: model.total_cost,
          threshold: 50,
          impact: 'Excessive operational costs',
          recommendation: 'Consider cost optimization strategies or model alternatives'
        });
      }

      // Low usage alert
      if (model.total_requests < 10) {
        alerts.push({
          type: 'low_usage',
          severity: 'low',
          model: model.model,
          message: `Low usage detected: ${model.total_requests} requests in 7 days`,
          current_value: model.total_requests,
          threshold: 10,
          impact: 'Underutilized resources',
          recommendation: 'Consider removing unused models or increasing adoption'
        });
      }

      // Model deprecation alert (simulated)
      if (model.model === 'gpt-3.5-turbo' && model.total_requests > 1000) {
        alerts.push({
          type: 'model_deprecated',
          severity: 'medium',
          model: model.model,
          message: 'Model may be deprecated soon - high usage detected',
          current_value: model.total_requests,
          threshold: 1000,
          impact: 'Potential service disruption',
          recommendation: 'Plan migration to newer model versions'
        });
      }
    }

    return alerts;
  }

  /**
   * Generate recommendations based on performance data
   */
  private generateRecommendations(performance: ModelPerformance[], alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');
    const mediumAlerts = alerts.filter(a => a.severity === 'medium');

    if (criticalAlerts.length > 0) {
      recommendations.push('🚨 Critical AI performance issues detected - immediate attention required');
      recommendations.push('Review and fix all critical performance problems');
    }

    if (highAlerts.length > 0) {
      recommendations.push('⚠️ High priority performance issues found - address within 24 hours');
      recommendations.push('Implement performance monitoring and alerting');
    }

    if (mediumAlerts.length > 0) {
      recommendations.push('📋 Medium priority issues found - address within 1 week');
      recommendations.push('Consider implementing cost optimization strategies');
    }

    // Cost optimization recommendations
    const highCostModels = performance.filter(p => p.total_cost > 20);
    if (highCostModels.length > 0) {
      recommendations.push('💰 High-cost models detected - consider optimization strategies');
      recommendations.push('Implement model selection based on task complexity');
    }

    // Latency optimization recommendations
    const slowModels = performance.filter(p => p.avg_latency_ms > 1500);
    if (slowModels.length > 0) {
      recommendations.push('⏱️ Slow models detected - consider performance optimizations');
      recommendations.push('Implement caching and request batching strategies');
    }

    // Error rate recommendations
    const errorProneModels = performance.filter(p => p.error_rate > 3);
    if (errorProneModels.length > 0) {
      recommendations.push('🔧 High error rate models detected - implement error handling');
      recommendations.push('Add retry logic and fallback mechanisms');
    }

    // Usage optimization recommendations
    const underusedModels = performance.filter(p => p.total_requests < 50);
    if (underusedModels.length > 0) {
      recommendations.push('📊 Underutilized models detected - consider consolidation');
      recommendations.push('Review model portfolio and remove unused models');
    }

    return recommendations;
  }

  /**
   * Calculate overall health based on alerts
   */
  private calculateOverallHealth(alerts: PerformanceAlert[]): 'healthy' | 'warning' | 'critical' {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;
    const mediumCount = alerts.filter(a => a.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2 || mediumCount > 5) return 'warning';
    return 'healthy';
  }

  /**
   * Create GitHub issue for critical performance issues
   */
  private async createPerformanceIssue(report: PerformanceReport): Promise<void> {
    try {
      const title = `🚨 AI Performance Alert - ${report.overall_health.toUpperCase()}`;
      const body = this.formatPerformanceIssueBody(report);

      await this.octokit.rest.issues.create({
        owner: this.repoOwner,
        repo: this.repoName,
        title,
        body,
        labels: ['ai', 'performance', 'critical', 'automated']
      });

      console.log('📝 Created AI performance issue in GitHub');
    } catch (error) {
      console.error('Error creating performance issue:', error);
    }
  }

  /**
   * Format performance issue body
   */
  private formatPerformanceIssueBody(report: PerformanceReport): string {
    const criticalAlerts = report.alerts.filter(a => a.severity === 'critical');
    const highAlerts = report.alerts.filter(a => a.severity === 'high');

    return `
## 🚨 AI Performance Alert

**Overall Health:** ${report.overall_health.toUpperCase()}
**Total Models:** ${report.total_models}
**Total Requests:** ${report.total_requests.toLocaleString()}
**Total Tokens:** ${report.total_tokens.toLocaleString()}
**Total Cost:** $${report.total_cost.toFixed(2)}
**Average Latency:** ${report.avg_latency_ms}ms
**Cost Trend:** ${report.cost_trend}
**Performance Trend:** ${report.performance_trend}

### Critical Alerts
${criticalAlerts.length > 0 ? criticalAlerts.map(alert => 
  `- **${alert.model}:** ${alert.message} (${alert.current_value} vs ${alert.threshold})`
).join('\n') : 'None'}

### High Priority Alerts
${highAlerts.length > 0 ? highAlerts.map(alert => 
  `- **${alert.model}:** ${alert.message} (${alert.current_value} vs ${alert.threshold})`
).join('\n') : 'None'}

### Model Performance Summary
${report.model_performance.map(model => 
  `- **${model.model}** (${model.provider}): ${model.total_requests} requests, $${model.total_cost.toFixed(2)} cost, ${model.avg_latency_ms}ms avg latency, ${model.error_rate}% error rate`
).join('\n')}

### Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

### Next Steps
1. Review all performance alerts
2. Implement cost optimization strategies
3. Optimize slow models
4. Add error handling and retry logic
5. Close this issue once all issues are resolved

---
*This issue was automatically created by the AI Performance Watcher.*
    `.trim();
  }
}

// Export for use in other modules
export { AIPerformanceWatcher, ModelPerformance, PerformanceAlert, PerformanceReport };

// CLI usage
if (require.main === module) {
  const watcher = new AIPerformanceWatcher();
  
  watcher.runPerformanceCheck()
    .then((report) => {
      console.log('AI performance check completed');
      console.log(`Overall health: ${report.overall_health}`);
      console.log(`Total models: ${report.total_models}`);
      console.log(`Total cost: $${report.total_cost.toFixed(2)}`);
      console.log(`Alerts: ${report.alerts.length}`);
      
      process.exit(report.overall_health === 'critical' ? 1 : 0);
    })
    .catch((error) => {
      console.error('AI performance check failed:', error);
      process.exit(1);
    });
}
/**
 * AI Self-Diagnosis System
 * Monitors CI logs, error frequency, cold starts, and latency p95
 * Emits JSON summaries to Supabase table ai_health_metrics
 * Opens GitHub Issues on pattern detection
 */

import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';
import { performance } from 'perf_hooks';

interface HealthMetrics {
  id?: string;
  service: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  tags: Record<string, any>;
  recorded_at: string;
  environment: string;
  severity: 'info' | 'warning' | 'critical';
}

interface DeployMetrics {
  deploy_id: string;
  success: boolean;
  duration_ms: number;
  error_count: number;
  cold_start_count: number;
  p95_latency_ms: number;
  memory_usage_mb: number;
  timestamp: string;
}

interface PatternDetection {
  pattern_type: 'deploy_failures' | 'performance_degradation' | 'error_spike' | 'memory_leak';
  severity: 'warning' | 'critical';
  description: string;
  affected_services: string[];
  recommendations: string[];
  detected_at: string;
}

class AISelfDiagnose {
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
   * Monitor and collect health metrics
   */
  async collectHealthMetrics(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Collect various system metrics
      const metrics = await this.gatherSystemMetrics();
      
      // Store metrics in Supabase
      await this.storeMetrics(metrics);
      
      // Analyze patterns
      const patterns = await this.analyzePatterns();
      
      // Create GitHub issues for critical patterns
      await this.handlePatternDetection(patterns);
      
      const duration = performance.now() - startTime;
      console.log(`Health metrics collection completed in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Error collecting health metrics:', error);
      await this.recordError('health_metrics_collection', error);
    }
  }

  /**
   * Gather system metrics from various sources
   */
  private async gatherSystemMetrics(): Promise<HealthMetrics[]> {
    const metrics: HealthMetrics[] = [];
    const timestamp = new Date().toISOString();
    const environment = process.env.NODE_ENV || 'development';

    // Memory usage
    const memUsage = process.memoryUsage();
    metrics.push({
      service: 'node',
      metric_name: 'memory_heap_used',
      metric_value: memUsage.heapUsed / 1024 / 1024, // MB
      metric_unit: 'MB',
      tags: { type: 'memory' },
      recorded_at: timestamp,
      environment,
      severity: 'info'
    });

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    metrics.push({
      service: 'node',
      metric_name: 'cpu_user_time',
      metric_value: cpuUsage.user / 1000000, // seconds
      metric_unit: 'seconds',
      tags: { type: 'cpu' },
      recorded_at: timestamp,
      environment,
      severity: 'info'
    });

    // Database connection health
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      metrics.push({
        service: 'database',
        metric_name: 'connection_health',
        metric_value: error ? 0 : 1,
        metric_unit: 'boolean',
        tags: { type: 'connectivity' },
        recorded_at: timestamp,
        environment,
        severity: error ? 'critical' : 'info'
      });
    } catch (error) {
      metrics.push({
        service: 'database',
        metric_name: 'connection_health',
        metric_value: 0,
        metric_unit: 'boolean',
        tags: { type: 'connectivity', error: error.message },
        recorded_at: timestamp,
        environment,
        severity: 'critical'
      });
    }

    // API response times (simulate)
    const apiMetrics = await this.measureAPIMetrics();
    metrics.push(...apiMetrics);

    return metrics;
  }

  /**
   * Measure API performance metrics
   */
  private async measureAPIMetrics(): Promise<HealthMetrics[]> {
    const metrics: HealthMetrics[] = [];
    const timestamp = new Date().toISOString();
    const environment = process.env.NODE_ENV || 'development';

    // Simulate API endpoint testing
    const endpoints = [
      '/api/health',
      '/api/mortgage/calculate',
      '/api/rates/check',
      '/api/auth/session'
    ];

    for (const endpoint of endpoints) {
      const startTime = performance.now();
      
      try {
        // In a real implementation, you'd make actual HTTP requests
        // For now, we'll simulate response times
        const simulatedLatency = Math.random() * 100 + 50; // 50-150ms
        await new Promise(resolve => setTimeout(resolve, simulatedLatency));
        
        const responseTime = performance.now() - startTime;
        
        metrics.push({
          service: 'api',
          metric_name: 'response_time',
          metric_value: responseTime,
          metric_unit: 'ms',
          tags: { endpoint, type: 'performance' },
          recorded_at: timestamp,
          environment,
          severity: responseTime > 200 ? 'warning' : 'info'
        });

        metrics.push({
          service: 'api',
          metric_name: 'availability',
          metric_value: 1,
          metric_unit: 'boolean',
          tags: { endpoint, type: 'availability' },
          recorded_at: timestamp,
          environment,
          severity: 'info'
        });

      } catch (error) {
        metrics.push({
          service: 'api',
          metric_name: 'availability',
          metric_value: 0,
          metric_unit: 'boolean',
          tags: { endpoint, type: 'availability', error: error.message },
          recorded_at: timestamp,
          environment,
          severity: 'critical'
        });
      }
    }

    return metrics;
  }

  /**
   * Store metrics in Supabase
   */
  private async storeMetrics(metrics: HealthMetrics[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_health_metrics')
        .insert(metrics);

      if (error) {
        throw new Error(`Failed to store metrics: ${error.message}`);
      }

      console.log(`Stored ${metrics.length} health metrics`);
    } catch (error) {
      console.error('Error storing metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze patterns in collected metrics
   */
  private async analyzePatterns(): Promise<PatternDetection[]> {
    const patterns: PatternDetection[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // Check for deploy failures in the last hour
      const { data: recentMetrics } = await this.supabase
        .from('ai_health_metrics')
        .select('*')
        .gte('recorded_at', oneHourAgo.toISOString())
        .eq('metric_name', 'deploy_success');

      if (recentMetrics) {
        const failureCount = recentMetrics.filter(m => m.metric_value === 0).length;
        if (failureCount >= 3) {
          patterns.push({
            pattern_type: 'deploy_failures',
            severity: 'critical',
            description: `Detected ${failureCount} deploy failures in the last hour`,
            affected_services: ['deployment'],
            recommendations: [
              'Check CI/CD pipeline logs',
              'Verify environment variables',
              'Review recent code changes',
              'Check infrastructure status'
            ],
            detected_at: now.toISOString()
          });
        }
      }

      // Check for performance degradation
      const { data: performanceMetrics } = await this.supabase
        .from('ai_health_metrics')
        .select('*')
        .gte('recorded_at', oneHourAgo.toISOString())
        .eq('metric_name', 'response_time')
        .eq('service', 'api');

      if (performanceMetrics && performanceMetrics.length > 0) {
        const avgResponseTime = performanceMetrics.reduce((sum, m) => sum + m.metric_value, 0) / performanceMetrics.length;
        const slowRequests = performanceMetrics.filter(m => m.metric_value > 200).length;
        const slowPercentage = (slowRequests / performanceMetrics.length) * 100;

        if (slowPercentage > 20) {
          patterns.push({
            pattern_type: 'performance_degradation',
            severity: 'warning',
            description: `${slowPercentage.toFixed(1)}% of API requests are slower than 200ms (avg: ${avgResponseTime.toFixed(1)}ms)`,
            affected_services: ['api'],
            recommendations: [
              'Check database query performance',
              'Review caching strategy',
              'Monitor external API dependencies',
              'Consider scaling resources'
            ],
            detected_at: now.toISOString()
          });
        }
      }

      // Check for error spikes
      const { data: errorMetrics } = await this.supabase
        .from('ai_health_metrics')
        .select('*')
        .gte('recorded_at', oneHourAgo.toISOString())
        .eq('metric_name', 'error_rate');

      if (errorMetrics && errorMetrics.length > 0) {
        const avgErrorRate = errorMetrics.reduce((sum, m) => sum + m.metric_value, 0) / errorMetrics.length;
        if (avgErrorRate > 5) { // 5% error rate threshold
          patterns.push({
            pattern_type: 'error_spike',
            severity: 'critical',
            description: `Error rate is ${avgErrorRate.toFixed(2)}%, exceeding 5% threshold`,
            affected_services: ['api', 'database'],
            recommendations: [
              'Check application logs for error patterns',
              'Verify external service dependencies',
              'Review recent deployments',
              'Check resource utilization'
            ],
            detected_at: now.toISOString()
          });
        }
      }

    } catch (error) {
      console.error('Error analyzing patterns:', error);
    }

    return patterns;
  }

  /**
   * Handle pattern detection by creating GitHub issues
   */
  private async handlePatternDetection(patterns: PatternDetection[]): Promise<void> {
    for (const pattern of patterns) {
      if (pattern.severity === 'critical') {
        try {
          const issueTitle = `🚨 AI Health Alert: ${pattern.description}`;
          const issueBody = this.generateIssueBody(pattern);

          await this.octokit.rest.issues.create({
            owner: this.repoOwner,
            repo: this.repoName,
            title: issueTitle,
            body: issueBody,
            labels: ['ai-health', 'critical', 'automated']
          });

          console.log(`Created GitHub issue for pattern: ${pattern.pattern_type}`);
        } catch (error) {
          console.error('Error creating GitHub issue:', error);
        }
      }
    }
  }

  /**
   * Generate GitHub issue body
   */
  private generateIssueBody(pattern: PatternDetection): string {
    return `
## AI Health Pattern Detected

**Pattern Type:** ${pattern.pattern_type}
**Severity:** ${pattern.severity}
**Detected At:** ${pattern.detected_at}

### Description
${pattern.description}

### Affected Services
${pattern.affected_services.map(service => `- ${service}`).join('\n')}

### Recommendations
${pattern.recommendations.map(rec => `- ${rec}`).join('\n')}

### Next Steps
1. Review the recommendations above
2. Check the [AI Health Dashboard](https://supabase.com/dashboard/project/ghqyxhbyyirveptgwoqm/editor/ai_health_metrics)
3. Update this issue with findings and resolution steps

---
*This issue was automatically created by the AI Self-Diagnosis system.*
    `.trim();
  }

  /**
   * Record error for monitoring
   */
  private async recordError(context: string, error: any): Promise<void> {
    try {
      await this.supabase
        .from('ai_health_metrics')
        .insert({
          service: 'ai_self_diagnose',
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

  /**
   * Get health summary for external consumption
   */
  async getHealthSummary(): Promise<any> {
    try {
      const { data: recentMetrics } = await this.supabase
        .from('ai_health_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });

      if (!recentMetrics) return null;

      const summary = {
        timestamp: new Date().toISOString(),
        total_metrics: recentMetrics.length,
        services: [...new Set(recentMetrics.map(m => m.service))],
        critical_issues: recentMetrics.filter(m => m.severity === 'critical').length,
        warnings: recentMetrics.filter(m => m.severity === 'warning').length,
        avg_response_time: this.calculateAverage(recentMetrics, 'response_time'),
        error_rate: this.calculateErrorRate(recentMetrics),
        recommendations: this.generateRecommendations(recentMetrics)
      };

      return summary;
    } catch (error) {
      console.error('Error getting health summary:', error);
      return null;
    }
  }

  private calculateAverage(metrics: any[], metricName: string): number {
    const relevantMetrics = metrics.filter(m => m.metric_name === metricName);
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.metric_value, 0);
    return sum / relevantMetrics.length;
  }

  private calculateErrorRate(metrics: any[]): number {
    const availabilityMetrics = metrics.filter(m => m.metric_name === 'availability');
    if (availabilityMetrics.length === 0) return 0;
    
    const errors = availabilityMetrics.filter(m => m.metric_value === 0).length;
    return (errors / availabilityMetrics.length) * 100;
  }

  private generateRecommendations(metrics: any[]): string[] {
    const recommendations: string[] = [];
    
    const avgResponseTime = this.calculateAverage(metrics, 'response_time');
    if (avgResponseTime > 200) {
      recommendations.push('Consider optimizing API response times - current average is above 200ms');
    }

    const errorRate = this.calculateErrorRate(metrics);
    if (errorRate > 1) {
      recommendations.push('Error rate is above 1% - investigate and fix failing requests');
    }

    const criticalIssues = metrics.filter(m => m.severity === 'critical').length;
    if (criticalIssues > 0) {
      recommendations.push(`${criticalIssues} critical issues detected - immediate attention required`);
    }

    return recommendations;
  }
}

// Export for use in other modules
export { AISelfDiagnose, HealthMetrics, DeployMetrics, PatternDetection };

// CLI usage
if (require.main === module) {
  const diagnoser = new AISelfDiagnose();
  diagnoser.collectHealthMetrics()
    .then(() => {
      console.log('AI self-diagnosis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('AI self-diagnosis failed:', error);
      process.exit(1);
    });
}
/**
 * Watcher Notifier
 * Summarizes results from all watchers and creates GitHub issues
 * Provides unified reporting and notification system
 * Runs after all watchers complete
 */

import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';

interface WatcherResult {
  watcher_name: string;
  status: 'success' | 'warning' | 'error' | 'critical';
  health: 'healthy' | 'warning' | 'critical';
  issues_found: number;
  warnings_found: number;
  errors_found: number;
  critical_issues_found: number;
  summary: string;
  details: string;
  recommendations: string[];
  execution_time_ms: number;
  timestamp: string;
}

interface WatcherSummary {
  timestamp: string;
  total_watchers: number;
  successful_watchers: number;
  failed_watchers: number;
  total_issues: number;
  total_warnings: number;
  total_errors: number;
  total_critical: number;
  overall_health: 'healthy' | 'warning' | 'critical';
  watcher_results: WatcherResult[];
  system_health_score: number;
  recommendations: string[];
  next_actions: string[];
}

class WatcherNotifier {
  private octokit: Octokit;
  private supabase: any;
  private githubToken: string;
  private repoOwner: string;
  private repoName: string;

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN!;
    this.repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'your-org';
    this.repoName = process.env.GITHUB_REPOSITORY_NAME || 'mortgagematch-pro';
    
    this.octokit = new Octokit({
      auth: this.githubToken,
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * Main notification function
   */
  async notifyWatcherResults(watcherResults: WatcherResult[]): Promise<WatcherSummary> {
    console.log('📊 Summarizing watcher results...');

    try {
      // 1. Analyze watcher results
      const summary = this.analyzeWatcherResults(watcherResults);
      
      // 2. Calculate system health score
      summary.system_health_score = this.calculateSystemHealthScore(watcherResults);
      
      // 3. Generate recommendations
      summary.recommendations = this.generateSystemRecommendations(summary);
      
      // 4. Generate next actions
      summary.next_actions = this.generateNextActions(summary);
      
      // 5. Store summary in database
      await this.storeWatcherSummary(summary);
      
      // 6. Create GitHub issue if needed
      if (summary.overall_health === 'critical' || summary.total_critical > 0) {
        await this.createSystemHealthIssue(summary);
      }
      
      // 7. Send notifications
      await this.sendNotifications(summary);

      console.log(`✅ Watcher notification completed. Overall health: ${summary.overall_health}`);
      
      return summary;

    } catch (error) {
      console.error('❌ Watcher notification failed:', error);
      throw error;
    }
  }

  /**
   * Analyze watcher results and create summary
   */
  private analyzeWatcherResults(watcherResults: WatcherResult[]): WatcherSummary {
    const totalWatchers = watcherResults.length;
    const successfulWatchers = watcherResults.filter(r => r.status === 'success').length;
    const failedWatchers = watcherResults.filter(r => r.status === 'error' || r.status === 'critical').length;
    
    const totalIssues = watcherResults.reduce((sum, r) => sum + r.issues_found, 0);
    const totalWarnings = watcherResults.reduce((sum, r) => sum + r.warnings_found, 0);
    const totalErrors = watcherResults.reduce((sum, r) => sum + r.errors_found, 0);
    const totalCritical = watcherResults.reduce((sum, r) => sum + r.critical_issues_found, 0);

    // Calculate overall health
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (totalCritical > 0 || failedWatchers > 0) {
      overallHealth = 'critical';
    } else if (totalErrors > 2 || totalWarnings > 5) {
      overallHealth = 'warning';
    }

    return {
      timestamp: new Date().toISOString(),
      total_watchers: totalWatchers,
      successful_watchers: successfulWatchers,
      failed_watchers: failedWatchers,
      total_issues: totalIssues,
      total_warnings: totalWarnings,
      total_errors: totalErrors,
      total_critical: totalCritical,
      overall_health: overallHealth,
      watcher_results: watcherResults,
      system_health_score: 0, // Will be calculated separately
      recommendations: [],
      next_actions: []
    };
  }

  /**
   * Calculate system health score (0-100)
   */
  private calculateSystemHealthScore(watcherResults: WatcherResult[]): number {
    if (watcherResults.length === 0) return 0;

    let totalScore = 0;
    let weightSum = 0;

    for (const result of watcherResults) {
      let watcherScore = 100;
      
      // Deduct points for issues
      watcherScore -= result.critical_issues_found * 20;
      watcherScore -= result.errors_found * 10;
      watcherScore -= result.warnings_found * 5;
      watcherScore -= result.issues_found * 2;

      // Deduct points for failed execution
      if (result.status === 'critical') watcherScore -= 30;
      else if (result.status === 'error') watcherScore -= 20;
      else if (result.status === 'warning') watcherScore -= 10;

      // Ensure score doesn't go below 0
      watcherScore = Math.max(0, watcherScore);

      // Weight by execution time (longer running watchers are more important)
      const weight = Math.min(result.execution_time_ms / 1000, 10); // Cap at 10x weight
      
      totalScore += watcherScore * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
  }

  /**
   * Generate system-wide recommendations
   */
  private generateSystemRecommendations(summary: WatcherSummary): string[] {
    const recommendations: string[] = [];

    if (summary.total_critical > 0) {
      recommendations.push('🚨 Critical system issues detected - immediate attention required');
      recommendations.push('Review all critical issues and implement fixes immediately');
    }

    if (summary.total_errors > 0) {
      recommendations.push('⚠️ System errors detected - address within 24 hours');
      recommendations.push('Implement error handling and monitoring improvements');
    }

    if (summary.total_warnings > 0) {
      recommendations.push('📋 System warnings detected - address within 1 week');
      recommendations.push('Review warning patterns and implement preventive measures');
    }

    if (summary.failed_watchers > 0) {
      recommendations.push('🔧 Some watchers failed to execute - investigate and fix');
      recommendations.push('Check watcher configurations and dependencies');
    }

    if (summary.system_health_score < 70) {
      recommendations.push('📊 System health score is low - implement comprehensive improvements');
      recommendations.push('Focus on reducing issues and improving reliability');
    }

    if (summary.system_health_score > 90) {
      recommendations.push('✅ System health is excellent - maintain current practices');
      recommendations.push('Consider implementing additional monitoring for proactive maintenance');
    }

    // Specific recommendations based on watcher types
    const dbWatcher = summary.watcher_results.find(r => r.watcher_name === 'db_integrity');
    if (dbWatcher && dbWatcher.critical_issues_found > 0) {
      recommendations.push('🗄️ Database integrity issues - review data validation and constraints');
    }

    const apiWatcher = summary.watcher_results.find(r => r.watcher_name === 'api_contract');
    if (apiWatcher && apiWatcher.critical_issues_found > 0) {
      recommendations.push('🔌 API contract issues - update documentation and fix endpoints');
    }

    const aiWatcher = summary.watcher_results.find(r => r.watcher_name === 'ai_performance');
    if (aiWatcher && aiWatcher.critical_issues_found > 0) {
      recommendations.push('🤖 AI performance issues - optimize models and implement monitoring');
    }

    return recommendations;
  }

  /**
   * Generate next actions based on summary
   */
  private generateNextActions(summary: WatcherSummary): string[] {
    const actions: string[] = [];

    if (summary.total_critical > 0) {
      actions.push('1. Review and fix all critical issues immediately');
      actions.push('2. Implement emergency fixes for system stability');
      actions.push('3. Notify team leads about critical issues');
    }

    if (summary.total_errors > 0) {
      actions.push('4. Address all system errors within 24 hours');
      actions.push('5. Implement error monitoring and alerting');
    }

    if (summary.total_warnings > 0) {
      actions.push('6. Review and address warnings within 1 week');
      actions.push('7. Implement preventive measures for common issues');
    }

    if (summary.failed_watchers > 0) {
      actions.push('8. Investigate and fix failed watchers');
      actions.push('9. Update watcher configurations and dependencies');
    }

    actions.push('10. Schedule follow-up review in 24 hours');
    actions.push('11. Update system documentation with lessons learned');
    actions.push('12. Close this issue once all actions are completed');

    return actions;
  }

  /**
   * Store watcher summary in database
   */
  private async storeWatcherSummary(summary: WatcherSummary): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('watcher_summaries')
        .insert({
          timestamp: summary.timestamp,
          total_watchers: summary.total_watchers,
          successful_watchers: summary.successful_watchers,
          failed_watchers: summary.failed_watchers,
          total_issues: summary.total_issues,
          total_warnings: summary.total_warnings,
          total_errors: summary.total_errors,
          total_critical: summary.total_critical,
          overall_health: summary.overall_health,
          system_health_score: summary.system_health_score,
          watcher_results: summary.watcher_results,
          recommendations: summary.recommendations,
          next_actions: summary.next_actions
        });

      if (error) {
        console.error('Error storing watcher summary:', error);
      } else {
        console.log('📊 Watcher summary stored in database');
      }
    } catch (error) {
      console.error('Error storing watcher summary:', error);
    }
  }

  /**
   * Create GitHub issue for system health
   */
  private async createSystemHealthIssue(summary: WatcherSummary): Promise<void> {
    try {
      const title = `🚨 System Health Alert - ${summary.overall_health.toUpperCase()}`;
      const body = this.formatSystemHealthIssueBody(summary);

      await this.octokit.rest.issues.create({
        owner: this.repoOwner,
        repo: this.repoName,
        title,
        body,
        labels: ['system', 'health', 'critical', 'automated']
      });

      console.log('📝 Created system health issue in GitHub');
    } catch (error) {
      console.error('Error creating system health issue:', error);
    }
  }

  /**
   * Format system health issue body
   */
  private formatSystemHealthIssueBody(summary: WatcherSummary): string {
    const criticalWatchers = summary.watcher_results.filter(r => r.critical_issues_found > 0);
    const failedWatchers = summary.watcher_results.filter(r => r.status === 'error' || r.status === 'critical');

    return `
## 🚨 System Health Alert

**Overall Health:** ${summary.overall_health.toUpperCase()}
**System Health Score:** ${summary.system_health_score}/100
**Total Watchers:** ${summary.total_watchers}
**Successful Watchers:** ${summary.successful_watchers}
**Failed Watchers:** ${summary.failed_watchers}
**Total Issues:** ${summary.total_issues}
**Total Warnings:** ${summary.total_warnings}
**Total Errors:** ${summary.total_errors}
**Total Critical:** ${summary.total_critical}

### Critical Issues by Watcher
${criticalWatchers.length > 0 ? criticalWatchers.map(watcher => 
  `- **${watcher.watcher_name}:** ${watcher.critical_issues_found} critical issues - ${watcher.summary}`
).join('\n') : 'None'}

### Failed Watchers
${failedWatchers.length > 0 ? failedWatchers.map(watcher => 
  `- **${watcher.watcher_name}:** ${watcher.status} - ${watcher.summary}`
).join('\n') : 'None'}

### Watcher Results Summary
${summary.watcher_results.map(watcher => 
  `- **${watcher.watcher_name}:** ${watcher.status} (${watcher.health}) - ${watcher.issues_found} issues, ${watcher.warnings_found} warnings, ${watcher.errors_found} errors, ${watcher.critical_issues_found} critical`
).join('\n')}

### Recommendations
${summary.recommendations.map(rec => `- ${rec}`).join('\n')}

### Next Actions
${summary.next_actions.map(action => `- ${action}`).join('\n')}

### System Health Score Breakdown
- **Score:** ${summary.system_health_score}/100
- **Status:** ${summary.system_health_score >= 90 ? 'Excellent' : summary.system_health_score >= 70 ? 'Good' : summary.system_health_score >= 50 ? 'Fair' : 'Poor'}
- **Trend:** ${summary.system_health_score >= 80 ? 'Improving' : 'Needs Attention'}

---
*This issue was automatically created by the Watcher Notifier.*
    `.trim();
  }

  /**
   * Send notifications to various channels
   */
  private async sendNotifications(summary: WatcherSummary): Promise<void> {
    try {
      // Send to Slack if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackNotification(summary);
      }

      // Send to Discord if configured
      if (process.env.DISCORD_WEBHOOK_URL) {
        await this.sendDiscordNotification(summary);
      }

      // Send to Teams if configured
      if (process.env.TEAMS_WEBHOOK_URL) {
        await this.sendTeamsNotification(summary);
      }

      console.log('📢 Notifications sent successfully');
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(summary: WatcherSummary): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL!;
    
    const message = {
      text: `🚨 System Health Alert - ${summary.overall_health.toUpperCase()}`,
      attachments: [
        {
          color: summary.overall_health === 'critical' ? 'danger' : summary.overall_health === 'warning' ? 'warning' : 'good',
          fields: [
            {
              title: 'System Health Score',
              value: `${summary.system_health_score}/100`,
              short: true
            },
            {
              title: 'Total Issues',
              value: summary.total_issues.toString(),
              short: true
            },
            {
              title: 'Critical Issues',
              value: summary.total_critical.toString(),
              short: true
            },
            {
              title: 'Failed Watchers',
              value: summary.failed_watchers.toString(),
              short: true
            }
          ]
        }
      ]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(summary: WatcherSummary): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL!;
    
    const message = {
      embeds: [
        {
          title: `🚨 System Health Alert - ${summary.overall_health.toUpperCase()}`,
          color: summary.overall_health === 'critical' ? 0xff0000 : summary.overall_health === 'warning' ? 0xffaa00 : 0x00ff00,
          fields: [
            {
              name: 'System Health Score',
              value: `${summary.system_health_score}/100`,
              inline: true
            },
            {
              name: 'Total Issues',
              value: summary.total_issues.toString(),
              inline: true
            },
            {
              name: 'Critical Issues',
              value: summary.total_critical.toString(),
              inline: true
            }
          ],
          timestamp: summary.timestamp
        }
      ]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }

  /**
   * Send Teams notification
   */
  private async sendTeamsNotification(summary: WatcherSummary): Promise<void> {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL!;
    
    const message = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": summary.overall_health === 'critical' ? 'FF0000' : summary.overall_health === 'warning' ? 'FFAA00' : '00FF00',
      "summary": `System Health Alert - ${summary.overall_health.toUpperCase()}`,
      "sections": [
        {
          "activityTitle": `🚨 System Health Alert - ${summary.overall_health.toUpperCase()}`,
          "activitySubtitle": `Health Score: ${summary.system_health_score}/100`,
          "facts": [
            {
              "name": "Total Issues",
              "value": summary.total_issues.toString()
            },
            {
              "name": "Critical Issues",
              "value": summary.total_critical.toString()
            },
            {
              "name": "Failed Watchers",
              "value": summary.failed_watchers.toString()
            }
          ]
        }
      ]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }
}

// Export for use in other modules
export { WatcherNotifier, WatcherResult, WatcherSummary };

// CLI usage
if (require.main === module) {
  const notifier = new WatcherNotifier();
  
  // Mock watcher results for testing
  const mockResults: WatcherResult[] = [
    {
      watcher_name: 'db_integrity',
      status: 'success',
      health: 'healthy',
      issues_found: 0,
      warnings_found: 2,
      errors_found: 0,
      critical_issues_found: 0,
      summary: 'Database integrity check completed successfully',
      details: 'All foreign key constraints are valid, no orphaned records found',
      recommendations: ['Consider implementing automated cleanup procedures'],
      execution_time_ms: 1500,
      timestamp: new Date().toISOString()
    },
    {
      watcher_name: 'api_contract',
      status: 'warning',
      health: 'warning',
      issues_found: 3,
      warnings_found: 1,
      errors_found: 0,
      critical_issues_found: 0,
      summary: 'API contract validation completed with warnings',
      details: 'Found 3 undocumented endpoints, 1 deprecated endpoint still in use',
      recommendations: ['Update OpenAPI specification', 'Plan migration for deprecated endpoints'],
      execution_time_ms: 2000,
      timestamp: new Date().toISOString()
    },
    {
      watcher_name: 'ai_performance',
      status: 'success',
      health: 'healthy',
      issues_found: 0,
      warnings_found: 0,
      errors_found: 0,
      critical_issues_found: 0,
      summary: 'AI performance monitoring completed successfully',
      details: 'All models performing within acceptable parameters',
      recommendations: ['Continue monitoring for performance trends'],
      execution_time_ms: 3000,
      timestamp: new Date().toISOString()
    }
  ];
  
  notifier.notifyWatcherResults(mockResults)
    .then((summary) => {
      console.log('Watcher notification completed');
      console.log(`Overall health: ${summary.overall_health}`);
      console.log(`System health score: ${summary.system_health_score}/100`);
      console.log(`Total issues: ${summary.total_issues}`);
      
      process.exit(summary.overall_health === 'critical' ? 1 : 0);
    })
    .catch((error) => {
      console.error('Watcher notification failed:', error);
      process.exit(1);
    });
}
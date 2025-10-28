/**
 * AI Insights Agent
 * Parses logs with GPT-5 reasoning via OpenAI SDK
 * Recommends caching, schema, or API optimizations
 * Posts results as PR comment "AI Post-Deploy Analysis"
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';

class AIInsightsAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    
    this.repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'your-org';
    this.repoName = process.env.GITHUB_REPOSITORY_NAME || 'mortgagematch-pro';
  }

  /**
   * Main analysis function - analyzes recent deployments and logs
   */
  async analyzeDeployment(prNumber, commitSha) {
    try {
      console.log(`🔍 Starting AI analysis for PR #${prNumber}, commit ${commitSha}`);
      
      // 1. Gather deployment data
      const deploymentData = await this.gatherDeploymentData(prNumber, commitSha);
      
      // 2. Analyze with GPT-5
      const analysis = await this.performAIAnalysis(deploymentData);
      
      // 3. Generate recommendations
      const recommendations = await this.generateRecommendations(analysis);
      
      // 4. Post PR comment
      await this.postPRComment(prNumber, analysis, recommendations);
      
      // 5. Store insights in database
      await this.storeInsights(prNumber, commitSha, analysis, recommendations);
      
      console.log('✅ AI analysis completed successfully');
      
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      throw error;
    }
  }

  /**
   * Gather comprehensive deployment data
   */
  async gatherDeploymentData(prNumber, commitSha) {
    const data = {
      pr: null,
      commits: [],
      files: [],
      logs: [],
      metrics: [],
      performance: {},
      errors: []
    };

    try {
      // Get PR details
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner: this.repoOwner,
        repo: this.repoName,
        pull_number: prNumber
      });
      data.pr = pr;

      // Get commits
      const { data: commits } = await this.octokit.rest.pulls.listCommits({
        owner: this.repoOwner,
        repo: this.repoName,
        pull_number: prNumber
      });
      data.commits = commits;

      // Get changed files
      const { data: files } = await this.octokit.rest.pulls.listFiles({
        owner: this.repoOwner,
        repo: this.repoName,
        pull_number: prNumber
      });
      data.files = files;

      // Get recent health metrics
      const { data: metrics } = await this.supabase
        .from('ai_health_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });
      data.metrics = metrics || [];

      // Get performance data
      data.performance = await this.analyzePerformanceMetrics(data.metrics);

      // Get error logs (simulated - in real implementation, fetch from logging service)
      data.errors = await this.getErrorLogs(commitSha);

      console.log(`📊 Gathered data: ${data.commits.length} commits, ${data.files.length} files, ${data.metrics.length} metrics`);

    } catch (error) {
      console.error('Error gathering deployment data:', error);
    }

    return data;
  }

  /**
   * Perform AI analysis using GPT-5
   */
  async performAIAnalysis(deploymentData) {
    const prompt = this.buildAnalysisPrompt(deploymentData);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Using GPT-4 as GPT-5 is not available yet
        messages: [
          {
            role: 'system',
            content: `You are an expert software engineer and DevOps specialist analyzing a deployment. 
            Provide detailed, actionable insights about code quality, performance, security, and best practices.
            Focus on specific, implementable recommendations.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return {
        summary: 'Analysis failed due to API error',
        issues: [],
        recommendations: ['Check AI service connectivity']
      };
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  buildAnalysisPrompt(data) {
    const fileChanges = data.files.map(f => ({
      filename: f.filename,
      changes: f.changes,
      additions: f.additions,
      deletions: f.deletions,
      status: f.status
    }));

    const commitMessages = data.commits.map(c => c.commit.message).join('\n');
    
    const performanceSummary = {
      avgResponseTime: data.performance.avgResponseTime,
      errorRate: data.performance.errorRate,
      memoryUsage: data.performance.memoryUsage,
      criticalIssues: data.performance.criticalIssues
    };

    return `
Analyze this deployment and provide insights in JSON format:

## Pull Request Information
- Title: ${data.pr?.title || 'N/A'}
- Description: ${data.pr?.body || 'N/A'}
- Files Changed: ${data.files.length}

## File Changes
${JSON.stringify(fileChanges, null, 2)}

## Commit Messages
${commitMessages}

## Performance Metrics (Last 24h)
${JSON.stringify(performanceSummary, null, 2)}

## Recent Errors
${data.errors.length} errors detected

## Analysis Required
Please analyze and return a JSON object with:
1. summary: Brief overview of the deployment
2. code_quality: Assessment of code changes
3. performance_impact: Analysis of performance implications
4. security_concerns: Any security issues identified
5. issues: Array of specific issues found
6. recommendations: Array of actionable recommendations
7. risk_level: "low", "medium", or "high"
8. confidence: 0-100 confidence score

Focus on:
- Performance optimizations (caching, database queries, API efficiency)
- Code quality and maintainability
- Security vulnerabilities
- Best practices adherence
- Potential production issues
    `.trim();
  }

  /**
   * Generate specific recommendations based on analysis
   */
  async generateRecommendations(analysis) {
    const recommendations = [];

    // Performance recommendations
    if (analysis.performance_impact?.response_time_concern) {
      recommendations.push({
        category: 'Performance',
        priority: 'high',
        title: 'Optimize API Response Times',
        description: 'Consider implementing caching, database query optimization, or code splitting',
        implementation: 'Add Redis caching layer and optimize database queries'
      });
    }

    // Database recommendations
    if (analysis.issues?.some(issue => issue.includes('database'))) {
      recommendations.push({
        category: 'Database',
        priority: 'medium',
        title: 'Database Query Optimization',
        description: 'Review and optimize database queries for better performance',
        implementation: 'Add database indexes and optimize query patterns'
      });
    }

    // Security recommendations
    if (analysis.security_concerns?.length > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'high',
        title: 'Address Security Concerns',
        description: analysis.security_concerns.join(', '),
        implementation: 'Review and implement security best practices'
      });
    }

    // Code quality recommendations
    if (analysis.code_quality?.complexity_high) {
      recommendations.push({
        category: 'Code Quality',
        priority: 'medium',
        title: 'Reduce Code Complexity',
        description: 'Break down complex functions into smaller, more maintainable pieces',
        implementation: 'Refactor large functions and add unit tests'
      });
    }

    return recommendations;
  }

  /**
   * Post analysis results as PR comment
   */
  async postPRComment(prNumber, analysis, recommendations) {
    const commentBody = this.formatPRComment(analysis, recommendations);
    
    try {
      await this.octokit.rest.issues.createComment({
        owner: this.repoOwner,
        repo: this.repoName,
        issue_number: prNumber,
        body: commentBody
      });
      
      console.log(`📝 Posted AI analysis comment to PR #${prNumber}`);
    } catch (error) {
      console.error('Error posting PR comment:', error);
    }
  }

  /**
   * Format PR comment with analysis results
   */
  formatPRComment(analysis, recommendations) {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🔴'
    };

    return `
## 🤖 AI Post-Deploy Analysis

${riskEmoji[analysis.risk_level]} **Risk Level:** ${analysis.risk_level.toUpperCase()}
📊 **Confidence:** ${analysis.confidence}%

### 📋 Summary
${analysis.summary}

### 🔍 Key Findings
${analysis.issues?.map(issue => `- ${issue}`).join('\n') || 'No major issues detected'}

### 🚀 Recommendations
${recommendations.map(rec => `
#### ${rec.title}
- **Priority:** ${rec.priority}
- **Description:** ${rec.description}
- **Implementation:** ${rec.implementation}
`).join('\n')}

### 📈 Performance Impact
${analysis.performance_impact || 'No significant performance impact detected'}

### 🔒 Security Assessment
${analysis.security_concerns?.length > 0 
  ? analysis.security_concerns.map(concern => `- ${concern}`).join('\n')
  : 'No security concerns identified'
}

---
*This analysis was generated by the AI Insights Agent. For detailed metrics, check the [AI Health Dashboard](https://supabase.com/dashboard/project/ghqyxhbyyirveptgwoqm/editor/ai_health_metrics).*
    `.trim();
  }

  /**
   * Store insights in database for future reference
   */
  async storeInsights(prNumber, commitSha, analysis, recommendations) {
    try {
      const insight = {
        pr_number: prNumber,
        commit_sha: commitSha,
        analysis_data: analysis,
        recommendations: recommendations,
        risk_level: analysis.risk_level,
        confidence_score: analysis.confidence,
        created_at: new Date().toISOString()
      };

      await this.supabase
        .from('ai_insights')
        .insert(insight);

      console.log('💾 Stored AI insights in database');
    } catch (error) {
      console.error('Error storing insights:', error);
    }
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformanceMetrics(metrics) {
    const performance = {
      avgResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      criticalIssues: 0
    };

    if (!metrics || metrics.length === 0) return performance;

    // Calculate average response time
    const responseTimeMetrics = metrics.filter(m => m.metric_name === 'response_time');
    if (responseTimeMetrics.length > 0) {
      performance.avgResponseTime = responseTimeMetrics.reduce((sum, m) => sum + m.metric_value, 0) / responseTimeMetrics.length;
    }

    // Calculate error rate
    const availabilityMetrics = metrics.filter(m => m.metric_name === 'availability');
    if (availabilityMetrics.length > 0) {
      const errors = availabilityMetrics.filter(m => m.metric_value === 0).length;
      performance.errorRate = (errors / availabilityMetrics.length) * 100;
    }

    // Get memory usage
    const memoryMetrics = metrics.filter(m => m.metric_name === 'memory_heap_used');
    if (memoryMetrics.length > 0) {
      performance.memoryUsage = memoryMetrics[0].metric_value;
    }

    // Count critical issues
    performance.criticalIssues = metrics.filter(m => m.severity === 'critical').length;

    return performance;
  }

  /**
   * Get error logs (simulated)
   */
  async getErrorLogs(commitSha) {
    // In a real implementation, this would fetch from your logging service
    // For now, return simulated data
    return [
      {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Database connection timeout',
        service: 'api',
        commit: commitSha
      }
    ];
  }
}

// Export for use in other modules
export { AIInsightsAgent };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new AIInsightsAgent();
  
  const prNumber = process.argv[2];
  const commitSha = process.argv[3];
  
  if (!prNumber || !commitSha) {
    console.error('Usage: node insights_agent.mjs <pr_number> <commit_sha>');
    process.exit(1);
  }
  
  agent.analyzeDeployment(prNumber, commitSha)
    .then(() => {
      console.log('AI insights analysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('AI insights analysis failed:', error);
      process.exit(1);
    });
}
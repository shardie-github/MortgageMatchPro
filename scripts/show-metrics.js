#!/usr/bin/env node

/**
 * Metrics Display Script
 * v1.2.0 - Display system metrics and health status
 */

const { enhancedMetricsService } = require('../lib/monitoring/EnhancedMetrics')

async function showMetrics(metricType) {
  try {
    switch (metricType) {
      case 'ai':
        await showAIMetrics()
        break
      case 'regional':
        await showRegionalMetrics()
        break
      case 'training':
        await showTrainingMetrics()
        break
      case 'health':
        await showHealthStatus()
        break
      default:
        console.log('📊 Available metric types:')
        console.log('  - ai: AI performance metrics')
        console.log('  - regional: Regional performance metrics')
        console.log('  - training: Training metrics')
        console.log('  - health: System health status')
        console.log('')
        console.log('Usage: npm run metrics:<type>')
        break
    }
  } catch (error) {
    console.error('❌ Error showing metrics:', error.message)
    process.exit(1)
  }
}

async function showAIMetrics() {
  console.log('🤖 AI Metrics Summary')
  console.log('====================')
  
  const summary = enhancedMetricsService.getAIMetricsSummary('day')
  
  console.log(`Total Requests: ${summary.totalRequests}`)
  console.log(`Average Latency: ${summary.averageLatency}ms`)
  console.log(`Average Cost: $${summary.averageCost}`)
  console.log(`Average Accuracy: ${(summary.averageAccuracy * 100).toFixed(1)}%`)
  console.log(`Average Confidence: ${(summary.averageConfidence * 100).toFixed(1)}%`)
  console.log(`Total Tokens: ${summary.totalTokens.toLocaleString()}`)
  console.log('')
  console.log('Model Breakdown:')
  Object.entries(summary.modelBreakdown).forEach(([model, count]) => {
    console.log(`  ${model}: ${count} requests`)
  })
}

async function showRegionalMetrics() {
  console.log('🌍 Regional Metrics Summary')
  console.log('===========================')
  
  const summary = enhancedMetricsService.getRegionalMetricsSummary()
  
  console.log(`Global Average Latency: ${summary.globalAverageLatency}ms`)
  console.log(`Global Error Rate: ${(summary.globalErrorRate * 100).toFixed(2)}%`)
  console.log(`Total Active Users: ${summary.totalActiveUsers.toLocaleString()}`)
  console.log('')
  console.log('Regional Breakdown:')
  summary.regions.forEach(region => {
    console.log(`  ${region.region} (${region.country}):`)
    console.log(`    Latency: ${region.averageLatency}ms`)
    console.log(`    Error Rate: ${(region.errorRate * 100).toFixed(2)}%`)
    console.log(`    Throughput: ${region.throughput} req/min`)
    console.log(`    Active Users: ${region.activeUsers}`)
  })
}

async function showTrainingMetrics() {
  console.log('🎯 Training Metrics')
  console.log('==================')
  
  // Get all unique model IDs from training metrics
  const allMetrics = enhancedMetricsService.trainingMetrics || []
  const modelIds = [...new Set(allMetrics.map(m => m.modelId))]
  
  if (modelIds.length === 0) {
    console.log('No training metrics available')
    return
  }
  
  modelIds.forEach(modelId => {
    const metrics = enhancedMetricsService.getTrainingMetrics(modelId)
    console.log(`Model: ${modelId}`)
    console.log(`  Total Epochs: ${metrics.totalEpochs}`)
    console.log(`  Final Accuracy: ${(metrics.finalAccuracy * 100).toFixed(1)}%`)
    console.log(`  Best Accuracy: ${(metrics.bestAccuracy * 100).toFixed(1)}%`)
    console.log(`  Final Loss: ${metrics.finalLoss.toFixed(4)}`)
    console.log(`  Best Loss: ${metrics.bestLoss.toFixed(4)}`)
    console.log('')
  })
}

async function showHealthStatus() {
  console.log('🏥 System Health Status')
  console.log('=======================')
  
  const health = enhancedMetricsService.getSystemHealth()
  
  const statusEmoji = {
    healthy: '✅',
    degraded: '⚠️',
    unhealthy: '❌'
  }
  
  console.log(`Status: ${statusEmoji[health.status]} ${health.status.toUpperCase()}`)
  console.log('')
  
  if (health.issues.length > 0) {
    console.log('Issues:')
    health.issues.forEach(issue => {
      console.log(`  ❌ ${issue}`)
    })
    console.log('')
  }
  
  if (health.recommendations.length > 0) {
    console.log('Recommendations:')
    health.recommendations.forEach(rec => {
      console.log(`  💡 ${rec}`)
    })
    console.log('')
  }
  
  if (health.issues.length === 0) {
    console.log('✅ No issues detected')
  }
}

// Get metric type from command line arguments
const metricType = process.argv[2]

showMetrics(metricType)